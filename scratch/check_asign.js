const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const asigs = await prisma.tc_asign.findMany({
    include: { tm_ninos: true, tm_espec: true }
  });
  console.log(asigs);
}

main().finally(() => prisma.$disconnect());
