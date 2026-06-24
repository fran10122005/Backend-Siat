const { Prisma } = require('@prisma/client');

const errorHandler = (err, req, res, next) => {
  console.error('Error no manejado:', err);

  // Manejo de errores específicos de Prisma
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Error de restricción única (ej. correo duplicado)
    if (err.code === 'P2002') {
      const field = err.meta && err.meta.target ? err.meta.target : 'campo';
      return res.status(400).json({
        error: `Restricción de duplicidad violada en el campo: ${field}. Ya existe un registro con ese valor.`
      });
    }
    // Error de registro no encontrado
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Registro no encontrado en la base de datos.' });
    }
  }

  // Error de validación de Prisma
  if (err instanceof Prisma.PrismaClientValidationError) {
    return res.status(400).json({ error: 'Error de validación en la consulta a la base de datos. Verifica los datos enviados.' });
  }

  // Otros errores custom que pasemos con un "status" o "statusCode" (ej. en los controladores)
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';

  res.status(status).json({
    error: message,
    // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
