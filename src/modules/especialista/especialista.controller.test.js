const mockPrisma = {
  tm_espec: { findUnique: jest.fn() },
  tr_indic: {
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  tr_incid: {
    findMany: jest.fn(),
    create: jest.fn()
  },
  tr_sesio: {
    findMany: jest.fn()
  }
};

jest.mock('../../config/db', () => mockPrisma);

const controller = require('./especialista.controller');

const buildReq = (overrides = {}) => ({
  user: { usu_codi: 'U1' },
  params: {},
  body: {},
  ...overrides
});

const buildRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('EspecialistaController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('listarIndicaciones', () => {
    it('obtiene la lista de indicaciones para un nino', async () => {
      mockPrisma.tr_indic.findMany.mockResolvedValue([{ ind_codi: 'IND1', ind_desc: 'Test' }]);
      const req = buildReq({ params: { nin_codi: 'N1' } });
      const res = buildRes();
      await controller.listarIndicaciones(req, res);
      expect(mockPrisma.tr_indic.findMany).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ status: 'ok', data: [{ ind_codi: 'IND1', ind_desc: 'Test' }] });
    });
  });

  describe('crearIndicacion', () => {
    it('lanza 400 si faltan campos requeridos', async () => {
      mockPrisma.tm_espec.findUnique.mockResolvedValue({ esp_codi: 'E1' });
      const req = buildReq({ body: { nin_codi: 'N1', ind_tipo: 'Terapéutica' } });
      const res = buildRes();
      await controller.crearIndicacion(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('crea la indicación correctamente', async () => {
      mockPrisma.tm_espec.findUnique.mockResolvedValue({ esp_codi: 'E1' });
      mockPrisma.tr_indic.create.mockImplementation(async (args) => args.data);
      const req = buildReq({
        body: {
          nin_codi: 'N1',
          ind_tipo: 'Terapéutica',
          ind_area: 'Comunicación',
          ind_frec: 'Diaria',
          ind_prio: 'Alta',
          ind_desc: 'Practicar contacto visual 10 min/día'
        }
      });
      const res = buildRes();
      await controller.crearIndicacion(req, res);
      expect(mockPrisma.tr_indic.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('marcarIndicacionLeida', () => {
    it('marca una indicación como leída exitosamente', async () => {
      mockPrisma.tr_indic.update.mockResolvedValue({ ind_codi: 'IND1', ind_leid: true });
      const req = buildReq({ params: { ind_codi: 'IND1' } });
      const res = buildRes();
      await controller.marcarIndicacionLeida(req, res);
      expect(mockPrisma.tr_indic.update).toHaveBeenCalledWith({
        where: { ind_codi: 'IND1' },
        data: { ind_leid: true }
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('crearIncidente', () => {
    it('lanza 400 si faltan campos requeridos', async () => {
      mockPrisma.tm_espec.findUnique.mockResolvedValue({ esp_codi: 'E1' });
      const req = buildReq({
        params: { nin_codi: 'N1' },
        body: { inc_tipo: 'Berrinche' }
      });
      const res = buildRes();
      await controller.crearIncidente(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('crea el incidente correctamente', async () => {
      mockPrisma.tm_espec.findUnique.mockResolvedValue({ esp_codi: 'E1' });
      mockPrisma.tr_incid.create.mockImplementation(async (args) => args.data);
      const req = buildReq({
        params: { nin_codi: 'N1' },
        body: {
          inc_tipo: 'Berrinche',
          inc_dura: '5 min',
          inc_deto: 'Ruido',
          inc_seve: 'Moderada'
        }
      });
      const res = buildRes();
      await controller.crearIncidente(req, res);
      expect(mockPrisma.tr_incid.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('listarAlertasNino', () => {
    it('devuelve alertas vacías si no hay sesiones', async () => {
      mockPrisma.tr_sesio.findMany.mockResolvedValue([]);
      const req = buildReq({ params: { nin_codi: 'N1' } });
      const res = buildRes();
      await controller.listarAlertasNino(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ok', data: [] })
      );
    });

    it('construye alertas con telemetría asociada', async () => {
      const sesion = {
        ses_inic: new Date('2026-08-14T10:00:00'),
        tr_alert: [{ ale_codi: 'AL1', ale_time: new Date('2026-08-14T10:10:00'), ale_meto: 'SOBRECARGA_SENSORIAL' }],
        tr_telem: [
          { tel_marc: 60, tel_regi: 120 },   // 10 min después del inicio
          { tel_marc: 120, tel_regi: 135 }   // 20 min después del inicio
        ]
      };
      mockPrisma.tr_sesio.findMany.mockResolvedValue([sesion]);
      const req = buildReq({ params: { nin_codi: 'N1' } });
      const res = buildRes();
      await controller.listarAlertasNino(req, res);
      const { data } = res.json.mock.calls[0][0];
      expect(data).toHaveLength(1);
      expect(data[0].bpm_max).toBe(135);
      expect(data[0].telemetry.length).toBe(2);
    });
  });
});
