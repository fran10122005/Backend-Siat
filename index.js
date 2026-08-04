const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const jwt = require('jsonwebtoken');
const env = require('./src/config/env');
const prisma = require('./src/config/db');
const { isOriginAllowed } = require('./src/middleware/cors');

const server = http.createServer(app);

const io = new Server(server, {
  // Heartbeat: verifica que los clientes sigan vivos y libera las conexiones muertas
  pingInterval: 25000,
  pingTimeout: 10000,
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

app.set('io', io);

// Middleware de Socket.io para verificar el token JWT
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

const childRoom = (ninCodi) => `child:${ninCodi}`;

// Devuelve la lista de salas a las que tiene acceso un usuario según su rol
async function roomsForUser(usu_codi, rol_codi) {
  const rooms = [];
  if (rol_codi === 'ROL_REP') {
    const repre = await prisma.tm_repre.findUnique({ where: { usu_codi } });
    if (repre && repre.nin_codi) rooms.push(childRoom(repre.nin_codi));
  } else if (rol_codi === 'ROL_ESP') {
    const espec = await prisma.tm_espec.findUnique({
      where: { usu_codi },
      include: { tc_asign: true }
    });
    if (espec && espec.tc_asign) {
      espec.tc_asign.forEach(asign => rooms.push(childRoom(asign.nin_codi)));
    }
  } else if (rol_codi === 'ROL_ADM') {
    // El administrador observa todos los niños de su institución
    const ninos = await prisma.tm_ninos.findMany({ select: { nin_codi: true } });
    ninos.forEach(n => rooms.push(childRoom(n.nin_codi)));
  }
  return rooms;
}

// Valida que el usuario tenga acceso a un niño concreto
async function canAccessChild(usu_codi, rol_codi, nin_codi) {
  if (rol_codi === 'ROL_ADM') {
    const nino = await prisma.tm_ninos.findUnique({ where: { nin_codi } });
    return Boolean(nino);
  }
  if (rol_codi === 'ROL_REP') {
    const repre = await prisma.tm_repre.findUnique({ where: { usu_codi } });
    return Boolean(repre && repre.nin_codi === nin_codi);
  }
  if (rol_codi === 'ROL_ESP') {
    const espec = await prisma.tm_espec.findUnique({
      where: { usu_codi },
      include: { tc_asign: true }
    });
    return Boolean(espec && espec.tc_asign.some(a => a.nin_codi === nin_codi));
  }
  return false;
}

async function syncRooms(socket) {
  const { usu_codi, rol_codi } = socket.user;
  try {
    const rooms = await roomsForUser(usu_codi, rol_codi);
    // Abandonar salas previas y unirse a las actuales (reescucha ante cambios de asignación)
    for (const room of socket.rooms) {
      if (room !== socket.id) socket.leave(room);
    }
    for (const room of rooms) {
      socket.join(room);
      console.log(`🔌 ${rol_codi} ${usu_codi} unido a sala ${room}`);
    }
    socket.emit('rooms_updated', { rooms });
  } catch (err) {
    console.error('Error al sincronizar salas de Socket.io:', err.message);
  }
}

io.on('connection', async (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id} (Usuario: ${socket.user.usu_codi}, Rol: ${socket.user.rol_codi})`);

  // Unión inicial de salas
  await syncRooms(socket);

  // Reescucha dinámica: el cliente puede volver a suscribirse (útil tras reconexión)
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

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor backend SIAT corriendo en el puerto ${PORT}`);
});