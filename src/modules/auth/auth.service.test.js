const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');

jest.mock('../../services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue({ messageId: 'mock-msg' })
}));

const mockPrisma = {
  tm_usuar: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    create: jest.fn()
  },
  tm_insti: { findFirst: jest.fn(), create: jest.fn() },
  tm_ninos: { create: jest.fn() },
  tm_repre: { create: jest.fn(), update: jest.fn() },
  tm_repre_ninos: { create: jest.fn() },
  tm_espec: { update: jest.fn(), create: jest.fn() },
  tm_especi: { findFirst: jest.fn(), create: jest.fn() },
  tm_admin: { update: jest.fn() },
  $transaction: jest.fn(async (cb) => cb(mockPrisma))
};

jest.mock('../../config/db', () => mockPrisma);

const authService = require('./auth.service');

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('retorna token y datos del usuario cuando las credenciales son válidas', async () => {
      const hash = await bcrypt.hash('Clave12345', 4);
      mockPrisma.tm_usuar.findFirst.mockResolvedValue({
        usu_codi: 'U123456789',
        usu_crro: 'admin@siat.com',
        usu_clve: hash,
        usu_estd: true,
        rol_codi: 'ROL_ADM',
        tm_roles: { rol_nomb: 'Administrador' },
        tm_espec: null,
        tm_repre: null,
        tm_admin: { adm_nomb: 'Ana', adm_apel: 'García', ins_codi: 'I001' }
      });

      const result = await authService.login('admin@siat.com', 'Clave12345');

      expect(result.token).toBeTruthy();
      expect(jwt.verify(result.token, env.JWT_SECRET).usu_codi).toBe('U123456789');
      expect(result.user.nombre).toBe('Ana García');
      expect(mockPrisma.tm_usuar.update).toHaveBeenCalled();
    });

    it('lanza error con credenciales inválidas', async () => {
      mockPrisma.tm_usuar.findFirst.mockResolvedValue({
        usu_codi: 'U1', usu_clve: 'hash-invalido', usu_estd: true, rol_codi: 'ROL_REP'
      });
      await expect(authService.login('a@b.com', 'Incorrecta1')).rejects.toThrow('Credenciales inválidas');
    });

    it('lanza error si el usuario no existe o está inactivo', async () => {
      mockPrisma.tm_usuar.findFirst.mockResolvedValue(null);
      await expect(authService.login('no@existe.com', 'Clave12345')).rejects.toThrow('Credenciales inválidas o usuario inactivo');
    });
  });

  describe('registerRepresentante', () => {
    it('lanza error si el correo ya está registrado', async () => {
      mockPrisma.tm_usuar.findFirst.mockResolvedValue({ usu_codi: 'U1' });
      await expect(authService.registerRepresentante({ usu_crro: 'a@b.com' })).rejects.toThrow('El correo ya está registrado');
    });

    it('crea usuario, niño y representante en transacción', async () => {
      mockPrisma.tm_usuar.findFirst.mockResolvedValue(null);
      mockPrisma.tm_insti.findFirst.mockResolvedValue({ ins_codi: 'I001' });
      mockPrisma.tm_usuar.create.mockResolvedValue({ usu_codi: 'U111111111' });
      mockPrisma.tm_ninos.create.mockResolvedValue({ nin_codi: 'N111111111' });
      mockPrisma.tm_repre.create.mockResolvedValue({ rep_cod: 'R111111111' });

      const data = {
        usu_crro: 'padre@siat.com',
        usu_clve: 'Clave12345',
        rep_nomb: 'Pedro',
        rep_apel: 'López',
        nin_nomb: 'Leo',
        nin_apel: 'López',
        nin_fnac: '2018-05-10'
      };

      const result = await authService.registerRepresentante(data);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toBeTruthy();
      // El niño debe crearse con nivel "Por evaluar"
      const ninoCreate = mockPrisma.tm_ninos.create.mock.calls[0][0].data;
      expect(ninoCreate.nin_nivd).toBe('Por evaluar');
    });
  });

  describe('updateMe (regresión bug 3: campos genéricos)', () => {
    it('actualiza el perfil admin usando nombres genéricos nomb/apel', async () => {
      mockPrisma.tm_usuar.findUnique.mockResolvedValue({
        usu_codi: 'U123',
        usu_clve: 'hash',
        rol_codi: 'ROL_ADM',
        tm_espec: null,
        tm_repre: null,
        tm_admin: { adm_nomb: 'Ana', adm_apel: 'García', usu_codi: 'U123' }
      });
      // getMe se invoca al final para devolver el perfil actualizado
      mockPrisma.tm_usuar.findUnique.mockResolvedValueOnce({
        usu_codi: 'U123', usu_clve: 'hash', rol_codi: 'ROL_ADM',
        tm_espec: null, tm_repre: null,
        tm_admin: { adm_nomb: 'Ana', adm_apel: 'García', usu_codi: 'U123' }
      });

      const result = await authService.updateMe('U123', { nomb: 'Ana María', apel: 'García Ríos', telf: '5555555' });

      expect(mockPrisma.tm_admin.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ adm_nomb: 'Ana María', adm_apel: 'García Ríos' })
      }));
      expect(result).toBeTruthy();
    });

    it('exige la contraseña actual al intentar cambiar la contraseña', async () => {
      mockPrisma.tm_usuar.findUnique.mockResolvedValue({
        usu_codi: 'U123', usu_clve: 'hash', rol_codi: 'ROL_REP',
        tm_espec: null, tm_repre: { rep_cod: 'R1' }, tm_admin: null
      });
      await expect(authService.updateMe('U123', { password: 'NuevaClave1' })).rejects.toThrow('La contraseña actual es requerida');
    });
  });

  describe('forgotPassword', () => {
    it('retorna true sin información si el correo no existe', async () => {
      mockPrisma.tm_usuar.findFirst.mockResolvedValue(null);
      await expect(authService.forgotPassword('no@existe.com')).resolves.toBe(true);
    });
  });

  describe('resetPassword', () => {
    it('lanza error con token inválido o expirado', async () => {
      mockPrisma.tm_usuar.findFirst.mockResolvedValue(null);
      await expect(authService.resetPassword('token-malo', 'NuevaClave1')).rejects.toThrow('Token inválido o expirado');
    });
  });
});
