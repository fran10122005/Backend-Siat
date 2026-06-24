const express = require('express');
const router = express.Router();
const metasController = require('./metas.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.get('/:nin_codi', authenticate, metasController.getMetasNino);
router.post('/', authenticate, metasController.crearMeta);
router.patch('/:met_codi/ensayo', authenticate, metasController.registrarEnsayo);

module.exports = router;
