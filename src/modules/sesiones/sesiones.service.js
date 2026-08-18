const prisma = require('../../config/db');
const { generateId } = require('../../utils/idGenerator');
const AppError = require('../../utils/AppError');

const ACTIVIDAD_ESTADOS = ['Activa', 'Inactiva'];
const ACTIVIDAD_DIFICULTAD = ['Baja', 'Media', 'Alta'];
const ASIGNACION_ESTADOS = ['Activa', 'Completada', 'Cancelada'];

class SesionesService {
  // ========================== SESIONES (TERAPIAS) ==========================

  async iniciarSesion(data) {
    const [nino, actividad, dispositivo] = await Promise.all([
      prisma.tm_ninos.findUnique({ where: { nin_codi: data.nin_codi } }),
      prisma.tm_activ.findUnique({ where: { act_codi: data.act_codi } }),
      prisma.tm_dispo.findUnique({ where: { dis_codi: data.dis_codi } }),
    ]);

    if (!nino) throw new AppError('Niño no encontrado', 404);
    if (!actividad) throw new AppError('Actividad no encontrada', 404);
    if (actividad.act_estd === 'Inactiva') throw new AppError('La actividad se encuentra inactiva', 409);
    if (!dispositivo) throw new AppError('Dispositivo no encontrado', 404);

    const sesion = await prisma.tr_sesio.create({
      data: {
        ses_codi: generateId('S'),
        nin_codi: data.nin_codi,
        act_codi: data.act_codi,
        dis_codi: data.dis_codi,
        ses_inic: new Date(),
      },
      include: { tm_activ: true, tm_dispo: true },
    });

    return sesion;
  }

  async cerrarSesion(ses_codi, ses_nota) {
    const sesion = await prisma.tr_sesio.findUnique({ where: { ses_codi } });
    if (!sesion) throw new AppError('Sesión no encontrada', 404);
    if (sesion.ses_cerr) throw new AppError('La sesión ya se encuentra cerrada', 409);

    return await prisma.tr_sesio.update({
      where: { ses_codi },
      data: { ses_cerr: new Date(), ses_nota },
    });
  }

