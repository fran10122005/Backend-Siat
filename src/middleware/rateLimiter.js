const rateLimit = require('express-rate-limit');

// Limitador global de peticiones a la API
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: process.env.NODE_ENV === 'production' ? 500 : 5000,
  message: {
    error: 'Demasiadas solicitudes desde esta dirección IP. Por favor, espere un momento e intente de nuevo.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limitador específico para endpoints sensibles (como login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 50 : 500,
  message: {
    error: 'Demasiados intentos de inicio de sesión. Por favor, intente de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  globalLimiter,
  authLimiter
};
