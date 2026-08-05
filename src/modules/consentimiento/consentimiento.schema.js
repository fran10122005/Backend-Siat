const { z } = require('zod');

const aceptarConsentimientoSchema = z.object({
  nin_codi: z.string().min(1, 'El código del niño es requerido'),
  con_vers: z.string().min(1, 'La versión del documento es requerida'),
  con_acep: z.boolean().refine(val => val === true, {
    message: 'Debe aceptar los términos para continuar'
  })
});

module.exports = {
  aceptarConsentimientoSchema
};
