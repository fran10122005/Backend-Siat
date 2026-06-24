const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const telems = await prisma.tr_telem.findMany();
  
  for (const t of telems) {
    if (t.tel_regi !== null) {
      const rounded = Math.round(t.tel_regi);
      await prisma.tr_telem.update({
        where: { tel_codi: t.tel_codi },
        data: { tel_regi: rounded }
      });
    }
  }
  console.log('Se han redondeado los valores de telemetría.');
}

main().finally(() => prisma.$disconnect());
