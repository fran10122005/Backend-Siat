/**
 * SIAT - Wearable IoT Simulator
 * Simula el envío de telemetría (BPM, Aceleración, Índice de Estrés) desde la pulsera.
 */
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const BACKEND_URL = 'http://localhost:3000/api';

// Configuración inicial del simulador
let isCrisisMode = false;
let transmitInterval = null;
let telemetryCounter = 0;
let token = null;

// Parámetros de sesión
const SESSION_IDS = {
  nin_codi: 'NIN_1', // Juanito Pérez (Seeded)
  dis_codi: 'D001',
  con_codi: 'C_PULSO',
  sen_codi: 'S_PULSO',
  cat_codi: 'CAT_SIM',
  act_codi: 'ACT_SIM',
  ses_codi: 'S_SIM_001',
};

async function setupDatabaseState() {
  console.log('🔄 Sincronizando estado de base de datos para la simulación...');

  // 0. Asegurar Roles base y Permisos
  await prisma.tm_permi.upsert({
    where: { per_codi: 'P001' },
    update: {},
    create: { per_codi: 'P001', per_nomb: 'Todos los permisos' }
  });

  await prisma.tm_roles.upsert({
    where: { rol_codi: 'ROL_REP' },
    update: {},
    create: { rol_codi: 'ROL_REP', rol_nomb: 'Representante', per_codi: 'P001' }
  });

  // 0.1 Asegurar Usuario y Representante
  const hashed = await bcrypt.hash('123456', 10);
  const user = await prisma.tm_usuar.findFirst({ where: { usu_crro: 'padre@siat.com' } });
  if (!user) {
    await prisma.tm_usuar.create({
      data: {
        usu_codi: 'U_SIM_1',
        rol_codi: 'ROL_REP',
        usu_crro: 'padre@siat.com',
        usu_clve: hashed,
        usu_crea: new Date(),
        usu_estd: true
      }
    });
  }

  // 0.2 Crear institución I001 (Foreign Key para Ninos y Dispositivos)
  await prisma.tm_insti.upsert({
    where: { ins_codi: 'I001' },
    update: {},
    create: {
      ins_codi: 'I001',
      ins_nomb: 'Clínica Principal',
      ins_dire: 'No especificada',
      ins_telf: '000000000'
    }
  });

  // 0.3 Crear niño NIN_1 (Foreign Key para Dispositivos)
  await prisma.tm_ninos.upsert({
    where: { nin_codi: SESSION_IDS.nin_codi },
    update: {},
    create: {
      nin_codi: SESSION_IDS.nin_codi,
      ins_codi: 'I001',
      nin_nomb: 'Juanito',
      nin_apel: 'Pérez',
      nin_fnac: new Date('2018-05-10'),
      nin_gner: 'M',
      nin_nivd: 'Nivel 1',
      nin_ingr: new Date()
    }
  });

  // 1. Crear sensor de pulso
  await prisma.tm_senso.upsert({
    where: { sen_codi: SESSION_IDS.sen_codi },
    update: {},
    create: {
      sen_codi: SESSION_IDS.sen_codi,
      sen_nomb: 'Biosensor Óptico MAX30102',
      sen_tmed: 'Frecuencia Cardíaca',
      sen_unit: 'BPM',
    },
  });

  // 2. Crear dispositivo
  await prisma.tm_dispo.upsert({
    where: { dis_sral: 'HW-001-SERIAL-99' },
    update: {},
    create: {
      dis_codi: SESSION_IDS.dis_codi,
      ins_codi: 'I001',
      nin_codi: SESSION_IDS.nin_codi,
      dis_sral: 'HW-001-SERIAL-99',
      dis_vers: 'v1.4',
      dis_iplo: '127.0.0.1',
      dis_stdo: 'Online',
    },
  });

  // 3. Crear configuración
  await prisma.tc_confi.upsert({
    where: { con_codi: SESSION_IDS.con_codi },
    update: {},
    create: {
      con_codi: SESSION_IDS.con_codi,
      dis_codi: SESSION_IDS.dis_codi,
      sen_codi: SESSION_IDS.sen_codi,
      con_stdo: true,
    },
  });

  // 4. Crear categoría de actividad
  await prisma.tm_categ.upsert({
    where: { cat_codi: SESSION_IDS.cat_codi },
    update: {},
    create: {
      cat_codi: SESSION_IDS.cat_codi,
      cat_nomb: 'Monitoreo General',
      cat_deta: 'Actividades de supervisión pasiva',
    },
  });

  // 5. Crear actividad
  await prisma.tm_activ.upsert({
    where: { act_codi: SESSION_IDS.act_codi },
    update: {},
    create: {
      act_codi: SESSION_IDS.act_codi,
      rep_codi: SESSION_IDS.cat_codi,
      act_trea: 'Supervisión en el Hogar',
      act_meta: 'Medir constantes fisiológicas basales',
      act_guia: 'Mantener la pulsera colocada correctamente',
      act_time: 120,
    },
  });

  // 5.5. Crear instrucción para la alerta (satisface FK constraint en tr_alert)
  await prisma.tm_instr.upsert({
    where: { ins_codi: 'I001' },
    update: {},
    create: {
      ins_codi: 'I001',
      ins_cont: 'Mantener la calma, aplicar respiración guiada y guiar al menor a un espacio de bajo estímulo.',
      ins_audi: null,
    },
  });

  // 6. Asegurar que exista una sesión activa
  const sesionActiva = await prisma.tr_sesio.findFirst({
    where: {
      nin_codi: SESSION_IDS.nin_codi,
      ses_cerr: null,
    },
  });

  if (sesionActiva) {
    SESSION_IDS.ses_codi = sesionActiva.ses_codi;
    console.log(`📌 Reutilizando sesión activa detectada: ${SESSION_IDS.ses_codi}`);
  } else {
    await prisma.tr_sesio.create({
      data: {
        ses_codi: SESSION_IDS.ses_codi,
        nin_codi: SESSION_IDS.nin_codi,
        act_codi: SESSION_IDS.act_codi,
        dis_codi: SESSION_IDS.dis_codi,
        ses_inic: new Date(),
      },
    });
    console.log(`🆕 Creada nueva sesión para simulación: ${SESSION_IDS.ses_codi}`);
  }
}

