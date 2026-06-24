const { z } = require('zod');

const loginSchema = z.object({
  body: z.object({
    usu_crro: z.string().email('Debe ser un correo electrónico válido'),
    usu_clve: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  }),
});

// Ejemplo: Registro de un representante
const registerRepreSchema = z.object({
  body: z.object({
    usu_crro: z.string().email().max(50),
    usu_clve: z.string().min(6).max(60),
    rep_nomb: z.string().max(50),
    rep_apel: z.string().max(50),
    rep_rela: z.string().max(20).optional(),
    rep_telf: z.string().max(15).optional(),
    nin_nomb: z.string().max(50),
    nin_apel: z.string().max(50),
    nin_fnac: z.string().datetime().or(z.string()), // Acepta string ISO o date
    nin_gner: z.enum(['M', 'F']).optional()
  })
});

const registerEspSchema = z.object({
  body: z.object({
    usu_codi: z.string().max(10),
    usu_crro: z.string().email().max(50),
    usu_clve: z.string().min(6).max(60),
    esp_codi: z.string().max(11),
    esp_nomb: z.string().max(50),
    esp_apel: z.string().max(50)
  })
});

const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Debe ser un correo electrónico válido')
  })
});

const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'El token es requerido'),
    newPassword: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
  })
});

const completeInvitationSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'El token es requerido'),
    usu_clve: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
    rep_rela: z.string().max(20).optional(),
    rep_telf: z.string().max(15).optional()
  })
});

const updateMeSchema = z.object({
  body: z.object({
    nomb: z.string().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'El nombre no puede exceder 50 caracteres').optional(),
    apel: z.string().min(2, 'El apellido debe tener al menos 2 caracteres').max(50, 'El apellido no puede exceder 50 caracteres').optional(),
    telf: z.string().max(15, 'El teléfono no puede exceder 15 caracteres').optional().nullable(),
    licencia: z.string().max(20, 'La licencia no puede exceder 20 caracteres').optional().nullable(),
    rela: z.string().max(20, 'El parentesco no puede exceder 20 caracteres').optional().nullable(),
    currentPassword: z.string().optional(),
    password: z
      .string()
      .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
      .max(60, 'La nueva contraseña no puede exceder 60 caracteres')
      .regex(/[a-z]/, 'La nueva contraseña debe contener al menos una letra minúscula')
      .regex(/[A-Z]/, 'La nueva contraseña debe contener al menos una letra mayúscula')
      .regex(/[0-9]/, 'La nueva contraseña debe contener al menos un número')
      .optional()
  }).refine((data) => {
    if (data.password && (!data.currentPassword || data.currentPassword.trim() === '')) {
      return false;
    }
    return true;
  }, {
    message: 'Para cambiar la contraseña debes ingresar la contraseña actual',
    path: ['currentPassword']
  })
});

module.exports = { 
  loginSchema, 
  registerRepreSchema, 
  registerEspSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  completeInvitationSchema,
  updateMeSchema
};
