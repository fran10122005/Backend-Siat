const {
  getTodayPartsVE,
  getAgeValidationError,
  isDateInAgeRange,
  documentoValido,
  telefonoMovilValido,
  telefonoInstValido,
  licenciaValida,
  strongPasswordSchema,
} = require('./validators');

const pad2 = (n) => String(n).padStart(2, '0');

describe('Backend validators — Reglas VE, Edad 12–75 y Contraseña Fuerte', () => {
  test('telefonoMovilValido acepta solo 04XXXXXXXXX o +584XXXXXXXXX sin espacios ni guiones', () => {
    expect(telefonoMovilValido('04120000000')).toBe(true);
    expect(telefonoMovilValido('+584120000000')).toBe(true);
    expect(telefonoMovilValido('')).toBe(true);
    expect(telefonoMovilValido(null)).toBe(true);

    expect(telefonoMovilValido('0412-0000000')).toBe(false);
    expect(telefonoMovilValido('+58 4120000000')).toBe(false);
    expect(telefonoMovilValido('02121234567')).toBe(false);
    expect(telefonoMovilValido('0412123456')).toBe(false);
  });

  test('telefonoInstValido acepta fijos 02XX y móviles 04XX en formato estricto', () => {
    expect(telefonoInstValido('02121234567')).toBe(true);
    expect(telefonoInstValido('+582121234567')).toBe(true);
    expect(telefonoInstValido('04141234567')).toBe(true);
    expect(telefonoInstValido('0212-1234567')).toBe(false);
    expect(telefonoInstValido('+58 212 1234567')).toBe(false);
  });

  test('documentoValido distingue cédula numérica (V/E) vs pasaporte alfanumérico (P)', () => {
    expect(documentoValido('12345678', 'V')).toBe(true);
    expect(documentoValido('123456', 'E')).toBe(true);
    expect(documentoValido('ik', 'V')).toBe(false);
    expect(documentoValido('12345', 'V')).toBe(false);

    expect(documentoValido('P123AB', 'P')).toBe(true);
    expect(documentoValido('ab1234567', 'P')).toBe(true);
    expect(documentoValido('AB12', 'P')).toBe(false);
  });

  test('getAgeValidationError valida límites exactos de 12 a 75 años y fechas inválidas', () => {
    const today = getTodayPartsVE();
    const minValidBirth = `${today.year - 75}-${pad2(today.month)}-${pad2(today.day)}`;
    const maxValidBirth = `${today.year - 12}-${pad2(today.month)}-${pad2(today.day)}`;
    const tooYoungBirth = `${today.year - 10}-${pad2(today.month)}-${pad2(today.day)}`;
    const tooOldBirth = `${today.year - 76}-01-01`;
    const futureBirth = `${today.year + 1}-01-01`;

    expect(getAgeValidationError(minValidBirth, 12, 75)).toBe('');
    expect(getAgeValidationError(maxValidBirth, 12, 75)).toBe('');
    expect(isDateInAgeRange(maxValidBirth, 12, 75)).toBe(true);

    expect(getAgeValidationError(tooYoungBirth, 12, 75)).toMatch(/mínima permitida es 12/i);
    expect(getAgeValidationError(tooOldBirth, 12, 75)).toMatch(/máxima permitida es 75/i);
    expect(getAgeValidationError(futureBirth, 12, 75)).toMatch(/futura/i);
    expect(getAgeValidationError('2026-02-30', 12, 75)).toMatch(/inválida/i);
  });

  test('licenciaValida valida formatos CM-XXXXXX / MPPS-XXXXXX', () => {
    expect(licenciaValida('CM-90800')).toBe(true);
    expect(licenciaValida('MPPS-123456')).toBe(true);
    expect(licenciaValida('12345-678')).toBe(true);
    expect(licenciaValida('abc')).toBe(false);
  });

  test('strongPasswordSchema exige min 8, max 60, minúscula, mayúscula y número', () => {
    expect(strongPasswordSchema.safeParse('Siat2026A').success).toBe(true);
    expect(strongPasswordSchema.safeParse('Abcdefg!').success).toBe(false);
    expect(strongPasswordSchema.safeParse('siat2026').success).toBe(false);
    expect(strongPasswordSchema.safeParse('SIAT2026').success).toBe(false);
    expect(strongPasswordSchema.safeParse('Siat12').success).toBe(false);
    expect(strongPasswordSchema.safeParse(`Aa1${'x'.repeat(60)}`).success).toBe(false);
  });
});

