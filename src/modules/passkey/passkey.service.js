const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} = require('@simplewebauthn/server');
const jwt = require('jsonwebtoken');
const prisma = require('../../config/db');
const env = require('../../config/env');

// Almacén de desafíos en memoria (TTL 5 min). En un deploy multi-instancia,
// mover a Redis en la Fase 3.
const challenges = new Map();

function setChallenge(key, value) {
  challenges.set(key, { value, expiresAt: Date.now() + 5 * 60 * 1000 });
}
function getChallenge(key) {
  const entry = challenges.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    challenges.delete(key);
    return null;
  }
  return entry.value;
}
function deleteChallenge(key) {
  challenges.delete(key);
}

const parseTransports = (raw) => {
  try { return raw ? JSON.parse(raw) : []; } catch { return []; }
};

function buildSession(usuario) {
  const token = jwt.sign(
    {
      usu_codi: usuario.usu_codi,
      rol_codi: usuario.rol_codi,
      rol_nomb: usuario.tm_roles?.rol_nomb,
      ins_codi: usuario.tm_admin?.ins_codi || usuario.tm_espec?.ins_codi || null
    },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  let userName = 'Usuario';
  if (usuario.rol_codi === 'ROL_ESP' && usuario.tm_espec) {
    const prefix = usuario.tm_espec.esp_gner === 'M' ? 'Dr.' : 'Dra.';
    userName = `${prefix} ${usuario.tm_espec.esp_nomb} ${usuario.tm_espec.esp_apel}`;
  } else if (usuario.rol_codi === 'ROL_REP' && usuario.tm_repre) {
    userName = `${usuario.tm_repre.rep_nomb} ${usuario.tm_repre.rep_apel}`;
  } else if (usuario.rol_codi === 'ROL_ADM' && usuario.tm_admin) {
    userName = `${usuario.tm_admin.adm_nomb} ${usuario.tm_admin.adm_apel}`;
  } else if (usuario.rol_codi === 'ROL_DIR') {
    userName = 'Director SIAT';
  }

  return { token, user: { usu_codi: usuario.usu_codi, usu_crro: usuario.usu_crro, rol_codi: usuario.rol_codi, nombre: userName } };
}

class PasskeyService {
  clearChallenges() {
    challenges.clear();
  }

  async listPasskeys(usu_codi) {
    const keys = await prisma.tm_passkeys.findMany({
      where: { usu_codi },
      orderBy: { pk_created: 'desc' },
      select: { pk_id: true, pk_nomb: true, pk_created: true, pk_last_used: true }
    });
    return keys;
  }

  async deletePasskey(usu_codi, pk_id) {
    const key = await prisma.tm_passkeys.findUnique({ where: { pk_id } });
    if (!key) throw Object.assign(new Error('Credencial no encontrada'), { status: 404 });
    if (key.usu_codi !== usu_codi) throw Object.assign(new Error('No tienes permiso para eliminar esta credencial'), { status: 403 });
    await prisma.tm_passkeys.delete({ where: { pk_id } });
    return true;
  }

  async startRegistration(usu_codi) {
    const usuario = await prisma.tm_usuar.findUnique({
      where: { usu_codi },
      include: { tm_espec: true, tm_repre: true, tm_admin: true, tm_passkeys: true }
    });
    if (!usuario) throw new Error('Usuario no encontrado');

    const existing = await prisma.tm_passkeys.findMany({ where: { usu_codi } });

    const options = await generateRegistrationOptions({
      rpName: env.WEBAUTHN_RP_NAME,
      rpID: env.WEBAUTHN_RP_ID,
      userID: Buffer.from(usu_codi),
      userName: usuario.usu_crro,
      userDisplayName: usuario.tm_espec?.esp_nomb || usuario.tm_repre?.rep_nomb || usuario.tm_admin?.adm_nomb || usu_codi,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'preferred',
        userVerification: 'required'
      },
      excludeCredentials: existing.map(k => ({
        id: k.pk_id,
        transports: parseTransports(k.pk_transports)
      }))
    });

    setChallenge(`reg:${usu_codi}`, options.challenge);
    return options;
  }

  async completeRegistration(usu_codi, credential, pkNomb) {
    const expectedChallenge = getChallenge(`reg:${usu_codi}`);
    if (!expectedChallenge) throw new Error('Desafío de registro expirado o inexistente. Intenta de nuevo.');

    const verification = await verifyRegistrationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID
    });
    if (!verification.verified) throw new Error('No se pudo verificar el registro de la huella');

    const regCred = verification.registrationInfo.credential;
    const pk_id = regCred.id;

    const existing = await prisma.tm_passkeys.findUnique({ where: { pk_id } });
    if (existing) throw new Error('Esta huella ya está registrada en otro dispositivo');

    await prisma.tm_passkeys.create({
      data: {
        pk_id,
        usu_codi,
        pk_nomb: pkNomb || 'Dispositivo',
        pk_public_key: Buffer.from(regCred.publicKey).toString('base64url'),
        pk_transports: JSON.stringify(regCred.transports || []),
        pk_counter: regCred.counter
      }
    });

    deleteChallenge(`reg:${usu_codi}`);
    return { pk_id };
  }

  async startLogin() {
    const options = await generateAuthenticationOptions({
      rpID: env.WEBAUTHN_RP_ID,
      timeout: 60000,
      userVerification: 'required',
      allowCredentials: []
    });
    setChallenge('login', options.challenge);
    return options;
  }

  async completeLogin(credential) {
    const expectedChallenge = getChallenge('login');
    if (!expectedChallenge) throw new Error('Desafío de acceso expirado. Intenta de nuevo.');

    const key = await prisma.tm_passkeys.findUnique({
      where: { pk_id: credential.id },
      include: {
        tm_usuar: {
          include: { tm_roles: true, tm_espec: true, tm_repre: true, tm_admin: true }
        }
      }
    });
    if (!key) throw new Error('Huella no registrada en este sistema');

    const verification = await verifyAuthenticationResponse({
      response: credential,
      expectedChallenge,
      expectedOrigin: env.WEBAUTHN_ORIGIN,
      expectedRPID: env.WEBAUTHN_RP_ID,
      credential: {
        id: key.pk_id,
        publicKey: Uint8Array.from(Buffer.from(key.pk_public_key, 'base64url')),
        counter: key.pk_counter,
        transports: parseTransports(key.pk_transports)
      },
      requireUserVerification: true
    });

    await prisma.tm_passkeys.update({
      where: { pk_id: key.pk_id },
      data: {
        pk_counter: verification.authenticationInfo.newCounter,
        pk_last_used: new Date()
      }
    });
    deleteChallenge('login');

    return buildSession(key.tm_usuar);
  }
}

module.exports = new PasskeyService();