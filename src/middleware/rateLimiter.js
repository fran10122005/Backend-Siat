const rateLimit = require('express-rate-limit');

// El rate limiter se ejecuta en desarrollo y producción.
// En entorno de pruebas (test) se omite para no interferir con los tests automatizados de Jest.
const skipInTest = () => process.env.NODE_ENV === 'test' || process.env.DISABLE_RATE_LIMIT === 'true';

// Límite global por IP: protege contra abuso general del API (300 req / 15 min)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  statusCode: 429,
  message: { status: 'error', error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
  skip: skipInTest
});

// Límite estricto para endpoints sensibles (login, registro, recuperación de contraseña, passkeys)
// Protege contra fuerza bruta y enumeración de cuentas (10 intentos / 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  statusCode: 429,
  message: { status: 'error', error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' },
  skip: skipInTest
});

module.exports = { globalLimiter, authLimiter };
