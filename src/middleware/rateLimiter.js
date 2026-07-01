const rateLimit = require('express-rate-limit');

// Limitador global de peticiones a la API: Máximo 2000 peticiones cada 15 minutos en desarrollo, o 100 en producción
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 100 : 5000, // Aumentado en desarrollo
  message: {
    error: 'Demasiadas solicitudes desde esta dirección IP. Por favor, intente de nuevo en 15 minutos.'
  },
  standardHeaders: true, // Retorna la info del rate limit en los headers 'RateLimit-*'
  legacyHeaders: false, // Deshabilita los headers 'X-RateLimit-*'
});

// Limitador específico para endpoints sensibles (como login)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: process.env.NODE_ENV === 'production' ? 15 : 200, // Aumentado en desarrollo
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
