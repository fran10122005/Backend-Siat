const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

async function testFlow() {
  console.log('🧪 Iniciando prueba automatizada del flujo de invitación clínica...');

  // 1. Obtener un especialista de prueba
  const espec = await prisma.tm_espec.findFirst();
  if (!espec) {
    console.error('❌ No hay especialistas en la base de datos para la prueba.');
    return;
  }
  console.log(`👤 Especialista seleccionado para prueba: ${espec.esp_nomb} (${espec.usu_codi})`);

  // 2. Ejecutar lógica de invitación simulando controlador/servicio
  const testEmail = `padre_test_${Date.now()}@test.com`;
  const ninoData = {
    nin_nomb: 'Pedrito',
    nin_apel: 'Test',
    nin_fnac: '2018-04-12',
    nin_gner: 'M',
    nin_nivd: 'Nivel 2',
    rep_nomb: 'Carlos',
    rep_apel: 'Test',
    usu_crro: testEmail
  };

  console.log(`✉️ Creando primera invitación para el correo: ${testEmail}`);
  
  // Llamar al servicio directamente para validar
  const ninosService = require('../src/modules/ninos/ninos.service');
  let inviteResult = await ninosService.inviteRepresentative(espec.usu_codi, ninoData);

  console.log('✅ Primera invitación creada con éxito.');

  console.log(`✉️ Creando SEGUNDA invitación para el mismo correo (debe limpiar y recrear): ${testEmail}`);
  inviteResult = await ninosService.inviteRepresentative(espec.usu_codi, {
    ...ninoData,
    nin_nomb: 'Pedrito Modificado'
  });

  console.log('✅ Segunda invitación creada con éxito sin error de constraint.');
  console.log(`🔗 Enlace de activación generado: ${inviteResult.invitationUrl}`);

  // Extraer token del enlace
  const urlParams = new URL(inviteResult.invitationUrl);
  const token = urlParams.searchParams.get('token');
  console.log(`🔑 Token de invitación extraído: ${token}`);

  // 3. Simular validación del token de invitación
  console.log('🔍 Validando token y obteniendo detalles de la invitación...');
  const authService = require('../src/modules/auth/auth.service');
  const details = await authService.getInvitationDetails(token);
  console.log('✅ Detalles de la invitación recuperados:', details);

  if (details.usu_crro !== testEmail || details.nin_nomb !== 'Pedrito Modificado') {
    throw new Error('❌ Los detalles de la invitación no coinciden con los datos registrados.');
  }

  // 4. Simular finalización del registro por el padre
  console.log('🔐 Completando registro del representante con contraseña...');
  const completeResult = await authService.completeInvitation({
    token: token,
    password: 'securePassword123',
    relation: 'Padre',
    phone: '04121112222'
  });

  console.log('✅ Registro completado exitosamente. Resultado del Login:', completeResult);

  // 5. Verificar que el usuario esté activo en la base de datos
  const userInDb = await prisma.tm_usuar.findUnique({
    where: { usu_codi: completeResult.user.usu_codi }
  });

  console.log(`📊 Estado final del usuario en la base de datos (activo = true): ${userInDb.usu_estd}`);

  if (userInDb.usu_estd !== true) {
    throw new Error('❌ El usuario no quedó marcado como activo tras completar el registro.');
  }

  console.log('🎉 ¡Prueba de flujo de invitación clínica completada con éxito!');
}

testFlow()
  .catch(err => {
    console.error('❌ Error durante la prueba:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
