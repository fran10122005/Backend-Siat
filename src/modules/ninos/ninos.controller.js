const ninosService = require('./ninos.service');
const catchAsync = require('../../utils/catchAsync');

const crearNino = catchAsync(async (req, res) => {
  const { usu_codi } = req.user;
  const result = await ninosService.crearNinoParaRepresentante(usu_codi, req.body);
  res.status(201).json({ message: 'Niño registrado exitosamente', data: result });
});

const misNinos = catchAsync(async (req, res) => {
  const { usu_codi, rol_codi } = req.user;
  const result = await ninosService.getMisNinos(usu_codi, rol_codi);
  res.status(200).json({ data: result });
});

const configurarUmbrales = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const result = await ninosService.setUmbral(nin_codi, req.body);
  res.status(201).json({ message: 'Umbral configurado', data: result });
});

const inviteRepresentative = catchAsync(async (req, res) => {
  const especCodi = req.user.usu_codi;
  const result = await ninosService.inviteRepresentative(especCodi, req.body);
  res.status(201).json({ message: 'Invitación de representante creada exitosamente', data: result });
});

const obtenerExpedienteRepresentante = catchAsync(async (req, res) => {
  const { usu_codi } = req.user;
  const result = await ninosService.getMiExpediente(usu_codi);
  res.status(200).json({ data: result });
});

const obtenerBitacoras = catchAsync(async (req, res) => {
  const { usu_codi } = req.user;
  const result = await ninosService.getBitacoras(usu_codi);
  res.status(200).json({ data: result });
});

const obtenerBitacorasPorNino = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const result = await ninosService.getBitacorasByNino(nin_codi);
  res.status(200).json({ data: result });
});

const registrarBitacora = catchAsync(async (req, res) => {
  const { usu_codi } = req.user;
  const result = await ninosService.crearBitacora(usu_codi, req.body);
  res.status(201).json({ message: 'Bitácora registrada exitosamente', data: result });
});

const obtenerFichaClinica = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const result = await ninosService.getFichaClinica(nin_codi);
  res.status(200).json({ data: result });
});

const actualizarFichaClinica = catchAsync(async (req, res) => {
  const { nin_codi } = req.params;
  const result = await ninosService.updateFichaClinica(nin_codi, req.body);
  res.status(200).json({ message: 'Ficha clínica actualizada exitosamente', data: result });
});

module.exports = { 
  crearNino, 
  misNinos, 
  configurarUmbrales, 
  inviteRepresentative,
  obtenerExpedienteRepresentante,
  obtenerBitacoras,
  obtenerBitacorasPorNino,
  registrarBitacora,
  obtenerFichaClinica,
  actualizarFichaClinica
};

