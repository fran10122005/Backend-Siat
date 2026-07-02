const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Buscando registros con "Generado por inyector de historial"...');

  const resultados = await prisma.tr_bitac.findMany({
    where: { bit_obse: { contains: 'inyector' } },
    select: { bit_codi: true, bit_obse: true, bit_fech: true }
  });

  console.log(`Encontrados ${resultados.length} registros para limpiar.`);

  if (resultados.length > 0) {
    await prisma.tr_bitac.updateMany({
      where: { bit_obse: { contains: 'inyector' } },
      data: { bit_obse: 'Registro del día generado automáticamente.' }
    });
    console.log(`✅ ${resultados.length} registros actualizados.`);
  }

  console.log('Limpieza completada.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
