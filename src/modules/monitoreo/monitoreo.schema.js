const { z } = require('zod');

const telemetriaSchema = z.object({
  body: z.object({
    ses_codi: z.string().min(1).max(10),
    con_codi: z.string().min(1).max(10),
    tel_regi: z.number().min(20, 'Frecuencia cardíaca fuera de rango').max(250, 'Frecuencia cardíaca fuera de rango'),
    tel_marc: z.number().int(),
    tel_calid: z.number().min(0).max(100).optional(),
    tel_mov: z.number().min(0).max(5).optional(),
    tel_stress: z.number().min(0).max(100).optional(),
    // Campos opcionales si la lectura generó una alerta
    is_alert: z.boolean().optional(),
    ins_codi: z.string().max(10).optional(),
    ale_meto: z.string().max(50).optional()
  })
});

module.exports = { telemetriaSchema };