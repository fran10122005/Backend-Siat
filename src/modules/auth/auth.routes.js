const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { validateSchema } = require('../../middleware/validate.middleware');
const { authenticate } = require('../../middleware/auth.middleware');
const schemas = require('./auth.schema');

// POST /api/auth/login
router.post('/login', validateSchema(schemas.loginSchema), authController.login);

// POST /api/auth/register-repre
router.post('/register/repre', validateSchema(schemas.registerRepreSchema), authController.registerRepre);

// POST /api/auth/register-esp
router.post('/register/esp', validateSchema(schemas.registerEspSchema), authController.registerEsp);

// POST /api/auth/forgot-password
router.post('/forgot-password', validateSchema(schemas.forgotPasswordSchema), authController.forgotPassword);

// POST /api/auth/reset-password
router.post('/reset-password', validateSchema(schemas.resetPasswordSchema), authController.resetPassword);

// GET /api/auth/invitation-details
router.get('/invitation-details', authController.getInvitationDetails);

// POST /api/auth/complete-invitation
router.post('/complete-invitation', validateSchema(schemas.completeInvitationSchema), authController.completeInvitation);

// GET /api/auth/me (Obtener perfil del usuario)
router.get('/me', authenticate, authController.getMe);

// PUT /api/auth/me (Actualizar perfil del usuario)
router.put('/me', authenticate, validateSchema(schemas.updateMeSchema), authController.updateMe);

module.exports = router;
