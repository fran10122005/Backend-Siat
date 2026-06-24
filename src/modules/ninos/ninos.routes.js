const express = require('express');
const router = express.Router();

const ninosController = require('./ninos.controller');
const { validateSchema } = require('../../middleware/validate.middleware');
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const schemas = require('./ninos.schema');

// GET /api/ninos/mis-ninos
router.get('/mis-ninos', authenticate, ninosController.misNinos);

// POST /api/ninos (Solo representantes pueden añadir a su perfil, o especialistas)
router.post('/', authenticate, requireRole(['ROL_REP', 'ROL_ESP']), validateSchema(schemas.registerNinoSchema), ninosController.crearNino);

// POST /api/ninos/invite-representative
router.post('/invite-representative', authenticate, requireRole(['ROL_ESP', 'ROL_ADM', 'ROL_DIR']), validateSchema(schemas.inviteRepresentativeSchema), ninosController.inviteRepresentative);

// POST /api/ninos/:nin_codi/umbrales
router.post('/:nin_codi/umbrales', authenticate, validateSchema(schemas.umbralesSchema), ninosController.configurarUmbrales);

// GET /api/ninos/mi-expediente (Expediente real del niño asociado al representante)
router.get('/mi-expediente', authenticate, requireRole(['ROL_REP']), ninosController.obtenerExpedienteRepresentante);

// GET /api/ninos/bitacora (Historial de bitácoras del niño para el representante)
router.get('/bitacora', authenticate, requireRole(['ROL_REP']), ninosController.obtenerBitacoras);

// GET /api/ninos/:nin_codi/bitacora (Historial de bitácoras del niño para especialistas)
router.get('/:nin_codi/bitacora', authenticate, requireRole(['ROL_ESP', 'ROL_ADM', 'ROL_DIR']), ninosController.obtenerBitacorasPorNino);

// POST /api/ninos/bitacora (Registrar nueva bitácora de hogar)
router.post('/bitacora', authenticate, requireRole(['ROL_REP']), ninosController.registrarBitacora);

// GET /api/ninos/:nin_codi/ficha (Obtener ficha clínica)
router.get('/:nin_codi/ficha', authenticate, ninosController.obtenerFichaClinica);

// PUT /api/ninos/:nin_codi/ficha (Actualizar ficha clínica)
router.put('/:nin_codi/ficha', authenticate, requireRole(['ROL_ESP']), ninosController.actualizarFichaClinica);

module.exports = router;

