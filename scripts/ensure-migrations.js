const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

function currentMigrationNames() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, 'migration.sql')));
}

/**
 * Verificación preventiva segura de migraciones para SIAT.
 * En lugar de borrar destructivamente registros válidos de la tabla interna de Prisma,
 * solo limpia bloqueos transaccionales fallidos (finished_at IS NULL) para garantizar idempotencia
 * y evitar condiciones de carrera entre múltiples instancias del contenedor.
 */
async function main() {
  const prisma = new PrismaClient();
  try {
    const current = currentMigrationNames();
    if (current.length === 0) {
      console.log('ensure-migrations: no hay migraciones en el directorio.');
      return;
    }

    // Verificar si la tabla de metadatos de migraciones existe en PostgreSQL
    const tableExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `;

    const exists = tableExists?.[0]?.exists ?? false;
    if (!exists) {
      console.log('ensure-migrations: _prisma_migrations no existe aún. Prisma migrate deploy la inicializará.');
      return;
    }

    // Eliminar únicamente registros atascados en fallo (sin finalizar ni revertir) para evitar error P3009
    const cleaned = await prisma.$executeRaw`
      DELETE FROM "_prisma_migrations" 
      WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL;
    `;

    if (cleaned > 0) {
      console.warn(`ensure-migrations: se recuperaron y limpiaron ${cleaned} migración(es) atascada(s).`);
    } else {
      console.log(`ensure-migrations: estado de _prisma_migrations consistente (${current.length} migraciones locales).`);
    }
  } catch (err) {
    // Si la conexión falla temporalmente, registrar aviso sin matar el proceso para permitir reintentos del orquestador
    console.warn('ensure-migrations: advertencia en verificación preventiva:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();