const catchAsync = require('../../utils/catchAsync');
const prisma = require('../../config/db');
const crypto = require('crypto');

// Obtener especialista autenticado
const getEspecialista = async (usu_codi) => {
  return prisma.tm_espec.findUnique({ where: { usu_codi } });
};



// ─── INDICACIONES MÉDICAS ─────────────────────────────────────────────────────

const listarIndicaciones = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const indicaciones = await prisma.tr_indic.findMany({
    where: { nin_codi },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } },
    orderBy: { ind_crea: 'desc' }
  });
  res.status(200).json({ status: 'ok', data: indicaciones });
});

const crearIndicacion = catchAsync(async (req, res) => {
  const nin_codi = req.params.nin_codi || req.body.nin_codi || req.body.id_ninos;
  const { ind_tipo, ind_area, ind_frec, ind_dura, ind_prio, ind_vige } = req.body;
  const ind_desc = req.body.ind_desc || req.body.com_tend || req.body.nota || req.body.descripcion;

  const especialista = await getEspecialista(req.user.usu_codi);
  if (!especialista) {
    return res.status(404).json({ error: 'Especialista no encontrado o sin permisos' });
  }
  if (!nin_codi || !ind_desc) {
    return res.status(400).json({ error: 'El código del paciente (nin_codi) y la descripción de la indicación son requeridos' });
  }

  const ind_codi = 'IND_' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const indicacion = await prisma.tr_indic.create({
    data: {
      ind_codi: ind_codi.substring(0, 10),
      nin_codi,
      esp_codi: especialista.esp_codi,
      ind_tipo: ind_tipo || 'Terapéutica',
      ind_area: ind_area || 'General',
      ind_frec: ind_frec || 'Diaria',
      ind_dura: ind_dura || null,
      ind_prio: ind_prio || 'Media',
      ind_vige: ind_vige ? new Date(ind_vige) : null,
      ind_desc
    },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true, esp_espe: true } } }
  });

  // Notificar en tiempo real al representante (best-effort sin romper flujo)
  try {
    if (prisma.tm_repre_ninos?.findMany) {
      const { emitToUser } = require('../../services/socket.service');
      const vinculos = await prisma.tm_repre_ninos.findMany({
        where: { nin_codi },
        include: {
          tm_repre: { select: { usu_codi: true } },
          tm_ninos: { select: { nin_nomb: true } }
        }
      });
      vinculos.forEach((v) => {
        const repUsu = v.tm_repre?.usu_codi;
        if (repUsu) {
          const ninNomb = v.tm_ninos?.nin_nomb || 'tu representado';
          emitToUser(repUsu, 'parent_notification', {
            id: `ind_${indicacion.ind_codi}`,
            ind_codi: indicacion.ind_codi,
            type: 'indication',
            nin_codi,
            nin_nomb: ninNomb,
            message: `📋 Nueva indicación (${indicacion.ind_area || 'Clínica'}) para ${ninNomb}: ${indicacion.ind_desc}`,
            time: indicacion.ind_crea || new Date().toISOString(),
            read: false
          });
        }
      });
    }
  } catch (_) {}

  res.status(201).json({ status: 'success', data: indicacion });
});

// Marcar indicación como leída
const marcarIndicacionLeida = catchAsync(async (req, res) => {
  const { ind_codi } = req.params;
  try {
    const indicacion = await prisma.tr_indic.update({
      where: { ind_codi },
      data: { ind_leid: true }
    });
    res.status(200).json({ status: 'ok', data: indicacion });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Indicación no encontrada' });
    }
    throw err;
  }
});

// ─── INCIDENTES CONDUCTUALES ──────────────────────────────────────────────────

const listarIncidentes = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const { getPagination } = require('../../utils/pagination');
  const { skip, limit, formatMeta } = getPagination(req.query, 50, 100);

  const [incidentes, total] = await Promise.all([
    prisma.tr_incid.findMany({
      where: { nin_codi },
      skip,
      take: limit,
      include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } },
      orderBy: { inc_time: 'desc' }
    }),
    prisma.tr_incid.count({ where: { nin_codi } })
  ]);

  res.status(200).json({ status: 'ok', data: incidentes, pagination: formatMeta(total) });
});

