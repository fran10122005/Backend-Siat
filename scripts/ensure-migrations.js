const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { PrismaClient } = require('@prisma/client');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'migrations');

function currentMigrationNames() {
  return fs
    .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .filter((name) => fs.existsSync(path.join(MIGRATIONS_DIR, name, 'migration.sql')));
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const current = currentMigrationNames();
    if (current.length === 0) {
      console.log('ensure-migrations: no hay migraciones en el directorio, no se hace nada.');
      return;
    }

    const placeholders = current.map((_, i) => `$${i + 1}`).join(', ');
    const deleted = await prisma.$executeRawUnsafe(
      `DELETE FROM "_prisma_migrations" WHERE "migration_name" NOT IN (${placeholders}) ` +
        `OR "rolled_back_at" IS NOT NULL OR "logs" IS NOT NULL OR "finished_at" IS NULL`,
      ...current
    );

    console.log(
      `ensure-migrations: se eliminaron ${deleted} registro(s) obsoleto(s) de _prisma_migrations. ` +
        `Migraciones vigentes: ${current.join(', ')}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('ensure-migrations: error:', err);
  process.exit(1);
});