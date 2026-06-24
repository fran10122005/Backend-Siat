const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const hashedClve = await bcrypt.hash('123456', 10);
  await prisma.tm_usuar.updateMany({
    where: { usu_crro: 'nohelia2002pinto@gmail.com' },
    data: { usu_clve: hashedClve }
  });
  console.log('Contraseña reseteada a 123456 exitosamente');
}
main().finally(() => prisma.$disconnect());
