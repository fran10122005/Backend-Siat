const reportesController = require('./reportes.controller');
const prisma = require('../../config/db');

jest.mock('../../config/db', () => ({
  tr_sesio: { findMany: jest.fn() },
  tm_repre: { findUnique: jest.fn() },
  tr_alert: { findMany: jest.fn() },
  tr_indic: { findMany: jest.fn() },
  tm_pref_notif: { findUnique: jest.fn() },
  tc_activ_ninos: { findMany: jest.fn() }
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

  describe('obtenerNotificacionesRepresentante', () => {
    test('retorna 403 si el rol no es ROL_REP', async () => {
      req.user = { usu_codi: 'U_ADM', rol_codi: 'ROL_ADM' };

      await reportesController.obtenerNotificacionesRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    test('retorna alertas, indicaciones sin leer y recordatorios de rutinas pendientes de hoy', async () => {
      req.user = { usu_codi: 'U001', rol_codi: 'ROL_REP' };
      prisma.tm_repre.findUnique.mockResolvedValue({
        rep_cod: 'R001',
        tm_repre_ninos: [{ nin_codi: 'N001', tm_ninos: { nin_nomb: 'Leo' } }]
      });
      prisma.tr_alert.findMany.mockResolvedValue([
        {
          ale_codi: 'AL01',
          ale_time: new Date('2026-11-09T14:00:00Z'),
          ale_meto: 'SOBRECARGA_SENSORIAL',
          tr_sesio: { nin_codi: 'N001', tm_ninos: { nin_codi: 'N001', nin_nomb: 'Leo' } }
        }
      ]);
      prisma.tr_indic.findMany.mockResolvedValue([
        {
          ind_codi: 'IND01',
          nin_codi: 'N001',
          ind_desc: 'Aplicar técnica sensorial',
          ind_crea: new Date('2026-11-09T13:00:00Z'),
          tm_ninos: { nin_codi: 'N001', nin_nomb: 'Leo' },
          tm_espec: { esp_nomb: 'Dra. Ana', esp_apel: 'Paz' }
        }
      ]);
      prisma.tm_pref_notif.findUnique.mockResolvedValue({ recordatorios_sesiones: true });
      prisma.tc_activ_ninos.findMany.mockResolvedValue([
        {
          acn_codi: 'ACN01',
          act_codi: 'ACT01',
          nin_codi: 'N001',
          tm_activ: { act_codi: 'ACT01', act_trea: 'Respiración Guiada' },
          tm_ninos: { nin_codi: 'N001', nin_nomb: 'Leo' }
        }
      ]);
      prisma.tr_sesio.findMany.mockResolvedValue([]);

      await reportesController.obtenerNotificacionesRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      const { data } = res.json.mock.calls[0][0];
      expect(data.map((i) => i.type)).toEqual(
        expect.arrayContaining(['crisis', 'indication', 'routine_reminder'])
      );
    });

    test('omite recordatorios de rutinas si recordatorios_sesiones === false', async () => {
      req.user = { usu_codi: 'U001', rol_codi: 'ROL_REP' };
      prisma.tm_repre.findUnique.mockResolvedValue({
        rep_cod: 'R001',
        tm_repre_ninos: [{ nin_codi: 'N001' }]
      });
      prisma.tr_alert.findMany.mockResolvedValue([]);
      prisma.tr_indic.findMany.mockResolvedValue([]);
      prisma.tm_pref_notif.findUnique.mockResolvedValue({ recordatorios_sesiones: false });
      prisma.tc_activ_ninos.findMany.mockResolvedValue([
        {
          acn_codi: 'ACN01',
          act_codi: 'ACT01',
          nin_codi: 'N001',
          tm_activ: { act_codi: 'ACT01', act_trea: 'Respiración Guiada' },
          tm_ninos: { nin_codi: 'N001', nin_nomb: 'Leo' }
        }
      ]);
      prisma.tr_sesio.findMany.mockResolvedValue([]);

      await reportesController.obtenerNotificacionesRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [] });
    });
  });
});
