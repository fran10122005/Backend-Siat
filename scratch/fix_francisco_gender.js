const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const res = await prisma.tm_espec.updateMany({
    where: {
      esp_nomb: {
        contains: 'Francisco',
        mode: 'insensitive'
      }
    },
    data: {
      esp_gner: 'M'
    }
  });
  console.log(`Especialistas actualizados:`, res.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
