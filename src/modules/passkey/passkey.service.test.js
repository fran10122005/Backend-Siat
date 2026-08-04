const jwt = require('jsonwebtoken');
const env = require('../../config/env');

const mockGenerateRegistration = jest.fn();
const mockVerifyRegistration = jest.fn();
const mockGenerateAuthn = jest.fn();
const mockVerifyAuthn = jest.fn();

jest.mock('@simplewebauthn/server', () => ({
  generateRegistrationOptions: mockGenerateRegistration,
  verifyRegistrationResponse: mockVerifyRegistration,
  generateAuthenticationOptions: mockGenerateAuthn,
  verifyAuthenticationResponse: mockVerifyAuthn
}));

const mockPrisma = {
  tm_passkeys: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  tm_usuar: { findUnique: jest.fn() }
};

jest.mock('../../config/db', () => mockPrisma);

const passkeyService = require('./passkey.service');

const fakeKey = (overrides = {}) => ({
  pk_id: 'aGVsbG8td29ybGQ', // base64url de "hello-world"
  usu_codi: 'U123',
  pk_nomb: 'Mi laptop',
  pk_public_key: Buffer.from([1, 2, 3]).toString('base64url'),
  pk_counter: 3,
  pk_transports: '["internal"]',
  pk_created: new Date(),
  pk_last_used: null,
  ...overrides
});