const crearIncidente = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const { inc_tipo, inc_dura, inc_deto, inc_ruti, inc_seve, inc_conse, inc_inter, inc_resu, inc_obse } = req.body;
  const especialista = await getEspecialista(req.user.usu_codi);
  if (!especialista) {
    return res.status(404).json({ error: 'Especialista no encontrado o sin permisos' });
  }
  if (!inc_tipo || !inc_dura || !inc_deto || !inc_seve) {
    return res.status(400).json({ error: 'Tipo, duración, detonante y severidad son requeridos' });
  }

  const inc_codi = 'INC_' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const incidente = await prisma.tr_incid.create({
    data: {
      inc_codi: inc_codi.substring(0, 10),
      nin_codi,
      esp_codi: especialista.esp_codi,
      inc_tipo,
      inc_dura,
      inc_deto,
      inc_ruti: inc_ruti || null,
      inc_seve,
      inc_conse: inc_conse || null,
      inc_inter: inc_inter || null,
      inc_resu: inc_resu || null,
      inc_obse: inc_obse || null
    },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } }
  });

  res.status(201).json({ status: 'success', data: incidente });
});

// ─── ALERTAS / CRISIS DEL PACIENTE (para análisis IoT) ────────────────────────

const listarAlertasNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const { getPagination } = require('../../utils/pagination');
  const { skip, limit, formatMeta } = getPagination(req.query, 50, 100);

  const sesiones = await prisma.tr_sesio.findMany({
    where: { nin_codi },
    include: {
      tr_alert: true,
      tr_telem: true
    },
    orderBy: { ses_inic: 'desc' }
  });

  // Construir alertas con su telemetría asociada
  const alertas = [];
  sesiones.forEach((sesion) => {
    sesion.tr_alert.forEach((alerta) => {
      // Ventana de telemetría cercana a la alerta (antes/después de la alerta)
      const puntos = sesion.tr_telem
        .filter((t) => {
          const ts = new Date(sesion.ses_inic.getTime() + t.tel_marc * 10 * 1000);
          const diff = Math.abs(ts - new Date(alerta.ale_time));
          return diff <= 30 * 60 * 1000; // 30 min alrededor del evento
        })
        .map((t) => ({
          time: new Date(sesion.ses_inic.getTime() + t.tel_marc * 10 * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
          bpm: Math.round(t.tel_regi),
          mov: 0
        }))
        .sort((a, b) => a.time.localeCompare(b.time));

      const bpms = puntos.map((p) => p.bpm);
      const bpm_max = bpms.length ? Math.max(...bpms) : 0;
      const stress = bpms.length ? Math.min(95, Math.max(5, Math.round((bpm_max - 68) * 1.6))) : 0;

      alertas.push({
        id_alert: alerta.ale_codi,
        fec_hora: alerta.ale_time,
        est_dete: alerta.ale_meto || 'SOBRECARGA_SENSORIAL',
        bpm_max,
        mov_max: 0,
        stress_index: stress,
        telemetry: puntos
      });
    });
  });

  alertas.sort((a, b) => new Date(b.fec_hora) - new Date(a.fec_hora));

  const total = alertas.length;
  const pagedAlertas = alertas.slice(skip, skip + limit);

  res.status(200).json({ status: 'ok', data: pagedAlertas, pagination: formatMeta(total) });
});

// ─── NOTIFICACIONES DEL MÓDULO ESPECIALISTA ────────────────────────────────────

