const prisma = require('../../config/db');
const authService = require('../auth/auth.service');
const emailService = require('../../services/email.service');
const AppError = require('../../utils/AppError');
const { generateId } = require('../../utils/idGenerator');

class AdminService {
  async logAudit(usu_codi, tipo, descripcion, ip = null) {
    return await prisma.tr_audito.create({
      data: {
        aud_codi: generateId('L'),
        usu_codi: usu_codi,
        aud_tipo: tipo,
        aud_desc: descripcion,
        aud_ip: ip
      }
    });
  }

  async listAuditoria() {
    return await prisma.tr_audito.findMany({
      include: {
        tm_usuar: {
          select: {
            usu_crro: true,
            tm_admin: { select: { adm_nomb: true, adm_apel: true } },
            tm_espec: { select: { esp_nomb: true, esp_apel: true } }
          }
        }
      },
      orderBy: { aud_time: 'desc' }
    });
  }

  async listNinos() {
    return await prisma.tm_ninos.findMany({
      include: {
        tm_repre: true
      }
    });
  }

  async listEspecialistas() {
    return await prisma.tm_espec.findMany({
      include: {
        tm_usuar: { select: { usu_crro: true, usu_estd: true } },
        tm_insti: true,
        tm_especi: true
      }
    });
  }

  async listAsignaciones() {
    return await prisma.tc_asign.findMany({
      include: {
        tm_ninos: true,
        tm_espec: true
      },
      orderBy: { asi_inic: 'desc' }
    });
  }

  async createEspecialista(data) {
    const password = data.password || 'SiatDoc2026*';
    
    const payload = {
      usu_crro: data.email,
      usu_clve: password,
      esp_nomb: data.nombre,
      esp_apel: data.apellido,
      esp_codi: data.esp_codi || generateId('E'),
      usu_codi: generateId('U'),
      esp_licencia: data.esp_licencia,
      esp_gner: data.esp_gner || 'F',
      esp_telf: data.esp_telf,
      esc_codi: data.esc_codi,
      ins_codi: data.ins_codi || 'I001'
    };

    const result = await authService.registerEspecialista(payload);
    
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      await emailService.sendEmail({
        to: data.email,
        subject: 'Bienvenido a SIAT - Credenciales de Acceso',
        templateName: 'welcome-especialista',
        context: {
          nombre: `${data.nombre} ${data.apellido}`,
          email: data.email,
          password: password,
          loginUrl: `${frontendUrl}/login`
        }
      });
    } catch (err) {
      console.error('No se pudo enviar el correo de bienvenida', err);
    }

