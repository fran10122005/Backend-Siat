const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bitacora = await prisma.tr_bitac.count({
    where: { bit_obse: { contains: 'inyector' } }
  });
  console.log('Bitácora pendientes con "inyector":', bitacora);

  const sesiones = await prisma.tr_sesio.count({
    where: { ses_nota: { contains: 'inyectados' } }
  });
  console.log('Sesiones pendientes con "inyectados":', sesiones);

  const total = await prisma.tr_bitac.count();
  console.log('Total registros en bitácora:', total);

  console.log('✅ Verificación completada.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
