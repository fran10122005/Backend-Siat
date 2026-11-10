const { z } = require('zod');
const {
  PERSON_NAME_REGEX,
  fechaNoFutura,
  getAgeValidationError,
  telefonoMovilValido,
} = require('../../utils/validators');

const optionalUrlOrEmpty = z.union([z.string().trim().url('URL de foto inválida'), z.literal('')]).optional().nullable();

const registerNinoSchema = z.object({
  body: z.object({
    nin_codi: z.string().trim().min(1).max(10),
    nin_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    nin_apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    nin_fnac: z.string().trim().refine(fechaNoFutura, 'La fecha de nacimiento del paciente no puede ser futura'),
    nin_gner: z.enum(['M', 'F']),
    nin_nivd: z.string().trim().min(2).max(20),
  })
});

const umbralesSchema = z.object({
  params: z.object({
    nin_codi: z.string().trim().min(1, 'El código del niño es requerido')
  }),
  body: z.object({
    umb_codi: z.string().trim().min(1).max(10),
    sen_codi: z.string().trim().min(1).max(10),
    umb_limi: z.number(),
    umb_lims: z.number(),
  }).refine((d) => d.umb_limi < d.umb_lims, {
    message: 'El límite inferior debe ser menor que el límite superior',
    path: ['umb_limi'],
  })
});

const inviteRepresentativeSchema = z.object({
  body: z.object({
    nin_nomb: z.string().trim().min(2, 'El nombre del paciente debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    nin_apel: z.string().trim().min(2, 'El apellido del paciente debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    nin_fnac: z.string().trim().refine(fechaNoFutura, 'La fecha de nacimiento del paciente no puede ser futura'),
    nin_gner: z.enum(['M', 'F']),
    nin_nivd: z.enum(['Por evaluar', 'Nivel 1', 'Nivel 2', 'Nivel 3'], 'Nivel de soporte inválido'),
    rep_nomb: z.string().trim().min(2, 'El nombre del representante debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    rep_apel: z.string().trim().min(2, 'El apellido del representante debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    rep_rela: z.string().trim().min(2, 'El parentesco es requerido').max(20),
    rep_cedu: z.string().trim().regex(/^\d{6,8}$/, 'La cédula debe tener entre 6 y 8 dígitos'),
    rep_telf: z.string().trim().max(15)
      .refine(telefonoMovilValido, 'Formato válido: 04120000000 o +584120000000'),
    rep_fnac: z.string().trim().optional().nullable(),
    usu_crro: z.string().trim().email('Debe ser un correo electrónico válido').max(50),
    nin_foto: optionalUrlOrEmpty,
    nin_diag: z.string().trim().max(255, 'Máximo 255 caracteres').optional().nullable().or(z.literal('')),
    nin_docs: z.array(z.string().trim().url('URL de documento inválida')).max(20, 'Máximo 20 documentos').optional(),
    rep_foto: optionalUrlOrEmpty,
    sen_tipo: z.string().trim().max(30).optional().nullable().or(z.literal('')),
    sen_nvli: z.string().trim().max(20).optional().nullable().or(z.literal('')),
    sen_nota: z.string().trim().max(255, 'Máximo 255 caracteres').optional().nullable().or(z.literal('')),
  }).superRefine((data, ctx) => {
    if (data.rep_fnac) {
      const ageErr = getAgeValidationError(data.rep_fnac, 12, 75);
      if (ageErr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: ageErr, path: ['rep_fnac'] });
      }
    }
    if (data.sen_tipo && !data.sen_nvli) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona la severidad de la condición clínica',
        path: ['sen_nvli'],
      });
    }
  })
});

const buscarRepresentanteSchema = z.object({
  query: z.object({
    cedula: z.string().trim().regex(/^\d{6,8}$/, 'La cédula debe tener entre 6 y 8 dígitos')
  })
});

module.exports = { registerNinoSchema, umbralesSchema, inviteRepresentativeSchema, buscarRepresentanteSchema };
