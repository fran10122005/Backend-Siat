const catchAsync = require('../../utils/catchAsync');
const prisma = require('../../config/db');

const getHistorialNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  
  // Ejemplo de reporte básico: traer las sesiones con sus alertas y actividades
  const historial = await prisma.tr_sesio.findMany({
    where: { nin_codi },
    include: {
      tr_alert: true,
      tr_estad: true,
      tm_activ: true
    },
    orderBy: { ses_inic: 'desc' }
  });

  res.status(200).json({ data: historial });
});

const obtenerAlertasRepresentante = catchAsync(async (req, res) => {
  // 1. Obtener al representante autenticado
  const repre = await prisma.tm_repre.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  // 2. Obtener alertas de las sesiones de su niño
  const alertas = await prisma.tr_alert.findMany({
    where: {
      tr_sesio: {
        nin_codi: repre.nin_codi
      }
    },
    include: {
      tr_sesio: {
        include: {
          tm_ninos: true
        }
      }
    },
    orderBy: { ale_time: 'desc' },
    take: 15
  });

  // Formatear alertas para responder al frontend
  const data = alertas.map(alerta => ({
    ale_codi: alerta.ale_codi,
    ale_time: alerta.ale_time,
    ale_meto: alerta.ale_meto,
    nin_nomb: alerta.tr_sesio.tm_ninos.nin_nomb
  }));

  res.status(200).json({ status: 'ok', data });
});

const obtenerEvolucionRepresentante = catchAsync(async (req, res) => {
  const repre = await prisma.tm_repre.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  // Definir rangos del día de hoy
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Buscar las sesiones de hoy con su telemetría
  const sesiones = await prisma.tr_sesio.findMany({
    where: {
      nin_codi: repre.nin_codi,
      ses_inic: {
        gte: startOfDay,
        lte: endOfDay
      }
    },
    include: {
      tr_telem: true
    }
  });

  // Estructura de bins horarios
  const bins = {
    '08:00': [],
    '10:00': [],
    '12:00': [],
    '14:00': [],
    '16:00': [],
    '18:00': [],
    '20:00': [],
    '22:00': []
  };

  // Clasificar cada punto de telemetría en el bin horario correspondiente
  sesiones.forEach(sesion => {
    sesion.tr_telem.forEach(telemetria => {
      // Estimar fecha del punto de telemetría multiplicando marcas (cada 10s)
      const timestamp = new Date(sesion.ses_inic.getTime() + telemetria.tel_marc * 10 * 1000);
      const hour = timestamp.getHours();

      // Clasificación en los bins establecidos
      if (hour < 9) {
        bins['08:00'].push(telemetria.tel_regi);
      } else if (hour < 11) {
        bins['10:00'].push(telemetria.tel_regi);
      } else if (hour < 13) {
        bins['12:00'].push(telemetria.tel_regi);
      } else if (hour < 15) {
        bins['14:00'].push(telemetria.tel_regi);
      } else if (hour < 17) {
        bins['16:00'].push(telemetria.tel_regi);
      } else if (hour < 19) {
        bins['18:00'].push(telemetria.tel_regi);
      } else if (hour < 21) {
        bins['20:00'].push(telemetria.tel_regi);
      } else {
        bins['22:00'].push(telemetria.tel_regi);
      }
    });
  });

  // Mapear los bins a los resultados
  const data = Object.keys(bins).map(timeStr => {
    const samples = bins[timeStr];
    if (samples.length === 0) {
      // Línea base del día por defecto
      return { time: timeStr, calma: 85, estres: 15 };
    }
    const sum = samples.reduce((acc, val) => acc + val, 0);
    const avgBpm = sum / samples.length;
    
    // Cálculo predictivo de agitación: a mayor pulso, más estrés
    const estres = Math.min(95, Math.max(5, Math.round((avgBpm - 68) * 1.6)));
    const calma = 100 - estres;
    
    return { time: timeStr, calma, estres };
  });

  res.status(200).json({ status: 'ok', data });
});

const getHistorialCompleto = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;

  const reportes = await prisma.tr_repor.findMany({
    where: { rpt_nin: nin_codi },
    include: {
      tm_espec: true
    },
    orderBy: { rpt_inpe: 'desc' }
  });

  const sesiones = await prisma.tr_sesio.findMany({
    where: { nin_codi },
    include: {
      tm_activ: true,
      tr_alert: {
        include: {
          tr_feedb: true
        }
      }
    },
    orderBy: { ses_inic: 'desc' }
  });

  res.status(200).json({
    data: {
      reportes,
      sesiones
    }
  });
});

const registrarFeedbackAlerta = catchAsync(async (req, res) => {
  const { ale_codi } = req.params;
  const { fed_efec, com_padr, fed_resp } = req.body;
  const crypto = require('crypto');

  let feedback = await prisma.tr_feedb.findFirst({
    where: { ale_codi }
  });

  if (feedback) {
    feedback = await prisma.tr_feedb.update({
      where: { fed_codi: feedback.fed_codi },
      data: {
        fed_efec,
        com_padr,
        fed_resp
      }
    });
  } else {
    const fed_codi = 'FB_' + crypto.randomBytes(3).toString('hex').toUpperCase() + Math.floor(Math.random() * 10);
    feedback = await prisma.tr_feedb.create({
      data: {
        fed_codi: fed_codi.substring(0, 10),
        ale_codi,
        fed_efec,
        com_padr,
        fed_resp
      }
    });
  }

  res.status(200).json({ message: 'Feedback registrado exitosamente', data: feedback });
});

const crearIndicacionMedica = catchAsync(async (req, res) => {
  const { nin_codi, com_tend } = req.body;
  const crypto = require('crypto');

  // Obtener al especialista autenticado
  const especialista = await prisma.tm_espec.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!especialista) {
    return res.status(404).json({ error: 'Especialista no encontrado o sin permisos' });
  }

  const rpt_cod = 'RPT_' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const reporte = await prisma.tr_repor.create({
    data: {
      rpt_cod: rpt_cod.substring(0, 10),
      rpt_nin: nin_codi,
      rpt_esp: especialista.esp_codi,
      rpt_inpe: new Date(),
      rpt_finp: new Date(),
      rpt_sesi: 0,
      rpt_meta: 100,
      rpt_nota: com_tend,
      rpt_nube: true
    }
  });

  res.status(201).json({ message: 'Indicación médica registrada exitosamente', data: reporte });
});

module.exports = { 
  getHistorialNino,
  obtenerAlertasRepresentante,
  obtenerEvolucionRepresentante,
  getHistorialCompleto,
  registrarFeedbackAlerta,
  crearIndicacionMedica
};

