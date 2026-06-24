const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const generateId = (prefix) => prefix + crypto.randomBytes(3).toString('hex').toUpperCase();

async function main() {
  console.log('Iniciando inyección de historial...');

  const ninos = await prisma.tm_ninos.findMany({
    include: {
      tm_dispo: true,
      tr_sesio: true
    }
  });

  if (ninos.length === 0) {
    console.log('No hay niños para inyectar historial.');
    return;
  }

  // 1. Crear Sensor
  const sensor = await prisma.tm_senso.upsert({
    where: { sen_codi: 'S_PULSO' },
    update: {},
    create: {
      sen_codi: 'S_PULSO',
      sen_nomb: 'Ritmo Cardíaco',
      sen_tmed: 'BPM',
      sen_unit: 'bpm'
    }
  });

  for (const nino of ninos) {
    const dispo = nino.tm_dispo[0];
    const baseAct = nino.tr_sesio[0]?.act_codi;

    if (!dispo || !baseAct) {
      console.log(`Faltan datos básicos para ${nino.nin_nomb}`);
      continue;
    }

    // 2. Crear Confi
    const conCodi = generateId('C');
    const confi = await prisma.tc_confi.create({
      data: {
        con_codi: conCodi,
        dis_codi: dispo.dis_codi,
        sen_codi: sensor.sen_codi,
        con_stdo: true
      }
    });

    // 3. Generar Bitácora (Últimos 7 días)
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const sueno = 6 + Math.random() * 4; // 6 a 10 horas
      const animo = ['Tranquilo', 'Irritable', 'Alegre', 'Cansado'][Math.floor(Math.random() * 4)];
      const apetito = ['Bueno', 'Regular', 'Poco'][Math.floor(Math.random() * 3)];
      const bpm = Math.floor(80 + Math.random() * 30);

      await prisma.tr_bitac.create({
        data: {
          bit_codi: generateId('B'),
          nin_codi: nino.nin_codi,
          bit_fech: date,
          bit_suen: sueno,
          bit_cali: 'Normal',
          bit_anim: animo,
          bit_apet: apetito,
          bit_bpm: bpm,
          bit_obse: 'Generado por inyector de historial',
          bit_crea: new Date()
        }
      });
    }

    // 4. Generar Sesiones pasadas
    for (let i = 1; i <= 5; i++) {
      const sesDate = new Date();
      sesDate.setDate(sesDate.getDate() - i);
      sesDate.setHours(10, 0, 0);

      const sesClose = new Date(sesDate);
      sesClose.setMinutes(sesClose.getMinutes() + 15); // 15 minutos de sesion

      const sesion = await prisma.tr_sesio.create({
        data: {
          ses_codi: generateId('S'),
          nin_codi: nino.nin_codi,
          act_codi: baseAct,
          dis_codi: dispo.dis_codi,
          ses_inic: sesDate,
          ses_cerr: sesClose,
          ses_nota: '[Cooperación: 4/5] Sesión completada con éxito. Datos históricos inyectados.'
        }
      });

      // Telemetria para esta sesion
      for (let t = 0; t < 10; t++) {
        await prisma.tr_telem.create({
          data: {
            tel_codi: generateId('T'),
            ses_codi: sesion.ses_codi,
            con_codi: confi.con_codi,
            tel_regi: 80 + Math.random() * 20, // 80 - 100 bpm
            tel_marc: t * 60, // cada minuto
            tel_calid: 98.5
          }
        });
      }

      // Estados
      await prisma.tr_estad.create({
        data: {
          est_codi: generateId('E'),
          ses_codi: sesion.ses_codi,
          est_dete: 'Calmo',
          est_time: sesDate
        }
      });
    }

    console.log(`Historial inyectado para ${nino.nin_nomb} ${nino.nin_apel}`);
  }

  console.log('Inyección completada exitosamente.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
