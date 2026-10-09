const ninosController = require('./ninos.controller');
const ninosService = require('./ninos.service');

jest.mock('./ninos.service');

describe('NinosController', () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();
    req = {
      user: { usu_codi: 'U001', rol_codi: 'ROL_REP' },
      body: {},
      params: {},
      query: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
  });

  describe('crearNino', () => {
    test('crea un niño para el representante autenticado', async () => {
      const mockResult = { nin_codi: 'N001', nin_nomb: 'Leo' };
      ninosService.crearNinoParaRepresentante.mockResolvedValue(mockResult);

      req.body = { nin_nomb: 'Leo' };
      await ninosController.crearNino(req, res);

      expect(ninosService.crearNinoParaRepresentante).toHaveBeenCalledWith('U001', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Niño registrado exitosamente',
        data: mockResult
      });
    });
  });

  describe('misNinos', () => {
    test('retorna los niños vinculados al usuario', async () => {
      const mockNinos = [{ nin_codi: 'N001', nin_nomb: 'Leo' }];
      ninosService.getMisNinos.mockResolvedValue(mockNinos);

      await ninosController.misNinos(req, res);

      expect(ninosService.getMisNinos).toHaveBeenCalledWith('U001', 'ROL_REP');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockNinos });
    });
  });

  describe('configurarUmbrales', () => {
    test('configura los umbrales de alerta del paciente', async () => {
      const mockResult = { umb_codi: 'UMB01' };
      ninosService.setUmbral.mockResolvedValue(mockResult);

      req.params = { nin_codi: 'N001' };
      req.body = { bpm_max: 120 };
      await ninosController.configurarUmbrales(req, res);

      expect(ninosService.setUmbral).toHaveBeenCalledWith('N001', req.body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        message: 'Umbral configurado',
        data: mockResult
      });
    });
  });

  describe('buscarRepresentante', () => {
    test('retorna datos del representante por cédula', async () => {
      const mockRepre = { rep_nomb: 'María', rep_cedu: '12345678' };
      ninosService.buscarRepresentantePorCedula.mockResolvedValue(mockRepre);

      req.query = { cedula: '12345678' };
      await ninosController.buscarRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockRepre });
    });

    test('retorna objeto no encontrado si no existe', async () => {
      ninosService.buscarRepresentantePorCedula.mockResolvedValue(null);

      req.query = { cedula: '99999999' };
      await ninosController.buscarRepresentante(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: { encontrado: false } });
    });
  });

  describe('obtenerFichaClinica', () => {
    test('obtiene la ficha médica completa del menor', async () => {
      const mockFicha = { nino: { nin_codi: 'N001' }, sesiones: [] };
      ninosService.getFichaClinica.mockResolvedValue(mockFicha);

      req.params = { nin_codi: 'N001' };
      await ninosController.obtenerFichaClinica(req, res);

      expect(ninosService.getFichaClinica).toHaveBeenCalledWith('N001');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: mockFicha });
    });
  });
});
