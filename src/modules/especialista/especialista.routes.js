const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const especialistaController = require('./especialista.controller');

// Notas SOAP
router.get('/soap/:nin_codi', authenticate, especialistaController.listarSoap);
router.post('/soap', authenticate, especialistaController.crearSoap);

// Indicaciones médicas
router.get('/indicaciones/:nin_codi', authenticate, especialistaController.listarIndicaciones);
router.post('/indicaciones', authenticate, especialistaController.crearIndicacion);

// Incidentes conductuales
router.get('/incidentes/:nin_codi', authenticate, especialistaController.listarIncidentes);
router.post('/incidentes/:nin_codi', authenticate, especialistaController.crearIncidente);

// Alertas / crisis del paciente (análisis IoT)
router.get('/alertas/:nin_codi', authenticate, especialistaController.listarAlertasNino);

module.exports = router;
