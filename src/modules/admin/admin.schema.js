const { z } = require('zod');

// --- Especialistas ---
const createEspecialistaSchema = z.object({
  body: z.object({
    email: z.string().email('Correo electrónico inválido'),
    nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
    apellido: z.string().min(2, 'El apellido debe tener al menos 2 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    esp_codi: z.string().max(11).optional(),
    esp_licencia: z.string().max(50).optional(),
    esp_telf: z.string().max(15).optional(),
    esc_codi: z.string().max(10, 'Código de especialidad inválido'),
    esp_gner: z.enum(['M', 'F']).optional(),
    ins_codi: z.string().max(11, 'Código de institución inválido').optional(), // Será forzado si es ROL_ADM
  })
});

const updateEspecialistaSchema = z.object({
  params: z.object({
    esp_codi: z.string().min(1, 'El código de especialista es requerido')
  }),
  body: z.object({
    esp_nomb: z.string().min(2).optional(),
    esp_apel: z.string().min(2).optional(),
    usu_crro: z.string().email().optional()
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
    esp_codi: z.string().min(1, 'El código del especialista es requerido')
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
    esc_codi: z.string().min(1).max(10),
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
