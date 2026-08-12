const { z } = require('zod');

const fechaValida = (value) => {
  if (!value) return true;
  const fecha = new Date(value);
  return !isNaN(fecha.getTime());
};

const fechaNoFutura = (value) => {
  if (!value) return true;
  const fecha = new Date(value);
  return !isNaN(fecha.getTime()) && fecha <= new Date();
};

// Formato de cédula según tipo de documento:
//  V/E: 6-8 dígitos (cédula venezolana/extranjera)
//  P:   alfanumérico de pasaporte (1-3 letras + 4-8 dígitos)
const documentoValido = (value, tdoc) => {
  if (!value) return true;
  const doc = String(value).trim();
  if (tdoc === 'P') {
    return /^[A-Za-z]{1,3}\d{4,8}$/.test(doc);
  }
  return /^\d{6,8}$/.test(doc);
};

const telefonoValido = (value) => {
  if (!value) return true;
  const tel = String(value).trim();
  // Formato venezolano: +58 4XX XXXXXXX o 04XX XXXXXXX
  return /^(\+58|0058|0)?4\d{2}[- ]?\d{3}[- ]?\d{4}$/.test(tel);
};

const licenciaValida = (value) => {
  if (!value) return true;
  const lic = String(value).trim();
  // CM-123456 o MPPS-123456 o alfanumérico de colegiación
  return /^(CM|MPPS|MPP|\d{4,6})[- ]?\d{3,6}$/i.test(lic);
};

// --- Especialistas ---
const createEspecialistaSchema = z.object({
  body: z.object({
    email: z.string().email('Correo electrónico inválido'),
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    esp_codi: z.string().max(11).optional(),
    esp_tdoc: z.enum(['V', 'E', 'P']).optional(),
    esp_fnac: z.string().refine(fechaNoFutura, 'La fecha de nacimiento no puede ser futura').optional(),
    esp_foto: z.string().url('URL de foto inválida').optional(),
    esp_licencia: z.string().max(50).optional(),
    esp_telf: z.string().max(15).optional(),
    esc_codi: z.string().max(10, 'Código de especialidad inválido'),
    esp_gner: z.enum(['M', 'F']).optional(),
    ins_codi: z.string().max(11, 'Código de institución inválido').optional(), // Será forzado si es ROL_ADM
  })
    .refine((data) => documentoValido(data.esp_codi, data.esp_tdoc), {
      message: data => data.esp_tdoc === 'P'
        ? 'El pasaporte debe tener el formato: 1-3 letras seguidas de 4-8 dígitos (Ej. P123456)'
        : 'La cédula debe contener entre 6 y 8 dígitos (Ej. 12345678)',
      path: ['esp_codi']
    })
    .refine((data) => telefonoValido(data.esp_telf), {
      message: 'El teléfono debe tener formato venezolano (Ej. +584121234567)',
      path: ['esp_telf']
    })
    .refine((data) => licenciaValida(data.esp_licencia), {
      message: 'La licencia debe tener el formato CM-XXXXXX o MPPS-XXXXXX',
      path: ['esp_licencia']
    })
});

const updateEspecialistaSchema = z.object({
  params: z.object({
    esp_codi: z.string().min(1, 'El código de especialista es requerido')
  }),
  body: z.object({
    esp_nomb: z.string().min(2).optional(),
    esp_apel: z.string().min(2).optional(),
    esp_tdoc: z.enum(['V', 'E', 'P']).optional(),
    esp_fnac: z.string().refine(fechaNoFutura, 'La fecha de nacimiento no puede ser futura').optional(),
    esp_foto: z.string().url('URL de foto inválida').optional().nullable(),
    esp_licencia: z.string().max(50).optional(),
    esp_telf: z.string().max(15).optional(),
    esp_gner: z.enum(['M', 'F']).optional(),
    esc_codi: z.string().max(10).optional(),
    usu_crro: z.string().email().optional()
  })
    .refine((data) => documentoValido(data.esp_codi, data.esp_tdoc), {
      message: 'El documento ingresado no coincide con el tipo de documento seleccionado',
      path: ['esp_codi']
    })
    .refine((data) => telefonoValido(data.esp_telf), {
      message: 'El teléfono debe tener formato venezolano (Ej. +584121234567)',
      path: ['esp_telf']
    })
    .refine((data) => licenciaValida(data.esp_licencia), {
      message: 'La licencia debe tener el formato CM-XXXXXX o MPPS-XXXXXX',
      path: ['esp_licencia']
    })
});

const toggleEstadoSchema = z.object({
  params: z.object({
    id: z.string().min(1) // Usaremos alias o renombramos en las rutas
  }).catchall(z.any()), // Permitir params dinámicos como esp_codi, ins_codi, etc. a nivel de validación extra si se quiere, pero mejor definimos esquemas específicos.
  body: z.object({
    activo: z.boolean({ required_error: 'El campo activo es requerido y debe ser booleano' })
  })
});

const toggleEspecialistaSchema = z.object({
  params: z.object({ esp_codi: z.string().min(1) }),
  body: z.object({ activo: z.boolean() })
});

// --- Asignaciones ---
const assignPacienteSchema = z.object({
  body: z.object({
    nin_codi: z.string().min(1, 'El código del paciente es requerido'),
    esp_codi: z.string().min(1, 'El código del especialista es requerido'),
    asi_inic: z.string().optional(),
    asi_stdo: z.enum(['Activo', 'Inactivo']).optional()
  })
});

const toggleAsignacionSchema = z.object({
  params: z.object({ asi_codi: z.string().min(1) }),
  body: z.object({ estado: z.string().min(1) })
});

// --- Instituciones ---
const createInstitucionSchema = z.object({
  body: z.object({
    ins_codi: z.string().min(1, 'El código RIF/ID es requerido').max(11),
    ins_nomb: z.string().min(2, 'El nombre de la institución es requerido').max(100),
    ins_dire: z.string().min(5, 'La dirección es requerida'),
    ins_telf: z.string().min(5).max(15),
    ins_pers: z.string().max(50).optional()
  })
});

const updateInstitucionSchema = z.object({
  params: z.object({ ins_codi: z.string().min(1) }),
  body: z.object({
    ins_nomb: z.string().min(2).max(100).optional(),
    ins_dire: z.string().min(5).optional(),
    ins_telf: z.string().min(5).max(15).optional(),
    ins_pers: z.string().max(50).optional()
  })
});

const toggleInstitucionSchema = z.object({
  params: z.object({ ins_codi: z.string().min(1) }),
  body: z.object({ activo: z.boolean() })
});

// --- Especialidades ---
const createEspecialidadSchema = z.object({
  body: z.object({
    esc_codi: z.string().min(1).max(20),
    esc_nomb: z.string().min(2).max(50),
    esc_desc: z.string().optional()
  })
});

const updateEspecialidadSchema = z.object({
  params: z.object({ esc_codi: z.string().min(1) }),
  body: z.object({
    esc_nomb: z.string().min(2).max(50).optional(),
    esc_desc: z.string().optional()
  })
});

const toggleEspecialidadSchema = z.object({
  params: z.object({ esc_codi: z.string().min(1) }),
  body: z.object({ activo: z.boolean() })
});

module.exports = {
  createEspecialistaSchema,
  updateEspecialistaSchema,
  toggleEspecialistaSchema,
  assignPacienteSchema,
  toggleAsignacionSchema,
  createInstitucionSchema,
  updateInstitucionSchema,
  toggleInstitucionSchema,
  createEspecialidadSchema,
  updateEspecialidadSchema,
  toggleEspecialidadSchema
};
