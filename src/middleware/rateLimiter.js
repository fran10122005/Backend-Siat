const rateLimit = require('express-rate-limit');

// No limitar en entorno de test para no interferir con las pruebas automatizadas
const skipTest = () => process.env.NODE_ENV === 'test';

// Límite global por IP: protege contra abuso general del API
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.' },
  skip: skipTest
});

// Límite estricto para endpoints sensibles (login, registro, recuperación de contraseña)
// Protege contra fuerza bruta y enumeración de cuentas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo en 15 minutos.' },
  skip: skipTest
});

module.exports = { globalLimiter, authLimiter };
