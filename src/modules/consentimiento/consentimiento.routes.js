const express = require('express');
const router = express.Router();
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const { validateSchema } = require('../../middleware/validate.middleware');
const consentimientoController = require('./consentimiento.controller');
const schemas = require('./consentimiento.schema');

// POST /api/consentimiento/aceptar
router.post(
  '/aceptar',
  authenticate,
  requireRole(['ROL_REP']),
  validateSchema(schemas.aceptarConsentimientoSchema),
  consentimientoController.aceptar
);

// GET /api/consentimiento/estado/:nin_codi
router.get(
  '/estado/:nin_codi',
  authenticate,
  consentimientoController.estado
);

// GET /api/consentimiento/mis-consentimientos
router.get(
  '/mis-consentimientos',
  authenticate,
  requireRole(['ROL_REP']),
  consentimientoController.listar
);

// GET /api/consentimiento/historial
router.get(
  '/historial',
  authenticate,
  consentimientoController.historial
);

module.exports = router;
