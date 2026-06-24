const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const acts = await prisma.tm_activ.findMany();
  console.log('Activities:', acts);
  const sessions = await prisma.tr_sesio.findMany();
  console.log('Sessions:', sessions);
}
main().finally(() => prisma.$disconnect());
