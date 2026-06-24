const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const bitacoras = await prisma.tr_bitac.findMany();
  
  for (const b of bitacoras) {
    if (b.bit_suen) {
      // Redondear a un decimal
      const rounded = Math.round(b.bit_suen * 10) / 10;
      await prisma.tr_bitac.update({
        where: { bit_codi: b.bit_codi },
        data: { bit_suen: rounded }
      });
    }
  }
  console.log('Se han redondeado las horas de sueño en la bitácora.');
}

main().finally(() => prisma.$disconnect());
