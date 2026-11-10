const { z } = require('zod');
const {
  PERSON_NAME_REGEX,
  RIF_OR_CODE_REGEX,
  ESC_CODI_REGEX,
  strongPasswordSchema,
  fechaNoFutura,
  getAgeValidationError,
  documentoValido,
  telefonoMovilValido,
  telefonoInstValido,
  licenciaValida,
  isValidHttpUrl,
} = require('../../utils/validators');

const optionalUrlOrEmpty = z.union([z.string().trim().url('URL inválida'), z.literal('')]).optional().nullable();

const isLogoValid = (val) => {
  if (!val) return true;
  const raw = String(val).trim();
  if (/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/i.test(raw)) return true;
  return isValidHttpUrl(raw);
};

const emailSimpleRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validateAdditionalEmails = (val) => {
  if (!val || !String(val).trim()) return true;
  const parts = String(val).split(',').map((s) => s.trim()).filter(Boolean);
  return parts.every((e) => emailSimpleRegex.test(e));
};

// --- Especialistas ---
const createEspecialistaSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Correo electrónico inválido').max(50),
    nombre: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras'),
    apellido: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras'),
    password: strongPasswordSchema.optional(),
    esp_codi: z.string().trim().max(11).optional(),
    esp_tdoc: z.enum(['V', 'E', 'P']).default('V'),
    esp_cedu: z.string().trim().min(6, 'La cédula / documento debe tener al menos 6 caracteres').max(20),
    esp_fnac: z.string().trim().optional(),
    esp_foto: optionalUrlOrEmpty,
    esp_licencia: z.string().trim().max(50).optional().or(z.literal('')),
    esp_telf: z.string().trim().max(15).optional().or(z.literal('')),
    esc_codi: z.string().trim().min(1, 'La especialidad es requerida').max(10, 'Código de especialidad inválido'),
    esp_gner: z.enum(['M', 'F']).optional(),
    ins_codi: z.string().trim().max(15, 'Código de institución inválido').optional(),
  }).superRefine((data, ctx) => {
    const tdoc = data.esp_tdoc || 'V';
    if (!documentoValido(data.esp_cedu, tdoc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tdoc === 'P'
          ? 'El pasaporte debe tener entre 6 y 11 caracteres alfanuméricos (Ej. P123456)'
          : 'La cédula debe contener entre 6 y 8 dígitos (Ej. 12345678)',
        path: ['esp_cedu'],
      });
    }
    if (data.esp_fnac) {
      const ageErr = getAgeValidationError(data.esp_fnac, 12, 75);
      if (ageErr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: ageErr, path: ['esp_fnac'] });
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

const updateEspecialistaSchema = z.object({
  params: z.object({
    esp_codi: z.string().trim().min(1, 'El código de especialista es requerido')
  }),
  body: z.object({
    esp_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras').optional(),
    esp_apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras').optional(),
    esp_tdoc: z.enum(['V', 'E', 'P']).optional(),
    esp_cedu: z.string().trim().max(20).optional().nullable(),
    esp_fnac: z.string().trim().optional().nullable(),
    esp_foto: optionalUrlOrEmpty,
    esp_licencia: z.string().trim().max(50).optional().nullable().or(z.literal('')),
    esp_telf: z.string().trim().max(15).optional().nullable().or(z.literal('')),
    esp_gner: z.enum(['M', 'F']).optional(),
    esc_codi: z.string().trim().min(1, 'La especialidad es requerida').max(10).optional(),
    usu_crro: z.string().trim().email('Correo electrónico inválido').max(50).optional()
  }).superRefine((data, ctx) => {
    const tdoc = data.esp_tdoc || 'V';
    if (data.esp_cedu && !documentoValido(data.esp_cedu, tdoc)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: tdoc === 'P'
          ? 'El pasaporte debe tener entre 6 y 11 caracteres alfanuméricos (Ej. P123456)'
          : 'La cédula debe contener entre 6 y 8 dígitos (Ej. 12345678)',
        path: ['esp_cedu'],
      });
    }
    if (data.esp_fnac) {
      const ageErr = getAgeValidationError(data.esp_fnac, 12, 75);
      if (ageErr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: ageErr, path: ['esp_fnac'] });
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

const toggleEspecialistaSchema = z.object({
  params: z.object({ esp_codi: z.string().trim().min(1) }),
  body: z.object({ activo: z.boolean() })
});

// --- Usuarios ---
const toggleUserSchema = z.object({
  params: z.object({ usu_codi: z.string().trim().min(1, 'El código de usuario es requerido') }),
  body: z.object({ activo: z.boolean({ required_error: 'El campo activo debe ser booleano' }) })
});

// --- Asignaciones ---
const assignPacienteSchema = z.object({
  body: z.object({
    nin_codi: z.string().trim().min(1, 'El código del paciente es requerido'),
    esp_codi: z.string().trim().min(1, 'El código del especialista es requerido'),
    asi_inic: z.string().trim().optional(),
    asi_stdo: z.enum(['Activo', 'Inactivo']).optional()
  })
});

const toggleAsignacionSchema = z.object({
  params: z.object({ asi_codi: z.string().trim().min(1) }),
  body: z.object({ estado: z.enum(['Activo', 'Inactivo']) })
});

// --- Instituciones ---
const createInstitucionSchema = z.object({
  body: z.object({
    ins_codi: z.string().trim().min(2, 'El código RIF/ID es requerido').max(15)
      .regex(RIF_OR_CODE_REGEX, 'Formato válido: J-12345678-9 o código institucional'),
    ins_nomb: z.string().trim().min(2, 'El nombre de la institución es requerido').max(100),
    ins_dire: z.string().trim().min(5, 'La dirección debe tener al menos 5 caracteres'),
    ins_telf: z.string().trim().max(15).refine(telefonoInstValido, 'Formato válido: 02121234567, 04120000000 o +58...'),
    ins_pers: z.string().trim().max(50).optional().or(z.literal(''))
  })
});

const updateInstitucionSchema = z.object({
  params: z.object({ ins_codi: z.string().trim().min(1) }),
  body: z.object({
    ins_codi: z.string().trim().min(2, 'El RIF o código es requerido').max(15)
      .regex(RIF_OR_CODE_REGEX, 'Formato válido: J-12345678-9 o código institucional').optional(),
    ins_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(100).optional(),
    ins_dire: z.string().trim().min(5, 'La dirección debe tener al menos 5 caracteres').optional(),
    ins_telf: z.string().trim().max(15)
      .refine(telefonoInstValido, 'Formato válido: 02121234567, 04120000000 o +58...').optional(),
    ins_pers: z.string().trim().max(50).optional().nullable().or(z.literal('')),
    ins_emai: z.string().trim().email('Correo institucional inválido').max(120).optional().nullable().or(z.literal('')),
    ins_web: z.string().trim().max(200)
      .refine((v) => !v || isValidHttpUrl(v), 'La URL debe iniciar por http:// o https://')
      .optional().nullable().or(z.literal('')),
    ins_logo: z.string().trim()
      .refine(isLogoValid, 'El logo debe ser una URL o imagen válida')
      .optional().nullable().or(z.literal('')),
    ins_conf: z.record(z.string(), z.any()).optional().nullable()
  })
});

const toggleInstitucionSchema = z.object({
  params: z.object({ ins_codi: z.string().trim().min(1) }),
  body: z.object({ activo: z.boolean() })
});

// --- Especialidades ---
const createEspecialidadSchema = z.object({
  body: z.object({
    esc_codi: z.string().trim().min(2, 'El código debe tener al menos 2 caracteres').max(10, 'El código no puede exceder 10 caracteres')
      .regex(ESC_CODI_REGEX, 'Solo letras, números, guion y guion bajo'),
    esc_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres'),
    esc_desc: z.string().trim().max(500).optional().or(z.literal(''))
  })
});

const updateEspecialidadSchema = z.object({
  params: z.object({ esc_codi: z.string().trim().min(1) }),
  body: z.object({
    esc_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50, 'Máximo 50 caracteres').optional(),
    esc_desc: z.string().trim().max(500).optional().nullable().or(z.literal(''))
  })
});

const toggleEspecialidadSchema = z.object({
  params: z.object({ esc_codi: z.string().trim().min(1) }),
  body: z.object({ activo: z.boolean() })
});

// --- Representantes & Pacientes ---
const updateRepresentanteSchema = z.object({
  params: z.object({ usu_codi: z.string().trim().min(1) }),
  body: z.object({
    rep_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras').optional(),
    rep_apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras').optional(),
    rep_telf: z.string().trim().max(15)
      .refine((v) => !v || telefonoMovilValido(v), 'Formato válido: 04120000000 o +584120000000')
      .optional(),
    rep_rela: z.string().trim().min(2).max(20).optional(),
    rep_fnac: z.string().trim().optional().nullable(),
    rep_foto: optionalUrlOrEmpty,
    rep_cedu: z.string().trim().regex(/^\d{6,8}$/, 'La cédula debe tener entre 6 y 8 dígitos').optional(),
    usu_crro: z.string().trim().email('Correo electrónico inválido').max(50).optional()
  }).superRefine((data, ctx) => {
    if (data.rep_fnac) {
      const ageErr = getAgeValidationError(data.rep_fnac, 12, 75);
      if (ageErr) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: ageErr, path: ['rep_fnac'] });
      }
    }
  })
});

