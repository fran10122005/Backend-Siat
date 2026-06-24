const express = require('express');
const router = express.Router();

const sesionesController = require('./sesiones.controller');
const { validateSchema } = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const schemas = require('./sesiones.schema');

// Todas las rutas requieren autenticación
router.use(authenticate);

// POST /api/sesiones/iniciar
router.post('/iniciar', validateSchema(schemas.iniciarSesionSchema), sesionesController.iniciarSesion);

// PUT /api/sesiones/:ses_codi/cerrar
router.put('/:ses_codi/cerrar', validateSchema(schemas.cerrarSesionSchema), sesionesController.cerrarSesion);

// GET /api/sesiones/actividades (Obtener catálogo de actividades)
router.get('/actividades', sesionesController.obtenerActividades);

// POST /api/sesiones/actividades (Crear actividad)
router.post('/actividades', sesionesController.crearActividad);

module.exports = router;

