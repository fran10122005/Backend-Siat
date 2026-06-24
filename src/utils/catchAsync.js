/**
 * Wrapper para controladores asíncronos en Express.
 * Elimina la necesidad de usar bloques try/catch en cada controlador.
 * Cualquier error lanzado será capturado y pasado al middleware global (next).
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = catchAsync;
