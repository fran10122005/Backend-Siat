const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function seedBitacora() {
  try {
    const santiago = await prisma.tm_ninos.findFirst({ where: { nin_nomb: { contains: 'Santiago' } } });
    const hellen = await prisma.tm_ninos.findFirst({ where: { nin_nomb: { contains: 'Hellen' } } });

    console.log("Santiago:", santiago ? santiago.nin_codi : "No encontrado");
    console.log("Hellen:", hellen ? hellen.nin_codi : "No encontrada");

    const records = [];

    if (santiago) {
      records.push({
        nin_codi: santiago.nin_codi,
        bit_fech: new Date(new Date().setDate(new Date().getDate() - 1)),
        bit_suen: 6.5,
        bit_cali: "Interrumpido",
        bit_anim: "Irritable",
        bit_apet: "Regular",
        bit_bpm: 95,
        bit_obse: "Dificultad para dormir, se despertó varias veces. Estuvo muy irritable por la mañana.",
        bit_crisi: 2,
        bit_dese: "Cambio en la rutina matutina, luces fuertes en el supermercado.",
        bit_senso: "Taparse los oídos frecuente",
        bit_medi: true,
        bit_diges: "Estreñimiento"
      });
      records.push({
        nin_codi: santiago.nin_codi,
        bit_fech: new Date(new Date().setDate(new Date().getDate() - 2)),
        bit_suen: 8,
        bit_cali: "Excelente",
        bit_anim: "Estable",
        bit_apet: "Bueno",
        bit_bpm: 82,
        bit_obse: "Día tranquilo en casa, completó sus tareas con poca resistencia.",
        bit_crisi: 0,
        bit_dese: "Ninguno",
        bit_senso: "Sin sensibilidades destacadas hoy",
        bit_medi: true,
        bit_diges: "Normal"
      });
    }

    if (hellen) {
      records.push({
        nin_codi: hellen.nin_codi,
        bit_fech: new Date(new Date().setDate(new Date().getDate() - 1)),
        bit_suen: 5,
        bit_cali: "Insomnio",
        bit_anim: "Crisis / Sobrecarga",
        bit_apet: "Malo / Selectivo",
        bit_bpm: 110,
        bit_obse: "Rechazó la comida nueva. Tuvo un desborde emocional después del colegio.",
        bit_crisi: 1,
        bit_dese: "Textura de la comida nueva, ruido ambiental alto.",
        bit_senso: "Selectividad táctil y auditiva.",
        bit_medi: false,
        bit_diges: "Malestar abdominal"
      });
      records.push({
        nin_codi: hellen.nin_codi,
        bit_fech: new Date(new Date().setDate(new Date().getDate() - 3)),
        bit_suen: 7.5,
        bit_cali: "Excelente",
        bit_anim: "Muy Calmo",
        bit_apet: "Bueno",
        bit_bpm: 78,
        bit_obse: "Disfrutó mucho la actividad de pintura.",
        bit_crisi: 0,
        bit_dese: "",
        bit_senso: "",
        bit_medi: true,
        bit_diges: "Normal"
      });
    }

    for (const record of records) {
      const bit_codi = 'B' + crypto.randomBytes(4).toString('hex').substring(0, 9);
      await prisma.tr_bitac.create({
        data: {
          bit_codi: bit_codi,
          nin_codi: record.nin_codi,
          bit_fech: record.bit_fech,
          bit_suen: record.bit_suen,
          bit_cali: record.bit_cali,
          bit_anim: record.bit_anim,
          bit_apet: record.bit_apet,
          bit_bpm: record.bit_bpm,
          bit_obse: record.bit_obse,
          bit_crisi: record.bit_crisi,
          bit_dese: record.bit_dese,
          bit_senso: record.bit_senso,
          bit_medi: record.bit_medi,
          bit_diges: record.bit_diges,
          bit_crea: new Date()
        }
      });
    }

    console.log(`Se insertaron ${records.length} reportes de bitácora simulados.`);
  } catch (error) {
    console.error("Error seeding bitacoras:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedBitacora();
