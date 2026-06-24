const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const nino = await prisma.tm_ninos.findFirst({
    where: { nin_nomb: { contains: 'Santiago' } }
  });
  console.log('Santiago:', nino.nin_codi);
  
  const bitacoras = await prisma.tr_bitac.findMany({
    where: { nin_codi: nino.nin_codi }
  });
  console.log('Bitacoras count:', bitacoras.length);
  if (bitacoras.length > 0) {
    console.log('Sample:', bitacoras[0]);
  }
}

test().finally(() => prisma.$disconnect());
