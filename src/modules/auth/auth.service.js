const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../../config/db');
const env = require('../../config/env');

const generateId = (prefix) => {
  // 1 char prefix + 9 random hex chars = 10 chars max
  return prefix + crypto.randomBytes(4).toString('hex') + Math.floor(Math.random() * 10);
};

class AuthService {
  async login(correo, clave) {
    const usuario = await prisma.tm_usuar.findFirst({
      where: { usu_crro: correo, usu_estd: true },
      include: { tm_roles: true, tm_espec: true, tm_repre: true, tm_admin: true }
    });

    if (!usuario) {
      throw new Error('Credenciales inválidas o usuario inactivo');
    }

    const isValid = await bcrypt.compare(clave, usuario.usu_clve);
    if (!isValid) {
      throw new Error('Credenciales inválidas');
    }

    // Actualizar ultimo login
    await prisma.tm_usuar.update({
      where: { usu_codi: usuario.usu_codi },
      data: { usu_logi: new Date() }
    });

    const token = jwt.sign(
      { 
        usu_codi: usuario.usu_codi, 
        rol_codi: usuario.rol_codi,
        rol_nomb: usuario.tm_roles?.rol_nomb,
        ins_codi: usuario.tm_admin?.ins_codi || usuario.tm_espec?.ins_codi || null
      },
      env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    let userName = 'Usuario';
    if (usuario.rol_codi === 'ROL_ESP' && usuario.tm_espec) {
      const prefix = usuario.tm_espec.esp_gner === 'M' ? 'Dr.' : 'Dra.';
      userName = `${prefix} ${usuario.tm_espec.esp_nomb} ${usuario.tm_espec.esp_apel}`;
    } else if (usuario.rol_codi === 'ROL_REP' && usuario.tm_repre) {
      userName = `${usuario.tm_repre.rep_nomb} ${usuario.tm_repre.rep_apel}`;
    } else if (usuario.rol_codi === 'ROL_ADM' && usuario.tm_admin) {
      userName = `${usuario.tm_admin.adm_nomb} ${usuario.tm_admin.adm_apel}`;
    } else if (usuario.rol_codi === 'ROL_DIR') {
      userName = 'Director SIAT';
    }

    return { token, user: { usu_codi: usuario.usu_codi, usu_crro: usuario.usu_crro, rol_codi: usuario.rol_codi, nombre: userName } };
  }

  async registerRepresentante(data) {
    // Validar si el correo ya existe
    const existingUser = await prisma.tm_usuar.findFirst({
      where: { usu_crro: data.usu_crro }
    });

    if (existingUser) {
      throw new Error('El correo ya está registrado');
    }

    const hashedClve = await bcrypt.hash(data.usu_clve, 10);
    const ROL_REPRESENTANTE = 'ROL_REP';

    const usuCodi = generateId('U');
    const repCod = generateId('R');
    const ninCodi = generateId('N');

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.tm_usuar.create({
        data: {
          usu_codi: usuCodi,
          rol_codi: ROL_REPRESENTANTE,
          usu_crro: data.usu_crro,
          usu_clve: hashedClve,
          usu_crea: new Date(),
          usu_estd: true
        }
      });

      // Asegurar que exista una institucion (SaaS: si el form no lo envía, asignar a una principal por defecto)
      let instCodi = data.ins_codi;
      if (!instCodi) {
        let inst = await tx.tm_insti.findFirst();
        if (!inst) {
          inst = await tx.tm_insti.create({
            data: { ins_codi: 'I001', ins_nomb: 'Clínica Principal', ins_dire: 'No especificada', ins_telf: '000000000' }
          });
        }
        instCodi = inst.ins_codi;
      }

      const nino = await tx.tm_ninos.create({
        data: {
          nin_codi: ninCodi,
          ins_codi: instCodi,
          nin_nomb: data.nin_nomb,
          nin_apel: data.nin_apel,
          nin_fnac: new Date(data.nin_fnac),
          nin_gner: data.nin_gner || 'M',
          nin_nivd: 'Por evaluar', // Se evalua por especialista posteriormente
          nin_ingr: new Date()
        }
      });

      const repre = await tx.tm_repre.create({
        data: {
          rep_cod: repCod,
          usu_codi: user.usu_codi,
          rep_nomb: data.rep_nomb,
          rep_apel: data.rep_apel,
          nin_codi: nino.nin_codi,
          rep_rela: data.rep_rela || 'Familiar',
          rep_telf: data.rep_telf || 'No especificado'
        }
      });

      return { user, repre, nino };
    });

