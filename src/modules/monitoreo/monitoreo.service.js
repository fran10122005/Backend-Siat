const prisma = require('../../config/db');
const emailService = require('../../services/email.service');
const { generateId } = require('../../utils/idGenerator');

class MonitoreoService {
  constructor() {
    this.simulatedCrisisMode = false;
  }

  async getSimulatedCrisisMode() {
    return this.simulatedCrisisMode;
  }

  async setSimulatedCrisisMode(val) {
    this.simulatedCrisisMode = val;
  }

  async getActiveSessionAndConfig() {
    // Encontrar la última sesión activa (que no esté cerrada)
    let sesion = await prisma.tr_sesio.findFirst({
      where: { ses_cerr: null },
      orderBy: { ses_inic: 'desc' },
      include: { 
        tm_ninos: { 
          include: { tm_repre_ninos: { include: { tm_repre: true } } } 
        } 
      }
    });
    
    // Si no hay sesión activa, tomamos la última creada
    if (!sesion) {
      sesion = await prisma.tr_sesio.findFirst({
        orderBy: { ses_inic: 'desc' },
        include: { 
          tm_ninos: { 
            include: { tm_repre_ninos: { include: { tm_repre: true } } } 
          } 
        }
      });
    }
    
    if (!sesion) return null;
    
    // Encontrar la configuración del dispositivo
    const config = await prisma.tc_confi.findFirst({
      where: { dis_codi: sesion.dis_codi }
    });
    
    return { sesion, config };
  }

  async forzarCrisisInmediata(io) {
    const activeInfo = await this.getActiveSessionAndConfig();
    if (!activeInfo) {
      console.warn('⚠️ No active session found to force simulation telemetry');
      return null;
    }
    const { sesion, config } = activeInfo;
    const bpm = Math.floor(Math.random() * (132 - 120 + 1) + 120);
    const mov = Number((Math.random() * (1.5 - 0.4) + 0.4).toFixed(1));
    const stress = Math.max(88, Math.round(((bpm - 65) / 45) * 100 * (1 - mov * 0.4)));
    
    return await this.procesarTelemetria({
      ses_codi: sesion.ses_codi,
      con_codi: config.con_codi,
      tel_regi: bpm,
      tel_marc: 999,
      tel_calid: 99.9,
      tel_mov: mov,
      tel_stress: stress,
      is_alert: true,
      ins_codi: 'I001',
      ale_meto: 'SOBRECARGA_SENSORIAL'
    }, io);
  }

  async forzarCalmaInmediata(io) {
    const activeInfo = await this.getActiveSessionAndConfig();
    if (!activeInfo) {
      console.warn('⚠️ No active session found to force simulation telemetry');
      return null;
    }
    const { sesion, config } = activeInfo;
    const bpm = Math.floor(Math.random() * (82 - 70 + 1) + 70);
    const mov = Number((Math.random() * (2.8 - 0.8) + 0.8).toFixed(1));
    const stress = Math.round(((bpm - 65) / 45) * 100 * (1 - mov * 0.4));
    
    return await this.procesarTelemetria({
      ses_codi: sesion.ses_codi,
      con_codi: config.con_codi,
      tel_regi: bpm,
      tel_marc: 999,
      tel_calid: 99.9,
      tel_mov: mov,
      tel_stress: stress,
      is_alert: false,
      ins_codi: 'I001'
    }, io);
  }

