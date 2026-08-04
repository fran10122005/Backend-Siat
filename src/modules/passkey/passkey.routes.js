const express = require('express');
const router = express.Router();
const { authenticate } = require('../../middleware/auth.middleware');
const { validateSchema } = require('../../middleware/validate.middleware');
const passkeyController = require('./passkey.controller');
const passkeySchemas = require('./passkey.schema');

// Gestión de credenciales (requiere sesión)
router.get('/passkey', authenticate, passkeyController.listPasskeys);
router.delete('/passkey/:pk_id', authenticate, passkeyController.deletePasskey);

// Enrolamiento de huella (requiere sesión: tras login con contraseña)
router.post('/passkey/register/start', authenticate, passkeyController.startRegistration);
router.post('/passkey/register/complete', authenticate, validateSchema(passkeySchemas.completeRegistrationSchema), passkeyController.completeRegistration);

// Acceso rápido (público)
router.post('/passkey/login/start', validateSchema(passkeySchemas.startLoginSchema), passkeyController.startLogin);
router.post('/passkey/login/complete', validateSchema(passkeySchemas.completeLoginSchema), passkeyController.completeLogin);

module.exports = router;