    return result;
  }

  async registerEspecialista(data) {
    const existingUser = await prisma.tm_usuar.findFirst({
      where: { OR: [{ usu_codi: data.usu_codi }, { usu_crro: data.usu_crro }] }
    });

    if (existingUser) {
      throw new Error('El usuario o correo ya están registrados');
    }

    const hashedClve = await bcrypt.hash(data.usu_clve, 10);
    const ROL_ESPECIALISTA = 'ROL_ESP';

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.tm_usuar.create({
        data: {
          usu_codi: data.usu_codi,
          rol_codi: ROL_ESPECIALISTA,
          usu_crro: data.usu_crro,
          usu_clve: hashedClve,
          usu_crea: new Date(),
          usu_estd: true
        }
      });

      // Asegurar que exista una institucion
      let instCodi = data.ins_codi;
      if (!instCodi) {
        let inst = await tx.tm_insti.findFirst();
        if (!inst) {
          inst = await tx.tm_insti.create({
            data: { ins_codi: 'I001', ins_nomb: 'Clínica Principal', ins_dire: 'No especificada', ins_telf: '000000000' }
          });
        }
        instCodi = inst.ins_codi;
      }

      // Asegurar que exista una especialidad
      let specCodi = data.esc_codi;
      if (!specCodi) {
        let spec = await tx.tm_especi.findFirst();
        if (!spec) {
          spec = await tx.tm_especi.create({
            data: { esc_codi: 'E001', esc_nomb: 'Neurología' }
          });
        }
        specCodi = spec.esc_codi;
      }

      const esp = await tx.tm_espec.create({
        data: {
          esp_codi: data.esp_codi,
          usu_codi: user.usu_codi,
          ins_codi: instCodi,
          esc_codi: specCodi,
          esp_nomb: data.esp_nomb,
          esp_apel: data.esp_apel,
          esp_gner: data.esp_gner || 'F',
          esp_licencia: data.esp_licencia || null,
          esp_telf: data.esp_telf || null
        }
      });

      return { user, esp };
    });

    return result;
  }
  async forgotPassword(email) {
    const usuario = await prisma.tm_usuar.findFirst({
      where: { usu_crro: email },
      include: { tm_repre: true, tm_espec: true }
    });

    if (!usuario) {
      // Por seguridad, retornamos true de todas formas sin avisar si existe o no
      return true;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 15 * 60000); // 15 minutos

    await prisma.tm_usuar.update({
      where: { usu_codi: usuario.usu_codi },
      data: {
        usu_rtok: resetToken,
        usu_rexp: resetExpires
      }
    });

    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    const name = usuario.tm_repre?.[0]?.rep_nomb || usuario.tm_espec?.esp_nomb || 'Usuario';

    const emailService = require('../../services/email.service');
    await emailService.sendEmail({
      to: usuario.usu_crro,
      subject: 'Recuperación de Contraseña - SIAT',
      templateName: 'recover-password',
      context: {
        name: name,
        resetUrl: resetUrl
      }
    });

    return true;
  }

  async resetPassword(token, newPassword) {
    const usuario = await prisma.tm_usuar.findFirst({
      where: {
        usu_rtok: token,
        usu_rexp: { gt: new Date() }
      }
    });

    if (!usuario) {
      throw new Error('Token inválido o expirado');
    }

    const hashedClve = await bcrypt.hash(newPassword, 10);

    await prisma.tm_usuar.update({
      where: { usu_codi: usuario.usu_codi },
      data: {
        usu_clve: hashedClve,
        usu_rtok: null,
        usu_rexp: null
      }
    });

    return true;
  }

  async getInvitationDetails(token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const usuario = await prisma.tm_usuar.findUnique({
        where: { usu_codi: decoded.usu_codi },
        include: {
          tm_repre: {
            include: {
              tm_ninos: true
            }
          }
        }
      });

      if (!usuario || usuario.usu_estd) {
        throw new Error('La invitación no es válida o ya ha sido completada.');
      }

      const repre = usuario.tm_repre;
      const child = repre?.tm_ninos;

      return {
        usu_crro: usuario.usu_crro,
        rep_nomb: repre?.rep_nomb,
        rep_apel: repre?.rep_apel,
        nin_nomb: child?.nin_nomb,
        nin_apel: child?.nin_apel
      };
    } catch (error) {
      throw new Error(error.message || 'Token de invitación inválido o expirado.');
    }
  }

  async completeInvitation({ token, password, relation, phone }) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      
      const usuario = await prisma.tm_usuar.findUnique({
        where: { usu_codi: decoded.usu_codi },
        include: { tm_repre: true }
      });

      if (!usuario || usuario.usu_estd) {
        throw new Error('Esta invitación ya fue completada o es inválida.');
      }

      const hashedClve = await bcrypt.hash(password, 10);

      const result = await prisma.$transaction(async (tx) => {
        const updatedUser = await tx.tm_usuar.update({
          where: { usu_codi: usuario.usu_codi },
          data: {
            usu_clve: hashedClve,
            usu_estd: true,
            usu_logi: new Date()
          }
        });

        const updatedRepre = await tx.tm_repre.update({
          where: { rep_cod: usuario.tm_repre.rep_cod },
          data: {
            rep_rela: relation || 'Familiar',
            rep_telf: phone || 'No especificado'
          }
        });

        return { updatedUser, updatedRepre };
      });

      // Loguear automáticamente al usuario retornando el token de sesión
      const loginToken = jwt.sign(
        { 
          usu_codi: result.updatedUser.usu_codi, 
          rol_codi: result.updatedUser.rol_codi,
          rol_nomb: 'Representante',
          ins_codi: null
        },
        env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return {
        token: loginToken,
        user: {
          usu_codi: result.updatedUser.usu_codi,
          usu_crro: result.updatedUser.usu_crro,
          rol_codi: result.updatedUser.rol_codi,
          nombre: `${result.updatedRepre.rep_nomb} ${result.updatedRepre.rep_apel}`
        }
      };
    } catch (error) {
      throw new Error(error.message || 'Error al completar el registro.');
    }
  }

  async getMe(usu_codi) {
    const usuario = await prisma.tm_usuar.findUnique({
      where: { usu_codi },
      include: {
        tm_roles: true,
        tm_espec: true,
        tm_repre: true,
        tm_admin: true
      }
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Retornamos los datos limpiando la contraseña
    const { usu_clve, usu_rtok, ...safeUser } = usuario;
    return safeUser;
  }

  async updateMe(usu_codi, updateData) {
    const usuario = await prisma.tm_usuar.findUnique({
      where: { usu_codi },
      include: { tm_espec: true, tm_repre: true, tm_admin: true }
    });

    if (!usuario) {
      throw new Error('Usuario no encontrado');
    }

    const { currentPassword, password, ...profileData } = updateData;

    // Si intentan cambiar la contraseña, validar la actual
    if (password && password.trim() !== '') {
      if (!currentPassword) {
        throw Object.assign(new Error('La contraseña actual es requerida para cambiar la contraseña'), { status: 400 });
      }
      const isCurrentPasswordValid = await bcrypt.compare(currentPassword, usuario.usu_clve);
      if (!isCurrentPasswordValid) {
        throw Object.assign(new Error('La contraseña actual es incorrecta'), { status: 400 });
      }
    }

    return await prisma.$transaction(async (tx) => {
      // Si enviaron un nuevo password, lo actualizamos
      if (password && password.trim() !== '') {
        const hashedClve = await bcrypt.hash(password, 10);
        await tx.tm_usuar.update({
          where: { usu_codi },
          data: { usu_clve: hashedClve }
        });
      }

      // Actualizar información específica según el rol
      if (usuario.rol_codi === 'ROL_ESP' && usuario.tm_espec) {
        await tx.tm_espec.update({
          where: { usu_codi },
          data: {
            esp_nomb: profileData.nomb || usuario.tm_espec.esp_nomb,
            esp_apel: profileData.apel || usuario.tm_espec.esp_apel,
            esp_telf: profileData.telf !== undefined ? profileData.telf : usuario.tm_espec.esp_telf,
            esp_licencia: profileData.licencia !== undefined ? profileData.licencia : usuario.tm_espec.esp_licencia
          }
        });
      } else if (usuario.rol_codi === 'ROL_REP' && usuario.tm_repre) {
        await tx.tm_repre.update({
          where: { usu_codi },
          data: {
            rep_nomb: profileData.nomb || usuario.tm_repre.rep_nomb,
            rep_apel: profileData.apel || usuario.tm_repre.rep_apel,
            rep_telf: profileData.telf !== undefined ? profileData.telf : usuario.tm_repre.rep_telf,
            rep_rela: profileData.rela !== undefined ? profileData.rela : usuario.tm_repre.rep_rela
          }
        });
      } else if (usuario.rol_codi === 'ROL_ADM' && usuario.tm_admin) {
        await tx.tm_admin.update({
          where: { usu_codi },
          data: {
            adm_nomb: profileData.nomb || usuario.tm_admin.adm_nomb,
            adm_apel: profileData.apel || usuario.tm_admin.adm_apel
          }
        });
      }

      // Devolver el perfil actualizado
      return this.getMe(usu_codi);
    });
  }
}

module.exports = new AuthService();
