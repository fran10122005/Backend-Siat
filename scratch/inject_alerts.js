const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const generateId = (prefix) => prefix + crypto.randomBytes(3).toString('hex').toUpperCase();

async function main() {
  console.log('Iniciando inyección de alertas y crisis...');

  const ninos = await prisma.tm_ninos.findMany({
    include: {
      tr_sesio: {
        orderBy: { ses_inic: 'desc' },
        take: 7
      }
    }
  });

  if (ninos.length === 0) {
    console.log('No hay niños para inyectar historial.');
    return;
  }

  // Asegurar que existe un instrumento base para las alertas
  const instr = await prisma.tm_instr.upsert({
    where: { ins_codi: 'I_DEFAULT' },
    update: {},
    create: {
      ins_codi: 'I_DEFAULT',
      ins_cont: 'Instrumento general'
    }
  });

  const tiposAlerta = ['Berrinche', 'Estereotipia', 'Agresión', 'Meltdown Sensorial'];

  for (const nino of ninos) {
    for (const sesion of nino.tr_sesio) {
      // 50% de probabilidad de tener una alerta en la sesión
      if (Math.random() > 0.5) {
        const tipo = tiposAlerta[Math.floor(Math.random() * tiposAlerta.length)];
        
        const aleCodi = generateId('A').substring(0, 10);
        await prisma.tr_alert.create({
          data: {
            ale_codi: aleCodi,
            ses_codi: sesion.ses_codi,
            ins_codi: instr.ins_codi,
            ale_time: new Date(sesion.ses_inic.getTime() + 5 * 60000), // 5 min despues de iniciar
            ale_meto: tipo
          }
        });

        // Crear feedback para la alerta
        const fedCodi = generateId('F').substring(0, 10);
        await prisma.tr_feedb.create({
          data: {
            fed_codi: fedCodi,
            ale_codi: aleCodi,
            fed_efec: Math.random() > 0.3, // 70% efectivo
            fed_resp: 'Técnica de contención aplicada',
            com_padr: 'Se calmó a los pocos minutos'
          }
        });

        console.log(`Alerta inyectada para ${nino.nin_nomb}: ${tipo}`);
      }
    }
  }

  console.log('Inyección completada exitosamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
