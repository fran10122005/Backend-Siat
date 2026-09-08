const http = require('http');
const app = require('./src/app');
const env = require('./src/config/env');
const prisma = require('./src/config/db');
const logger = require('./src/utils/logger');
const { initSocketServer } = require('./src/services/socket.service');

const PORT = env.PORT || 3000;

const server = http.createServer(app);

// Inicializar Socket.IO mediante el servicio dedicado
const io = initSocketServer(server, app);

// Iniciar servidor HTTP
server.listen(PORT, () => {
  logger.info(`🚀 Servidor backend SIAT corriendo en el puerto ${PORT}`);
});

// Graceful Shutdown (Cierre ordenado ante señales del sistema)
const gracefulShutdown = (signal) => {
  logger.info(`⚠️ Señal ${signal} recibida. Iniciando cierre ordenado de SIAT Backend...`);
  
  if (io) {
    io.close(() => {
      logger.info('🔌 Servidor Socket.IO cerrado.');
    });
  }

  server.close(async () => {
    logger.info('🌐 Servidor HTTP cerrado.');
    try {
      await prisma.$disconnect();
      logger.info('🗄️ Conexiones de base de datos Prisma cerradas.');
      process.exit(0);
    } catch (err) {
      logger.error('Error al desconectar Prisma durante cierre:', { error: err.message });
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('⚠️ Apagado forzado por tiempo de espera excedido (10s).');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));