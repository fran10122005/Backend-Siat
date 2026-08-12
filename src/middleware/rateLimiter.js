const rateLimit = require('express-rate-limit');

// El rate limiter solo se activa en producción.
// En desarrollo/test se omite para no interferir con pruebas manuales y automatizadas.
const skipNotProduction = () => process.env.NODE_ENV !== 'production';

// Límite global por IP: protege contra abuso general del API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
  skip: skipNotProduction
});

// Límite estricto para endpoints sensibles (login, registro, recuperación de contraseña)
// Protege contra fuerza bruta y enumeración de cuentas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' },
  skip: skipNotProduction
});

module.exports = { globalLimiter, authLimiter };
