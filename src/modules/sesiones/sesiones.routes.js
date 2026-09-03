const express = require('express');
const router = express.Router();

const sesionesController = require('./sesiones.controller');
const { validateSchema } = require('../../middleware/validate.middleware');
const { authenticate, requireRole } = require('../../middleware/auth.middleware');
const schemas = require('./sesiones.schema');

// Roles con permisos de gestión (crear/editar/eliminar actividades, categorías y asignaciones)
const ROLES_GESTION = ['ROL_ADM', 'ROL_ESP', 'ROL_DIR'];
// Roles con permisos de ejecución de terapia (iniciar/cerrar sesiones y actualizar estado)
const ROLES_EJECUCION = ['ROL_ADM', 'ROL_ESP', 'ROL_DIR', 'ROL_REP'];

// Todas las rutas requieren autenticación
router.use(authenticate);

// ========================== SESIONES (TERAPIAS) ==========================
router.post('/iniciar', validateSchema(schemas.iniciarSesionSchema), requireRole(ROLES_EJECUCION), sesionesController.iniciarSesion);
router.put('/:ses_codi/cerrar', validateSchema(schemas.cerrarSesionSchema), requireRole(ROLES_EJECUCION), sesionesController.cerrarSesion);
router.get('/ninos/:nin_codi/sesiones', validateSchema(schemas.obtenerSesionesSchema), sesionesController.listarSesionesNino);

// ========================== CATEGORÍAS ==========================
router.get('/categorias', validateSchema(schemas.listarCategoriasSchema), sesionesController.listarCategorias);
router.post('/categorias', validateSchema(schemas.crearCategoriaSchema), requireRole(ROLES_GESTION), sesionesController.crearCategoria);
router.put('/categorias/:cat_codi', validateSchema(schemas.actualizarCategoriaSchema), requireRole(ROLES_GESTION), sesionesController.actualizarCategoria);
router.delete('/categorias/:cat_codi', validateSchema(schemas.eliminarCategoriaSchema), requireRole(ROLES_GESTION), sesionesController.eliminarCategoria);

// ========================== ACTIVIDADES ==========================
router.get('/actividades', validateSchema(schemas.listarActividadesSchema), sesionesController.listarActividades);
router.get('/actividades/:act_codi', validateSchema(schemas.obtenerActividadSchema), sesionesController.obtenerActividad);
router.post('/actividades', validateSchema(schemas.crearActividadSchema), requireRole(ROLES_GESTION), sesionesController.crearActividad);
router.put('/actividades/:act_codi', validateSchema(schemas.actualizarActividadSchema), requireRole(ROLES_GESTION), sesionesController.actualizarActividad);
router.delete('/actividades/:act_codi', validateSchema(schemas.eliminarActividadSchema), requireRole(ROLES_GESTION), sesionesController.eliminarActividad);

// ========================== ASIGNACIÓN DE ACTIVIDADES ==========================
router.post('/actividades/:act_codi/asignar/:nin_codi', validateSchema(schemas.asignarActividadSchema), requireRole(ROLES_GESTION), sesionesController.asignarActividad);
router.get('/ninos/:nin_codi/asignaciones', validateSchema(schemas.listarAsignacionesSchema), sesionesController.listarAsignacionesNino);
router.patch('/asignaciones/:acn_codi/estado', validateSchema(schemas.cambiarEstadoAsignacionSchema), requireRole(ROLES_EJECUCION), sesionesController.cambiarEstadoAsignacion);
router.delete('/asignaciones/:acn_codi', validateSchema(schemas.desasignarActividadSchema), requireRole(ROLES_GESTION), sesionesController.desasignarActividad);

module.exports = router;