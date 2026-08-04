const mockPrisma = {
  tm_ninos: { findUnique: jest.fn() },
  tm_activ: { findUnique: jest.fn() },
  tm_dispo: { findUnique: jest.fn() },
  tr_sesio: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() }
};

jest.mock('../../config/db', () => mockPrisma);

const sesionesService = require('./sesiones.service');

describe('SesionesService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('iniciarSesion', () => {
    it('lanza error si el niño no existe', async () => {
      mockPrisma.tm_ninos.findUnique.mockResolvedValue(null);
      await expect(sesionesService.iniciarSesion({ nin_codi: 'N1' })).rejects.toThrow('Niño no encontrado');
    });

    it('crea la sesión cuando niño, actividad y dispositivo existen', async () => {
      mockPrisma.tm_ninos.findUnique.mockResolvedValue({ nin_codi: 'N1' });
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'A1' });
      mockPrisma.tm_dispo.findUnique.mockResolvedValue({ dis_codi: 'D1' });
      mockPrisma.tr_sesio.create.mockImplementation(async (args) => args.data);

      const result = await sesionesService.iniciarSesion({ nin_codi: 'N1', act_codi: 'A1', dis_codi: 'D1' });

      expect(mockPrisma.tr_sesio.create).toHaveBeenCalled();
      expect(result.ses_codi).toMatch(/^S/);
      expect(result.nin_codi).toBe('N1');
    });
  });

  describe('cerrarSesion', () => {
    it('lanza error si la sesión no existe', async () => {
      mockPrisma.tr_sesio.findUnique.mockResolvedValue(null);
      await expect(sesionesService.cerrarSesion('S1')).rejects.toThrow('Sesión no encontrada');
    });

    it('lanza error si la sesión ya está cerrada', async () => {
      mockPrisma.tr_sesio.findUnique.mockResolvedValue({ ses_codi: 'S1', ses_cerr: new Date() });
      await expect(sesionesService.cerrarSesion('S1')).rejects.toThrow('ya se encuentra cerrada');
    });

    it('cierra la sesión estableciendo ses_cerr', async () => {
      mockPrisma.tr_sesio.findUnique.mockResolvedValue({ ses_codi: 'S1', ses_cerr: null });
      mockPrisma.tr_sesio.update.mockImplementation(async (args) => args.data);
      const result = await sesionesService.cerrarSesion('S1', 'nota');
      expect(mockPrisma.tr_sesio.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ ses_cerr: expect.any(Date) })
      }));
      expect(result).toBeTruthy();
    });
  });
});