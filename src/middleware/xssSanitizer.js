const xss = require('xss');

/**
 * Configuración estricta de XSS para el Backend SIAT.
 * Elimina cualquier etiqueta HTML (<script>, <iframe>, <img> con onerror, etc.)
 * protegiendo los campos clínicos, diagnósticos y notas terapéuticas contra Stored XSS.
 */
const xssOptions = {
  whiteList: {}, // No permitir etiquetas HTML en texto plano
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style', 'iframe', 'object']
};

// Campos sensibles que no deben modificarse (contraseñas a hashear o payloads binarios WebAuthn)
const EXCLUDED_FIELDS = new Set([
  'password',
  'usu_clve',
  'currentPassword',
  'newPassword',
  'confirmPassword',
  'token',
  'refreshToken',
  'pk_public_key',
  'clientDataJSON',
  'attestationObject',
  'authenticatorData',
  'signature'
]);

function sanitizeValue(value, key = '') {
  if (typeof value === 'string') {
    if (EXCLUDED_FIELDS.has(key)) return value;
    return xss(value, xssOptions);
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key));
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const [k, v] of Object.entries(value)) {
      sanitizedObj[k] = sanitizeValue(v, k);
    }
    return sanitizedObj;
  }
  return value;
}

/**
 * Middleware global de Express para sanitizar entradas en req.body, req.query y req.params.
 */
const xssSanitizer = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};

module.exports = xssSanitizer;
