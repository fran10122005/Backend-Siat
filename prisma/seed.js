const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando el seeding de la base de datos...');

  // 1. Permisos y Roles
  await prisma.tm_permi.upsert({
    where: { per_codi: 'P_ALL' },
    update: {},
    create: { per_codi: 'P_ALL', per_nomb: 'Todos', per_priv: 'ALL' }
  });

  const roles = [
    { rol_codi: 'ROL_DIR', rol_nomb: 'Director Global', per_codi: 'P_ALL' },
    { rol_codi: 'ROL_ADM', rol_nomb: 'Admin Institución', per_codi: 'P_ALL' },
    { rol_codi: 'ROL_ESP', rol_nomb: 'Especialista', per_codi: 'P_ALL' },
    { rol_codi: 'ROL_REP', rol_nomb: 'Representante', per_codi: 'P_ALL' }
  ];

  for (const r of roles) {
    await prisma.tm_roles.upsert({
      where: { rol_codi: r.rol_codi },
      update: {},
      create: r
    });
  }

  // 2. Institución y Especialidad
  await prisma.tm_insti.upsert({
    where: { ins_codi: 'I001' },
    update: {},
    create: { ins_codi: 'I001', ins_nomb: 'Fundación Una Luz Para el Autismo', ins_dire: 'Sede Principal', ins_telf: '04140000000' }
  });

  const especialidades = [
    { esc_codi: 'E001', esc_nomb: 'Neurología' },
    { esc_codi: 'E002', esc_nomb: 'Psicología Infantil' },
    { esc_codi: 'E003', esc_nomb: 'Terapia Ocupacional' },
    { esc_codi: 'E004', esc_nomb: 'Terapia de Lenguaje' },
    { esc_codi: 'E005', esc_nomb: 'Psicopedagogía' }
  ];

  for (const esp of especialidades) {
    await prisma.tm_especi.upsert({
      where: { esc_codi: esp.esc_codi },
      update: {},
      create: esp
    });
  }

  const hashedClve = await bcrypt.hash('123456', 10);

  // 3. Crear Director (Admin Global) - Desactivado temporalmente
  /*
  await prisma.tm_usuar.upsert({
    where: { usu_codi: 'U_DIR1' },
    update: { usu_clve: hashedClve },
    create: {
      usu_codi: 'U_DIR1',
      rol_codi: 'ROL_DIR',
      usu_crro: 'director@siat.com',
      usu_clve: hashedClve,
      usu_crea: new Date(),
      usu_estd: true
    }
  });
  */



  // 6. Crear Admin de Institución
  const adminInst = await prisma.tm_usuar.upsert({
    where: { usu_codi: 'U_ADM1' },
    update: { usu_clve: hashedClve },
    create: {
      usu_codi: 'U_ADM1',
      rol_codi: 'ROL_ADM',
      usu_crro: 'admin_fundacion@siat.com',
      usu_clve: hashedClve,
      usu_crea: new Date(),
      usu_estd: true
    }
  });

  await prisma.tm_admin.upsert({
    where: { usu_codi: adminInst.usu_codi },
    update: {},
    create: {
      adm_codi: 'ADM_1',
      usu_codi: adminInst.usu_codi,
      ins_codi: 'I001',
      adm_nomb: 'Carlos',
      adm_apel: 'Méndez'
    }
  });

  console.log('¡Seeding completado con éxito!');
  console.log('Credenciales para probar los perfiles:');
  console.log('1. ADMIN FUNDACIÓN: admin_fundacion@siat.com | pass: 123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
