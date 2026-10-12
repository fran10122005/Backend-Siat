const adminController = require('./admin.controller');
const adminService = require('./admin.service');
const prisma = require('../../config/db');

jest.mock('./admin.service');
jest.mock('../../config/db', () => ({
  $queryRawUnsafe: jest.fn().mockResolvedValue([{ '?column?': 1 }])
}));

describe('AdminController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      app: { get: jest.fn().mockReturnValue({ engine: { clientsCount: 5 } }) },
      query: { page: '1', limit: '10' }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('getHealth', () => {
    test('devuelve telemetría y métricas del sistema', async () => {
      await adminController.getHealth(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          api: expect.objectContaining({ status: 'Operativo' }),
          db: expect.objectContaining({ status: 'Conectada' }),
          ws: expect.objectContaining({ status: 'Activo', clients: 5 })
        })
      }));
    });
  });

  describe('listNinos', () => {
    test('retorna lista paginada de niños', async () => {
      const mockNinos = { items: [{ nin_codi: 'N001', nin_nomb: 'Juan' }], total: 1 };
      adminService.listNinos.mockResolvedValue(mockNinos);

      await adminController.listNinos(req, res);

      expect(adminService.listNinos).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockNinos });
    });
  });

  describe('listEspecialistas', () => {
    test('retorna lista de especialistas', async () => {
      const mockEsp = [{ esp_codi: 'E001', esp_nomb: 'Dra. María' }];
      adminService.listEspecialistas.mockResolvedValue(mockEsp);

      await adminController.listEspecialistas(req, res);

      expect(adminService.listEspecialistas).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockEsp });
    });
  });

  describe('listAsignaciones', () => {
    test('retorna asignaciones terapeuta-paciente', async () => {
      const mockAsign = [{ asi_codi: 'A001', nin_codi: 'N001', esp_codi: 'E001' }];
      adminService.listAsignaciones.mockResolvedValue(mockAsign);

      await adminController.listAsignaciones(req, res);

      expect(adminService.listAsignaciones).toHaveBeenCalledWith(req.query);
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockAsign });
    });
  });

  describe('reportes programados', () => {
    test('getReporteSchedule retorna la configuración persistida', async () => {
      const mockConfig = { enabled: true, frequency: 'weekly', email: 'admin@funauta.org' };
      adminService.getReporteSchedule.mockResolvedValue(mockConfig);

      await adminController.getReporteSchedule(req, res);

      expect(adminService.getReporteSchedule).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockConfig });
    });

    test('saveReporteSchedule guarda configuración y registra auditoría', async () => {
      const mockUpdated = { enabled: true, frequency: 'daily', email: 'director@funauta.org' };
      req.body = mockUpdated;
      req.user = { usu_codi: 'U001' };
      req.ip = '127.0.0.1';
      adminService.saveReporteSchedule.mockResolvedValue(mockUpdated);

      await adminController.saveReporteSchedule(req, res);

      expect(adminService.saveReporteSchedule).toHaveBeenCalledWith(mockUpdated);
      expect(adminService.logAudit).toHaveBeenCalledWith('U001', 'INFO', expect.any(String), '127.0.0.1');
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockUpdated });
    });

    test('ejecutarReporteProgramado ejecuta chequeo y envía reporte', async () => {
      req.query = { force: 'true' };
      req.user = { usu_codi: 'U001' };
      req.ip = '127.0.0.1';
      const mockResult = { executed: true, sentTo: ['admin@funauta.org'] };
      adminService.checkAndExecuteScheduledReport.mockResolvedValue(mockResult);

      await adminController.ejecutarReporteProgramado(req, res);

      expect(adminService.checkAndExecuteScheduledReport).toHaveBeenCalledWith(true);
      expect(adminService.logAudit).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ success: true, data: mockResult });
    });
  });
});
