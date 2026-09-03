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

  // GET /api/consentimiento/historial
  // Para representantes: devuelve su propio historial.
  // Para admin/especialista: devuelve el historial por nin_codi (query param).
  async historial(req, res, next) {
    try {
      const { usu_codi, rol_codi } = req.user;
      const esRepre = rol_codi === 'ROL_REP';

      if (esRepre) {
        const repre = await prisma.tm_repre.findUnique({ where: { usu_codi } });
        if (!repre) {
          return res.status(403).json({ error: 'Representante no encontrado' });
        }
        const resultados = await consentimientoService.listar(repre.rep_cod);
        return res.json({ success: true, data: resultados });
      }

      // Admin / Especialista: pueden consultar por nin_codi
      const { nin_codi } = req.query;
      if (!nin_codi) {
        return res.status(400).json({ error: 'Debes indicar nin_codi como query param' });
      }
      const resultados = await consentimientoService.historialPorNino(nin_codi);
      return res.json({ success: true, data: resultados });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ConsentimientoController();
