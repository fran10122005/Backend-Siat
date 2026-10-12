const adminService = require('../modules/admin/admin.service');
const logger = require('../utils/logger');

let intervalId = null;
const CHECK_INTERVAL_MS = 60 * 1000; // Chequeo periódico cada 60 segundos

/**
 * Servicio autónomo de ejecución periódica de reportes clínicos y ejecutivos en Backend.
 * Opera de forma 100% independiente del navegador y persiste su estado en Neon PostgreSQL.
 */
function startReportScheduler() {
  if (intervalId) return;

  logger.info('⏰ Scheduler de reportes ejecutivos iniciado (intervalo: 60s)');

  // Primer chequeo preventivo 10s después del arranque
  setTimeout(async () => {
    try {
      await adminService.checkAndExecuteScheduledReport();
    } catch (err) {
      logger.error('Error en chequeo inicial de reportes programados:', { error: err.message });
    }
  }, 10000);

  intervalId = setInterval(async () => {
    try {
      await adminService.checkAndExecuteScheduledReport();
    } catch (err) {
      logger.error('Error durante ciclo de scheduler de reportes:', { error: err.message });
    }
  }, CHECK_INTERVAL_MS);

  if (intervalId.unref) {
    intervalId.unref();
  }
}

function stopReportScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    logger.info('🛑 Scheduler de reportes ejecutivos detenido.');
  }
}

module.exports = {
  startReportScheduler,
  stopReportScheduler
};
