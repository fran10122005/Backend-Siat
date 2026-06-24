const { z } = require('zod');

const iniciarSesionSchema = z.object({
  body: z.object({
    nin_codi: z.string().min(1, 'Código de niño requerido').max(10),
    act_codi: z.string().min(1, 'Código de actividad requerido').max(10),
    dis_codi: z.string().min(1, 'Código de dispositivo requerido').max(10),
  })
});

const cerrarSesionSchema = z.object({
  params: z.object({
    ses_codi: z.string().min(1, 'Código de sesión requerido')
  }),
  body: z.object({
    ses_nota: z.string().optional()
  })
});

const obtenerSesionesSchema = z.object({
  params: z.object({
    nin_codi: z.string().min(1, 'Código de niño requerido')
  })
});

module.exports = { iniciarSesionSchema, cerrarSesionSchema, obtenerSesionesSchema };
