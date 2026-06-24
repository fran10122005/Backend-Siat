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
        newTrea = 'Práctica de Lenguaje y Comunicación en Casa';
        newMeta = 'Lograr que Hellen pida las cosas por su nombre usando frases cortas, de manera calmada y sin frustrarse.';
        newGuia = 'PASOS A SEGUIR:\n1. Siéntese frente a ella, a la altura de sus ojos.\n2. Muéstrele su juguete o merienda favorita y pregúntele con voz suave: "¿Qué quieres?".\n3. Espere pacientemente 5 segundos para que ella intente responder.\n4. Si lo dice (o lo intenta), entrégueselo inmediatamente y felicítela con mucho entusiasmo.\n5. Realice esta actividad en un cuarto tranquilo, con el televisor y la radio apagados.';
      } else {
        newTrea = 'Ejercicios para Mantener la Calma y el Control';
        newMeta = 'Ayudar a Santiago a tranquilizarse cuando se sienta abrumado o ansioso, antes de que llegue a hacer un berrinche.';
        newGuia = 'PASOS A SEGUIR:\n1. Si nota que Santiago empieza a agitarse, colóquele el chaleco de peso (recuerde, solo por 15 minutos máximo).\n2. Llévelo con calma a un espacio de la casa que sea silencioso y sin muchas luces.\n3. Siéntese a su lado y pídale que respire profundo junto a usted.\n4. Cuente en voz alta y despacio: "Inhala 1, 2, 3... Exhala 1, 2, 3".\n5. Repita la respiración al menos 5 veces o hasta que note que su cuerpo se relaja.';
      }

      await prisma.tm_activ.update({
        where: { act_codi: actCodi },
        data: {
          act_trea: newTrea,
          act_meta: newMeta,
          act_guia: newGuia,
          act_time: 20
        }
      });
      
      console.log(`Actividad amigable para padres actualizada para ${nino.nin_nomb} ${nino.nin_apel}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
