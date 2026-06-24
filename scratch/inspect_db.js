const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- USUARIOS ROL_ADM ---');
  const admins = await prisma.tm_admin.findMany({
    include: {
      tm_usuar: true,
      tm_insti: true
    }
  });
  console.dir(admins, { depth: null });

  console.log('--- TODOS LOS USUARIOS ---');
  const users = await prisma.tm_usuar.findMany({
    include: {
      tm_roles: true
    }
  });
  console.dir(users, { depth: null });

  console.log('--- TODAS LAS INSTITUCIONES ---');
  const insts = await prisma.tm_insti.findMany();
  console.dir(insts, { depth: null });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
