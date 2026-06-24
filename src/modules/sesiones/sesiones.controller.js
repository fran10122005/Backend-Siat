const sesionesService = require('./sesiones.service');
const catchAsync = require('../../utils/catchAsync');

const iniciarSesion = catchAsync(async (req, res) => {
  const result = await sesionesService.iniciarSesion(req.body);
  res.status(201).json({ message: 'Sesión iniciada exitosamente', data: result });
});

const cerrarSesion = catchAsync(async (req, res) => {
  const { ses_codi } = req.params;
  const { ses_nota } = req.body;
  const result = await sesionesService.cerrarSesion(ses_codi, ses_nota);
  res.status(200).json({ message: 'Sesión cerrada exitosamente', data: result });
});

const listarSesionesNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const result = await sesionesService.obtenerSesionesPorNino(nin_codi);
  res.status(200).json({ data: result });
});

const obtenerActividades = catchAsync(async (req, res) => {
  const { nin_codi } = req.query;
  const result = await sesionesService.listarActividades(nin_codi);
  res.status(200).json({ data: result });
});

const crearActividad = catchAsync(async (req, res) => {
  const result = await sesionesService.crearActividad(req.body);
  res.status(201).json({ message: 'Actividad creada exitosamente', data: result });
});

module.exports = { 
  iniciarSesion, 
  cerrarSesion, 
  listarSesionesNino,
  obtenerActividades,
  crearActividad
};

