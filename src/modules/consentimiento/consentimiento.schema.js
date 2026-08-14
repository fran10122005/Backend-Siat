const { z } = require('zod');

const aceptarConsentimientoSchema = z.object({
  // El backend deriva nin_codi del representante autenticado si el cliente no lo envía
  body: z.object({
    nin_codi: z.string().min(1, 'El código del niño es requerido').optional(),
    con_vers: z.string().min(1, 'La versión del documento es requerida').default('1.0'),
    // La aceptación es implícita al llamar a /aceptar; se rechaza solo si envían false explícito.
    con_acep: z.boolean().default(true).refine(val => val === true, {
      message: 'Debe aceptar los términos para continuar'
    })
  })
});

module.exports = {
  aceptarConsentimientoSchema
};
