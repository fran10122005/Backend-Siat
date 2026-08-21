const catchAsync = require('../../utils/catchAsync');
const prisma = require('../../config/db');
const crypto = require('crypto');

// Obtener especialista autenticado
const getEspecialista = async (usu_codi) => {
  return prisma.tm_espec.findUnique({ where: { usu_codi } });
};

// ─── NOTAS SOAP ───────────────────────────────────────────────────────────────

const listarSoap = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const notas = await prisma.tr_soap.findMany({
    where: { nin_codi },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } },
    orderBy: { soap_fech: 'desc' }
  });
  res.status(200).json({ status: 'ok', data: notas });
});

const crearSoap = catchAsync(async (req, res) => {
  const { nin_codi, soap_subj, soap_obje, soap_anal, soap_plan } = req.body;
  const especialista = await getEspecialista(req.user.usu_codi);
  if (!especialista) {
    return res.status(404).json({ error: 'Especialista no encontrado o sin permisos' });
  }
  if (!nin_codi || !soap_subj || !soap_obje || !soap_anal || !soap_plan) {
    return res.status(400).json({ error: 'Todos los campos SOAP (S-O-A-P) son requeridos' });
  }

  const soap_codi = 'SOAP_' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const nota = await prisma.tr_soap.create({
    data: {
      soap_codi: soap_codi.substring(0, 10),
      nin_codi,
      esp_codi: especialista.esp_codi,
      soap_subj,
      soap_obje,
      soap_anal,
      soap_plan
    },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } }
  });

  res.status(201).json({ status: 'success', data: nota });
});

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
  const { nin_codi, ind_tipo, ind_area, ind_frec, ind_dura, ind_prio, ind_vige, ind_desc } = req.body;
  const especialista = await getEspecialista(req.user.usu_codi);
  if (!especialista) {
    return res.status(404).json({ error: 'Especialista no encontrado o sin permisos' });
  }
  if (!nin_codi || !ind_tipo || !ind_area || !ind_frec || !ind_prio || !ind_desc) {
    return res.status(400).json({ error: 'Tipo, área, frecuencia, prioridad y descripción son requeridos' });
  }

  const ind_codi = 'IND_' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const indicacion = await prisma.tr_indic.create({
    data: {
      ind_codi: ind_codi.substring(0, 10),
      nin_codi,
      esp_codi: especialista.esp_codi,
      ind_tipo,
      ind_area,
      ind_frec,
      ind_dura: ind_dura || null,
      ind_prio,
      ind_vige: ind_vige ? new Date(ind_vige) : null,
      ind_desc
    },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } }
  });

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
  const incidentes = await prisma.tr_incid.findMany({
    where: { nin_codi },
    include: { tm_espec: { select: { esp_nomb: true, esp_apel: true } } },
    orderBy: { inc_time: 'desc' }
  });
  res.status(200).json({ status: 'ok', data: incidentes });
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

  res.status(200).json({ status: 'ok', data: alertas });
});

module.exports = {
  listarSoap,
  crearSoap,
  listarIndicaciones,
  crearIndicacion,
  marcarIndicacionLeida,
  listarIncidentes,
  crearIncidente,
  listarAlertasNino
};
