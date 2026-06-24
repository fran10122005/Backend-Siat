const { customAlphabet } = require('nanoid');

// Alfabeto seguro sin caracteres especiales (garantiza evitar inyecciones raras)
const safeAlphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

/**
 * Genera un ID criptográficamente seguro
 * @param {string} prefix - Prefijo de la tabla (ej. 'U' para usuarios, 'A' para alertas)
 * @param {number} totalLength - Longitud total del ID (por defecto 10 para encajar en VarChar(10))
 */
const generateId = (prefix = '', totalLength = 10) => {
  const nanoLength = totalLength - prefix.length;
  if (nanoLength <= 0) return prefix;
  
  const nanoid = customAlphabet(safeAlphabet, nanoLength);
  return `${prefix}${nanoid()}`;
};

module.exports = { generateId };
