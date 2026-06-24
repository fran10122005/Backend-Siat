const { z } = require('zod');

const historialSchema = z.object({
  params: z.object({
    nin_codi: z.string().min(1, 'El código del niño es requerido')
  })
});

module.exports = { historialSchema };