    return { ...result, password_generada: password };
  }

  async assignNinoToEspecialista(nin_codi, esp_codi) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi } });
    if (!nino) throw new AppError('Niño no encontrado', 404);

    const especialista = await prisma.tm_espec.findUnique({ where: { esp_codi } });
    if (!especialista) throw new AppError('Especialista no encontrado', 404);

    const asignacionExistente = await prisma.tc_asign.findFirst({
      where: { nin_codi, esp_codi }
    });

    if (asignacionExistente) {
      throw new AppError('El paciente ya está asignado a este especialista', 400);
    }

    const nuevaAsignacion = await prisma.tc_asign.create({
      data: {
        asi_codi: generateId('A'),
        nin_codi: nin_codi,
        esp_codi: esp_codi,
        asi_inic: new Date(),
        asi_stdo: 'Activo'
      }
    });

    return nuevaAsignacion;
  }

  async updateEspecialista(esp_codi, data) {
    const esp = await prisma.tm_espec.findUnique({ where: { esp_codi } });
    if (!esp) throw new AppError('Especialista no encontrado', 404);

    const result = await prisma.$transaction(async (tx) => {
      const updatedEsp = await tx.tm_espec.update({
        where: { esp_codi },
        data: {
          esp_nomb: data.esp_nomb !== undefined ? data.esp_nomb : undefined,
          esp_apel: data.esp_apel !== undefined ? data.esp_apel : undefined,
        }
      });

      let updatedUser;
      if (data.usu_crro) {
        const emailExists = await tx.tm_usuar.findFirst({
          where: { 
            usu_crro: data.usu_crro,
            usu_codi: { not: esp.usu_codi }
          }
        });
        if (emailExists) throw new AppError('El correo ingresado ya está en uso', 400);

        updatedUser = await tx.tm_usuar.update({
          where: { usu_codi: esp.usu_codi },
          data: { usu_crro: data.usu_crro }
        });
      }

      return { updatedEsp, updatedUser };
    });

    return result;
  }

  async toggleEspecialistaEstado(esp_codi, isActivo) {
    const esp = await prisma.tm_espec.findUnique({ where: { esp_codi } });
    if (!esp) throw new AppError('Especialista no encontrado', 404);

    const updatedUser = await prisma.tm_usuar.update({
      where: { usu_codi: esp.usu_codi },
      data: { usu_estd: isActivo }
    });

    return updatedUser;
  }

  async toggleAsignacionEstado(asi_codi, stdo) {
    const asignacion = await prisma.tc_asign.findUnique({ where: { asi_codi } });
    if (!asignacion) throw new AppError('Asignación no encontrada', 404);

    const updatedAsignacion = await prisma.tc_asign.update({
      where: { asi_codi },
      data: { asi_stdo: stdo }
    });

    return updatedAsignacion;
  }

  async getMetricasDashboard() {
    const totalNinos = await prisma.tm_ninos.count();
    const totalEspecialistas = await prisma.tm_espec.count();
    const totalAlertas = await prisma.tr_alert.count();
    const asignacionesActivas = await prisma.tc_asign.count({ where: { asi_stdo: 'Activo' } });

    // Cálculo REAL histórico basado en la fecha de creación de asignaciones (asi_inic)
    // Agrupando asignaciones por mes en los últimos 6 meses.
    const seisMesesAtras = new Date();
    seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 5);
    seisMesesAtras.setDate(1); // Primer día del mes
    seisMesesAtras.setHours(0, 0, 0, 0);

    const asignaciones = await prisma.tc_asign.findMany({
      where: {
        asi_inic: {
          gte: seisMesesAtras
        }
      },
      select: { asi_inic: true }
    });

    const mesesStr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    // Inicializar estructura de los últimos 6 meses
    const monthlyData = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const name = mesesStr[d.getMonth()];
      monthlyData[name] = { name, pacientes: 0, horasTerapia: 0 };
    }

    // Poblar con la info real de la DB
    asignaciones.forEach(a => {
      const monthName = mesesStr[a.asi_inic.getMonth()];
      if (monthlyData[monthName]) {
        monthlyData[monthName].pacientes += 1;
        monthlyData[monthName].horasTerapia += 8; // Estimado fijo acordado por negocio
      }
    });

    return {
      totalNinos,
      totalEspecialistas,
      totalAlertas,
      asignacionesActivas,
      chartData: Object.values(monthlyData)
    };
  }

  async updateInstitucion(id, data) {
    const targetId = id || 'I001';
    const existing = await prisma.tm_insti.findUnique({ where: { ins_codi: targetId } });
    if (!existing) throw new AppError('Institución no encontrada', 404);
    
    return prisma.tm_insti.update({
      where: { ins_codi: targetId },
      data: {
        ins_nomb: data.ins_nomb,
        ins_dire: data.ins_dire,
        ins_telf: data.ins_telf,
        ins_pers: data.ins_pers
      }
    });
  }

  async createEspecialidad(data) {
    const existing = await prisma.tm_especi.findUnique({ where: { esc_codi: data.esc_codi } });
    if (existing) throw new AppError('Ya existe una especialidad con este ID', 400);

    return prisma.tm_especi.create({
      data: {
        esc_codi: data.esc_codi,
        esc_nomb: data.esc_nomb,
        esc_desc: data.esc_desc,
        esc_estd: true
      }
    });
  }

  async updateEspecialidad(id, data) {
    const existing = await prisma.tm_especi.findUnique({ where: { esc_codi: id } });
    if (!existing) throw new AppError('Especialidad no encontrada', 404);

    return prisma.tm_especi.update({
      where: { esc_codi: id },
      data: {
        esc_nomb: data.esc_nomb,
        esc_desc: data.esc_desc
      }
    });
  }

  async toggleEspecialidadStatus(id, activo) {
    const existing = await prisma.tm_especi.findUnique({ where: { esc_codi: id } });
    if (!existing) throw new AppError('Especialidad no encontrada', 404);

    return prisma.tm_especi.update({
      where: { esc_codi: id },
      data: { esc_estd: activo }
    });
  }

  async listUsers() {
    return await prisma.tm_usuar.findMany({
      select: {
        usu_codi: true,
        usu_crro: true,
        usu_crea: true,
        usu_logi: true,
        usu_estd: true,
        rol_codi: true,
        tm_roles: { select: { rol_nomb: true } },
        tm_espec: { select: { esp_nomb: true, esp_apel: true } },
        tm_repre: { select: { rep_nomb: true, rep_apel: true } },
        tm_admin: { select: { adm_nomb: true, adm_apel: true } }
      },
      orderBy: { usu_crea: 'desc' }
    });
  }

  async toggleUserEstado(usu_codi, activo) {
    const user = await prisma.tm_usuar.findUnique({ where: { usu_codi } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    return await prisma.tm_usuar.update({
      where: { usu_codi },
      data: { usu_estd: activo }
    });
  }

  async getCatalogos() {
    const especialidades = await prisma.tm_especi.findMany({ where: { esc_estd: true } });
    const instituciones = await prisma.tm_insti.findMany({ where: { ins_estd: true } });
    return { especialidades, instituciones };
  }
}

module.exports = new AdminService();
