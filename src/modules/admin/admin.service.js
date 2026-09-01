const prisma = require('../../config/db');
const authService = require('../auth/auth.service');
const emailService = require('../../services/email.service');
const env = require('../../config/env');
const AppError = require('../../utils/AppError');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { generateId } = require('../../utils/idGenerator');

// Contraseña provisional criptográficamente aleatoria (sin caracteres ambiguos ni confusos)
const generateRandomPassword = (length = 12) => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%&*';
  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[crypto.randomInt(chars.length)];
  }
  return password;
};

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
        tm_repre_ninos: { include: { tm_repre: true } }
      }
    });
  }

  async listEspecialistas() {
    return await prisma.tm_espec.findMany({
      include: {
        tm_usuar: { select: { usu_crro: true, usu_estd: true } },
        tm_insti: true,
        tm_especi: true,
        _count: {
          select: {
            tc_asign: { where: { asi_stdo: 'Activo' } }
          }
        }
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
    const password = data.password || generateRandomPassword();
    
    const payload = {
      usu_crro: data.email,
      usu_clve: password,
      esp_nomb: data.nombre,
      esp_apel: data.apellido,
      esp_codi: data.esp_codi || generateId('E'),
      usu_codi: generateId('U'),
      esp_licencia: data.esp_licencia,
      esp_tdoc: data.esp_tdoc || 'V',
      esp_fnac: data.esp_fnac ? new Date(data.esp_fnac) : undefined,
      esp_foto: data.esp_foto,
      esp_gner: data.esp_gner || 'F',
      esp_telf: data.esp_telf,
      esc_codi: data.esc_codi,
      ins_codi: data.ins_codi || 'I001'
    };

    const result = await authService.registerEspecialista(payload);
    
    try {
      const frontendUrl = env.FRONTEND_URL || 'http://localhost:5173';
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

  async assignNinoToEspecialista(nin_codi, esp_codi, options = {}) {
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
        asi_inic: options.asi_inic ? new Date(options.asi_inic) : new Date(),
        asi_stdo: options.asi_stdo || 'Activo'
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
          esp_tdoc: data.esp_tdoc !== undefined ? data.esp_tdoc : undefined,
          esp_fnac: data.esp_fnac !== undefined
            ? (data.esp_fnac ? new Date(data.esp_fnac) : null)
            : undefined,
          esp_foto: data.esp_foto !== undefined ? data.esp_foto : undefined,
          esp_licencia: data.esp_licencia !== undefined ? data.esp_licencia : undefined,
          esp_telf: data.esp_telf !== undefined ? data.esp_telf : undefined,
          esp_gner: data.esp_gner !== undefined ? data.esp_gner : undefined,
          esc_codi: data.esc_codi !== undefined ? data.esc_codi : undefined,
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

    // El RIF es la PK; si cambia, la BD lo propaga en cascada a las tablas que lo referencian
    const newCodi = data.ins_codi && data.ins_codi.trim() && data.ins_codi !== targetId
      ? data.ins_codi.trim()
      : undefined;

    if (newCodi) {
      const clash = await prisma.tm_insti.findUnique({ where: { ins_codi: newCodi } });
      if (clash) throw new AppError('Ya existe una institución con ese RIF', 409);
    }

    return prisma.tm_insti.update({
      where: { ins_codi: targetId },
      data: {
        ...(newCodi ? { ins_codi: newCodi } : {}),
        ins_nomb: data.ins_nomb,
        ins_dire: data.ins_dire,
        ins_telf: data.ins_telf,
        ins_pers: data.ins_pers,
        ins_emai: data.ins_emai,
        ins_web: data.ins_web
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
        tm_espec: { select: { esp_nomb: true, esp_apel: true, esp_foto: true } },
        tm_repre: {
          select: {
            rep_cod: true,
            rep_nomb: true,
            rep_apel: true,
            rep_rela: true,
            rep_telf: true,
            rep_foto: true,
            rep_cedu: true,
            tm_repre_ninos: {
              select: {
                nin_codi: true,
                tm_ninos: {
                  select: {
                    nin_codi: true,
                    nin_nomb: true,
                    nin_apel: true,
                    nin_fnac: true,
                    nin_gner: true,
                    nin_nivd: true,
                    nin_foto: true,
                    nin_diag: true,
                    nin_docs: true,
                  },
                },
              },
            },
          },
        },
        tm_admin: { select: { adm_nomb: true, adm_apel: true, adm_foto: true } }
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

  async resetUserPassword(usu_codi) {
    const user = await prisma.tm_usuar.findUnique({ where: { usu_codi } });
    if (!user) throw new AppError('Usuario no encontrado', 404);

    const newPassword = generateRandomPassword();
    const hashedClve = await bcrypt.hash(newPassword, 10);

    await prisma.tm_usuar.update({
      where: { usu_codi },
      data: { usu_clve: hashedClve }
    });

    return {
      usu_codi: user.usu_codi,
      usu_crro: user.usu_crro,
      password_generada: newPassword
    };
  }

  async getCatalogos() {
    const especialidades = await prisma.tm_especi.findMany({ orderBy: { esc_nomb: 'asc' } });
    const instituciones = await prisma.tm_insti.findMany({ where: { ins_estd: true } });
    return { especialidades, instituciones };
  }

  async updateRepresentante(usuCodi, data) {
    const repre = await prisma.tm_repre.findUnique({ where: { usu_codi: usuCodi } });
    if (!repre) throw new AppError('Representante no encontrado', 404);

    if (data.rep_cedu && data.rep_cedu !== repre.rep_cedu) {
      const ceduExists = await prisma.tm_repre.findFirst({
        where: { rep_cedu: data.rep_cedu, usu_codi: { not: usuCodi } }
      });
      if (ceduExists) throw new AppError('La cédula ingresada ya está registrada', 400);
    }

    if (data.usu_crro) {
      const emailExists = await prisma.tm_usuar.findFirst({
        where: { usu_crro: data.usu_crro, usu_codi: { not: usuCodi } }
      });
      if (emailExists) throw new AppError('El correo electrónico ya está en uso', 400);
    }

    await prisma.$transaction(async (tx) => {
      await tx.tm_repre.update({
        where: { rep_cod: repre.rep_cod },
        data: {
          rep_nomb: data.rep_nomb !== undefined ? data.rep_nomb : undefined,
          rep_apel: data.rep_apel !== undefined ? data.rep_apel : undefined,
          rep_telf: data.rep_telf !== undefined ? data.rep_telf : undefined,
          rep_rela: data.rep_rela !== undefined ? data.rep_rela : undefined,
          rep_foto: data.rep_foto !== undefined ? data.rep_foto : undefined,
          rep_cedu: data.rep_cedu !== undefined ? data.rep_cedu : undefined
        }
      });

      if (data.usu_crro) {
        await tx.tm_usuar.update({
          where: { usu_codi: usuCodi },
          data: { usu_crro: data.usu_crro }
        });
      }
    });

    return prisma.tm_repre.findUnique({
      where: { usu_codi: usuCodi },
      include: { tm_usuar: { select: { usu_crro: true } } }
    });
  }

  async updateNinoFoto(nin_codi, foto) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi } });
    if (!nino) throw new AppError('Paciente no encontrado', 404);

    return prisma.tm_ninos.update({
      where: { nin_codi },
      data: { nin_foto: foto }
    });
  }
}


  async updateNino(ninCodi, data) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi: ninCodi } });
    if (!nino) throw new AppError('Paciente no encontrado', 404);

    return prisma.tm_ninos.update({
      where: { nin_codi: ninCodi },
      data: {
        ...(data.nin_nomb ? { nin_nomb: data.nin_nomb } : {}),
        ...(data.nin_apel ? { nin_apel: data.nin_apel } : {}),
        ...(data.nin_fnac ? { nin_fnac: new Date(data.nin_fnac) } : {}),
        ...(data.nin_gner ? { nin_gner: data.nin_gner } : {}),
        ...(data.nin_nivd ? { nin_nivd: data.nin_nivd } : {}),
        ...(data.nin_diag !== undefined ? { nin_diag: data.nin_diag || null } : {}),
        ...(data.nin_docs !== undefined ? { nin_docs: data.nin_docs } : {}),
        ...(data.nin_foto !== undefined ? { nin_foto: data.nin_foto || null } : {})
      }
    });
  }

  async addNinoDocumento(ninCodi, docUrl) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi: ninCodi } });
    if (!nino) throw new AppError('Paciente no encontrado', 404);

    const currentDocs = Array.isArray(nino.nin_docs) ? nino.nin_docs : [];
    const newDocs = [...currentDocs, docUrl];

    return prisma.tm_ninos.update({
      where: { nin_codi: ninCodi },
      data: { nin_docs: newDocs }
    });
  }
}


  getReporteSchedule() {
    const configPath = path.resolve(__dirname, '../../config/scheduled_reports.json');
    if (!fs.existsSync(configPath)) {
      return {
        enabled: false,
        frequency: 'weekly',
        day: 'lunes',
        time: '08:00',
        email: '',
        additionalEmails: '',
        subject: 'Reporte Ejecutivo de Gestión Clínica — SIAT',
        modules: { metricas: true, pacientes: true, especialistas: true, auditoria: true }
      };
    }
    try {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch {
      return { enabled: false, frequency: 'weekly', day: 'lunes', time: '08:00', email: '' };
    }
  }

  saveReporteSchedule(config) {
    const configPath = path.resolve(__dirname, '../../config/scheduled_reports.json');
    const updated = {
      ...config,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2), 'utf8');
    return updated;
  }

  async compileReporteHtml(modulesConfig, customSubject) {
    const metricas = await this.getMetricas();
    const ninos = await prisma.tm_ninos.findMany({
      take: 10,
      orderBy: { nin_crea: 'desc' },
      select: { nin_nomb: true, nin_apel: true, nin_nivd: true, nin_diag: true }
    });
    const especialistas = await prisma.tm_espec.findMany({
      take: 10,
      include: {
        tm_usuar: { select: { usu_crro: true, usu_estd: true } },
        tm_especi: { select: { esc_nomb: true } },
        _count: { select: { tc_asign: true } }
      }
    });
    const auditoria = await prisma.tr_audito.findMany({
      take: 8,
      orderBy: { aud_fech: 'desc' }
    });

    const fechaActual = new Date().toLocaleDateString('es-VE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    let html = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 650px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
        <div style="background-color: #2563eb; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px; font-weight: bold;">SIAT - Sistema Inteligente de Acompañamiento Terapéutico</h1>
          <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">${customSubject || 'Reporte Ejecutivo de Gestión Clínica'}</p>
          <p style="margin: 3px 0 0 0; font-size: 11px; opacity: 0.75;">Fecha: ${fechaActual}</p>
        </div>
        <div style="padding: 20px; background-color: #ffffff;">
    `;

    if (modulesConfig.metricas) {
      html += `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; font-size: 16px; margin-top: 0;">📊 Indicadores Generales (KPIs)</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;"><strong>Pacientes Registrados:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #2563eb; font-weight: bold;">${metricas.totalNinos}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;"><strong>Especialistas Activos:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #059669; font-weight: bold;">${metricas.totalEspecialistas}</td>
            </tr>
            <tr style="background-color: #f8fafc;">
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;"><strong>Representantes Registrados:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #7c3aed; font-weight: bold;">${metricas.totalRepresentantes}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px;"><strong>Pacientes Asignados:</strong></td>
              <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 13px; text-align: right; color: #d97706; font-weight: bold;">${metricas.asignadosCount}</td>
            </tr>
          </table>
        </div>
      `;
    }

    if (modulesConfig.pacientes && ninos.length > 0) {
      html += `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; font-size: 16px;">👶 Estado de Pacientes Recientes</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Paciente</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Nivel TEA</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              ${ninos.map(n => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">${n.nin_nomb} ${n.nin_apel}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${n.nin_nivd || 'No clasificado'}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; color: #64748b;">${(n.nin_diag || '-').substring(0, 45)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (modulesConfig.especialistas && especialistas.length > 0) {
      html += `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; font-size: 16px;">🩺 Personal Clínico Especializado</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left;">
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Especialista</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0;">Especialidad</th>
                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center;">Pacientes</th>
              </tr>
            </thead>
            <tbody>
              ${especialistas.map(e => `
                <tr>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; font-weight: bold;">Dr/a. ${e.esp_nomb} ${e.esp_apel}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0;">${e.tm_especi?.esc_nomb || 'General'}</td>
                  <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #2563eb;">${e._count?.tc_asign || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    if (modulesConfig.auditoria && auditoria.length > 0) {
      html += `
        <div style="margin-bottom: 24px;">
          <h3 style="color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 6px; font-size: 16px;">🚨 Bitácora de Eventos Recientes</h3>
          <ul style="padding-left: 20px; font-size: 12px; color: #334155; margin-top: 8px;">
            ${auditoria.map(a => `
              <li style="margin-bottom: 6px;">
                <strong>[${a.aud_tipo}]</strong> ${a.aud_desc} <span style="color: #94a3b8; font-size: 11px;">(${new Date(a.aud_fech).toLocaleTimeString('es-VE')})</span>
              </li>
            `).join('')}
          </ul>
        </div>
      `;
    }

    html += `
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; text-align: center; color: #94a3b8; margin: 0;">
            Este reporte automático fue generado por el sistema <strong>SIAT-TEA</strong>.<br />
            Fundación Autismo Atiende · Plataforma de Gestión Clínica.
          </p>
        </div>
      </div>
    `;

    return html;
  }

  async enviarReporteAhora(payload) {
    const { email, additionalEmails, subject, modules } = payload;

    const mainEmail = email || 'admin@funauta.org';
    const targets = [mainEmail];
    if (additionalEmails) {
      additionalEmails.split(',').forEach(e => {
        const clean = e.trim();
        if (clean && clean.includes('@')) targets.push(clean);
      });
    }

    const htmlContent = await this.compileReporteHtml(modules || { metricas: true, pacientes: true, especialistas: true, auditoria: true }, subject);

    for (const target of targets) {
      await emailService.sendEmail({
        to: target,
        subject: subject || 'Reporte Ejecutivo de Gestión — SIAT',
        html: htmlContent
      });
    }

    return { sentTo: targets };
  }

module.exports = new AdminService();
