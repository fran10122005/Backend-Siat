const { ZodError } = require('zod');

const validateSchema = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    if (error && (error.errors || error.issues)) {
      const issues = error.errors || error.issues;
      return res.status(400).json({
        error: 'Error de validación',
        detalles: issues.map((e) => ({
          campo: e.path ? e.path.join('.') : 'desconocido',
          mensaje: e.message,
        })),
      });
    }
    next(error);
  }
};

module.exports = { validateSchema };
