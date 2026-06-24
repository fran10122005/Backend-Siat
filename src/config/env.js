const { z } = require('zod');
const dotenv = require('dotenv');

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string()
});

const _env = envSchema.safeParse(process.env);

if (!_env.success) {
  console.error('❌ Error de validación de variables de entorno:', _env.error.format());
  process.exit(1);
}

module.exports = _env.data;
