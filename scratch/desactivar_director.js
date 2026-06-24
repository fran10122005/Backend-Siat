const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Desactivando usuarios con ROL_DIR en la base de datos...');
  const updated = await prisma.tm_usuar.updateMany({
    where: { rol_codi: 'ROL_DIR' },
    data: { usu_estd: false }
  });
  console.log(`Se desactivaron ${updated.count} usuarios ROL_DIR.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