const updateNinoSchema = z.object({
  params: z.object({ nin_codi: z.string().trim().min(1) }),
  body: z.object({
    nin_nomb: z.string().trim().min(2, 'El nombre debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El nombre solo debe contener letras').optional(),
    nin_apel: z.string().trim().min(2, 'El apellido debe tener al menos 2 caracteres').max(50)
      .regex(PERSON_NAME_REGEX, 'El apellido solo debe contener letras').optional(),
    nin_fnac: z.string().trim()
      .refine((v) => !v || fechaNoFutura(v), 'La fecha de nacimiento del paciente no puede ser futura')
      .optional(),
    nin_gner: z.enum(['M', 'F']).optional(),
    nin_nivd: z.string().trim().min(2).max(20).optional(),
    nin_diag: z.string().trim().max(255, 'Máximo 255 caracteres').optional().nullable().or(z.literal('')),
    nin_docs: z.array(z.any()).max(20).optional(),
    nin_foto: optionalUrlOrEmpty,
    sen_tipo: z.string().trim().max(30).optional().nullable().or(z.literal('')),
    sen_nvli: z.string().trim().max(20).optional().nullable().or(z.literal('')),
    sen_nota: z.string().trim().max(255).optional().nullable().or(z.literal(''))
  })
});

const updateNinoFotoSchema = z.object({
  params: z.object({ nin_codi: z.string().trim().min(1) }),
  body: z.object({
    nin_foto: optionalUrlOrEmpty
  })
});

