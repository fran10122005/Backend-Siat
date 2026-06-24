const catchAsync = require('../../utils/catchAsync');
const prisma = require('../../config/db');
const crypto = require('crypto');

// Obtener todas las metas PEI de un niño
const getMetasNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;

  const metas = await prisma.tr_metaspei.findMany({
    where: { nin_codi },
    orderBy: { met_crea: 'desc' }
  });

  res.status(200).json({ status: 'ok', data: metas });
});

// Crear una nueva meta PEI
const crearMeta = catchAsync(async (req, res) => {
  const { nin_codi, met_desc, met_ttria } = req.body;

  // Obtener al especialista autenticado
  const especialista = await prisma.tm_espec.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!especialista) {
    return res.status(403).json({ error: 'Solo los especialistas pueden asignar metas PEI.' });
  }

  const met_codi = 'PEI_' + crypto.randomBytes(3).toString('hex').toUpperCase();

  const nuevaMeta = await prisma.tr_metaspei.create({
    data: {
      met_codi: met_codi.substring(0, 10),
      nin_codi,
      esp_codi: especialista.esp_codi,
      met_desc,
      met_ttria: parseInt(met_ttria) || 20,
      met_trial: 0,
      met_prog: 0,
      met_estd: 'EN PROGRESO'
    }
  });

  res.status(201).json({ status: 'success', data: nuevaMeta });
});

// Registrar un ensayo (trial) y actualizar progreso
const registrarEnsayo = catchAsync(async (req, res) => {
  const { met_codi } = req.params;

  const meta = await prisma.tr_metaspei.findUnique({
    where: { met_codi }
  });

  if (!meta) {
    return res.status(404).json({ error: 'Meta PEI no encontrada.' });
  }

  // Incrementar ensayos
  const nuevosEnsayos = meta.met_trial + 1;
  // Calcular progreso (asegurar que no pase de 100%)
  const progreso = Math.min(100, Math.round((nuevosEnsayos / meta.met_ttria) * 100));
  
  // Si llega al 100%, cambiar estado a LOGRADO
  const estado = progreso >= 100 ? 'LOGRADO' : 'EN PROGRESO';

  const metaActualizada = await prisma.tr_metaspei.update({
    where: { met_codi },
    data: {
      met_trial: nuevosEnsayos,
      met_prog: progreso,
      met_estd: estado
    }
  });

  res.status(200).json({ status: 'success', data: metaActualizada });
});

module.exports = {
  getMetasNino,
  crearMeta,
  registrarEnsayo
};
