const validateSchema = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    // Exponer los datos validados/saneados (Zod .trim() / eliminación de claves desconocidas)
    // tanto en req.validated* como en req.body para compatibilidad con todos los controladores.
    req.validatedBody = result.body;
    if (result.body !== undefined) {
      req.body = result.body;
    }
    req.validatedQuery = result.query;
    req.validatedParams = result.params;
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
