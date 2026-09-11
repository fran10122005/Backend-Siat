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

// Límite específico para telemetría IoT por IP: evita abuso bruto (300 req / 1 min por IP)
const telemetriaIpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  statusCode: 429,
  message: { status: 'error', error: 'Límite global de telemetría por IP excedido. Máximo 300 peticiones por minuto.' },
  skip: skipInTest
});

// Límite específico para telemetría IoT por paciente: evita saturación de un solo niño (120 req / 1 min por nin_codi)
const telemetriaNinoLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  limit: 120,
  keyGenerator: (req) => req.body?.nin_codi || req.ip || 'anonymous',
  validate: { keyGeneratorIpFallback: false },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  statusCode: 429,
  message: { status: 'error', error: 'Límite de telemetría para este paciente excedido. Máximo 120 peticiones por minuto.' },
  skip: skipInTest
});


module.exports = { globalLimiter, authLimiter, telemetriaIpLimiter, telemetriaNinoLimiter };
