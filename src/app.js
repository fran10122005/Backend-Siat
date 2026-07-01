const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const app = express();
const env = require('./config/env');

// Configurar CORS: permite localhost en desarrollo y la(s) URL(s) del frontend en producción
app.use(cors({
  origin: function (origin, callback) {
    const frontendUrls = env.FRONTEND_URL.split(',').map(u => u.trim().replace(/\/$/, ''));
    const allowedOrigins = [
      /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
      ...frontendUrls
    ];
    if (!origin || allowedOrigins.some(o => typeof o === 'string' ? o === origin : o.test(origin))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

const { globalLimiter } = require('./middleware/rateLimiter');

// Middlewares globales
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/api', globalLimiter);

// Rutas base
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Backend SIAT funcionando correctamente' });
});

const authRoutes = require('./modules/auth/auth.routes');
const ninosRoutes = require('./modules/ninos/ninos.routes');
const sesionesRoutes = require('./modules/sesiones/sesiones.routes');
const monitoreoRoutes = require('./modules/monitoreo/monitoreo.routes');
const reportesRoutes = require('./modules/reportes/reportes.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const citasRoutes = require('./modules/citas/citas.routes');
const metasRoutes = require('./modules/metas/metas.routes');
const errorHandler = require('./middleware/errorHandler');

// Rutas de modulos
app.use('/api/auth', authRoutes);
app.use('/api/ninos', ninosRoutes);
app.use('/api/sesiones', sesionesRoutes);
app.use('/api/monitoreo', monitoreoRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/citas', citasRoutes);
app.use('/api/metas', metasRoutes);

// Manejo de rutas no encontradas
app.use((req, res, next) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores centralizado
app.use(errorHandler);

module.exports = app;
