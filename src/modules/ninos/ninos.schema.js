const { z } = require('zod');

const registerNinoSchema = z.object({
  body: z.object({
    nin_codi: z.string().max(10),
    nin_nomb: z.string().max(50),
    nin_apel: z.string().max(50),
    nin_fnac: z.string().transform(str => new Date(str)), // 'YYYY-MM-DD'
    nin_gner: z.enum(['M', 'F']),
    nin_nivd: z.string().max(20),
  })
});

const umbralesSchema = z.object({
  params: z.object({
    nin_codi: z.string().min(1, 'El código del niño es requerido')
  }),
  body: z.object({
    umb_codi: z.string().max(10),
    sen_codi: z.string().max(10),
    umb_limi: z.number(),
    umb_lims: z.number(),
  })
});

const inviteRepresentativeSchema = z.object({
  body: z.object({
    nin_nomb: z.string().max(50),
    nin_apel: z.string().max(50),
    nin_fnac: z.string().transform(str => new Date(str)),
    nin_gner: z.enum(['M', 'F']),
    nin_nivd: z.string().max(20),
    rep_nomb: z.string().max(50),
    rep_apel: z.string().max(50),
    usu_crro: z.string().email('Debe ser un correo electrónico válido')
  })
});

module.exports = { registerNinoSchema, umbralesSchema, inviteRepresentativeSchema };
