const { z } = require('zod');

const MOBILE_PHONE_VE_REGEX = /^(04\d{9}|\+584\d{9})$/;
const INST_PHONE_VE_REGEX = /^(0[24]\d{9}|\+58[24]\d{9})$/;
const PERSON_NAME_REGEX = /^[\p{L}\s'\-.]+$/u;
const CEDULA_VE_REGEX = /^\d{6,8}$/;
const PASSPORT_REGEX = /^[A-Z0-9]{6,11}$/i;
const LICENSE_REGEX = /^(CM|MPPS|MPP|\d{4,6})[- ]?\d{3,6}$/i;
const RIF_OR_CODE_REGEX = /^([JGVEP]-\d{8}-\d|[A-Za-z0-9]{2,15})$/i;
const ESC_CODI_REGEX = /^[A-Za-z0-9_-]{2,10}$/;

function getTodayPartsVE() {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Caracas',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(new Date());
    return {
      year: parseInt(parts.find((p) => p.type === 'year').value, 10),
      month: parseInt(parts.find((p) => p.type === 'month').value, 10),
      day: parseInt(parts.find((p) => p.type === 'day').value, 10),
    };
  } catch (_) {
    const now = new Date();
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate(),
    };
  }
}

function parseCalendarDate(value) {
  if (!value) return null;
  const raw = String(value).trim();
  const ymdMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (
      isNaN(probe.getTime()) ||
      probe.getUTCFullYear() !== year ||
      probe.getUTCMonth() + 1 !== month ||
      probe.getUTCDate() !== day
    ) {
      return null;
    }
    return { year, month, day, probe };
  }
  const parsed = new Date(raw);
  if (isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getUTCFullYear(),
    month: parsed.getUTCMonth() + 1,
    day: parsed.getUTCDate(),
    probe: parsed,
  };
}

function calcAgeYears(value) {
  const parsed = parseCalendarDate(value);
  if (!parsed) return null;
  const today = getTodayPartsVE();
  let age = today.year - parsed.year;
  const monthDiff = today.month - parsed.month;
  if (monthDiff < 0 || (monthDiff === 0 && today.day < parsed.day)) {
    age -= 1;
  }
  return age;
}

function isFutureCalendarDate(value) {
  const parsed = parseCalendarDate(value);
  if (!parsed) return true;
  const today = getTodayPartsVE();
  if (parsed.year !== today.year) return parsed.year > today.year;
  if (parsed.month !== today.month) return parsed.month > today.month;
  return parsed.day > today.day;
}

function fechaValida(value) {
  if (!value) return true;
  return parseCalendarDate(value) !== null;
}

function fechaNoFutura(value) {
  if (!value) return true;
  const parsed = parseCalendarDate(value);
  if (!parsed) return false;
  if (parsed.year < 1900) return false;
  return !isFutureCalendarDate(value);
}

function isDateInAgeRange(value, minAge = 12, maxAge = 75) {
  if (!value) return true;
  const parsed = parseCalendarDate(value);
  if (!parsed) return false;
  if (isFutureCalendarDate(value)) return false;
  const age = calcAgeYears(value);
  return age !== null && age >= minAge && age <= maxAge;
}

function getAgeValidationError(value, minAge = 12, maxAge = 75) {
  if (!value) return '';
  const parsed = parseCalendarDate(value);
  if (!parsed) return 'Fecha de nacimiento inválida';
  if (isFutureCalendarDate(value)) return 'La fecha de nacimiento no puede ser futura';
  const age = calcAgeYears(value);
  if (age === null) return 'Fecha de nacimiento inválida';
  if (age < minAge) return `La edad mínima permitida es ${minAge} años`;
  if (age > maxAge) return `La edad máxima permitida es ${maxAge} años`;
  return '';
}

function documentoValido(value, tdoc = 'V') {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  const doc = String(value).trim().toUpperCase();
  if (tdoc === 'P') {
    return PASSPORT_REGEX.test(doc);
  }
  return CEDULA_VE_REGEX.test(doc);
}

function telefonoMovilValido(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  return MOBILE_PHONE_VE_REGEX.test(String(value).trim());
}

function telefonoInstValido(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  return INST_PHONE_VE_REGEX.test(String(value).trim());
}

function licenciaValida(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  return LICENSE_REGEX.test(String(value).trim());
}

function isValidHttpUrl(value) {
  if (value === undefined || value === null || String(value).trim() === '') return true;
  try {
    const u = new URL(String(value).trim());
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch (_) {
    return false;
  }
}

const strongPasswordSchema = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(60, 'La contraseña no puede exceder 60 caracteres')
  .regex(/[a-z]/, 'La contraseña debe contener al menos una letra minúscula')
  .regex(/[A-Z]/, 'La contraseña debe contener al menos una letra mayúscula')
  .regex(/[0-9]/, 'La contraseña debe contener al menos un número');

module.exports = {
  MOBILE_PHONE_VE_REGEX,
  INST_PHONE_VE_REGEX,
  PERSON_NAME_REGEX,
  CEDULA_VE_REGEX,
  PASSPORT_REGEX,
  LICENSE_REGEX,
  RIF_OR_CODE_REGEX,
  ESC_CODI_REGEX,
  getTodayPartsVE,
  parseCalendarDate,
  calcAgeYears,
  isFutureCalendarDate,
  fechaValida,
  fechaNoFutura,
  isDateInAgeRange,
  getAgeValidationError,
  documentoValido,
  telefonoMovilValido,
  telefonoInstValido,
  licenciaValida,
  isValidHttpUrl,
  strongPasswordSchema,
};

