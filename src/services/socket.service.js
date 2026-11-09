const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const prisma = require('../config/db');
const { isOriginAllowed } = require('../middleware/cors');
const logger = require('../utils/logger');
const { generateId } = require('../utils/idGenerator');

const socketsByUser = new Map(); // usu_codi → Set<socketId>
const lastSavedTelemetryBySession = new Map(); // ses_codi → timestamp

function registerSocket(socket) {
  const usuCodi = socket.user.usu_codi;
  const current = socketsByUser.get(usuCodi) || new Set();
  current.add(socket.id);
  socketsByUser.set(usuCodi, current);
}

function unregisterSocket(socket) {
  const usuCodi = socket.user.usu_codi;
  const current = socketsByUser.get(usuCodi);
  if (!current) return;
  current.delete(socket.id);
  if (current.size === 0) socketsByUser.delete(usuCodi);
}

function closePreviousSockets(io, usuCodi, keepId) {
  const current = socketsByUser.get(usuCodi);
  if (!current) return;
  for (const socketId of current) {
    if (socketId === keepId) continue;
    const old = io.sockets.sockets.get(socketId);
    if (old) {
      logger.info(`🧹 Cerrando socket huérfano ${socketId} del usuario ${usuCodi}`);
      old.disconnect(true);
    }
  }
}

const childRoom = (ninCodi) => `child:${ninCodi}`;
const userRoom = (usuCodi) => `user:${usuCodi}`;
const adminRoom = (insCodi) => `admin:${insCodi || 'global'}`;

async function roomsForUser(usu_codi, rol_codi) {
  const rooms = [];
  if (usu_codi) rooms.push(userRoom(usu_codi));

  if (rol_codi === 'ROL_REP') {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: { tm_repre_ninos: true }
    });
    if (repre?.tm_repre_ninos?.length) {
      repre.tm_repre_ninos.forEach((rn) => rooms.push(childRoom(rn.nin_codi)));
    } else if (repre?.nin_codi) {
      rooms.push(childRoom(repre.nin_codi));
    }
  } else if (rol_codi === 'ROL_ESP') {
    const espec = await prisma.tm_espec.findUnique({
      where: { usu_codi },
      include: {
        tc_asign: {
          where: { asi_stdo: 'Activo' }
        }
      }
    });
    if (espec?.tc_asign?.length) {
      espec.tc_asign.forEach((asign) => rooms.push(childRoom(asign.nin_codi)));
    }
  } else if (rol_codi === 'ROL_ADM') {
    // El administrador NO se une a salas child:* para aislar crisis infantiles y evitar
    // sobrecarga en tiempo real cuando existen miles de pacientes en la institución.
    const admin = await prisma.tm_admin.findUnique({
      where: { usu_codi },
      select: { ins_codi: true }
    });
    rooms.push(adminRoom(admin?.ins_codi));
  }

  return [...new Set(rooms)];
}

async function canAccessChild(usu_codi, rol_codi, nin_codi) {
  if (!nin_codi) return false;
  if (rol_codi === 'ROL_ADM') {
    // El administrador no participa en telemetría clínica ni en salas individuales de niños
    return false;
  }
  if (rol_codi === 'ROL_REP') {
    const repre = await prisma.tm_repre.findUnique({
      where: { usu_codi },
      include: { tm_repre_ninos: true }
    });
    if (!repre) return false;
    if (Array.isArray(repre.tm_repre_ninos)) {
      return repre.tm_repre_ninos.some((rn) => rn.nin_codi === nin_codi);
    }
    return repre.nin_codi === nin_codi;
  }
  if (rol_codi === 'ROL_ESP') {
    const espec = await prisma.tm_espec.findUnique({
      where: { usu_codi },
      include: {
        tc_asign: {
          where: { asi_stdo: 'Activo' }
        }
      }
    });
    return Boolean(
      espec?.tc_asign?.some(
        (a) => a.nin_codi === nin_codi && (!a.asi_stdo || a.asi_stdo === 'Activo')
      )
    );
  }
  return false;
}

async function syncRooms(socket) {
  const { usu_codi, rol_codi } = socket.user;
  try {
    const rooms = await roomsForUser(usu_codi, rol_codi);
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    for (const room of rooms) {
      socket.join(room);
      logger.info(`🔌 ${rol_codi} ${usu_codi} unido a sala ${room}`);
    }
    socket.emit('rooms_updated', { rooms });
  } catch (err) {
    logger.error('Error al sincronizar salas de Socket.io:', { error: err.message });
  }
}

