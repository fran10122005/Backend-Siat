const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.tm_usuar.findFirst({
    where: { usu_crro: 'nohelia2002pinto@gmail.com' },
    include: { tm_roles: true }
  });
  
  if (user) {
    console.log(`Usuario encontrado: ${user.usu_crro} con rol ${user.tm_roles?.rol_nomb}`);
  } else {
    console.log('Usuario no encontrado');
  }
}
main().finally(() => prisma.$disconnect());
