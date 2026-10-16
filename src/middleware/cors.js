const env = require('../config/env');

// Orígenes permitidos: localhost en desarrollo, la(s) URL(s) del frontend en producción y esquemas móviles Capacitor.
const getAllowedOrigins = () => {
  const frontendUrls = env.FRONTEND_URL ? env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, '')) : [];
  return [
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
    'capacitor://localhost',
    'https://localhost',
    'http://localhost',
    ...frontendUrls
  ];
};

// Validador de origen compartido. Retorna true si el origen es permitido o si no hay origen.
const isOriginAllowed = (origin) => {
  if (!origin) return true;
  // Permitir explícitamente orígenes de la aplicación móvil Capacitor
  if (
    origin === 'capacitor://localhost' ||
    origin === 'https://localhost' ||
    origin === 'http://localhost' ||
    origin.startsWith('capacitor://') ||
    origin.startsWith('ionic://')
  ) {
    return true;
  }
  const allowed = getAllowedOrigins();
  return allowed.some(o => typeof o === 'string' ? o === origin : o.test(origin));
};

module.exports = { getAllowedOrigins, isOriginAllowed };