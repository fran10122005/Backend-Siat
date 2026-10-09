const reportesController = require('./reportes.controller');
const prisma = require('../../config/db');

jest.mock('../../config/db', () => ({
  tr_sesio: { findMany: jest.fn() },
  tm_repre: { findUnique: jest.fn() },
  tr_alert: { findMany: jest.fn() }
}));

describe('ReportesController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      params: {},
      user: { usu_codi: 'U001' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getHistorialNino', () => {
    test('obtiene el historial de sesiones con alertas', async () => {
      const mockHistorial = [
        { ses_codi: 'SES01', nin_codi: 'N001', tr_alert: [], tr_estad: [] }
      ];
      prisma.tr_sesio.findMany.mockResolvedValue(mockHistorial);

      req.params = { nin_codi: 'N001' };
      await reportesController.getHistorialNino(req, res);

      expect(prisma.tr_sesio.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { nin_codi: 'N001' }
      }));
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockHistorial });
    });
  });

  describe('obtenerAlertasRepresentante', () => {
    test('retorna 404 si el representante no existe', async () => {
      prisma.tm_repre.findUnique.mockResolvedValue(null);

      await reportesController.obtenerAlertasRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Representante no encontrado' });
    });

    test('retorna lista vacía si el representante no tiene niños vinculados', async () => {
      prisma.tm_repre.findUnique.mockResolvedValue({
        rep_cod: 'R001',
        tm_repre_ninos: []
      });

      await reportesController.obtenerAlertasRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [] });
    });

    test('retorna las alertas formateadas de los niños del representante', async () => {
      prisma.tm_repre.findUnique.mockResolvedValue({
        rep_cod: 'R001',
        tm_repre_ninos: [{ nin_codi: 'N001' }]
      });

      prisma.tr_alert.findMany.mockResolvedValue([
        {
          ale_codi: 'A001',
          ale_time: new Date(),
          ale_meto: 'ESTRES_SEVERO',
          tr_sesio: { tm_ninos: { nin_nomb: 'Leo' } }
        }
      ]);

      await reportesController.obtenerAlertasRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ok',
        data: expect.arrayContaining([
          expect.objectContaining({ nin_nomb: 'Leo', ale_meto: 'ESTRES_SEVERO' })
        ])
      }));
    });
  });
});
