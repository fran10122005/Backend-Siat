const sesionesController = require('./sesiones.controller');
const sesionesService = require('./sesiones.service');

jest.mock('./sesiones.service');

describe('SesionesController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      validatedBody: {},
      validatedParams: {},
      validatedQuery: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('iniciarSesion', () => {
    test('inicia una nueva sesión clínica', async () => {
      const mockResult = { ses_codi: 'SES01', nin_codi: 'N001' };
      sesionesService.iniciarSesion.mockResolvedValue(mockResult);

      req.validatedBody = { nin_codi: 'N001', act_codi: 'ACT01', dis_codi: 'DIS01' };
      await sesionesController.iniciarSesion(req, res);

      expect(sesionesService.iniciarSesion).toHaveBeenCalledWith(req.validatedBody);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sesión iniciada exitosamente',
        data: mockResult
      });
    });
  });

  describe('cerrarSesion', () => {
    test('cierra la sesión con notas de evolución', async () => {
      const mockResult = { ses_codi: 'SES01', ses_cerr: new Date() };
      sesionesService.cerrarSesion.mockResolvedValue(mockResult);

      req.validatedParams = { ses_codi: 'SES01' };
      req.validatedBody = { ses_nota: 'Excelente progreso' };
      await sesionesController.cerrarSesion(req, res);

      expect(sesionesService.cerrarSesion).toHaveBeenCalledWith('SES01', 'Excelente progreso');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Sesión cerrada exitosamente',
        data: mockResult
      });
    });
  });

  describe('listarActividades', () => {
    test('retorna catálogo paginado de actividades terapéuticas', async () => {
      const mockResult = { items: [{ act_codi: 'ACT01', act_trea: 'Rompecabezas' }], total: 1 };
      sesionesService.listarActividades.mockResolvedValue(mockResult);

      await sesionesController.listarActividades(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockResult });
    });
  });

  describe('crearActividad', () => {
    test('crea una nueva actividad', async () => {
      const mockResult = { act_codi: 'ACT02', act_trea: 'Pintura' };
      sesionesService.crearActividad.mockResolvedValue(mockResult);

      req.validatedBody = { act_trea: 'Pintura', cat_codi: 'CAT01' };
      await sesionesController.crearActividad(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Actividad creada exitosamente',
        data: mockResult
      });
    });
  });

  describe('eliminarActividad', () => {
    test('elimina o archiva una actividad', async () => {
      sesionesService.eliminarActividad.mockResolvedValue({ softDelete: false });

      req.validatedParams = { act_codi: 'ACT01' };
      await sesionesController.eliminarActividad(req, res);

      expect(sesionesService.eliminarActividad).toHaveBeenCalledWith('ACT01');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Actividad eliminada',
        data: { softDelete: false }
      });
    });
  });
});
