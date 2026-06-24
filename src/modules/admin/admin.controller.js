const adminService = require('./admin.service');
const catchAsync = require('../../utils/catchAsync');

const listNinos = catchAsync(async (req, res) => {
  const ninos = await adminService.listNinos();
  res.status(200).json({ data: ninos });
});

const listEspecialistas = catchAsync(async (req, res) => {
  const especialistas = await adminService.listEspecialistas();
  res.status(200).json({ data: especialistas });
});

const listAsignaciones = catchAsync(async (req, res) => {
  const asignaciones = await adminService.listAsignaciones();
  res.status(200).json({ data: asignaciones });
});

const createEspecialista = catchAsync(async (req, res) => {
  const data = { ...req.body };
  data.ins_codi = 'I001';
  const result = await adminService.createEspecialista(data);
  await adminService.logAudit(req.user.usu_codi, 'SUCCESS', `Creación de especialista: ${data.nombre} ${data.apellido}`, req.ip);
  res.status(201).json({ message: 'Especialista creado', data: result });
});

const assignPaciente = catchAsync(async (req, res) => {
  const { nin_codi, esp_codi } = req.body;
  const result = await adminService.assignNinoToEspecialista(nin_codi, esp_codi);
  await adminService.logAudit(req.user.usu_codi, 'ASIGNACION', `Paciente ${nin_codi} asignado a especialista ${esp_codi}`, req.ip);
  res.status(201).json({ success: true, data: result });
});

const updateEspecialista = catchAsync(async (req, res) => {
  const { esp_codi } = req.params;
  const result = await adminService.updateEspecialista(esp_codi, req.body);
  res.json({ success: true, data: result });
});

const toggleEspecialista = catchAsync(async (req, res) => {
  const { esp_codi } = req.params;
  const { activo } = req.body;
  const result = await adminService.toggleEspecialistaEstado(esp_codi, activo);
  res.json({ success: true, data: result });
});

const toggleAsignacion = catchAsync(async (req, res) => {
  const { asi_codi } = req.params;
  const { estado } = req.body;
  const result = await adminService.toggleAsignacionEstado(asi_codi, estado);
  res.json({ success: true, data: result });
});

const getMetricas = catchAsync(async (req, res) => {
  const metricas = await adminService.getMetricasDashboard();
  res.status(200).json({ data: metricas });
});

const getCatalogos = catchAsync(async (req, res) => {
  const data = await adminService.getCatalogos();
  res.status(200).json({ data });
});

const updateInstitucion = catchAsync(async (req, res) => {
  const result = await adminService.updateInstitucion('I001', req.body);
  await adminService.logAudit(req.user.usu_codi, 'INFO', `Actualización de datos institucionales`, req.ip);
  res.json({ success: true, data: result });
});

const createEspecialidad = catchAsync(async (req, res) => {
  const result = await adminService.createEspecialidad(req.body);
  res.status(201).json({ message: 'Especialidad creada', data: result });
});

const updateEspecialidad = catchAsync(async (req, res) => {
  const { esc_codi } = req.params;
  const result = await adminService.updateEspecialidad(esc_codi, req.body);
  res.json({ success: true, data: result });
});

const toggleEspecialidad = catchAsync(async (req, res) => {
  const { esc_codi } = req.params;
  const { activo } = req.body;
  const result = await adminService.toggleEspecialidadStatus(esc_codi, activo);
  res.json({ success: true, data: result });
});

const listUsers = catchAsync(async (req, res) => {
  const users = await adminService.listUsers();
  res.status(200).json({ data: users });
});

const toggleUser = catchAsync(async (req, res) => {
  const { usu_codi } = req.params;
  const { activo } = req.body;
  const result = await adminService.toggleUserEstado(usu_codi, activo);
  await adminService.logAudit(req.user.usu_codi, 'WARN', `Cambio de estado de usuario ${usu_codi} a ${activo ? 'Activo' : 'Inactivo'}`, req.ip);
  res.json({ success: true, data: result });
});

const getAuditoria = catchAsync(async (req, res) => {
  const logs = await adminService.listAuditoria();
  res.status(200).json({ data: logs });
});

module.exports = {
  listNinos,
  listEspecialistas,
  listAsignaciones,
  createEspecialista,
  assignPaciente,
  updateEspecialista,
  toggleEspecialista,
  toggleAsignacion,
  getMetricas,
  getCatalogos,
  updateInstitucion,
  createEspecialidad,
  updateEspecialidad,
  toggleEspecialidad,
  listUsers,
  toggleUser,
  getAuditoria
};
