const express = require('express');
const router = express.Router();

const citasController = require('./citas.controller');
const { authenticate, requireRole } = require('../../middleware/auth.middleware');

// GET /api/citas/agenda-hoy - Para el especialista
router.get('/agenda-hoy', authenticate, requireRole(['ROL_ESP']), citasController.obtenerAgendaHoy);

// POST /api/citas - Para el representante
router.post('/', authenticate, requireRole(['ROL_REP']), citasController.solicitarCita);

// PATCH /api/citas/:cit_codi/estado - Para el especialista
router.patch('/:cit_codi/estado', authenticate, requireRole(['ROL_ESP']), citasController.cambiarEstadoCita);

// GET /api/citas/especialistas-asignados - Para el representante
router.get('/especialistas-asignados', authenticate, requireRole(['ROL_REP']), citasController.obtenerEspecialistasAsignados);

module.exports = router;
