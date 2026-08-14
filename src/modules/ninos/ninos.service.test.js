const mockPrisma = {
  tm_repre: { findUnique: jest.fn(), findFirst: jest.fn() },
  tm_insti: { findFirst: jest.fn() },
  tm_ninos: { create: jest.fn(), findFirst: jest.fn() },
  tm_repre_ninos: { create: jest.fn() },
  tm_usuar: { findFirst: jest.fn() }
};

jest.mock('../../config/db', () => mockPrisma);

const ninosService = require('./ninos.service');

describe('NinosService.crearNinoParaRepresentante', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza error si el usuario no es representante', async () => {
    mockPrisma.tm_repre.findUnique.mockResolvedValue(null);
    await expect(ninosService.crearNinoParaRepresentante('U1', {})).rejects.toThrow('no está registrado como representante');
  });

  it('crea un nuevo niño y lo vincula al representante vía la tabla pivote N:M', async () => {
    mockPrisma.tm_repre.findUnique.mockResolvedValue({
      rep_cod: 'R1', usu_codi: 'U1'
    });
    mockPrisma.tm_ninos.findFirst.mockResolvedValue({ ins_codi: 'I001' });
    mockPrisma.tm_ninos.create.mockImplementation(async (args) => args.data);

    const result = await ninosService.crearNinoParaRepresentante('U1', {
      nin_codi: 'N999999999', nin_nomb: 'Leo', nin_apel: 'López',
      nin_fnac: '2018-05-10', nin_gner: 'M', nin_nivd: 'Nivel 1'
    });

    expect(mockPrisma.tm_ninos.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ins_codi: 'I001', nin_nomb: 'Leo' })
    }));
    expect(mockPrisma.tm_repre_ninos.create).toHaveBeenCalledWith(expect.objectContaining({
      data: { rep_cod: 'R1', nin_codi: 'N999999999' }
    }));
    expect(result.nin_codi).toBe('N999999999');
  });
});

describe('NinosService.buscarRepresentantePorCedula', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna la info del representante activo con su cantidad de niños', async () => {
    mockPrisma.tm_repre.findFirst.mockResolvedValue({
      rep_nomb: 'María', rep_apel: 'Rodríguez', rep_rela: 'Madre',
      rep_telf: '+58 424 1234567', rep_cedu: '12345678',
      tm_usuar: { usu_crro: 'maria@gmail.com' },
      _count: { tm_repre_ninos: 2 }
    });

    const result = await ninosService.buscarRepresentantePorCedula('12345678');

    expect(mockPrisma.tm_repre.findFirst).toHaveBeenCalledWith({
      where: {
        rep_cedu: '12345678',
        tm_usuar: { is: { usu_estd: true } }
      },
      include: {
        tm_usuar: true,
        _count: { select: { tm_repre_ninos: true } }
      }
    });
    expect(result).toEqual({
      encontrado: true, rep_nomb: 'María', rep_apel: 'Rodríguez',
      rep_rela: 'Madre', rep_telf: '+58 424 1234567', rep_cedu: '12345678',
      usu_crro: 'maria@gmail.com', ninos: 2
    });
  });

  it('retorna null si no hay representante con esa cédula', async () => {
    mockPrisma.tm_repre.findFirst.mockResolvedValue(null);
    expect(await ninosService.buscarRepresentantePorCedula('87654321')).toBeNull();
    expect(mockPrisma.tm_repre.findFirst).toHaveBeenCalled();
  });

  it('retorna null si la cédula está vacía', async () => {
    expect(await ninosService.buscarRepresentantePorCedula('')).toBeNull();
    expect(mockPrisma.tm_repre.findFirst).not.toHaveBeenCalled();
  });
});