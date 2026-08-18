const { z } = require('zod');

const ESTADO_ACTIVIDAD = ['Activa', 'Inactiva'];
const DIFICULTAD_ACTIVIDAD = ['Baja', 'Media', 'Alta'];
const ESTADO_ASIGNACION = ['Activa', 'Completada', 'Cancelada'];

const codigo10 = z.string().min(1, 'Código requerido').max(10, 'Máximo 10 caracteres');
const codigo11 = z.string().min(1, 'Código requerido').max(11, 'Máximo 11 caracteres');
const paginacion = z.object({
  pagina: z.coerce.number().int().min(1).optional(),
  limite: z.coerce.number().int().min(1).max(100).optional(),
});
const busquedaQuery = z.string().trim().max(100).optional();

// ========================== SESIONES ==========================

const iniciarSesionSchema = z.object({
  body: z.object({
    nin_codi: codigo10,
    act_codi: codigo10,
    dis_codi: codigo10,
  }),
});

const cerrarSesionSchema = z.object({
  params: z.object({ ses_codi: codigo10 }),
  body: z.object({
    ses_nota: z.string().trim().max(2000).optional(),
  }),
});

const obtenerSesionesSchema = z.object({
  params: z.object({ nin_codi: codigo10 }),
  query: z.object({
    estado: z.enum(['abierta', 'cerrada']).optional(),
  }),
});

// ========================== ACTIVIDADES ==========================

const listarActividadesSchema = z.object({
  query: z.object({
    nin_codi: codigo10.optional(),
    cat_codi: codigo10.optional(),
    estado: z.enum(ESTADO_ACTIVIDAD).optional(),
    dificultad: z.enum(DIFICULTAD_ACTIVIDAD).optional(),
    busqueda: busquedaQuery,
    ...paginacion.shape,
  }),
});

const obtenerActividadSchema = z.object({
  params: z.object({ act_codi: codigo10 }),
});

const crearActividadSchema = z.object({
  body: z.object({
    cat_codi: codigo10,
    act_trea: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(60),
    act_desc: z.string().trim().max(2000).optional(),
    act_meta: z.string().trim().max(2000).optional(),
    act_guia: z.string().trim().max(2000).optional(),
    act_difi: z.enum(DIFICULTAD_ACTIVIDAD).optional(),
    act_estd: z.enum(ESTADO_ACTIVIDAD).optional(),
    act_time: z.coerce.number().int().min(1).max(600).optional(),
    nin_codi: codigo10.optional(),
  }),
});

const actualizarActividadSchema = z.object({
  params: z.object({ act_codi: codigo10 }),
  body: z.object({
    cat_codi: codigo10.optional(),
    act_trea: z.string().trim().min(3, 'El título debe tener al menos 3 caracteres').max(60).optional(),
    act_desc: z.string().trim().max(2000).nullable().optional(),
    act_meta: z.string().trim().max(2000).nullable().optional(),
    act_guia: z.string().trim().max(2000).nullable().optional(),
    act_difi: z.enum(DIFICULTAD_ACTIVIDAD).optional(),
    act_estd: z.enum(ESTADO_ACTIVIDAD).optional(),
    act_time: z.coerce.number().int().min(1).max(600).nullable().optional(),
    nin_codi: codigo10.nullable().optional(),
  }).refine((b) => Object.keys(b).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  }),
});

const eliminarActividadSchema = z.object({
  params: z.object({ act_codi: codigo10 }),
});

// ========================== CATEGORÍAS ==========================

const listarCategoriasSchema = z.object({
  query: z.object({
    busqueda: busquedaQuery,
    ...paginacion.shape,
  }),
});

const crearCategoriaSchema = z.object({
  body: z.object({
    cat_nomb: z.string().trim().min(3, 'El nombre debe tener al menos 3 caracteres').max(50),
    cat_deta: z.string().trim().max(2000).optional(),
  }),
});

const actualizarCategoriaSchema = z.object({
  params: z.object({ cat_codi: codigo10 }),
  body: z.object({
    cat_nomb: z.string().trim().min(3).max(50).optional(),
    cat_deta: z.string().trim().max(2000).nullable().optional(),
    cat_estd: z.boolean().optional(),
  }).refine((b) => Object.keys(b).length > 0, {
    message: 'Debe enviar al menos un campo para actualizar',
  }),
});

const eliminarCategoriaSchema = z.object({
  params: z.object({ cat_codi: codigo10 }),
});

// ========================== ASIGNACIÓN DE ACTIVIDADES ==========================

const asignarActividadSchema = z.object({
  params: z.object({
    act_codi: codigo10,
    nin_codi: codigo10,
  }),
  body: z.object({
    acn_nota: z.string().trim().max(2000).optional(),
  }),
});

const listarAsignacionesSchema = z.object({
  params: z.object({ nin_codi: codigo10 }),
  query: z.object({
    estado: z.enum(ESTADO_ASIGNACION).optional(),
  }),
});

const cambiarEstadoAsignacionSchema = z.object({
  params: z.object({ acn_codi: codigo10 }),
  body: z.object({
    acn_estd: z.enum(ESTADO_ASIGNACION),
  }),
});

const desasignarActividadSchema = z.object({
  params: z.object({ acn_codi: codigo10 }),
});

module.exports = {
  iniciarSesionSchema,
  cerrarSesionSchema,
  obtenerSesionesSchema,
  listarActividadesSchema,
  obtenerActividadSchema,
  crearActividadSchema,
  actualizarActividadSchema,
  eliminarActividadSchema,
  listarCategoriasSchema,
  crearCategoriaSchema,
  actualizarCategoriaSchema,
  eliminarCategoriaSchema,
  asignarActividadSchema,
  listarAsignacionesSchema,
  cambiarEstadoAsignacionSchema,
  desasignarActividadSchema,
};