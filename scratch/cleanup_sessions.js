const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const sesiones = await prisma.tr_sesio.findMany({
    where: { ses_nota: { contains: 'inyectados' } },
    select: { ses_codi: true, ses_nota: true }
  });
  console.log('Sesiones con "inyectados":', sesiones.length);
  if (sesiones.length > 0) {
    await prisma.tr_sesio.updateMany({
      where: { ses_nota: { contains: 'inyectados' } },
      data: { ses_nota: '[Cooperación: 4/5] Sesión completada con éxito.' }
    });
    console.log('✅ Actualizadas:', sesiones.length);
  }
  console.log('Limpieza de sesiones completada.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
