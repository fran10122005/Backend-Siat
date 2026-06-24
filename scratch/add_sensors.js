const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Agregando sensores clínicos (Modelo Awake Labs)...');

  const sensores = [
    {
      sen_codi: 'S_PULSO', // Ya existe, lo actualizamos por si acaso
      sen_nomb: 'Fotopletismografía (PPG)',
      sen_tmed: 'Ritmo Cardíaco',
      sen_unit: 'bpm'
    },
    {
      sen_codi: 'S_EDA', // Electrodermal Activity (GSR)
      sen_nomb: 'Actividad Electrodérmica',
      sen_tmed: 'Conductancia de la piel (Sudoración)',
      sen_unit: 'µS'
    },
    {
      sen_codi: 'S_TEMP',
      sen_nomb: 'Temperatura Periférica',
      sen_tmed: 'Temperatura de la piel',
      sen_unit: '°C'
    },
    {
      sen_codi: 'S_ACCEL',
      sen_nomb: 'Acelerómetro 3D',
      sen_tmed: 'Cinemática / Movimiento',
      sen_unit: 'G'
    }
  ];

  for (const s of sensores) {
    await prisma.tm_senso.upsert({
      where: { sen_codi: s.sen_codi },
      update: {
        sen_nomb: s.sen_nomb,
        sen_tmed: s.sen_tmed,
        sen_unit: s.sen_unit
      },
      create: s
    });
    console.log(`Sensor registrado: ${s.sen_nomb} (${s.sen_codi})`);
  }

  // Vincular a los dispositivos existentes
  const dispositivos = await prisma.tm_dispo.findMany();
  
  for (const d of dispositivos) {
    for (const s of sensores) {
      await prisma.tc_confi.upsert({
        where: { con_codi: `C_${d.dis_codi}_${s.sen_codi}`.substring(0, 10) }, // Limitar a 10 chars, usaremos un truco mejor
        update: {},
        create: {
          con_codi: require('crypto').randomBytes(3).toString('hex').toUpperCase(),
          dis_codi: d.dis_codi,
          sen_codi: s.sen_codi,
          con_stdo: true
        }
      });
    }
  }

  console.log('Sensores vinculados a los dispositivos actuales.');
}

main().finally(() => prisma.$disconnect());
