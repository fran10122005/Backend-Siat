const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const generateId = (prefix) => prefix + crypto.randomBytes(4).toString('hex') + Math.floor(Math.random() * 10);

async function main() {
  const ninos = await prisma.tm_ninos.findMany({
    where: {
      OR: [
        { nin_nomb: { contains: 'Hellen', mode: 'insensitive' } },
        { nin_nomb: { contains: 'Santiago', mode: 'insensitive' } }
      ]
    }
  });

  if (ninos.length === 0) {
    console.log('No se encontraron los niños.');
    return;
  }

  // Asegurar categoría
  const cat = await prisma.tm_categ.upsert({
    where: { cat_codi: 'CAT_RUT' },
    update: {},
    create: {
      cat_codi: 'CAT_RUT',
      cat_nomb: 'Rutinas Diarias',
      cat_deta: 'Actividades programadas diarias'
    }
  });

  for (const nino of ninos) {
    // 1. Device
    const disCodi = generateId('D');
    await prisma.tm_dispo.create({
      data: {
        dis_codi: disCodi,
        ins_codi: nino.ins_codi,
        nin_codi: nino.nin_codi,
        dis_sral: 'SN-' + crypto.randomBytes(4).toString('hex'),
        dis_vers: 'v1.0',
        dis_iplo: '192.168.1.1',
        dis_stdo: 'Online'
      }
    });

    // 2. Activity
    const actCodi = generateId('A');
    await prisma.tm_activ.create({
      data: {
        act_codi: actCodi,
        rep_codi: cat.cat_codi,
        act_trea: nino.nin_nomb.includes('Hellen') ? 'Terapia de Lenguaje en Hogar' : 'Control de Impulsos',
        act_meta: 'Completar 15 minutos sin alteraciones graves',
        act_guia: 'Mantener un entorno sin ruidos',
        act_time: 15
      }
    });

    // 3. Session (Asignar actividad e iniciarla para que se vea activa)
    const sesCodi = generateId('S');
    await prisma.tr_sesio.create({
      data: {
        ses_codi: sesCodi,
        nin_codi: nino.nin_codi,
        act_codi: actCodi,
        dis_codi: disCodi,
        ses_inic: new Date()
      }
    });

    console.log(`Actividad y Sesión asignada exitosamente a ${nino.nin_nomb} ${nino.nin_apel}`);
  }
}

main().finally(() => prisma.$disconnect());
