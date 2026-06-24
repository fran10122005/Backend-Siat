const prisma = require('../../config/db');
const crypto = require('crypto');

const generateId = (prefix) => {
  return prefix + crypto.randomBytes(4).toString('hex') + Math.floor(Math.random() * 10);
};

class SesionesService {
  async iniciarSesion(data) {
    // Validar que exista el niño, la actividad y el dispositivo
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi: data.nin_codi } });
    if (!nino) throw new Error('Niño no encontrado');

    const actividad = await prisma.tm_activ.findUnique({ where: { act_codi: data.act_codi } });
    if (!actividad) throw new Error('Actividad no encontrada');

    const dispositivo = await prisma.tm_dispo.findUnique({ where: { dis_codi: data.dis_codi } });
    if (!dispositivo) throw new Error('Dispositivo no encontrado');

    const ses_codi = generateId('S');

    const sesion = await prisma.tr_sesio.create({
      data: {
        ses_codi,
        nin_codi: data.nin_codi,
        act_codi: data.act_codi,
        dis_codi: data.dis_codi,
        ses_inic: new Date(),
      }
    });

    return sesion;
  }

  async cerrarSesion(ses_codi, ses_nota) {
    const sesion = await prisma.tr_sesio.findUnique({ where: { ses_codi } });
    if (!sesion) throw new Error('Sesión no encontrada');
    if (sesion.ses_cerr) throw new Error('La sesión ya se encuentra cerrada');

    const updatedSesion = await prisma.tr_sesio.update({
      where: { ses_codi },
      data: {
        ses_cerr: new Date(),
        ses_nota
      }
    });

    return updatedSesion;
  }

  async obtenerSesionesPorNino(nin_codi) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi } });
    if (!nino) throw new Error('Niño no encontrado');

    const sesiones = await prisma.tr_sesio.findMany({
      where: { nin_codi },
      include: {
        tm_activ: true,
        tm_dispo: true
      },
      orderBy: { ses_inic: 'desc' }
    });

    return sesiones;
  }

  async listarActividades(nin_codi) {
    const whereClause = nin_codi ? {
      OR: [
        { nin_codi: nin_codi },
        { nin_codi: null }
      ]
    } : {};

    return await prisma.tm_activ.findMany({
      where: whereClause,
      include: {
        tm_categ: true
      }
    });
  }

  async crearActividad(data) {
    const crypto = require('crypto');
    const act_codi = 'ACT_' + crypto.randomBytes(3).toString('hex').toUpperCase() + Math.floor(Math.random() * 10);
    const catCodi = data.category_code || 'CAT_SIM';

    return await prisma.tm_activ.create({
      data: {
        act_codi: act_codi.substring(0, 10),
        rep_codi: catCodi,
        act_trea: data.act_trea,
        nin_codi: data.nin_codi || null,
        act_meta: data.act_meta || 'Baja',
        act_guia: data.act_guia || '',
        act_time: data.act_time ? parseInt(data.act_time) : 15
      }
    });
  }
}

module.exports = new SesionesService();

