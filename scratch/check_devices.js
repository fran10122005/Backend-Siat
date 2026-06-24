const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const devices = await prisma.tm_dispo.findMany();
  console.log('Devices:', devices);
}
main().finally(() => prisma.$disconnect());
