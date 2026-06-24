const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Actualizando institución I001 en la base de datos...');
  const updated = await prisma.tm_insti.upsert({
    where: { ins_codi: 'I001' },
    update: {
      ins_nomb: 'Fundación Una Luz Para el Autismo',
      ins_dire: 'Sede Principal',
      ins_telf: '04140000000'
    },
    create: {
      ins_codi: 'I001',
      ins_nomb: 'Fundación Una Luz Para el Autismo',
      ins_dire: 'Sede Principal',
      ins_telf: '04140000000'
    }
  });
  console.log('Institución actualizada:', updated);
}

main()
  .catch((e) => {
    console.error('Error al actualizar base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