  async obtenerSesionesPorNino(nin_codi, { estado } = {}) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi } });
    if (!nino) throw new AppError('Niño no encontrado', 404);

    const where = {
      nin_codi,
      ...(estado === 'abierta' ? { ses_cerr: null } : {}),
      ...(estado === 'cerrada' ? { ses_cerr: { not: null } } : {}),
    };

    return await prisma.tr_sesio.findMany({
      where,
      include: {
        tm_activ: { include: { tm_categ: true } },
        tm_dispo: true,
      },
      orderBy: { ses_inic: 'desc' },
    });
  }

  // ========================== ACTIVIDADES ==========================

  async listarActividades({ nin_codi, cat_codi, estado, dificultad, busqueda, pagina = 1, limite = 10 }) {
    const where = {};
    if (cat_codi) where.cat_codi = cat_codi;
    if (estado) where.act_estd = estado;
    if (dificultad) where.act_difi = dificultad;

    if (busqueda) {
      where.OR = [
        { act_trea: { contains: busqueda, mode: 'insensitive' } },
        { act_desc: { contains: busqueda, mode: 'insensitive' } },
        { act_meta: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    if (nin_codi) {
      where.OR = [
        ...(where.OR || []),
        { nin_codi: nin_codi },
        { nin_codi: null },
        { tc_activ_ninos: { some: { nin_codi } } },
      ];
    }

    const page = Math.max(parseInt(pagina, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limite, 10) || 10, 1), 100);

    const [total, items] = await Promise.all([
      prisma.tm_activ.count({ where }),
      prisma.tm_activ.findMany({
        where,
        include: {
          tm_categ: true,
          _count: { select: { tr_sesio: true } },
        },
        orderBy: { act_crea: 'desc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      items,
      paginacion: {
        total,
        pagina: page,
        limite: perPage,
        totalPaginas: Math.ceil(total / perPage),
      },
    };
  }

  async obtenerActividad(act_codi) {
    const actividad = await prisma.tm_activ.findUnique({
      where: { act_codi },
      include: {
        tm_categ: true,
        tc_activ_ninos: {
          include: {
            tm_ninos: {
              select: { nin_codi: true, nin_nomb: true, nin_apel: true, nin_foto: true, nin_nivd: true },
            },
          },
        },
      },
    });
    if (!actividad) throw new AppError('Actividad no encontrada', 404);
    return actividad;
  }

  async crearActividad(data) {
    const categoria = await prisma.tm_categ.findUnique({ where: { cat_codi: data.cat_codi } });
    if (!categoria || !categoria.cat_estd) {
      throw new AppError('Categoría no encontrada o inactiva', 400);
    }

    const actividad = await prisma.tm_activ.create({
      data: {
        act_codi: generateId('ACT'),
        cat_codi: data.cat_codi,
        act_trea: data.act_trea.trim(),
        act_desc: data.act_desc || null,
        act_meta: data.act_meta || null,
        act_guia: data.act_guia || null,
        act_med: data.act_med || null,
        act_difi: data.act_difi || 'Baja',
        act_estd: data.act_estd || 'Activa',
        act_time: data.act_time != null ? parseInt(data.act_time, 10) : null,
        nin_codi: data.nin_codi || null,
      },
      include: { tm_categ: true },
    });

    return actividad;
  }

  async actualizarActividad(act_codi, data) {
    const actividad = await prisma.tm_activ.findUnique({ where: { act_codi } });
    if (!actividad) throw new AppError('Actividad no encontrada', 404);

    if (data.cat_codi) {
      const categoria = await prisma.tm_categ.findUnique({ where: { cat_codi: data.cat_codi } });
      if (!categoria || !categoria.cat_estd) {
        throw new AppError('Categoría no encontrada o inactiva', 400);
      }
    }

    const actualizada = await prisma.tm_activ.update({
      where: { act_codi },
      data: {
        cat_codi: data.cat_codi !== undefined ? data.cat_codi : undefined,
        act_trea: data.act_trea !== undefined ? data.act_trea.trim() : undefined,
        act_desc: data.act_desc !== undefined ? data.act_desc : undefined,
        act_meta: data.act_meta !== undefined ? data.act_meta : undefined,
        act_guia: data.act_guia !== undefined ? data.act_guia : undefined,
        act_med: data.act_med !== undefined ? data.act_med : undefined,
        act_difi: data.act_difi !== undefined ? data.act_difi : undefined,
        act_estd: data.act_estd !== undefined ? data.act_estd : undefined,
        act_time: data.act_time !== undefined ? parseInt(data.act_time, 10) : undefined,
        nin_codi: data.nin_codi !== undefined ? data.nin_codi : undefined,
      },
      include: { tm_categ: true },
    });

    return actualizada;
  }

  async eliminarActividad(act_codi) {
    const actividad = await prisma.tm_activ.findUnique({ where: { act_codi } });
    if (!actividad) throw new AppError('Actividad no encontrada', 404);

    const sesiones = await prisma.tr_sesio.count({ where: { act_codi } });
    if (sesiones > 0) {
      return await prisma.tm_activ.update({
        where: { act_codi },
        data: { act_estd: 'Inactiva' },
      });
    }

    await prisma.tc_activ_ninos.deleteMany({ where: { act_codi } });
    await prisma.tm_activ.delete({ where: { act_codi } });
    return { eliminada: true, act_codi };
  }

  // ========================== CATEGORÍAS ==========================

  async listarCategorias({ busqueda, pagina = 1, limite = 10 } = {}) {
    const where = {};
    if (busqueda) {
      where.OR = [
        { cat_nomb: { contains: busqueda, mode: 'insensitive' } },
        { cat_deta: { contains: busqueda, mode: 'insensitive' } },
      ];
    }

    const page = Math.max(parseInt(pagina, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limite, 10) || 10, 1), 100);

    const [total, items] = await Promise.all([
      prisma.tm_categ.count({ where }),
      prisma.tm_categ.findMany({
        where,
        include: { _count: { select: { tm_activ: true } } },
        orderBy: { cat_nomb: 'asc' },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
    ]);

    return {
      items,
      paginacion: { total, pagina: page, limite: perPage, totalPaginas: Math.ceil(total / perPage) },
    };
  }

  async crearCategoria(data) {
    const existe = await prisma.tm_categ.findFirst({
      where: { cat_nomb: { equals: data.cat_nomb, mode: 'insensitive' } },
    });
    if (existe) throw new AppError('Ya existe una categoría con ese nombre', 409);

    return await prisma.tm_categ.create({
      data: {
        cat_codi: generateId('CAT'),
        cat_nomb: data.cat_nomb.trim(),
        cat_deta: data.cat_deta || null,
        cat_estd: true,
      },
    });
  }

  async actualizarCategoria(cat_codi, data) {
    const categoria = await prisma.tm_categ.findUnique({ where: { cat_codi } });
    if (!categoria) throw new AppError('Categoría no encontrada', 404);

    if (data.cat_nomb) {
      const existe = await prisma.tm_categ.findFirst({
        where: { cat_nomb: { equals: data.cat_nomb, mode: 'insensitive' }, cat_codi: { not: cat_codi } },
      });
      if (existe) throw new AppError('Ya existe una categoría con ese nombre', 409);
    }

    return await prisma.tm_categ.update({
      where: { cat_codi },
      data: {
        cat_nomb: data.cat_nomb !== undefined ? data.cat_nomb.trim() : undefined,
        cat_deta: data.cat_deta !== undefined ? data.cat_deta : undefined,
        cat_estd: data.cat_estd !== undefined ? data.cat_estd : undefined,
      },
    });
  }

  async eliminarCategoria(cat_codi) {
    const categoria = await prisma.tm_categ.findUnique({ where: { cat_codi } });
    if (!categoria) throw new AppError('Categoría no encontrada', 404);

    const activas = await prisma.tm_activ.count({ where: { cat_codi, act_estd: 'Activa' } });
    if (activas > 0) {
      throw new AppError('No se puede eliminar: la categoría tiene actividades activas', 400);
    }

    await prisma.tm_activ.updateMany({ where: { cat_codi }, data: { act_estd: 'Inactiva' } });
    return await prisma.tm_categ.update({ where: { cat_codi }, data: { cat_estd: false } });
  }

  // ========================== ASIGNACIÓN DE ACTIVIDADES ==========================

  async asignarActividad(act_codi, nin_codi, { acn_nota } = {}) {
    const [actividad, nino] = await Promise.all([
      prisma.tm_activ.findUnique({ where: { act_codi } }),
      prisma.tm_ninos.findUnique({ where: { nin_codi } }),
    ]);
    if (!actividad) throw new AppError('Actividad no encontrada', 404);
    if (!nino) throw new AppError('Niño no encontrado', 404);
    if (actividad.act_estd === 'Inactiva') throw new AppError('No se puede asignar una actividad inactiva', 409);

    const existente = await prisma.tc_activ_ninos.findFirst({
      where: { act_codi, nin_codi, acn_estd: 'Activa' },
    });
    if (existente) throw new AppError('La actividad ya está asignada a este niño', 409);

    const asignacion = await prisma.tc_activ_ninos.create({
      data: {
        acn_codi: generateId('ASN'),
        act_codi,
        nin_codi,
        acn_estd: 'Activa',
        acn_asig: new Date(),
        acn_nota: acn_nota || null,
      },
      include: {
        tm_activ: { include: { tm_categ: true } },
        tm_ninos: { select: { nin_codi: true, nin_nomb: true, nin_apel: true } },
      },
    });

    return asignacion;
  }

  async listarAsignacionesDeNino(nin_codi, { estado } = {}) {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi } });
    if (!nino) throw new AppError('Niño no encontrado', 404);

    const where = {
      nin_codi,
      ...(estado ? { acn_estd: estado } : {}),
    };

    return await prisma.tc_activ_ninos.findMany({
      where,
      include: { tm_activ: { include: { tm_categ: true } } },
      orderBy: { acn_asig: 'desc' },
    });
  }

  async cambiarEstadoAsignacion(acn_codi, acn_estd) {
    const asignacion = await prisma.tc_activ_ninos.findUnique({ where: { acn_codi } });
    if (!asignacion) throw new AppError('Asignación no encontrada', 404);

    return await prisma.tc_activ_ninos.update({
      where: { acn_codi },
      data: { acn_estd },
      include: { tm_activ: true },
    });
  }

  async desasignarActividad(acn_codi) {
    const asignacion = await prisma.tc_activ_ninos.findUnique({ where: { acn_codi } });
    if (!asignacion) throw new AppError('Asignación no encontrada', 404);

    await prisma.tc_activ_ninos.delete({ where: { acn_codi } });
    return { eliminada: true, acn_codi };
  }
}

module.exports = new SesionesService();
module.exports.ESTADOS = {
  ACTIVIDAD: ACTIVIDAD_ESTADOS,
  DIFICULTAD: ACTIVIDAD_DIFICULTAD,
  ASIGNACION: ASIGNACION_ESTADOS,
};