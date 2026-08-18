const sesionesService = require('./sesiones.service');
const catchAsync = require('../../utils/catchAsync');

const { ESTADOS } = sesionesService;

// ========================== SESIONES ==========================

const iniciarSesion = catchAsync(async (req, res) => {
  const result = await sesionesService.iniciarSesion(req.validatedBody);
  res.status(201).json({ message: 'Sesión iniciada exitosamente', data: result });
});

const cerrarSesion = catchAsync(async (req, res) => {
  const { ses_codi } = req.validatedParams;
  const { ses_nota } = req.validatedBody;
  const result = await sesionesService.cerrarSesion(ses_codi, ses_nota);
  res.status(200).json({ message: 'Sesión cerrada exitosamente', data: result });
});

const listarSesionesNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.validatedParams;
  const { estado } = req.validatedQuery;
  const result = await sesionesService.obtenerSesionesPorNino(nin_codi, { estado });
  res.status(200).json({ data: result });
});

// ========================== ACTIVIDADES ==========================

const listarActividades = catchAsync(async (req, res) => {
  const result = await sesionesService.listarActividades(req.validatedQuery);
  res.status(200).json({ data: result });
});

const obtenerActividad = catchAsync(async (req, res) => {
  const { act_codi } = req.validatedParams;
  const result = await sesionesService.obtenerActividad(act_codi);
  res.status(200).json({ data: result });
});

const crearActividad = catchAsync(async (req, res) => {
  const result = await sesionesService.crearActividad(req.validatedBody);
  res.status(201).json({ message: 'Actividad creada exitosamente', data: result });
});

const actualizarActividad = catchAsync(async (req, res) => {
  const { act_codi } = req.validatedParams;
  const result = await sesionesService.actualizarActividad(act_codi, req.validatedBody);
  res.status(200).json({ message: 'Actividad actualizada exitosamente', data: result });
});

const eliminarActividad = catchAsync(async (req, res) => {
  const { act_codi } = req.validatedParams;
  const result = await sesionesService.eliminarActividad(act_codi);
  res.status(200).json({ message: 'Actividad eliminada', data: result });
});

// ========================== CATEGORÍAS ==========================

const listarCategorias = catchAsync(async (req, res) => {
  const result = await sesionesService.listarCategorias(req.validatedQuery);
  res.status(200).json({ data: result });
});

const crearCategoria = catchAsync(async (req, res) => {
  const result = await sesionesService.crearCategoria(req.validatedBody);
  res.status(201).json({ message: 'Categoría creada exitosamente', data: result });
});

const actualizarCategoria = catchAsync(async (req, res) => {
  const { cat_codi } = req.validatedParams;
  const result = await sesionesService.actualizarCategoria(cat_codi, req.validatedBody);
  res.status(200).json({ message: 'Categoría actualizada exitosamente', data: result });
});

const eliminarCategoria = catchAsync(async (req, res) => {
  const { cat_codi } = req.validatedParams;
  const result = await sesionesService.eliminarCategoria(cat_codi);
  res.status(200).json({ message: 'Categoría eliminada', data: result });
});

// ========================== ASIGNACIÓN DE ACTIVIDADES ==========================

const asignarActividad = catchAsync(async (req, res) => {
  const { act_codi, nin_codi } = req.validatedParams;
  const result = await sesionesService.asignarActividad(act_codi, nin_codi, req.validatedBody);
  res.status(201).json({ message: 'Actividad asignada al niño exitosamente', data: result });
});

const listarAsignacionesNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.validatedParams;
  const { estado } = req.validatedQuery;
  const result = await sesionesService.listarAsignacionesDeNino(nin_codi, { estado });
  res.status(200).json({ data: result });
});

const cambiarEstadoAsignacion = catchAsync(async (req, res) => {
  const { acn_codi } = req.validatedParams;
  const { acn_estd } = req.validatedBody;
  const result = await sesionesService.cambiarEstadoAsignacion(acn_codi, acn_estd);
  res.status(200).json({ message: 'Estado de asignación actualizado', data: result });
});

const desasignarActividad = catchAsync(async (req, res) => {
  const { acn_codi } = req.validatedParams;
  const result = await sesionesService.desasignarActividad(acn_codi);
  res.status(200).json({ message: 'Asignación eliminada', data: result });
});

module.exports = {
  iniciarSesion,
  cerrarSesion,
  listarSesionesNino,
  listarActividades,
  obtenerActividad,
  crearActividad,
  actualizarActividad,
  eliminarActividad,
  listarCategorias,
  crearCategoria,
  actualizarCategoria,
  eliminarCategoria,
  asignarActividad,
  listarAsignacionesNino,
  cambiarEstadoAsignacion,
  desasignarActividad,
  ESTADOS,
};