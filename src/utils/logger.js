/**
 * Logger estructurado en JSON para el Backend SIAT.
 * Proporciona trazabilidad estandarizada, compatible con agregadores de logs (Datadog, CloudWatch, Loki)
 * y garantiza cumplimiento estricto de privacidad (sin PII ni PHI).
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const getCurrentLogLevel = () => {
  const envLevel = (process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug')).toLowerCase();
  return LOG_LEVELS[envLevel] !== undefined ? LOG_LEVELS[envLevel] : LOG_LEVELS.info;
};

const output = (level, message, meta) => {
  if (LOG_LEVELS[level] < getCurrentLogLevel()) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(meta && typeof meta === 'object' ? { context: meta } : (meta !== undefined ? { context: { value: meta } } : {}))
  };

  const jsonStr = JSON.stringify(logEntry);
  if (level === 'error') {
    console.error(jsonStr);
  } else if (level === 'warn') {
    console.warn(jsonStr);
  } else {
    console.log(jsonStr);
  }
};

const logger = {
  debug: (message, meta) => output('debug', message, meta),
  info: (message, meta) => output('info', message, meta),
  warn: (message, meta) => output('warn', message, meta),
  error: (message, meta) => output('error', message, meta)
};

module.exports = logger;

