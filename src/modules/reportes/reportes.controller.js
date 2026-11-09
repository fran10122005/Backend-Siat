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
    where: { usu_codi: req.user.usu_codi },
    include: { tm_repre_ninos: true }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  const ninos = repre.tm_repre_ninos.map(rn => rn.nin_codi);
  if (ninos.length === 0) {
    return res.status(200).json({ status: 'ok', data: [] });
  }

  // 2. Obtener alertas de las sesiones de sus niños
  const alertas = await prisma.tr_alert.findMany({
    where: {
      tr_sesio: {
        nin_codi: { in: ninos }
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
    nin_codi: alerta.tr_sesio.nin_codi || alerta.tr_sesio.tm_ninos?.nin_codi || null,
    nin_nomb: alerta.tr_sesio.tm_ninos.nin_nomb
  }));

  res.status(200).json({ status: 'ok', data });
});

const obtenerNotificacionesRepresentante = catchAsync(async (req, res) => {
  if (req.user?.rol_codi && req.user.rol_codi !== 'ROL_REP') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Representante.' });
  }

  const repre = await prisma.tm_repre.findUnique({
    where: { usu_codi: req.user.usu_codi },
    include: {
      tm_repre_ninos: {
        include: {
          tm_ninos: { select: { nin_codi: true, nin_nomb: true, nin_apel: true } }
        }
      }
    }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  const ninoIds = (repre.tm_repre_ninos || []).map((rn) => rn.nin_codi);
  if (ninoIds.length === 0) {
    return res.status(200).json({ status: 'ok', data: [] });
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const todayKey = startOfToday.toISOString().slice(0, 10);

  const [alertas, indicaciones, pref, asignacionesRutina, sesionesHoy] = await Promise.all([
    prisma.tr_alert.findMany({
      where: { tr_sesio: { nin_codi: { in: ninoIds } } },
      include: {
        tr_sesio: {
          select: {
            nin_codi: true,
            tm_ninos: { select: { nin_codi: true, nin_nomb: true } }
          }
        }
      },
      orderBy: { ale_time: 'desc' },
      take: 15
    }),
    prisma.tr_indic.findMany({
      where: { nin_codi: { in: ninoIds }, ind_leid: false },
      include: {
        tm_ninos: { select: { nin_codi: true, nin_nomb: true } },
        tm_espec: { select: { esp_nomb: true, esp_apel: true } }
      },
      orderBy: { ind_crea: 'desc' },
      take: 15
    }),
    prisma.tm_pref_notif.findUnique({
      where: { pnf_usuario: req.user.usu_codi }
    }),
    prisma.tc_activ_ninos.findMany({
      where: {
        nin_codi: { in: ninoIds },
        acn_estd: 'Activa',
        tm_activ: { act_estd: 'Activa', act_visib: 'AMBOS' }
      },
      include: {
        tm_activ: { select: { act_codi: true, act_trea: true } },
        tm_ninos: { select: { nin_codi: true, nin_nomb: true } }
      },
      take: 30
    }),
    prisma.tr_sesio.findMany({
      where: {
        nin_codi: { in: ninoIds },
        ses_inic: { gte: startOfToday, lte: endOfToday }
      },
      select: { nin_codi: true, act_codi: true }
    })
  ]);

  const items = [];

  (alertas || []).forEach((alerta) => {
    const ninNomb = alerta.tr_sesio?.tm_ninos?.nin_nomb || 'Tu niño';
    const ninCodi = alerta.tr_sesio?.nin_codi || alerta.tr_sesio?.tm_ninos?.nin_codi || null;
    items.push({
      id: alerta.ale_codi,
      ale_codi: alerta.ale_codi,
      type: 'crisis',
      nin_codi: ninCodi,
      nin_nomb: ninNomb,
      message: `🚨 Alerta de sobrecarga (${alerta.ale_meto || 'SOBRECARGA'}) en ${ninNomb}`,
      time: alerta.ale_time
    });
  });

  (indicaciones || []).forEach((ind) => {
    const ninNomb = ind.tm_ninos?.nin_nomb || 'Tu niño';
    const docNomb = ind.tm_espec
      ? `${ind.tm_espec.esp_nomb} ${ind.tm_espec.esp_apel}`.trim()
      : 'Especialista';
    items.push({
      id: `ind_${ind.ind_codi}`,
      ind_codi: ind.ind_codi,
      type: 'indication',
      nin_codi: ind.nin_codi,
      nin_nomb: ninNomb,
      message: `📋 Indicación sin leer (${docNomb}) para ${ninNomb}: ${ind.ind_desc}`,
      time: ind.ind_crea
    });
  });

  const recordatoriosActivos = pref ? pref.recordatorios_sesiones !== false : true;
  if (recordatoriosActivos && Array.isArray(asignacionesRutina) && asignacionesRutina.length > 0) {
    const completedSet = new Set((sesionesHoy || []).map((s) => `${s.nin_codi}:${s.act_codi}`));
    asignacionesRutina.forEach((asig) => {
      if (!completedSet.has(`${asig.nin_codi}:${asig.act_codi}`)) {
        const ninNomb = asig.tm_ninos?.nin_nomb || 'Tu niño';
        const actTrea = asig.tm_activ?.act_trea || 'Rutina terapéutica';
        items.push({
          id: `routine_${asig.acn_codi}_${todayKey}`,
          acn_codi: asig.acn_codi,
          type: 'routine_reminder',
          nin_codi: asig.nin_codi,
          nin_nomb: ninNomb,
          message: `⏰ Rutina pendiente hoy para ${ninNomb}: ${actTrea}`,
          time: startOfToday
        });
      }
    });
  }

  items.sort((a, b) => new Date(b.time) - new Date(a.time));
  res.status(200).json({ status: 'ok', data: items.slice(0, 25) });
});

const obtenerEvolucionRepresentante = catchAsync(async (req, res) => {
  const repre = await prisma.tm_repre.findUnique({
    where: { usu_codi: req.user.usu_codi },
    include: { tm_repre_ninos: true }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  const ninos = repre.tm_repre_ninos.map(rn => rn.nin_codi);

  // Definir rangos del día de hoy
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  // Buscar las sesiones de hoy con su telemetría
  const sesiones = await prisma.tr_sesio.findMany({
    where: {
      nin_codi: { in: ninos },
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
  const { getPagination } = require('../../utils/pagination');
  const { skip, limit, formatMeta } = getPagination(req.query, 50, 100);

  const [reportes, sesiones, bitacoras, indicaciones, totalSesiones] = await Promise.all([
    prisma.tr_repor.findMany({
      where: { rpt_nin: nin_codi },
      include: {
        tm_espec: true
      },
      orderBy: { rpt_inpe: 'desc' }
    }),
    prisma.tr_sesio.findMany({
      where: { nin_codi },
      skip,
      take: limit,
      include: {
        tm_activ: true,
        tr_alert: {
          include: {
            tr_feedb: true
          }
        }
      },
      orderBy: { ses_inic: 'desc' }
    }),
    prisma.tr_bitac.findMany({
      where: { nin_codi },
      skip,
      take: limit,
      orderBy: { bit_fech: 'desc' }
    }),
    prisma.tr_indic.findMany({
      where: { nin_codi },
      include: {
        tm_espec: {
          select: {
            esp_nomb: true,
            esp_apel: true,
            tm_especi: {
              select: {
                esc_nomb: true
              }
            }
          }
        }
      },
      orderBy: { ind_crea: 'desc' }
    }),
    prisma.tr_sesio.count({ where: { nin_codi } })
  ]);

  // Mapear indicaciones clínicas de tr_indic al formato de reportes para máxima retrocompatibilidad
  const mappedIndicaciones = indicaciones.map((ind) => ({
    rpt_cod: ind.ind_codi,
    rpt_nin: ind.nin_codi,
    rpt_esp: ind.esp_codi,
    rpt_inpe: ind.ind_crea,
    rpt_finp: ind.ind_vige || ind.ind_crea,
    rpt_sesi: 0,
    rpt_meta: 100,
    rpt_nota: `[${ind.ind_tipo} - ${ind.ind_area}] ${ind.ind_desc}`,
    rpt_nube: !ind.ind_leid,
    tm_espec: {
      esp_nomb: ind.tm_espec?.esp_nomb || '',
      esp_apel: ind.tm_espec?.esp_apel || '',
      esp_espe: ind.tm_espec?.tm_especi?.esc_nomb || ind.ind_area || 'General'
    }
  }));

  const allReportes = [...reportes, ...mappedIndicaciones].sort(
    (a, b) => new Date(b.rpt_inpe) - new Date(a.rpt_inpe)
  );

  const pagedReportes = allReportes.slice(skip, skip + limit);
  const pagedIndicaciones = indicaciones.slice(skip, skip + limit);

  res.status(200).json({
    data: {
      reportes: pagedReportes,
      indicaciones: pagedIndicaciones,
      sesiones,
      bitacoras
    },
    pagination: formatMeta(Math.max(totalSesiones, allReportes.length))
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
  obtenerNotificacionesRepresentante,
  obtenerEvolucionRepresentante,
  getHistorialCompleto,
  registrarFeedbackAlerta,
  crearIndicacionMedica
};

