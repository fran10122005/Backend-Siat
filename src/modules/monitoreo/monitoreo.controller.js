const monitoreoService = require('./monitoreo.service');
const catchAsync = require('../../utils/catchAsync');

const recibirTelemetria = catchAsync(async (req, res) => {
  const io = req.app.get('io');
  const result = await monitoreoService.procesarTelemetria(req.body, io);
  
  if (result.alerta) {
    return res.status(201).json({ message: 'Alerta registrada y notificada', data: result });
  }
  
  res.status(201).json({ message: 'Recepción de telemetría exitosa', data: result });
});

const obtenerEstadoSimulacion = catchAsync(async (req, res) => {
  const isCrisis = await monitoreoService.getSimulatedCrisisMode();
  res.status(200).json({ status: 'ok', data: { simulatedCrisisMode: isCrisis } });
});

const establecerEstadoSimulacion = catchAsync(async (req, res) => {
  const { estado } = req.body; // 'CRISIS' o 'CALMA'
  const io = req.app.get('io');
  
  if (estado === 'CRISIS') {
    await monitoreoService.setSimulatedCrisisMode(true);
    const result = await monitoreoService.forzarCrisisInmediata(io);
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Simulación de CRISIS activada e incidente notificado inmediatamente',
      data: { simulatedCrisisMode: true, result } 
    });
  } else {
    await monitoreoService.setSimulatedCrisisMode(false);
    const result = await monitoreoService.forzarCalmaInmediata(io);
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Simulación de CALMA restaurada', 
      data: { simulatedCrisisMode: false, result } 
    });
  }
});

module.exports = { 
  recibirTelemetria,
  obtenerEstadoSimulacion,
  establecerEstadoSimulacion
};
