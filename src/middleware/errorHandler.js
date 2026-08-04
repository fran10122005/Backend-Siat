const { Prisma } = require('@prisma/client');

const isProduction = () => process.env.NODE_ENV === 'production';

const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Errores específicos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const target = err.meta && err.meta.target ? String(err.meta.target) : 'campo';
    const map = {
      P2000: { status: 400, error: `Valor demasiado largo para el campo: ${target}.` },
      P2001: { status: 404, error: 'El registro consultado no existe.' },
      P2002: { status: 400, error: `Restricción de duplicidad violada en el campo: ${target}. Ya existe un registro con ese valor.` },
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

  // Errores custom con status (ej. AppError en los controladores)
  const status = err.status || err.statusCode || 500;
  const message = isProduction() && status >= 500
    ? 'Error interno del servidor'
    : (err.message || 'Error interno del servidor');

  res.status(status).json({ error: message });
};

module.exports = errorHandler;
