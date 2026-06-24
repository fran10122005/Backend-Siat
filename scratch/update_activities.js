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
      tr_sesio: {
        include: {
          tm_activ: true
        }
      }
    }
  });

  for (const nino of ninos) {
    if (nino.tr_sesio.length > 0) {
      const actCodi = nino.tr_sesio[0].act_codi;
      
      let newTrea = '';
      let newMeta = '';
      let newGuia = '';

      if (nino.nin_nomb.includes('Hellen')) {
        newTrea = 'Estimulación Fonológica y Pragmática Social';
        newMeta = 'Fomentar la reciprocidad comunicativa y la articulación fonética a través de estímulos no aversivos.';
        newGuia = 'Aplicar economía de fichas. Presentar estímulos visuales con bajo contraste. Evitar ruido ambiental superior a 45 dB.';
      } else {
        newTrea = 'Terapia de Integración Sensorial y Autorregulación';
        newMeta = 'Reducir conductas desadaptativas mediante modulación propioceptiva y estrategias de afrontamiento activo.';
        newGuia = 'Uso de chaleco de peso (5% del peso corporal) por intervalos de 15 min. Aplicar protocolo de respiración diafragmática ante signos de desregulación.';
      }

      await prisma.tm_activ.update({
        where: { act_codi: actCodi },
        data: {
          act_trea: newTrea,
          act_meta: newMeta,
          act_guia: newGuia,
          act_time: 45
        }
      });
      
      console.log(`Actividad clínica actualizada para ${nino.nin_nomb} ${nino.nin_apel}: ${newTrea}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
