const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ninos = await prisma.tm_ninos.findMany({
    where: {
      OR: [
        { nin_nomb: { contains: 'Hellen', mode: 'insensitive' } },
        { nin_nomb: { contains: 'Santiago', mode: 'insensitive' } }
      ]
    }
  });
  console.log(ninos);
}

main().finally(() => prisma.$disconnect());
