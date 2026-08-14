const { z } = require('zod');

const registerNinoSchema = z.object({
  body: z.object({
    nin_codi: z.string().max(10),
    nin_nomb: z.string().max(50),
    nin_apel: z.string().max(50),
    nin_fnac: z.string(), // 'YYYY-MM-DD'
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
    nin_fnac: z.string(),
    nin_gner: z.enum(['M', 'F']),
    nin_nivd: z.string().max(20),
    rep_nomb: z.string().max(50),
    rep_apel: z.string().max(50),
    rep_rela: z.string().min(2).max(20),
    rep_telf: z.string().min(7).max(15),
    usu_crro: z.string().email('Debe ser un correo electrónico válido'),
    sen_tipo: z.string().max(30).optional(),
    sen_nvli: z.string().max(20).optional(),
  })
});

const buscarRepresentanteSchema = z.object({
  query: z.object({
    correo: z.string().email('Debe ser un correo electrónico válido')
  })
});

module.exports = { registerNinoSchema, umbralesSchema, inviteRepresentativeSchema, buscarRepresentanteSchema };