let ioInstance = null;

function initSocketServer(server, app) {
  const io = new Server(server, {
    pingInterval: 25000,
    pingTimeout: 20000,
    cors: {
      origin: (origin, callback) => {
        if (isOriginAllowed(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    }
  });

  if (app) {
    app.set('io', io);
  }

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      return next(new Error('Error de autenticación: Token no provisto'));
    }
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Error de autenticación: Token inválido o expirado'));
    }
  });

  io.on('connection', async (socket) => {
    logger.info(`🔌 Cliente conectado: ${socket.id} (Usuario: ${socket.user.usu_codi}, Rol: ${socket.user.rol_codi})`);

    registerSocket(socket);
    closePreviousSockets(io, socket.user.usu_codi, socket.id);

    await syncRooms(socket);

    socket.on('join_child', async (nin_codi, ack) => {
      try {
        const allowed = await canAccessChild(socket.user.usu_codi, socket.user.rol_codi, nin_codi);
        if (!allowed) {
          if (typeof ack === 'function') ack({ ok: false, error: 'Sin permiso para observar este niño' });
          return;
        }
        socket.join(childRoom(nin_codi));
        if (typeof ack === 'function') ack({ ok: true, room: childRoom(nin_codi) });
      } catch (err) {
        if (typeof ack === 'function') ack({ ok: false, error: err.message });
      }
    });

    socket.on('leave_child', (nin_codi) => {
      socket.leave(childRoom(nin_codi));
    });

    socket.on('resync_rooms', async () => {
      await syncRooms(socket);
    });

    socket.on('telemetry_data', async (payload) => {
      try {
        if (!payload || !payload.bpm) return;
        const bpm = Number(payload.bpm);
        if (isNaN(bpm) || bpm <= 0) return;

        let targetChild = payload.nin_codi;
        if (!targetChild) {
          if (socket.user.rol_codi === 'ROL_REP') {
            const rep = await prisma.tm_repre.findUnique({
              where: { usu_codi: socket.user.usu_codi },
              include: { tm_repre_ninos: true }
            });
            targetChild = rep?.tm_repre_ninos?.[0]?.nin_codi;
          }
        }
        if (!targetChild) return;

        const allowed = await canAccessChild(socket.user.usu_codi, socket.user.rol_codi, targetChild);
        if (!allowed) {
          logger.warn(`🚫 Usuario ${socket.user.usu_codi} sin permiso para emitir telemetría de niño: ${targetChild}`);
          return;
        }

        const mov = payload.mov !== undefined ? Number(payload.mov) : 1.0;
        const stress = payload.stress !== undefined
          ? Number(payload.stress)
          : Math.min(100, Math.max(5, Math.round(((bpm - 60) / 70) * 100)));
        const timeStr = payload.time || new Intl.DateTimeFormat('es-ES', {
          hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).format(new Date());

        const source = payload.source || 'BLE_DIRECT';
        const defaultDevice = source === 'HEALTH_CONNECT' ? 'Health Connect' : 'Smartwatch BLE';
        const deviceName = payload.deviceName || defaultDevice;

        const enrichedPayload = {
          nin_codi: targetChild,
          bpm,
          stress,
          mov,
          time: timeStr,
          source,
          deviceName,
          ses_codi: payload.ses_codi || null
        };

        const room = childRoom(targetChild);
        // Retransmisión continua en tiempo real hacia observadores (Especialista, Representante, Admin)
        io.to(room).emit('new_telemetry', enrichedPayload);
        io.to(room).emit('telemetry_data', enrichedPayload);

        // Si hay una sesión activa, persistir en tr_telem de la base de datos (con control de cadencia: cada 3s)
        const activeSesion = payload.ses_codi
          ? await prisma.tr_sesio.findUnique({ where: { ses_codi: payload.ses_codi } })
          : await prisma.tr_sesio.findFirst({
              where: { nin_codi: targetChild, ses_cerr: null },
              orderBy: { ses_inic: 'desc' }
            });

        if (activeSesion && !activeSesion.ses_cerr) {
          const nowTs = Date.now();
          const lastSaved = lastSavedTelemetryBySession.get(activeSesion.ses_codi) || 0;
          if (nowTs - lastSaved >= 3000) {
            lastSavedTelemetryBySession.set(activeSesion.ses_codi, nowTs);

            const config = await prisma.tc_confi.findFirst({
              where: { dis_codi: activeSesion.dis_codi }
            });

            if (config) {
              const secondsElapsed = Math.max(1, Math.floor((nowTs - new Date(activeSesion.ses_inic).getTime()) / 1000));
              await prisma.tr_telem.create({
                data: {
                  tel_codi: generateId('T'),
                  ses_codi: activeSesion.ses_codi,
                  con_codi: config.con_codi,
                  tel_regi: bpm,
                  tel_marc: Math.floor(secondsElapsed / 10),
                  tel_calid: 99.0,
                  tel_sour: source,
                  tel_devn: deviceName
                }
              }).catch(err => {
                logger.warn('Aviso al guardar muestra tr_telem:', { error: err.message });
              });
            }
          }
        }

        // Evaluación de umbrales clínicos (tc_umbra) para alerta de sobrecarga sensorial / anomalía
        const umbral = await prisma.tc_umbra.findFirst({
          where: { nin_codi: targetChild },
          orderBy: { umb_ajus: 'desc' }
        });

        if (umbral && (bpm > umbral.umb_lims || bpm < umbral.umb_limi)) {
          const aleMeto = bpm > umbral.umb_lims ? 'SOBRECARGA_SENSORIAL' : 'BRADICARDIA_ANOMALA';
          if (activeSesion && !activeSesion.ses_cerr) {
            const recentAlert = await prisma.tr_alert.findFirst({
              where: {
                ses_codi: activeSesion.ses_codi,
                ale_time: { gte: new Date(Date.now() - 30000) }
              }
            });

            if (!recentAlert) {
              const instr = await prisma.tm_instr.findFirst();
              const ins_codi = instr?.ins_codi || 'I001';
              const [alerta, ninoInfo] = await Promise.all([
                prisma.tr_alert.create({
                  data: {
                    ale_codi: generateId('AL'),
                    ses_codi: activeSesion.ses_codi,
                    ins_codi,
                    ale_time: new Date(),
                    ale_meto: aleMeto
                  }
                }),
                prisma.tm_ninos.findUnique({
                  where: { nin_codi: targetChild },
                  select: { nin_nomb: true }
                })
              ]);

              const ninNomb = ninoInfo?.nin_nomb || null;
              io.to(room).emit('new_alert', {
                id_alert: alerta.ale_codi,
                nin_codi: targetChild,
                nin_nomb: ninNomb,
                nino: ninNomb,
                niño: ninNomb,
                fec_hora: alerta.ale_time,
                metodo: alerta.ale_meto,
                est_dete: alerta.ale_meto,
                bpm_max: bpm,
                mov_max: mov,
                stress_index: stress
              });
            }
          }
        }
      } catch (err) {
        logger.error('Error al procesar socket telemetry_data:', { error: err.message });
      }
    });

    socket.on('disconnect', () => {
      unregisterSocket(socket);
      logger.info(`🔌 Cliente desconectado: ${socket.id}`);
    });
  });

  ioInstance = io;
  return io;
}

function getIO() {
  return ioInstance;
}

function emitToUser(usuCodi, event, payload) {
  if (!ioInstance || !usuCodi || !event) return false;
  ioInstance.to(userRoom(usuCodi)).emit(event, payload);
  return true;
}

function emitToAdminInstitution(insCodi, event, payload) {
  if (!ioInstance || !event) return false;
  ioInstance.to(adminRoom(insCodi)).emit(event, payload);
  return true;
}

async function resyncUserSockets(usuCodi) {
  if (!ioInstance || !usuCodi) return;
  const current = socketsByUser.get(usuCodi);
  if (!current || current.size === 0) return;
  for (const socketId of current) {
    const sock = ioInstance.sockets.sockets.get(socketId);
    if (sock) {
      await syncRooms(sock);
    }
  }
}

module.exports = {
  initSocketServer,
  getIO,
  emitToUser,
  emitToAdminInstitution,
  resyncUserSockets,
  roomsForUser,
  canAccessChild
};
