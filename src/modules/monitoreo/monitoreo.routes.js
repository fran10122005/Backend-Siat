const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { validateSchema } = require('../../middleware/validate.middleware');
const schemas = require('./monitoreo.schema');

const { telemetriaIpLimiter, telemetriaNinoLimiter } = require('../../middleware/rateLimiter');
const monitoreoController = require('./monitoreo.controller');

// Recepción de telemetría IoT con rate limiting por IP (300 req/min) y por paciente (120 req/min)
router.post(
  '/telemetria',
  telemetriaIpLimiter,
  authenticate,
  validateSchema(schemas.telemetriaSchema),
  telemetriaNinoLimiter,
  monitoreoController.recibirTelemetria
);
// English alias for the same telemetry endpoint
router.post(
  '/telemetry',
  telemetriaIpLimiter,
  authenticate,
  validateSchema(schemas.telemetriaSchema),
  telemetriaNinoLimiter,
  monitoreoController.recibirTelemetria
);

router.get('/simular-estado', authenticate, monitoreoController.obtenerEstadoSimulacion);
router.post('/simular-estado', authenticate, monitoreoController.establecerEstadoSimulacion);

module.exports = router;
