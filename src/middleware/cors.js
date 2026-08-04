const env = require('../config/env');

// Orígenes permitidos: localhost en desarrollo y la(s) URL(s) del frontend en producción.
// Se usa la misma lista para CORS HTTP (app.js) y CORS de Socket.io (index.js).
const getAllowedOrigins = () => {
  const frontendUrls = env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, ''));
  return [
    /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    ...frontendUrls
  ];
};

// Validador de origen compartido. Retorna true si el origen es permitido o si no hay origen.
const isOriginAllowed = (origin) => {
  const allowed = getAllowedOrigins();
  if (!origin) return true;
  return allowed.some(o => typeof o === 'string' ? o === origin : o.test(origin));
};

module.exports = { getAllowedOrigins, isOriginAllowed };