describe('PasskeyService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    passkeyService.clearChallenges();
    mockGenerateRegistration.mockResolvedValue({ challenge: 'reg-challenge', rp: { name: 'SIAT' } });
    mockGenerateAuthn.mockResolvedValue({ challenge: 'login-challenge' });
  });

  describe('listPasskeys', () => {
    it('retorna las credenciales del usuario', async () => {
      mockPrisma.tm_passkeys.findMany.mockResolvedValue([fakeKey()]);
      const result = await passkeyService.listPasskeys('U123');
      expect(mockPrisma.tm_passkeys.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { usu_codi: 'U123' } })
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('deletePasskey', () => {
    it('lanza 404 si la credencial no existe', async () => {
      mockPrisma.tm_passkeys.findUnique.mockResolvedValue(null);
      await expect(passkeyService.deletePasskey('U123', 'nope')).rejects.toThrow('Credencial no encontrada');
    });

    it('lanza 403 si no pertenece al usuario', async () => {
      mockPrisma.tm_passkeys.findUnique.mockResolvedValue(fakeKey({ usu_codi: 'OTRO' }));
      await expect(passkeyService.deletePasskey('U123', 'aGVsbG8td29ybGQ')).rejects.toThrow('No tienes permiso');
    });

    it('elimina la credencial cuando es del usuario', async () => {
      mockPrisma.tm_passkeys.findUnique.mockResolvedValue(fakeKey());
      mockPrisma.tm_passkeys.delete.mockResolvedValue({});
      await expect(passkeyService.deletePasskey('U123', 'aGVsbG8td29ybGQ')).resolves.toBe(true);
      expect(mockPrisma.tm_passkeys.delete).toHaveBeenCalledWith({ where: { pk_id: 'aGVsbG8td29ybGQ' } });
    });
  });

  describe('startRegistration', () => {
    it('genera opciones excluyendo credenciales ya registradas', async () => {
      mockPrisma.tm_usuar.findUnique.mockResolvedValue({
        usu_codi: 'U123', usu_crro: 'a@b.com', tm_espec: null, tm_repre: null, tm_admin: null
      });
      mockPrisma.tm_passkeys.findMany.mockResolvedValue([fakeKey()]);

      const options = await passkeyService.startRegistration('U123');

      expect(mockGenerateRegistration).toHaveBeenCalledWith(expect.objectContaining({
        rpID: env.WEBAUTHN_RP_ID,
        userName: 'a@b.com',
        excludeCredentials: expect.arrayContaining([
          expect.objectContaining({ id: 'aGVsbG8td29ybGQ' })
        ])
      }));
      expect(options.challenge).toBe('reg-challenge');
    });
  });

  describe('completeRegistration', () => {
    it('lanza error si no hay desafío en curso', async () => {
      await expect(passkeyService.completeRegistration('U123', {}, 'Laptop')).rejects.toThrow('expirado o inexistente');
    });

    it('persiste la credencial verificada y limpia el desafío', async () => {
      mockPrisma.tm_usuar.findUnique.mockResolvedValue({
        usu_codi: 'U123', usu_crro: 'a@b.com', tm_espec: null, tm_repre: null, tm_admin: null
      });
      mockPrisma.tm_passkeys.findMany.mockResolvedValue([]);
      mockPrisma.tm_passkeys.findUnique.mockResolvedValue(null);
      mockVerifyRegistration.mockResolvedValue({
        verified: true,
        registrationInfo: {
          credential: {
            id: 'aGVsbG8td29ybGQ',
            publicKey: Buffer.from([9, 9, 9]),
            counter: 7,
            transports: ['internal']
          }
        }
      });
      mockPrisma.tm_passkeys.create.mockResolvedValue({ pk_id: 'aGVsbG8td29ybGQ' });

      await passkeyService.startRegistration('U123'); // para fijar el desafío reg-challenge
      const result = await passkeyService.completeRegistration('U123', { id: 'aGVsbG8td29ybGQ' }, 'Mi laptop');

      expect(mockVerifyRegistration).toHaveBeenCalledWith(expect.objectContaining({
        expectedChallenge: 'reg-challenge',
        expectedRPID: env.WEBAUTHN_RP_ID,
        expectedOrigin: env.WEBAUTHN_ORIGIN
      }));
      expect(mockPrisma.tm_passkeys.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          pk_id: 'aGVsbG8td29ybGQ',
          usu_codi: 'U123',
          pk_nomb: 'Mi laptop',
          pk_counter: 7
        })
      });
      expect(result.pk_id).toBe('aGVsbG8td29ybGQ');
    });

    it('lanza error si la verificación falla', async () => {
      mockPrisma.tm_usuar.findUnique.mockResolvedValue({ usu_codi: 'U123', usu_crro: 'a@b.com' });
      mockPrisma.tm_passkeys.findMany.mockResolvedValue([]);
      mockVerifyRegistration.mockResolvedValue({ verified: false });

      await passkeyService.startRegistration('U123');
      await expect(passkeyService.completeRegistration('U123', { id: 'x' }, 'Laptop')).rejects.toThrow('No se pudo verificar');
    });
  });

  describe('startLogin', () => {
    it('genera opciones de acceso sin lista de credenciales (discoverable)', async () => {
      const options = await passkeyService.startLogin();
      expect(mockGenerateAuthn).toHaveBeenCalledWith(expect.objectContaining({ rpID: env.WEBAUTHN_RP_ID }));
      expect(options.challenge).toBe('login-challenge');
    });
  });

  describe('completeLogin', () => {
    it('lanza error si no hay desafío en curso', async () => {
      await expect(passkeyService.completeLogin({ id: 'aGVsbG8td29ybGQ' })).rejects.toThrow('expirado');
    });

    it('lanza error si la huella no está registrada', async () => {
      mockPrisma.tm_passkeys.findUnique.mockResolvedValue(null);
      await passkeyService.startLogin();
      await expect(passkeyService.completeLogin({ id: 'aGVsbG8td29ybGQ' })).rejects.toThrow('Huella no registrada');
    });

    it('verifica, actualiza el contador y abre sesión', async () => {
      const key = fakeKey({
        tm_usuar: {
          usu_codi: 'U123', usu_crro: 'a@b.com', rol_codi: 'ROL_ADM',
          tm_roles: { rol_nomb: 'Administrador' },
          tm_espec: null, tm_repre: null,
          tm_admin: { adm_nomb: 'Ana', adm_apel: 'García', ins_codi: 'I001' }
        }
      });
      mockPrisma.tm_passkeys.findUnique.mockResolvedValue(key);
      mockVerifyAuthn.mockResolvedValue({
        verified: true,
        authenticationInfo: { newCounter: 4 }
      });
      mockPrisma.tm_passkeys.update.mockResolvedValue({});

      await passkeyService.startLogin();
      const session = await passkeyService.completeLogin({ id: 'aGVsbG8td29ybGQ', response: {} });

      expect(mockVerifyAuthn).toHaveBeenCalledWith(expect.objectContaining({
        expectedChallenge: 'login-challenge',
        credential: expect.objectContaining({ counter: 3 })
      }));
      expect(mockPrisma.tm_passkeys.update).toHaveBeenCalledWith({
        where: { pk_id: 'aGVsbG8td29ybGQ' },
        data: expect.objectContaining({ pk_counter: 4 })
      });
      expect(jwt.verify(session.token, env.JWT_SECRET).usu_codi).toBe('U123');
      expect(session.user.nombre).toBe('Ana García');
    });
  });
});