const listarNotificaciones = catchAsync(async (req, res) => {
  if (req.user?.rol_codi && req.user.rol_codi !== 'ROL_ESP') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Especialista.' });
  }

  const espec = await prisma.tm_espec.findUnique({
    where: { usu_codi: req.user.usu_codi },
    include: {
      tc_asign: {
        where: { asi_stdo: 'Activo' },
        select: { nin_codi: true }
      }
    }
  });

  if (!espec) {
    return res.status(404).json({ error: 'Especialista no encontrado' });
  }

  const assignedIds = (espec.tc_asign || []).map((a) => a.nin_codi);
  if (assignedIds.length === 0) {
    return res.status(200).json({ status: 'ok', data: [] });
  }

  const hace7Dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const hace72Horas = new Date(Date.now() - 72 * 60 * 60 * 1000);

  const [alertas, bitacorasCriticas, asignacionesRecientes] = await Promise.all([
    prisma.tr_alert.findMany({
      where: {
        ale_time: { gte: hace7Dias },
        tr_sesio: { nin_codi: { in: assignedIds } }
      },
      include: {
        tr_sesio: {
          select: {
            nin_codi: true,
            tm_ninos: { select: { nin_codi: true, nin_nomb: true, nin_apel: true } }
          }
        }
      },
      orderBy: { ale_time: 'desc' },
      take: 15
    }),
    prisma.tr_bitac.findMany({
      where: {
        nin_codi: { in: assignedIds },
        bit_crea: { gte: hace72Horas },
        OR: [
          { bit_crisi: { gt: 0 } },
          { bit_anim: { contains: 'Crisis', mode: 'insensitive' } }
        ]
      },
      include: {
        tm_ninos: { select: { nin_codi: true, nin_nomb: true, nin_apel: true } }
      },
      orderBy: { bit_crea: 'desc' },
      take: 15
    }),
    prisma.tc_asign.findMany({
      where: {
        esp_codi: espec.esp_codi,
        asi_stdo: 'Activo',
        asi_inic: { gte: hace7Dias }
      },
      include: {
        tm_ninos: { select: { nin_codi: true, nin_nomb: true, nin_apel: true } }
      },
      orderBy: { asi_inic: 'desc' },
      take: 10
    })
  ]);

  const items = [];

  (alertas || []).forEach((al) => {
    const ninCodi = al.tr_sesio?.nin_codi || al.tr_sesio?.tm_ninos?.nin_codi || null;
    const ninNomb = al.tr_sesio?.tm_ninos?.nin_nomb || 'Paciente';
    items.push({
      id: al.ale_codi,
      ale_codi: al.ale_codi,
      type: 'crisis',
      nin_codi: ninCodi,
      nin_nomb: ninNomb,
      message: `🚨 Alerta fisiológica (${al.ale_meto || 'SOBRECARGA'}) en ${ninNomb}`,
      time: al.ale_time
    });
  });

  (bitacorasCriticas || []).forEach((b) => {
    const ninNomb = b.tm_ninos?.nin_nomb || 'Paciente';
    items.push({
      id: `home_${b.bit_codi}`,
      bit_codi: b.bit_codi,
      type: 'home_crisis',
      nin_codi: b.nin_codi,
      nin_nomb: ninNomb,
      message: `🏡 Bitácora crítica en el hogar de ${ninNomb} (${b.bit_anim || 'Crisis'}${b.bit_crisi ? ` · ${b.bit_crisi} crisis` : ''})`,
      time: b.bit_crea || b.bit_fech
    });
  });

  (asignacionesRecientes || []).forEach((a) => {
    const ninNomb = a.tm_ninos
      ? `${a.tm_ninos.nin_nomb} ${a.tm_ninos.nin_apel || ''}`.trim()
      : 'Paciente';
    items.push({
      id: `assign_${a.asi_codi}`,
      asi_codi: a.asi_codi,
      type: 'assignment',
      nin_codi: a.nin_codi,
      nin_nomb: a.tm_ninos?.nin_nomb || ninNomb,
      message: `📋 Nuevo paciente asignado: ${ninNomb}`,
      time: a.asi_inic
    });
  });

  items.sort((a, b) => new Date(b.time) - new Date(a.time));

  res.status(200).json({ status: 'ok', data: items.slice(0, 25) });
});


module.exports = {
  listarIndicaciones,
  crearIndicacion,
  marcarIndicacionLeida,
  listarIncidentes,
  crearIncidente,
  listarAlertasNino,
  listarNotificaciones
};
