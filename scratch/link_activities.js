const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const ninos = await prisma.tm_ninos.findMany({
    where: {
      OR: [
        { nin_nomb: { contains: 'Hellen', mode: 'insensitive' } },
        { nin_nomb: { contains: 'Santiago', mode: 'insensitive' } }
      ]
    },
    include: {
      tr_sesio: true
    }
  });

  for (const nino of ninos) {
    if (nino.tr_sesio.length > 0) {
      const actCodi = nino.tr_sesio[0].act_codi;
      
      await prisma.tm_activ.update({
        where: { act_codi: actCodi },
        data: {
          nin_codi: nino.nin_codi
        }
      });
      
      console.log(`Actividad vinculada permanentemente a ${nino.nin_nomb} ${nino.nin_apel}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
