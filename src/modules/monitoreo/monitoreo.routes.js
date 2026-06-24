const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { validateSchema } = require('../../middleware/validate.middleware');
const schemas = require('./monitoreo.schema');

const monitoreoController = require('./monitoreo.controller');

router.post('/telemetria', authenticate, validateSchema(schemas.telemetriaSchema), monitoreoController.recibirTelemetria);

router.get('/simular-estado', authenticate, monitoreoController.obtenerEstadoSimulacion);
router.post('/simular-estado', authenticate, monitoreoController.establecerEstadoSimulacion);

module.exports = router;
