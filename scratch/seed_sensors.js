const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const crypto = require('crypto');

async function seedSensors() {
  try {
    const santiago = await prisma.tm_ninos.findFirst({ where: { nin_nomb: { contains: 'Santiago' } } });
    const hellen = await prisma.tm_ninos.findFirst({ where: { nin_nomb: { contains: 'Hellen' } } });

    const ninos = [santiago, hellen].filter(n => n !== null);

    for (const nino of ninos) {
      // Create sensor in catalog if not exists
      const sensorCatalog = await prisma.tm_senso.upsert({
        where: { sen_codi: 'S_PULSO' },
        update: {},
        create: {
          sen_codi: 'S_PULSO',
          sen_nomb: 'Biosensor Óptico MAX30102',
          sen_tmed: 'Frecuencia Cardíaca',
          sen_unit: 'BPM',
        }
      });

      // Create instance in tc_sensi
      const sensi_codi = 'S' + crypto.randomBytes(3).toString('hex');
      const sensi = await prisma.tc_sensi.create({
        data: {
          sen_codi: sensi_codi,
          nin_codi: nino.nin_codi,
          sen_tipo: 'Pulsera Biométrica MAX30102',
          sen_nvli: '100%',
          sen_nota: 'Sensor inyectado',
        }
      });

      // Link to child
      await prisma.tm_ninos.update({
        where: { nin_codi: nino.nin_codi },
        data: { sen_codi: sensi_codi }
      });

      // Create dispo
      const dispo_codi = 'D' + crypto.randomBytes(3).toString('hex');
      await prisma.tm_dispo.create({
        data: {
          dis_codi: dispo_codi,
          ins_codi: nino.ins_codi,
          nin_codi: nino.nin_codi,
          dis_sral: 'HW-SERIAL-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
          dis_vers: 'v1.4',
          dis_iplo: '127.0.0.1',
          dis_stdo: 'Online',
        }
      });

      // Create config
      await prisma.tc_confi.create({
        data: {
          con_codi: 'C' + crypto.randomBytes(3).toString('hex'),
          dis_codi: dispo_codi,
          sen_codi: 'S_PULSO',
          con_stdo: true,
        }
      });

      console.log(`Sensor y dispositivo inyectado para ${nino.nin_nomb}`);
    }
  } catch (error) {
    console.error("Error seeding sensors:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedSensors();
