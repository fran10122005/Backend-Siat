const { z } = require('zod');
const { Prisma } = require('@prisma/client');
const { validateSchema } = require('./validate.middleware');
const errorHandler = require('./errorHandler');
const AppError = require('../utils/AppError');

function mockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('validateSchema Middleware y errorHandler', () => {
  test('propaga strings recortados (.trim) hacia req.body y req.validatedBody', () => {
    const schema = z.object({
      body: z.object({
        esp_nomb: z.string().trim().min(2),
        usu_crro: z.string().trim().email(),
      }),
    });

    const req = {
      body: {
        esp_nomb: '  Carlos   ',
        usu_crro: ' carlos@clinica.com ',
        extraNoPermitido: 'foo',
      },
      query: {},
      params: {},
    };
    const res = mockRes();
    const next = jest.fn();

    validateSchema(schema)(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({
      esp_nomb: 'Carlos',
      usu_crro: 'carlos@clinica.com',
    });
    expect(req.validatedBody).toEqual(req.body);
  });

  test('retorna 400 con detalles[].campo ante errores de esquema Zod', () => {
    const schema = z.object({
      body: z.object({
        usu_crro: z.string().email('Correo inválido'),
        usu_clve: z.string().min(8, 'Mínimo 8 caracteres'),
      }),
    });

    const req = {
      body: { usu_crro: 'no-es-correo', usu_clve: '123' },
      query: {},
      params: {},
    };
    const res = mockRes();
    const next = jest.fn();

    validateSchema(schema)(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Error de validación',
      detalles: [
        { campo: 'body.usu_crro', mensaje: 'Correo inválido' },
        { campo: 'body.usu_clve', mensaje: 'Mínimo 8 caracteres' },
      ],
    });
  });

  test('errorHandler expone campo exacto en Prisma P2002 (409) y AppError (409)', () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    try {
      const p2002 = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.22.0',
        meta: { target: ['usu_crro'] },
      });

      const resPrisma = mockRes();
      errorHandler(p2002, {}, resPrisma, jest.fn());
      expect(resPrisma.status).toHaveBeenCalledWith(409);
      expect(resPrisma.json).toHaveBeenCalledWith({
        error: 'El correo electrónico ya está registrado en el sistema.',
        campo: 'usu_crro',
      });

      const appErr = new AppError('La cédula ya está en uso', 409, 'esp_cedu');
      const resApp = mockRes();
      errorHandler(appErr, {}, resApp, jest.fn());
      expect(resApp.status).toHaveBeenCalledWith(409);
      expect(resApp.json).toHaveBeenCalledWith({
        error: 'La cédula ya está en uso',
        campo: 'esp_cedu',
      });
    } finally {
      console.error = originalConsoleError;
    }
  });
});

