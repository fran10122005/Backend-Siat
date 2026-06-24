const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { validateSchema } = require('../../middleware/validate.middleware');
const schemas = require('./reportes.schema');
const reportesController = require('./reportes.controller');

router.get('/historial/:nin_codi', authenticate, validateSchema(schemas.historialSchema), reportesController.getHistorialNino);

router.get('/alertas-representante', authenticate, reportesController.obtenerAlertasRepresentante);
router.get('/evolucion-representante', authenticate, reportesController.obtenerEvolucionRepresentante);
router.get('/historial-completo/:nin_codi', authenticate, reportesController.getHistorialCompleto);
router.post('/alertas/:ale_codi/feedback', authenticate, reportesController.registrarFeedbackAlerta);
router.post('/indicacion', authenticate, reportesController.crearIndicacionMedica);

module.exports = router;