async function authenticate() {
  console.log('🔐 Solicitando token de acceso (login)...');
  try {
    const res = await fetch(`${BACKEND_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        usu_crro: 'padre@siat.com',
        usu_clve: '123456',
      }),
    });
    if (!res.ok) throw new Error('Credenciales inválidas');
    const data = await res.json();
    token = data.data.token;
    console.log('✅ Token JWT adquirido exitosamente.');
  } catch (error) {
    console.error('❌ Error de autenticación:', error.message);
    process.exit(1);
  }
}

function calculateStressIndex(bpm, mov) {
  // Simula la lógica de estrés: a mayor pulso y menor movimiento, más estrés
  if (bpm <= 65) return 0;
  const ratio = Math.min(1, Math.max(0, (bpm - 65) / 45));
  const movRatio = Math.min(1, Math.max(0, mov / 8));
  let stress = ratio * 100 * (1 - movRatio * 0.4);
  if (isCrisisMode) {
    stress = Math.max(stress, 88);
  }
  return Math.round(stress);
}

async function transmitTelemetry() {
  // Sincronizar estado de simulación con el servidor backend
  try {
    const syncRes = await fetch(`${BACKEND_URL}/monitoreo/simular-estado`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    if (syncRes.ok) {
      const syncData = await syncRes.json();
      const serverCrisisMode = syncData.data.simulatedCrisisMode;
      if (isCrisisMode !== serverCrisisMode) {
        isCrisisMode = serverCrisisMode;
        console.log(`\n🔄 Sincronizado con el servidor: Modo ${isCrisisMode ? '🚨 CRISIS' : '🟢 CALMA'}`);
      }
    }
  } catch (err) {
    // Falla silenciosa para evitar spam en consola si se interrumpe la red
  }

  telemetryCounter++;
  let bpm, mov;

  if (isCrisisMode) {
    // Crisis: BPM elevado y poco movimiento de juego
    bpm = Math.floor(Math.random() * (132 - 120 + 1) + 120);
    mov = Number((Math.random() * (1.5 - 0.4) + 0.4).toFixed(1));
  } else {
    // Calma: BPM en reposo y movimiento regular
    bpm = Math.floor(Math.random() * (82 - 70 + 1) + 70);
    mov = Number((Math.random() * (2.8 - 0.8) + 0.8).toFixed(1));
  }

  const stress = calculateStressIndex(bpm, mov);
  const hasAlert = stress > 75;

  const payload = {
    ses_codi: SESSION_IDS.ses_codi,
    con_codi: SESSION_IDS.con_codi,
    tel_regi: bpm,
    tel_marc: telemetryCounter,
    tel_calid: 98.5,
    tel_mov: mov,
    tel_stress: stress,
    is_alert: hasAlert,
    ins_codi: 'I001',
    ale_meto: hasAlert ? 'SOBRECARGA_SENSORIAL' : undefined,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/monitoreo/telemetria`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const stateIcon = isCrisisMode ? '🚨' : '🟢';
      const stateName = isCrisisMode ? 'Crisis/Estrés' : 'Calma Basal';
      console.log(
        `📡 [Envío ${telemetryCounter}] [${stateIcon} ${stateName}] BPM: ${bpm} | Mov: ${mov}G | Estrés: ${stress}% | Alerta: ${hasAlert ? 'SÍ' : 'NO'}`
      );
    } else {
      console.warn(`⚠️ Error de transmisión (${res.status}):`, await res.text());
    }
  } catch (err) {
    console.error('❌ Error de red en transmisión:', err.message);
  }
}

