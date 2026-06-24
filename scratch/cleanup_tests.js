const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function clean() {
  const users = await prisma.tm_usuar.findMany({
    where: { usu_crro: { startsWith: 'padre_test_' } },
    include: { tm_repre: true }
  });
  
  console.log(`Found ${users.length} test users to delete.`);
  
  for (const user of users) {
    if (user.tm_repre) {
      await prisma.tc_asign.deleteMany({ where: { nin_codi: user.tm_repre.nin_codi } });
      await prisma.tm_repre.delete({ where: { rep_cod: user.tm_repre.rep_cod } });
      await prisma.tm_ninos.delete({ where: { nin_codi: user.tm_repre.nin_codi } });
    }
    await prisma.tm_usuar.delete({ where: { usu_codi: user.usu_codi } });
    console.log(`Deleted user ${user.usu_crro} and associated records.`);
  }
  await prisma.$disconnect();
}

clean();
