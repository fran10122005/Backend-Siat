const catchAsync = require('../../utils/catchAsync');
const prisma = require('../../config/db');
const crypto = require('crypto');

const solicitarCita = catchAsync(async (req, res) => {
  const { nin_codi, esp_codi, cit_fech, cit_hora, cit_tipo, cit_nota } = req.body;
  
  const repre = await prisma.tm_repre.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  if (!esp_codi) {
    return res.status(400).json({ error: 'Debe seleccionar un especialista para la cita.' });
  }

  // Verificar que la asignación exista
  const asignacion = await prisma.tc_asign.findFirst({
    where: { 
      nin_codi: nin_codi || repre.nin_codi, 
      esp_codi: esp_codi
    }
  });

  if (!asignacion) {
    return res.status(400).json({ error: 'El especialista seleccionado no está asignado a su niño.' });
  }

  const cit_codi = 'C' + crypto.randomBytes(4).toString('hex').toUpperCase();

  const cita = await prisma.tr_citas.create({
    data: {
      cit_codi,
      nin_codi: nin_codi || repre.nin_codi,
      esp_codi: esp_codi,
      cit_fech: new Date(cit_fech),
      cit_hora: cit_hora,
      cit_tipo: cit_tipo || 'Consulta Regular',
      cit_estd: 'Pendiente',
      cit_nota: cit_nota || null
    }
  });

  res.status(201).json({ status: 'ok', data: cita });
});

const obtenerAgendaHoy = catchAsync(async (req, res) => {
  const espec = await prisma.tm_espec.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!espec) {
    return res.status(404).json({ error: 'Especialista no encontrado' });
  }

  // Traer todas las citas pendientes o confirmadas o de hoy
  // Para la demo, traemos todas las citas de este especialista
  const citas = await prisma.tr_citas.findMany({
    where: {
      esp_codi: espec.esp_codi
    },
    include: {
      tm_ninos: true
    },
    orderBy: [
      { cit_fech: 'asc' },
      { cit_hora: 'asc' }
    ]
  });

  const agenda = citas.map(c => ({
    id: c.cit_codi,
    childId: c.nin_codi,
    paciente: `${c.tm_ninos.nin_nomb} ${c.tm_ninos.nin_apel}`,
    hora: c.cit_hora,
    tipo: c.cit_tipo,
    estado: c.cit_estd
  }));

  res.status(200).json({ status: 'ok', data: agenda });
});

const cambiarEstadoCita = catchAsync(async (req, res) => {
  const { cit_codi } = req.params;
  const { estado } = req.body;

  const cita = await prisma.tr_citas.update({
    where: { cit_codi },
    data: { cit_estd: estado }
  });

  res.status(200).json({ status: 'ok', data: cita });
});

const obtenerEspecialistasAsignados = catchAsync(async (req, res) => {
  const repre = await prisma.tm_repre.findUnique({
    where: { usu_codi: req.user.usu_codi }
  });

  if (!repre) {
    return res.status(404).json({ error: 'Representante no encontrado' });
  }

  const asignaciones = await prisma.tc_asign.findMany({
    where: {
      nin_codi: repre.nin_codi
    },
    include: {
      tm_espec: true
    }
  });

  const especialistas = asignaciones.map(a => ({
    esp_codi: a.tm_espec.esp_codi,
    nombre: `${a.tm_espec.esp_nomb} ${a.tm_espec.esp_apel}`,
    licencia: a.tm_espec.esp_licencia
  }));

  res.status(200).json({ status: 'ok', data: especialistas });
});

module.exports = {
  solicitarCita,
  obtenerAgendaHoy,
  cambiarEstadoCita,
  obtenerEspecialistasAsignados
};
