const prisma = require('../../config/db');
const { nanoid } = require('nanoid');
const consentimientoTextos = require('../../config/consentimiento_texto');

class ConsentimientoService {
  async aceptar(rep_cod, nin_codi, con_vers, ip) {
    const version = con_vers || '1.0';

    // Si el cliente no envía nin_codi, derivarlo del representante autenticado
    let targetNin = nin_codi;
    if (!targetNin) {
      const rep = await prisma.tm_repre.findFirst({ where: { rep_cod } });
      if (!rep) {
        const error = new Error('No se encontró el representante');
        error.status = 403;
        throw error;
      }
      targetNin = rep.nin_codi;
    }

    // Verificar que el niño pertenezca al representante
    const vinculado = await prisma.tm_repre.findFirst({
      where: { rep_cod, nin_codi: targetNin }
    });

    if (!vinculado) {
      const error = new Error('No estás vinculado a este niño');
      error.status = 403;
      throw error;
    }

    const con_text = consentimientoTextos[version];
    if (!con_text) {
      const error = new Error(`La versión ${version} del consentimiento no existe`);
      error.status = 400;
      throw error;
    }

    const con_codi = nanoid(10);
    const nuevoConsentimiento = await prisma.tm_conse.create({
      data: {
        con_codi,
        nin_codi: targetNin,
        rep_cod,
        con_vers: version,
        con_ip: ip,
        con_acep: true,
        con_text
      }
    });

    return nuevoConsentimiento;
  }

  async verificar(nin_codi) {
    const consentimiento = await prisma.tm_conse.findFirst({
      where: { nin_codi, con_acep: true },
      orderBy: { con_fech: 'desc' }
    });

    return !!consentimiento;
  }

  async listar(rep_cod) {
    return prisma.tm_conse.findMany({
      where: { rep_cod },
      orderBy: { con_fech: 'desc' },
      include: {
        tm_ninos: {
          select: { nin_nomb: true, nin_apel: true }
        }
      }
    });
  }
}

module.exports = new ConsentimientoService();
