const jwt = require('jsonwebtoken');
const env = require('../../config/env');

jest.mock('../../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-msg' })
}));

const mockPrisma = {
  tm_repre: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
  tm_insti: { findFirst: jest.fn() },
  tm_espec: { findUnique: jest.fn() },
  tm_admin: { findUnique: jest.fn() },
  tm_ninos: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  tm_repre_ninos: { create: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
  tm_usuar: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  tc_asign: { create: jest.fn(), deleteMany: jest.fn() },
  tr_bitac: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  $transaction: jest.fn(async (cb) => cb(mockPrisma))
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

describe('NinosService.bitacoras (crear y actualizar)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('guarda bit_logro y bit_terap junto con campos clínicos al crear bitácora', async () => {
    mockPrisma.tm_repre.findUnique.mockResolvedValue({
      rep_cod: 'R1',
      tm_repre_ninos: [{ nin_codi: 'N1' }]
    });
    mockPrisma.tr_bitac.create.mockImplementation(async (args) => args.data);

    const res = await ninosService.crearBitacora('U1', {
      nin_codi: 'N1',
      date: '2026-11-09',
      sleepHours: 8.5,
      sleepQuality: 'Continuo',
      mood: 'Muy Calmo',
      appetite: 'Excelente',
      positiveNote: 'Pudo cepillarse solo',
      therapyDone: 'Respiración profunda',
      medicationTaken: true,
      sensoryIssues: 'Estable',
      digestion: 'Normal'
    });

    expect(res.bit_logro).toBe('Pudo cepillarse solo');
    expect(res.bit_terap).toBe('Respiración profunda');
    expect(res.bit_cali).toBe('Continuo');
    expect(res.bit_medi).toBe(true);
    expect(res.bit_senso).toBe('Estable');
  });

  it('permite actualizar una bitácora vinculada al representante y bloquea a terceros', async () => {
    mockPrisma.tm_repre.findUnique.mockResolvedValue({
      rep_cod: 'R1',
      tm_repre_ninos: [{ nin_codi: 'N1' }]
    });
    mockPrisma.tr_bitac.findUnique.mockResolvedValue({ bit_codi: 'B001', nin_codi: 'N1' });
    mockPrisma.tr_bitac.update.mockImplementation(async (args) => ({ bit_codi: 'B001', ...args.data }));

    const updated = await ninosService.actualizarBitacora('U1', 'B001', {
      mood: 'Estable',
      positiveNote: 'Logro corregido'
    });

    expect(updated.bit_anim).toBe('Estable');
    expect(updated.bit_logro).toBe('Logro corregido');

    mockPrisma.tr_bitac.findUnique.mockResolvedValue({ bit_codi: 'B002', nin_codi: 'N_OTRO' });
    await expect(ninosService.actualizarBitacora('U1', 'B002', { mood: 'Estable' }))
      .rejects.toThrow('No tiene permisos');
  });
});

describe('NinosService.inviteRepresentative', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna invitationUrl válido, loginUrl, usu_crro y passwordGenerada al registrar nuevo representante', async () => {
    mockPrisma.tm_usuar.findFirst.mockResolvedValue(null);
    mockPrisma.tm_usuar.create.mockResolvedValue({ usu_codi: 'U_NEW1', usu_crro: 'nuevo@repre.com' });
    mockPrisma.tm_espec.findUnique.mockResolvedValue({ esp_codi: 'E_1', ins_codi: 'I001' });
    mockPrisma.tm_ninos.create.mockResolvedValue({ nin_codi: 'N_NEW1', nin_nomb: 'Mateo', nin_apel: 'Gómez' });
    mockPrisma.tm_repre.create.mockResolvedValue({ rep_cod: 'R_NEW1', rep_nomb: 'Laura', rep_apel: 'Gómez', rep_rela: 'Madre' });

    const res = await ninosService.inviteRepresentative('U_ESP1', {
      nin_nomb: 'Mateo',
      nin_apel: 'Gómez',
      nin_fnac: '2019-03-15',
      nin_gner: 'M',
      nin_nivd: 'Nivel 1',
      rep_cedu: '19876543',
      rep_nomb: 'Laura',
      rep_apel: 'Gómez',
      rep_rela: 'Madre',
      rep_telf: '04141234567',
      usu_crro: 'nuevo@repre.com'
    });

    expect(res.reutilizado).toBe(false);
    expect(res.usu_crro).toBe('nuevo@repre.com');
    expect(res.passwordGenerada).toBeTruthy();
    expect(res.loginUrl).toContain('/auth/login');
    expect(res.invitationUrl).toContain('/auth/invite?token=');
    const token = res.invitationUrl.split('token=')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET);
    expect(decoded.usu_codi).toBe('U_NEW1');
    expect(decoded.purpose).toBe('rep_invite');
  });
});