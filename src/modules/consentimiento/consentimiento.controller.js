const consentimientoService = require('./consentimiento.service');
const prisma = require('../../config/db');

class ConsentimientoController {
  async aceptar(req, res, next) {
    try {
      const { usu_codi } = req.user;
      const repre = await prisma.tm_repre.findUnique({ where: { usu_codi } });
      
      if (!repre) {
        return res.status(403).json({ error: 'Solo los representantes pueden aceptar el consentimiento' });
      }

      const rep_cod = repre.rep_cod;
      const { nin_codi, con_vers } = req.validatedBody;
      const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || null;

      const resultado = await consentimientoService.aceptar(rep_cod, nin_codi, con_vers, ip);
      res.status(201).json({ data: resultado, message: 'Consentimiento registrado exitosamente' });
    } catch (error) {
      next(error);
    }
  }

  async estado(req, res, next) {
    try {
      const { nin_codi } = req.params;
      const tieneConsentimiento = await consentimientoService.verificar(nin_codi);
      res.json({ data: { consentimientoOk: tieneConsentimiento } });
    } catch (error) {
      next(error);
    }
  }

  async listar(req, res, next) {
    try {
      const { usu_codi } = req.user;
      const repre = await prisma.tm_repre.findUnique({ where: { usu_codi } });
      
      if (!repre) {
        return res.status(403).json({ error: 'Solo los representantes tienen historial de consentimientos' });
      }

      const resultados = await consentimientoService.listar(repre.rep_cod);
      res.json({ data: resultados });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsentimientoController();
