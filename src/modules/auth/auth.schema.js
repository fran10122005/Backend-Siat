const { z } = require('zod');
const {
  PERSON_NAME_REGEX,
  documentoValido,
  telefonoMovilValido,
  licenciaValida,
  fechaNoFutura,
  getAgeValidationError,
  strongPasswordSchema,
} = require('../../utils/validators');

const loginSchema = z.object({
  body: z.object({
    usu_crro: z.string().trim().email('Debe ser un correo electrónico válido'),
    usu_clve: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

const registerRepreSchema = z.object({
  body: z.object({
    usu_crro: z.string().trim().email('Debe ser un correo electrónico válido').max(50),
    usu_clve: strongPasswordSchema,
    rep_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50).regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    rep_apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50).regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    rep_rela: z.string().trim().min(2).max(20).optional(),
    rep_telf: z.string().trim().max(15).optional()
      .refine((v) => telefonoMovilValido(v), 'Formato de teléfono inválido: use 04120000000 o +584120000000'),
    rep_fnac: z.string().trim().optional().nullable(),
    nin_nomb: z.string().trim().min(2, 'El nombre del niño debe tener al menos 2 caracteres').max(50).regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    nin_apel: z.string().trim().min(2, 'El apellido del niño debe tener al menos 2 caracteres').max(50).regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    nin_fnac: z.string().trim().refine(fechaNoFutura, 'La fecha de nacimiento del paciente no puede ser futura'),
    nin_gner: z.enum(['M', 'F']).optional(),
    nin_foto: z.string().url('URL de foto inválida').optional().nullable()
  }).superRefine((data, ctx) => {
    if (data.rep_fnac) {
      const msg = getAgeValidationError(data.rep_fnac, 12, 75);
      if (msg) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ['rep_fnac'] });
      }
    }
  })
});

const registerEspSchema = z.object({
  body: z.object({
    usu_codi: z.string().trim().max(10).optional(),
    usu_crro: z.string().trim().email('Debe ser un correo electrónico válido').max(50),
    usu_clve: strongPasswordSchema,
    esp_codi: z.string().trim().max(11).optional(),
    esp_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50).regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    esp_apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50).regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    esp_tdoc: z.enum(['V', 'E', 'P']).optional(),
    esp_cedu: z.string().trim().max(20).optional(),
    esp_fnac: z.string().trim().optional(),
    esp_licencia: z.string().trim().max(50).optional(),
    esp_telf: z.string().trim().max(15).optional(),
    esp_gner: z.enum(['M', 'F']).optional(),
    esc_codi: z.string().trim().max(10).optional(),
    ins_codi: z.string().trim().max(15).optional()
  }).superRefine((data, ctx) => {
    const tdoc = data.esp_tdoc || 'V';
    if (data.esp_cedu && !documentoValido(data.esp_cedu, tdoc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tdoc === 'P'
          ? 'El pasaporte debe tener entre 6 y 11 caracteres alfanuméricos'
          : 'La cédula debe contener entre 6 y 8 dígitos (Ej. 12345678)',
        path: ['esp_cedu'],
      });
    }
    if (data.esp_fnac) {
      const msg = getAgeValidationError(data.esp_fnac, 12, 75);
      if (msg) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: msg, path: ['esp_fnac'] });
      }
    }
    if (data.esp_telf && !telefonoMovilValido(data.esp_telf)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Formato de teléfono inválido: use 04120000000 o +584120000000',
        path: ['esp_telf'],
      });
    }
    if (data.esp_licencia && !licenciaValida(data.esp_licencia)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La licencia debe tener formato CM-XXXXXX o MPPS-XXXXXX',
        path: ['esp_licencia'],
      });
    }
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Debe ser un correo electrónico válido')
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'El token es requerido'),
    newPassword: strongPasswordSchema
  })
});

const completeInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'El token es requerido'),
    usu_clve: z.string().optional(),
    password: z.string().optional(),
    rep_rela: z.string().trim().max(20).optional(),
    relation: z.string().trim().max(20).optional(),
    rep_telf: z.string().trim().max(15).optional(),
    phone: z.string().trim().max(15).optional(),
  }).superRefine((data, ctx) => {
    const rawPwd = data.usu_clve ?? data.password;
    const pwdRes = strongPasswordSchema.safeParse(rawPwd || '');
    if (!pwdRes.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: pwdRes.error.issues[0]?.message || 'Contraseña inválida',
        path: ['usu_clve'],
      });
    }
    const rawPhone = data.rep_telf ?? data.phone;
    if (rawPhone && !telefonoMovilValido(rawPhone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Formato de teléfono inválido: use 04120000000 o +584120000000',
        path: ['rep_telf'],
      });
    }
  })
});

const updateMeSchema = z.object({
  body: z.object({
    nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede exceder 50 caracteres')
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras').optional(),
    apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'El apellido no puede exceder 50 caracteres')
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras').optional(),
    email: z.string().trim().email('Debe ser un correo electrónico válido').max(50).optional(),
    telf: z.string().trim().max(15, 'El teléfono no puede exceder 15 caracteres').optional().nullable(),
    licencia: z.string().trim().max(50, 'La licencia no puede exceder 50 caracteres').optional().nullable(),
    tdoc: z.enum(['V', 'E', 'P'], 'El tipo de documento debe ser V, E o P').optional(),
    cedu: z.string().trim().max(20, 'El documento no puede exceder 20 caracteres').optional().nullable(),
    fnac: z.string().trim().optional().nullable(),
    foto: z.union([z.string().url('URL de foto inválida'), z.literal('')]).optional().nullable(),
    rela: z.string().trim().max(20, 'El parentesco no puede exceder 20 caracteres').optional().nullable(),
    currentPassword: z.string().optional(),
    password: strongPasswordSchema.optional()
  }).superRefine((data, ctx) => {
    if (data.password && (!data.currentPassword || data.currentPassword.trim() === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Para cambiar la contraseña debes ingresar la contraseña actual',
        path: ['currentPassword'],
      });
    }
    if (data.telf && !telefonoMovilValido(data.telf)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Formato de teléfono inválido: use 04120000000 o +584120000000',
        path: ['telf'],
      });
    }
    if (data.licencia && !licenciaValida(data.licencia)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La licencia debe tener formato CM-XXXXXX o MPPS-XXXXXX',
        path: ['licencia'],
      });
    }
    if (data.cedu) {
      const tdoc = data.tdoc || 'V';
      if (!documentoValido(data.cedu, tdoc)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: tdoc === 'P'
            ? 'El pasaporte debe tener entre 6 y 11 caracteres alfanuméricos'
            : 'La cédula debe contener entre 6 y 8 dígitos (Ej. 12345678)',
          path: ['cedu'],
        });
      }
    }
    if (data.fnac) {
      const msg = getAgeValidationError(data.fnac, 12, 75);
      if (msg) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: msg,
          path: ['fnac'],
        });
      }
    }
  })
});

module.exports = {
  loginSchema,
  registerRepreSchema,
  registerEspSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeInvitationSchema,
  updateMeSchema,
};