const addNinoDocumentoSchema = z.object({
  params: z.object({ nin_codi: z.string().trim().min(1) }),
  body: z.object({
    doc: z.string().trim().url('La URL del documento es inválida')
  })
});

// --- Reportes Programados ---
const modulesSchema = z.object({
  metricas: z.boolean().optional(),
  pacientes: z.boolean().optional(),
  especialistas: z.boolean().optional(),
  auditoria: z.boolean().optional(),
}).optional();

const saveReporteSchema = z.object({
  body: z.object({
    enabled: z.boolean().optional(),
    frequency: z.enum(['daily', 'weekly', 'monthly']).optional(),
    day: z.string().trim().max(20).optional(),
    time: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Formato de hora inválido (HH:MM)').optional(),
    email: z.string().trim().max(100).optional().or(z.literal('')),
    additionalEmails: z.string().trim().max(500).optional().nullable().or(z.literal('')),
    subject: z.string().trim().max(200).optional(),
    modules: modulesSchema
  }).superRefine((data, ctx) => {
    if (data.enabled) {
      if (!data.email || !emailSimpleRegex.test(data.email)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Ingresa un correo destinatario principal válido para activar los envíos',
          path: ['email'],
        });
      }
      if (data.modules && !Object.values(data.modules).some(Boolean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Selecciona al menos un módulo para incluir en el reporte',
          path: ['modules'],
        });
      }
    } else if (data.email && !emailSimpleRegex.test(data.email)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Correo destinatario principal inválido',
        path: ['email'],
      });
    }
    if (!validateAdditionalEmails(data.additionalEmails)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Uno o más correos adicionales son inválidos (sepáralos por coma)',
        path: ['additionalEmails'],
      });
    }
  })
});

const enviarReporteAhoraSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Ingresa un correo destinatario principal válido').max(100),
    additionalEmails: z.string().trim().max(500).optional().nullable().or(z.literal('')),
    subject: z.string().trim().max(200).optional(),
    modules: modulesSchema
  }).superRefine((data, ctx) => {
    if (!validateAdditionalEmails(data.additionalEmails)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Uno o más correos adicionales son inválidos (sepáralos por coma)',
        path: ['additionalEmails'],
      });
    }
    if (data.modules && !Object.values(data.modules).some(Boolean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Selecciona al menos un módulo para el reporte',
        path: ['modules'],
      });
    }
  })
});

module.exports = {
  createEspecialistaSchema,
  updateEspecialistaSchema,
  toggleEspecialistaSchema,
  toggleUserSchema,
  assignPacienteSchema,
  toggleAsignacionSchema,
  createInstitucionSchema,
  updateInstitucionSchema,
  toggleInstitucionSchema,
  createEspecialidadSchema,
  updateEspecialidadSchema,
  toggleEspecialidadSchema,
  updateRepresentanteSchema,
  updateNinoSchema,
  updateNinoFotoSchema,
  addNinoDocumentoSchema,
  saveReporteSchema,
  enviarReporteAhoraSchema,
};
