const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const Sentry = require('@sentry/node');

// Inicialización opcional de Sentry para producción
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'production',
    tracesSampleRate: 0.2,
  });
}

const app = express();
const { isOriginAllowed } = require('./middleware/cors');
const emailService = require('./services/email.service');
const prisma = require('./config/db');

// Configuración de trust proxy: crítico detrás de Cloudflare/Nginx/Railway/Render
app.set('trust proxy', 1);

// Headers de seguridad con Helmet (HSTS activado en producción sin preload provisional)
app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: false
  } : false
}));

// Compresión Gzip para reducir payloads JSON hacia clientes
app.use(compression());

// Configurar CORS: origen definido en el helper compartido (middleware/cors.js)
app.use(cors({
  origin: function (origin, callback) {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const { globalLimiter } = require('./middleware/rateLimiter');
const xssSanitizer = require('./middleware/xssSanitizer');

// Middlewares globales
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(xssSanitizer);
app.use('/api', globalLimiter);

// Documentación Swagger API
const setupSwagger = require('./config/swagger');
setupSwagger(app);

// Helper para evaluar estado de salud de dependencias del sistema
async function evaluateHealth(appInstance) {
  const services = {
    database: { status: 'down' },
    socketio: { status: 'down' },
    emailjs: { status: 'unconfigured' },
    cloudinary: { status: 'unconfigured' }
  };

  // 1. Base de datos
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    services.database = { status: 'up', latencyMs: Date.now() - start };
  } catch (err) {
    services.database = { status: 'down', error: err.message };
  }

  // 2. Socket.io
  const io = appInstance.get('io');
  if (io) {
    services.socketio = { status: 'up', clientsCount: io.engine?.clientsCount || 0 };
  }

  // 3. EmailJS
  if (emailService.isConfigured()) {
    services.emailjs = { status: 'configured' };
  }

  // 4. Cloudinary
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    services.cloudinary = { status: 'configured' };
  }

  // Determinar estado global:
  // - unhealthy (503): si la base de datos falla
  // - degraded (200): si DB está OK pero alguna dependencia secundaria falla o no está configurada
  // - healthy (200): si todas las dependencias están OK
  let status = 'healthy';
  if (services.database.status !== 'up') {
    status = 'unhealthy';
  } else if (
    services.socketio.status !== 'up' ||
    services.emailjs.status !== 'configured' ||
    services.cloudinary.status !== 'configured'
  ) {
    status = 'degraded';
  }

  return { status, services };
}

// Endpoint público de healthcheck (solo retorna status mínimo para no filtrar detalles internos)
app.get('/api/health', async (req, res) => {
  try {
    const { status } = await evaluateHealth(req.app);
    const httpCode = status === 'unhealthy' ? 503 : 200;
    res.status(httpCode).json({ status });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy' });
  }
});

// Endpoint detallado de healthcheck (protegido por header X-Healthcheck-Token)
app.get('/api/health/detail', async (req, res) => {
  const configuredToken = process.env.HEALTHCHECK_TOKEN;
  if (!configuredToken) {
    return res.status(404).json({ error: 'Endpoint no disponible' });
  }

  const providedToken = req.headers['x-healthcheck-token'];
  if (!providedToken || providedToken !== configuredToken) {
    return res.status(401).json({ error: 'Token de healthcheck no autorizado' });
  }

  try {
    const { status, services } = await evaluateHealth(req.app);
    const httpCode = status === 'unhealthy' ? 503 : 200;
    res.status(httpCode).json({
      status,
      timestamp: new Date().toISOString(),
      services
    });
  } catch (err) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: err.message
    });
  }
});


const authRoutes = require('./modules/auth/auth.routes');
const passkeyRoutes = require('./modules/passkey/passkey.routes');
const ninosRoutes = require('./modules/ninos/ninos.routes');
const sesionesRoutes = require('./modules/sesiones/sesiones.routes');
const monitoreoRoutes = require('./modules/monitoreo/monitoreo.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const metasRoutes = require('./modules/metas/metas.routes');
const consentimientoRoutes = require('./modules/consentimiento/consentimiento.routes');
const especialistaRoutes = require('./modules/especialista/especialista.routes');
const errorHandler = require('./middleware/errorHandler');

// Rutas de modulos
app.use('/api/auth', authRoutes);
app.use('/api/auth', passkeyRoutes);
app.use('/api/ninos', ninosRoutes);
app.use('/api/sesiones', sesionesRoutes);
app.use('/api/monitoreo', monitoreoRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/metas', metasRoutes);
app.use('/api/consentimiento', consentimientoRoutes);
app.use('/api/especialista', especialistaRoutes);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores centralizado
app.use(errorHandler);

module.exports = app;
