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
  SMTP_PASS: z.string().default('')
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Error de validación de variables de entorno:', _env.error.format());
  process.exit(1);
}

module.exports = _env.data;