function startStreaming() {
  console.log('\n==================================================');
  console.log('📶 TRANSMISOR SIAT WEARABLE INICIADO');
  console.log('Muestras continuas cada 10 segundos.');
  console.log('--------------------------------------------------');
  console.log('Controles Interactivos de Consola:');
  console.log('  [S] : Gatillar Modo Crisis/Estrés Sobrecargado');
  console.log('  [C] : Retornar a Modo Calma');
  console.log('  [Q] o [Ctrl+C] : Detener y salir del Simulador');
  console.log('==================================================\n');

  transmitInterval = setInterval(transmitTelemetry, 10000);
}

// Configurar lectura de consola interactiva (Raw nativo directo)
if (process.stdin.isTTY || typeof process.stdin.setRawMode === 'function') {
  try {
    process.stdin.setRawMode(true);
    console.log('🎹 Modo de lectura rápida (Raw) activado: Presiona una sola tecla directamente.');
  } catch (err) {
    console.warn('⚠️ No se pudo activar el modo Raw en este terminal.');
  }
}

const handleInput = async (cmd) => {
  if (cmd === 's') {
    isCrisisMode = true;
    console.log('\n⚠️  MODO CRISIS ACTIVADO: Generando pulso alto y baja movilidad...');
    try {
      await fetch(`${BACKEND_URL}/monitoreo/simular-estado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'CRISIS' })
      });
    } catch (err) {
      // Ignorar fallas silenciosas en la red durante la simulación de entrada
    }
  } else if (cmd === 'c') {
    isCrisisMode = false;
    console.log('\n✅ MODO CALMA RESTAURADO: Retornando constantes a niveles basales...');
    try {
      await fetch(`${BACKEND_URL}/monitoreo/simular-estado`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ estado: 'CALMA' })
      });
    } catch (err) {
      // Ignorar fallas silenciosas
    }
  } else if (cmd === 'q') {
    console.log('\n🔌 Apagando simulador y desconectando hardware. ¡Hasta luego!');
    clearInterval(transmitInterval);
    prisma.$disconnect();
    process.exit();
  }
};

// Listener directo sobre el flujo de datos para máxima compatibilidad
process.stdin.resume();
process.stdin.on('data', (buffer) => {
  const str = buffer.toString('utf8').toLowerCase();
  
  // Capturar Ctrl+C (Hex 03)
  if (str.includes('\u0003')) {
    handleInput('q');
    return;
  }
  
  // Limpiar y tomar el comando
  const cmd = str.trim();
  if (cmd === 's' || cmd === 'c' || cmd === 'q') {
    handleInput(cmd);
  }
});

// Arrancar proceso
(async () => {
  await setupDatabaseState();
  await authenticate();
  startStreaming();
})();
