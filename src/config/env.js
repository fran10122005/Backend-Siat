const { z } = require('zod');
const dotenv = require('dotenv');

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  FRONTEND_URL: z.string().default('http://localhost:5173'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('465'),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  // EmailJS (envío de correos transaccionales). Se omiten los correos si no están configurados.
  EMAILJS_SERVICE_ID: z.string().optional().default(''),
  EMAILJS_TEMPLATE_ID: z.string().optional().default(''),
  EMAILJS_PUBLIC_KEY: z.string().optional().default(''),
  EMAILJS_PRIVATE_KEY: z.string().optional().default(''),
  // WebAuthn (acceso rápido por huella). RP_ID y ORIGEN se derivan del frontend si no se definen.
  WEBAUTHN_RP_ID: z.string().default('localhost'),
  WEBAUTHN_RP_NAME: z.string().default('SIAT'),
  WEBAUTHN_ORIGIN: z.string().default('http://localhost:5173'),
  // Cloudinary (almacenamiento de fotos e informes PDF de pacientes)
  // ← Completar con las credenciales de tu cuenta Cloudinary cuando las crees
  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_UPLOAD_PRESET: z.string().optional().default('siat_unsigned'),
  // Logo oficial de SIAT (URL pública en Cloudinary, opcional)
  SIAT_LOGO_URL: z.string().url().optional().default('')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Error de validación de variables de entorno:', _env.error.format());
  process.exit(1);
}

module.exports = _env.data;
