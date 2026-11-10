const { Prisma } = require('@prisma/client');

const isProduction = () => process.env.NODE_ENV === 'production';

const UNIQUE_FIELD_MAP = {
  usu_crro: {
    campo: 'usu_crro',
    error: 'El correo electrónico ya está registrado en el sistema.',
  },
  esp_cedu: {
    campo: 'esp_cedu',
    error: 'Ya existe un especialista registrado con ese número de cédula o documento.',
  },
  rep_cedu: {
    campo: 'rep_cedu',
    error: 'Ya existe un representante registrado con ese número de cédula.',
  },
  dis_sral: {
    campo: 'dis_sral',
    error: 'El serial del dispositivo ya está registrado.',
  },
  ins_codi: {
    campo: 'ins_codi',
    error: 'Ya existe una institución registrada con ese RIF o código.',
  },
  esc_codi: {
    campo: 'esc_codi',
    error: 'Ya existe una especialidad registrada con ese código.',
  },
};

const extractUniqueCampo = (meta) => {
  const raw = Array.isArray(meta?.target) ? meta.target.join(',') : String(meta?.target || '');
  const matchedKey = Object.keys(UNIQUE_FIELD_MAP).find((key) => raw.includes(key));
  return matchedKey ? UNIQUE_FIELD_MAP[matchedKey] : null;
};

const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Errores específicos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const target = Array.isArray(err.meta?.target)
      ? err.meta.target.join(', ')
      : (err.meta && err.meta.target ? String(err.meta.target) : 'campo');

    if (err.code === 'P2002') {
      const mappedUnique = extractUniqueCampo(err.meta);
      return res.status(409).json({
        error: mappedUnique ? mappedUnique.error : `Ya existe un registro con ese valor en ${target}.`,
        ...(mappedUnique ? { campo: mappedUnique.campo } : {}),
      });
    }

    const map = {
      P2000: { status: 400, error: `Valor demasiado largo para el campo: ${target}.` },
      P2001: { status: 404, error: 'El registro consultado no existe.' },
      P2003: { status: 400, error: `Violación de llave foránea en el campo: ${target}. El registro referenciado no existe.` },
      P2010: { status: 500, error: 'Error de base de datos al ejecutar la consulta.' },
      P2025: { status: 404, error: 'Registro no encontrado en la base de datos.' }
    };
    const mapped = map[err.code];
    if (mapped) return res.status(mapped.status).json({ error: mapped.error });
  }

  // Error de validación de Prisma
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Error de validación en la consulta a la base de datos. Verifica los datos enviados.' });
  }

  // Errores custom con status (ej. AppError usa statusCode numérico y status string 'fail'/'error')
  const candidateStatus = typeof err.statusCode === 'number'
    ? err.statusCode
    : (typeof err.status === 'number' ? err.status : 500);
  const status = candidateStatus >= 100 && candidateStatus <= 599 ? candidateStatus : 500;
  if (status >= 500 && process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      Sentry.captureException(err);
    } catch (_) {}
  }

  const message = isProduction() && status >= 500
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  res.status(status).json({
    error: message,
    ...(err.campo ? { campo: err.campo } : {}),
  });
};

module.exports = errorHandler;
