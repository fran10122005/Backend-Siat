const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function list() {
  const ninos = await prisma.tm_ninos.findMany();
  console.log('Ninos:', ninos);
}

list().finally(() => prisma.$disconnect());
