const mockPrisma = {
  tm_repre: { findUnique: jest.fn(), update: jest.fn() },
  tm_insti: { findFirst: jest.fn() },
  tm_ninos: { create: jest.fn() }
};

jest.mock('../../config/db', () => mockPrisma);

const ninosService = require('./ninos.service');

describe('NinosService.crearNinoParaRepresentante', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza error si el usuario no es representante', async () => {
    mockPrisma.tm_repre.findUnique.mockResolvedValue(null);
    await expect(ninosService.crearNinoParaRepresentante('U1', {})).rejects.toThrow('no está registrado como representante');
  });

  it('crea un nuevo niño y vincula al representante', async () => {
    mockPrisma.tm_repre.findUnique.mockResolvedValue({
      rep_cod: 'R1', nin_codi: 'N0', tm_ninos: { ins_codi: 'I001' }
    });
    mockPrisma.tm_ninos.create.mockImplementation(async (args) => args.data);

    const result = await ninosService.crearNinoParaRepresentante('U1', {
      nin_codi: 'N999999999', nin_nomb: 'Leo', nin_apel: 'López',
      nin_fnac: '2018-05-10', nin_gner: 'M', nin_nivd: 'Nivel 1'
    });

    expect(mockPrisma.tm_ninos.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ins_codi: 'I001', nin_nomb: 'Leo' })
    }));
    expect(mockPrisma.tm_repre.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { rep_cod: 'R1' },
      data: { nin_codi: 'N999999999' }
    }));
    expect(result.nin_codi).toBe('N999999999');
  });
});