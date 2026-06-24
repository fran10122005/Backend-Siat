const prisma = require('../../config/db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const env = require('../../config/env');

const generateId = (prefix) => {
  return (prefix + crypto.randomBytes(3).toString('hex') + Math.floor(Math.random() * 10)).substring(0, 10);
};

class NinosService {
  async crearNinoParaRepresentante(usu_codi, data) {
    // Verificar que el usuario sea representante
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: { tm_ninos: true }
    });

    if (!repre) {
      throw new Error('Usuario no está registrado como representante');
    }

    // Obtener la institución del representante (a través de su niño principal)
    let instCodi = data.ins_codi || repre?.tm_ninos?.ins_codi;
    if (!instCodi) {
      const inst = await prisma.tm_insti.findFirst();
      instCodi = inst ? inst.ins_codi : 'I001';
    }

    const nuevoNino = await prisma.tm_ninos.create({
      data: {
        nin_codi: data.nin_codi,
        ins_codi: instCodi,
        nin_nomb: data.nin_nomb,
        nin_apel: data.nin_apel,
        nin_fnac: data.nin_fnac,
        nin_gner: data.nin_gner,
        nin_nivd: data.nin_nivd,
        nin_ingr: new Date()
      }
    });

    // Vincular al representante actual (si no lo vinculamos en el registro inicial)
    // Asumiremos que el repre.nin_codi ya lo asocia, o podemos actualizarlo
    await prisma.tm_repre.update({
      where: { rep_cod: repre.rep_cod },
      data: { nin_codi: nuevoNino.nin_codi }
    });

    return nuevoNino;
  }

  async getMisNinos(usu_codi, rol_codi) {
    if (rol_codi === 'ROL_REP') {
      const repre = await prisma.tm_repre.findUnique({
        where: { usu_codi },
        include: { tm_ninos: true }
      });
      return repre?.tm_ninos ? [repre.tm_ninos] : [];
    }
    
    if (rol_codi === 'ROL_ESP') {
      const espec = await prisma.tm_espec.findUnique({
        where: { usu_codi },
        include: { tc_asign: { include: { tm_ninos: true } } }
      });
      return espec?.tc_asign.map(a => a.tm_ninos) || [];
    }

    if (rol_codi === 'ROL_DIR') {
      return await prisma.tm_ninos.findMany();
    }
    
    if (rol_codi === 'ROL_ADM') {
      // Como tm_admin puede no estar definido, lo omitimos si no existe
      // o buscamos si el usuario tiene una institución asignada
      return await prisma.tm_ninos.findMany();
    }

    throw new Error('Rol no soportado para esta consulta');
  }

  async setUmbral(nin_codi, data) {
    const umbral = await prisma.tc_umbra.create({
      data: {
        umb_codi: data.umb_codi,
        nin_codi: nin_codi,
        sen_codi: data.sen_codi,
        umb_limi: data.umb_limi,
        umb_lims: data.umb_lims,
        umb_ajus: new Date()
      }
    });
    return umbral;
  }

  async inviteRepresentative(especCodi, data) {
    let generatedPassword = '';
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or retrieve inactive user
      let user = await tx.tm_usuar.findFirst({ where: { usu_crro: data.usu_crro } });
      generatedPassword = 'Padre' + crypto.randomBytes(3).toString('hex');
      const hashedClve = await bcrypt.hash(generatedPassword, 10);
      
      if (user) {
        if (user.usu_estd) {
          throw new Error('El correo electrónico ya está registrado y activo');
        }
        // Clean up previous inactive invitation details to avoid duplicate constraints
        const existingRep = await tx.tm_repre.findUnique({
          where: { usu_codi: user.usu_codi }
        });
        if (existingRep) {
          // Delete assignments associated with the old child
          await tx.tc_asign.deleteMany({
            where: { nin_codi: existingRep.nin_codi }
          });
          // Delete representative
          await tx.tm_repre.delete({
            where: { rep_cod: existingRep.rep_cod }
          });
          // Delete child
          await tx.tm_ninos.delete({
            where: { nin_codi: existingRep.nin_codi }
          });
        }
        
        user = await tx.tm_usuar.update({
          where: { usu_codi: user.usu_codi },
          data: {
            usu_clve: hashedClve,
            usu_estd: true
          }
        });
      } else {
        user = await tx.tm_usuar.create({
          data: {
            usu_codi: generateId('U'),
            rol_codi: 'ROL_REP',
            usu_crro: data.usu_crro,
            usu_clve: hashedClve,
            usu_crea: new Date(),
            usu_estd: true
          }
        });
      }

      // 2. Determine ins_codi. It should belong to the specialist's clinic, or default to I001.
      let instCodi = 'I001';
      const espec = await tx.tm_espec.findUnique({ where: { usu_codi: especCodi } });
      if (espec && espec.ins_codi) {
        instCodi = espec.ins_codi;
      } else {
        const admin = await tx.tm_admin.findUnique({ where: { usu_codi: especCodi } });
        if (admin && admin.ins_codi) {
          instCodi = admin.ins_codi;
        }
      }

      // 3. Create tm_ninos
      const nino = await tx.tm_ninos.create({
        data: {
          nin_codi: generateId('N'),
          ins_codi: instCodi,
          nin_nomb: data.nin_nomb,
          nin_apel: data.nin_apel,
          nin_fnac: new Date(data.nin_fnac),
          nin_gner: data.nin_gner,
          nin_nivd: data.nin_nivd,
          nin_ingr: new Date()
        }
      });

      // 4. Create tm_repre
      const repre = await tx.tm_repre.create({
        data: {
          rep_cod: generateId('R'),
          usu_codi: user.usu_codi,
          rep_nomb: data.rep_nomb,
          rep_apel: data.rep_apel,
          nin_codi: nino.nin_codi,
          rep_rela: 'Familiar',
          rep_telf: 'No especificado'
        }
      });

      // 5. Create assignments (tc_asign) if created by a specialist to link them immediately
      if (espec) {
        await tx.tc_asign.create({
          data: {
            asi_codi: generateId('AS'),
            nin_codi: nino.nin_codi,
            esp_codi: espec.esp_codi,
            asi_inic: new Date(),
            asi_stdo: 'Activo'
          }
        });
      }

      return { user, nino, repre };
    });

    const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
    const loginUrl = `${frontendUrl}/login`;

    // Enviar correo de invitación con credenciales
    const emailService = require('../../services/email.service');
    let emailSent = false;
    try {
      await emailService.sendEmail({
        to: result.user.usu_crro,
        subject: 'Invitación y Credenciales de Acceso - SIAT',
        templateName: 'invite-representative',
        context: {
          nombre_padre: `${result.repre.rep_nomb} ${result.repre.rep_apel}`,
          nombre_nino: `${result.nino.nin_nomb} ${result.nino.nin_apel}`,
          email: result.user.usu_crro,
          password: generatedPassword,
          loginUrl: loginUrl
        }
      });
      emailSent = true;
    } catch (error) {
      console.warn('⚠️ Error al enviar correo de invitación (SMTP no configurado):', error.message);
    }

    // Imprimir las credenciales en los logs de consola para fácil desarrollo
    console.log(`🔗 Credenciales generadas para ${result.user.usu_crro} - Password: ${generatedPassword}`);

    return {
      nin_codi: result.nino.nin_codi,
      nin_nomb: result.nino.nin_nomb,
      nin_apel: result.nino.nin_apel,
      passwordGenerada: generatedPassword,
      emailSent: emailSent
    };
  }

  async getMiExpediente(usu_codi) {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: {
        tm_ninos: {
          include: {
            tc_asign: {
              where: { asi_stdo: 'Activo' },
              include: {
                tm_espec: {
                  include: {
                    tm_especi: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!repre) {
      throw new Error('Representante no encontrado');
    }

    const nino = repre.tm_ninos;
    if (!nino) {
      return null;
    }

    // Calcular edad
    const hoy = new Date();
    const cumple = new Date(nino.nin_fnac);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const m = hoy.getMonth() - cumple.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }

    // Especialista
    const especialista = nino.tc_asign[0]?.tm_espec
      ? `Dr(a). ${nino.tc_asign[0].tm_espec.esp_nomb} ${nino.tc_asign[0].tm_espec.esp_apel}`
      : 'Dra. Elena Ramos (Fundación)';

    return {
      nin_codi: nino.nin_codi,
      nin_nomb: nino.nin_nomb,
      nin_apel: nino.nin_apel,
      nin_fnac: nino.nin_fnac,
      nin_edad: `${edad} años`,
      nin_gner: nino.nin_gner,
      nin_nivd: nino.nin_nivd,
      especialista,
      perfil_sensorial: 'Sensorial Mixto (Ajustado)'
    };
  }

  async getBitacoras(usu_codi) {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi }
    });

    if (!repre) {
      throw new Error('Representante no encontrado');
    }

    return await prisma.tr_bitac.findMany({
      where: { nin_codi: repre.nin_codi },
      orderBy: { bit_fech: 'desc' }
    });
  }

  async getBitacorasByNino(nin_codi) {
    return await prisma.tr_bitac.findMany({
      where: { nin_codi },
      orderBy: { bit_fech: 'desc' }
    });
  }

  async crearBitacora(usu_codi, data) {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi }
    });

    if (!repre) {
      throw new Error('Representante no encontrado');
    }

    // Generar ID único
    const bit_codi = 'B' + crypto.randomBytes(3).toString('hex') + Math.floor(Math.random() * 10);

    return await prisma.tr_bitac.create({
      data: {
        bit_codi: bit_codi.substring(0, 10),
        nin_codi: repre.nin_codi,
        bit_fech: new Date(data.date),
        bit_suen: parseFloat(data.sleepHours),
        bit_cali: data.sleepQuality,
        bit_anim: data.mood,
        bit_apet: data.appetite,
        bit_bpm: data.bpm ? parseInt(data.bpm) : null,
        bit_obse: data.text,
        bit_crisi: data.crisisCount !== undefined ? parseInt(data.crisisCount) : null,
        bit_dese: data.triggers || null,
        bit_senso: data.sensoryIssues || null,
        bit_medi: data.medicationTaken !== undefined ? data.medicationTaken : null,
        bit_diges: data.digestion || null,
        bit_crea: new Date()
      }
    });
  }

  async getFichaClinica(nin_codi) {

    const nino = await prisma.tm_ninos.findUnique({
      where: { nin_codi },
      include: {
        tc_sensi_rel: true,
        tc_umbra: {
          orderBy: { umb_ajus: 'desc' },
          take: 1
        }
      }
    });

    if (!nino) {
      throw new Error('Niño no encontrado');
    }

    return {
      nin_codi: nino.nin_codi,
      nin_nomb: nino.nin_nomb,
      nin_apel: nino.nin_apel,
      nin_fnac: nino.nin_fnac,
      nin_gner: nino.nin_gner,
      nin_nivd: nino.nin_nivd,
      nin_ingr: nino.nin_ingr,
      sensibilidad: nino.tc_sensi_rel ? {
        sen_codi: nino.tc_sensi_rel.sen_codi,
        sen_tipo: nino.tc_sensi_rel.sen_tipo,
        sen_nvli: nino.tc_sensi_rel.sen_nvli,
        sen_nota: nino.tc_sensi_rel.sen_nota
      } : null,
      umbral: nino.tc_umbra[0] ? {
        umb_codi: nino.tc_umbra[0].umb_codi,
        umb_limi: nino.tc_umbra[0].umb_limi,
        umb_lims: nino.tc_umbra[0].umb_lims,
        umb_ajus: nino.tc_umbra[0].umb_ajus
      } : null
    };
  }

  async updateFichaClinica(nin_codi, data) {
    const nino = await prisma.tm_ninos.findUnique({
      where: { nin_codi }
    });

    if (!nino) {
      throw new Error('Niño no encontrado');
    }

    // 1. Actualizar datos básicos del niño
    await prisma.tm_ninos.update({
      where: { nin_codi },
      data: {
        nin_nomb: data.nin_nomb,
        nin_apel: data.nin_apel,
        nin_fnac: new Date(data.nin_fnac),
        nin_gner: data.nin_gner,
        nin_nivd: data.nin_nivd
      }
    });

    // 2. Si se proporciona información de sensibilidad, crearla o actualizarla
    if (data.sen_tipo) {
      let senCodi = nino.sen_codi;
      if (!senCodi) {
        senCodi = 'S' + crypto.randomBytes(3).toString('hex') + Math.floor(Math.random() * 10);
        senCodi = senCodi.substring(0, 10);
        
        // Crear tc_sensi
        await prisma.tc_sensi.create({
          data: {
            sen_codi: senCodi,
            nin_codi: nin_codi,
            sen_tipo: data.sen_tipo,
            sen_nvli: data.sen_nvli || 'Moderado',
            sen_nota: data.sen_nota || ''
          }
        });

        // Vincular al niño
        await prisma.tm_ninos.update({
          where: { nin_codi },
          data: { sen_codi: senCodi }
        });
      } else {
        // Actualizar tc_sensi existente
        await prisma.tc_sensi.update({
          where: { sen_codi: senCodi },
          data: {
            sen_tipo: data.sen_tipo,
            sen_nvli: data.sen_nvli || 'Moderado',
            sen_nota: data.sen_nota || ''
          }
        });
      }
    }

    return this.getFichaClinica(nin_codi);
  }
}

module.exports = new NinosService();