  async procesarTelemetria(data, io) {
    const sesion = await prisma.tr_sesio.findUnique({
      where: { ses_codi: data.ses_codi },
      include: { 
        tm_ninos: { 
          include: { tm_repre_ninos: { include: { tm_repre: true } } } 
        } 
      }
    });

    if (!sesion) throw new Error('Sesión no encontrada');

    const config = await prisma.tc_confi.findUnique({ where: { con_codi: data.con_codi } });
    if (!config) throw new Error('Configuración no encontrada');

    let bpm = data.tel_regi;
    let mov = data.tel_mov || 1.0;
    let stress = data.tel_stress || 15;
    let is_alert = data.is_alert;
    let ale_meto = data.ale_meto;

    if (this.simulatedCrisisMode) {
      bpm = Math.floor(Math.random() * (132 - 120 + 1) + 120);
      mov = Number((Math.random() * (1.5 - 0.4) + 0.4).toFixed(1));
      stress = Math.max(88, Math.round(((bpm - 65) / 45) * 100 * (1 - mov * 0.4)));
      is_alert = true;
      ale_meto = 'SOBRECARGA_SENSORIAL';
    }

    // Detección automática de sobrepaso de umbral configurado (tc_umbra) para este sensor
    if (!is_alert && config.sen_codi) {
      const umbral = await prisma.tc_umbra.findFirst({
        where: { nin_codi: sesion.tm_ninos.nin_codi, sen_codi: config.sen_codi },
        orderBy: { umb_ajus: 'desc' }
      });
      if (umbral && (bpm > umbral.umb_lims || bpm < umbral.umb_limi)) {
        is_alert = true;
        ale_meto = 'UMBRAL_SUPERADO';
      }
    }

    const telemetria = await prisma.tr_telem.create({
      data: {
        tel_codi: generateId('T'),
        ses_codi: data.ses_codi,
        con_codi: data.con_codi,
        tel_regi: bpm,
        tel_marc: data.tel_marc,
        tel_calid: data.tel_calid
      }
    });

    // Emitir telemetría continua para graficar en vivo
    if (io) {
      const time = new Intl.DateTimeFormat('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date());
      io.to(`child:${sesion.tm_ninos.nin_codi}`).emit('new_telemetry', {
        ses_codi: data.ses_codi,
        con_codi: data.con_codi,
        bpm: bpm,
        mov: mov,
        stress: stress,
        time: time
      });
    }

    let alerta = null;
    if (is_alert && data.ins_codi) {
      alerta = await prisma.tr_alert.create({
        data: {
          ale_codi: generateId('AL'),
          ses_codi: data.ses_codi,
          ins_codi: data.ins_codi,
          ale_time: new Date(),
          ale_meto: ale_meto || 'UMBRAL_SUPERADO'
        }
      });

      // Emitir Socket.io
      if (io) {
        io.to(`child:${sesion.tm_ninos.nin_codi}`).emit('new_alert', {
          id_alert: alerta.ale_codi,
          fec_hora: alerta.ale_time,
          metodo: alerta.ale_meto,
          est_dete: alerta.ale_meto,
          nino: sesion.tm_ninos.nin_nomb,
          niño: sesion.tm_ninos.nin_nomb,
          bpm_max: bpm,
          mov_max: mov,
          stress_index: stress
        });
      }

      // Enviar correo real al representante con los datos EmailJS configurados.
      // Si EmailJS no está configurado, se omite con aviso en vez de fallar la telemetría.
      if (emailService.isConfigured()) {
        try {
          const representante = sesion.tm_ninos.tm_repre_ninos[0]?.tm_repre;
          if (representante && representante.usu_codi) {
            const userRep = await prisma.tm_usuar.findUnique({ where: { usu_codi: representante.usu_codi } });
            if (userRep && userRep.usu_crro) {
              const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
              await emailService.sendEmail({
                to: userRep.usu_crro,
                subject: `Alerta SIAT - ${sesion.tm_ninos.nin_nomb}`,
                templateName: 'alert-notification',
                context: {
                  nombre_padre: `${representante.rep_nomb} ${representante.rep_apel}`,
                  nombre_nino: sesion.tm_ninos.nin_nomb,
                  tipo_alerta: alerta.ale_meto,
                  fecha_hora: new Date().toLocaleString('es-ES'),
                  loginUrl: `${frontendUrl}/login`
                }
              });
            }
          }
        } catch (emailErr) {
          console.error('Error al enviar correo de alerta:', emailErr.message);
        }
      }
    }

    return { telemetria, alerta };
  }
}

module.exports = new MonitoreoService();
