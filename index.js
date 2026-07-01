const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const jwt = require('jsonwebtoken');
const env = require('./src/config/env');
const prisma = require('./src/config/db');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      const allowedOrigins = [
        /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
        env.FRONTEND_URL.replace(/\/$/, '')
      ];
      if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
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

io.on('connection', async (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id} (Usuario: ${socket.user.usu_codi}, Rol: ${socket.user.rol_codi})`);

  try {
    const { usu_codi, rol_codi } = socket.user;

    if (rol_codi === 'ROL_REP') {
      const repre = await prisma.tm_repre.findUnique({
        where: { usu_codi }
      });
      if (repre && repre.nin_codi) {
        socket.join(`child:${repre.nin_codi}`);
        console.log(`🔌 Representante ${usu_codi} unido a sala child:${repre.nin_codi}`);
      }
    } else if (rol_codi === 'ROL_ESP') {
      const espec = await prisma.tm_espec.findUnique({
        where: { usu_codi },
        include: { tc_asign: true }
      });
      if (espec && espec.tc_asign) {
        espec.tc_asign.forEach(asign => {
          socket.join(`child:${asign.nin_codi}`);
          console.log(`🔌 Especialista ${usu_codi} unido a sala child:${asign.nin_codi}`);
        });
      }
    }
  } catch (err) {
    console.error('Error al unir cliente a salas de Socket.io:', err.message);
  }

  socket.on('disconnect', () => {
    console.log(`🔌 Cliente desconectado: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Servidor backend SIAT corriendo en el puerto ${PORT}`);
});
