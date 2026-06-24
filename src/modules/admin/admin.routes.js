const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { validateSchema } = require('../../middleware/validate.middleware');
const adminSchemas = require('./admin.schema');

// Middleware para verificar que el usuario sea Administrador
const requireAdmin = (req, res, next) => {
  if (req.user.rol_codi !== 'ROL_ADM') {
    return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de Administrador.' });
  }
  next();
};

// Todas las rutas de admin requieren estar logueado y tener rol administrativo
router.use(authenticate);
router.use(requireAdmin);

router.get('/metricas', adminController.getMetricas);
router.get('/catalogos', adminController.getCatalogos);
router.get('/ninos', adminController.listNinos);
router.get('/especialistas', adminController.listEspecialistas);
router.get('/asignaciones', adminController.listAsignaciones);
router.get('/users', adminController.listUsers);
router.get('/auditoria', adminController.getAuditoria);
router.patch('/users/:usu_codi/estado', adminController.toggleUser);

router.post('/especialistas', validateSchema(adminSchemas.createEspecialistaSchema), adminController.createEspecialista);
router.put('/especialistas/:esp_codi', validateSchema(adminSchemas.updateEspecialistaSchema), adminController.updateEspecialista);
router.patch('/especialistas/:esp_codi/estado', validateSchema(adminSchemas.toggleEspecialistaSchema), adminController.toggleEspecialista);
router.post('/asignar', validateSchema(adminSchemas.assignPacienteSchema), adminController.assignPaciente);
router.patch('/asignaciones/:asi_codi/estado', validateSchema(adminSchemas.toggleAsignacionSchema), adminController.toggleAsignacion);

router.put('/instituciones/:ins_codi', validateSchema(adminSchemas.updateInstitucionSchema), adminController.updateInstitucion);

router.post('/especialidades', validateSchema(adminSchemas.createEspecialidadSchema), adminController.createEspecialidad);
router.put('/especialidades/:esc_codi', validateSchema(adminSchemas.updateEspecialidadSchema), adminController.updateEspecialidad);
router.patch('/especialidades/:esc_codi/estado', validateSchema(adminSchemas.toggleEspecialidadSchema), adminController.toggleEspecialidad);

module.exports = router;
