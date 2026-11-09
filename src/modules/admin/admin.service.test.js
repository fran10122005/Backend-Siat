const mockPrisma = {
  tm_espec: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  tm_usuar: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  $transaction: jest.fn(async (cb) => cb(mockPrisma)),
};

jest.mock('../../config/db', () => mockPrisma);
jest.mock('../auth/auth.service', () => ({
  registerEspecialista: jest.fn(),
}));
jest.mock('../../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'ok' }),
}));

const authService = require('../auth/auth.service');
const adminService = require('./admin.service');

describe('AdminService Especialistas (esp_cedu vs esp_codi)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createEspecialista genera esp_codi interno y pasa esp_cedu separado', async () => {
    authService.registerEspecialista.mockResolvedValue({
      user: { usu_codi: 'U1' },
      esp: { esp_codi: 'E123456', esp_cedu: '19876543' },
    });

    await adminService.createEspecialista({
      email: 'doc@siat.com',
      nombre: 'Elena',
      apellido: 'Ramos',
      esp_cedu: ' 19876543 ',
      esp_tdoc: 'V',
      esc_codi: 'ESC1',
    });

    const payload = authService.registerEspecialista.mock.calls[0][0];
    expect(payload.esp_codi).toMatch(/^E/);
    expect(payload.esp_codi).not.toBe('19876543');
    expect(payload.esp_cedu).toBe('19876543');
    expect(payload.esp_tdoc).toBe('V');
  });

  test('updateEspecialista actualiza esp_cedu/esp_tdoc y rechaza duplicados', async () => {
    mockPrisma.tm_espec.findUnique.mockResolvedValue({
      esp_codi: 'E001',
      usu_codi: 'U001',
      esp_cedu: '12345678',
    });
    mockPrisma.tm_espec.findFirst.mockResolvedValue(null);
    mockPrisma.tm_espec.update.mockResolvedValue({
      esp_codi: 'E001',
      esp_cedu: '20111222',
      esp_tdoc: 'E',
    });

    await adminService.updateEspecialista('E001', {
      esp_cedu: ' 20111222 ',
      esp_tdoc: 'E',
    });

    expect(mockPrisma.tm_espec.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { esp_codi: 'E001' },
      data: expect.objectContaining({ esp_cedu: '20111222', esp_tdoc: 'E' }),
    }));

    mockPrisma.tm_espec.findFirst.mockResolvedValue({ esp_codi: 'E002' });
    await expect(adminService.updateEspecialista('E001', { esp_cedu: '99887766' }))
      .rejects.toThrow('cédula / documento ingresado ya está en uso');
  });

  test('listEspecialistas incluye esp_cedu en la búsqueda por texto', async () => {
    mockPrisma.tm_espec.findMany.mockResolvedValue([]);
    await adminService.listEspecialistas({ search: '19876' });

    const call = mockPrisma.tm_espec.findMany.mock.calls[0][0];
    expect(call.where.OR).toEqual(
      expect.arrayContaining([
        { esp_cedu: { contains: '19876', mode: 'insensitive' } },
        { esp_codi: { contains: '19876', mode: 'insensitive' } },
      ]),
    );
  });
});
