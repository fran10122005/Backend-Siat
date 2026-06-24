const { z } = require('zod');

const telemetriaSchema = z.object({
  body: z.object({
    ses_codi: z.string().min(1).max(10),
    con_codi: z.string().min(1).max(10),
    tel_regi: z.number(),
    tel_marc: z.number().int(),
    tel_calid: z.number().optional(),
    // Campos opcionales si la lectura generó una alerta
    is_alert: z.boolean().optional(),
    ins_codi: z.string().max(10).optional(),
    ale_meto: z.string().max(50).optional()
  })
});

module.exports = { telemetriaSchema };
