const monitoreoController = require('./monitoreo.controller');
const monitoreoService = require('./monitoreo.service');

jest.mock('./monitoreo.service');

describe('MonitoreoController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      app: { get: jest.fn().mockReturnValue({}) },
      body: {},
      validatedBody: null
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('recibirTelemetria', () => {
    test('responde 201 sin alerta cuando los valores son normales', async () => {
      const mockResult = { telemetria: { tel_regi: 80 }, alerta: null };
      monitoreoService.procesarTelemetria.mockResolvedValue(mockResult);

      req.body = { nin_codi: 'N001', bpm: 80 };
      await monitoreoController.recibirTelemetria(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Recepción de telemetría exitosa',
        data: mockResult
      });
    });

    test('responde 201 con mensaje de alerta cuando se detecta una crisis', async () => {
      const mockResult = {
        telemetria: { tel_regi: 145 },
        alerta: { ale_meto: 'ESTRES_SEVERO' }
      };
      monitoreoService.procesarTelemetria.mockResolvedValue(mockResult);

      req.validatedBody = { nin_codi: 'N001', bpm: 145 };
      await monitoreoController.recibirTelemetria(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Alerta registrada y notificada',
        data: mockResult
      });
    });
  });

  describe('obtenerEstadoSimulacion', () => {
    test('devuelve el estado actual de simulación de crisis', async () => {
      monitoreoService.getSimulatedCrisisMode.mockResolvedValue(true);

      await monitoreoController.obtenerEstadoSimulacion(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'ok',
        data: { simulatedCrisisMode: true }
      });
    });
  });

  describe('establecerEstadoSimulacion', () => {
    test('activa la simulación de CRISIS y fuerza el incidente', async () => {
      monitoreoService.setSimulatedCrisisMode.mockResolvedValue();
      monitoreoService.forzarCrisisInmediata.mockResolvedValue({ triggered: true });

      req.body = { estado: 'CRISIS' };
      await monitoreoController.establecerEstadoSimulacion(req, res);

      expect(monitoreoService.setSimulatedCrisisMode).toHaveBeenCalledWith(true);
      expect(monitoreoService.forzarCrisisInmediata).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ok',
        data: expect.objectContaining({ simulatedCrisisMode: true })
      }));
    });

    test('restaura la simulación a CALMA', async () => {
      monitoreoService.setSimulatedCrisisMode.mockResolvedValue();
      monitoreoService.forzarCalmaInmediata.mockResolvedValue({ triggered: false });

      req.body = { estado: 'CALMA' };
      await monitoreoController.establecerEstadoSimulacion(req, res);

      expect(monitoreoService.setSimulatedCrisisMode).toHaveBeenCalledWith(false);
      expect(monitoreoService.forzarCalmaInmediata).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        status: 'ok',
        data: expect.objectContaining({ simulatedCrisisMode: false })
      }));
    });
  });
});
