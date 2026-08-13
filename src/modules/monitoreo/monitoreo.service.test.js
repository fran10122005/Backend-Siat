const mockPrisma = {
  tr_sesio: { findUnique: jest.fn(), findFirst: jest.fn() },
  tc_confi: { findUnique: jest.fn(), findFirst: jest.fn() },
  tr_telem: { create: jest.fn() },
  tr_alert: { create: jest.fn() },
  tm_usuar: { findUnique: jest.fn() }
};

jest.mock('../../config/db', () => mockPrisma);

const monitoreoService = require('./monitoreo.service');

const baseSession = {
  ses_codi: 'S1',
  dis_codi: 'D1',
  tm_ninos: {
    nin_codi: 'N1',
    nin_nomb: 'Leo',
    tm_repre_ninos: [{ tm_repre: { usu_codi: 'U1' } }]
  }
};

describe('MonitoreoService.procesarTelemetria', () => {
  beforeEach(() => jest.clearAllMocks());

  it('lanza error si la sesión no existe', async () => {
    mockPrisma.tr_sesio.findUnique.mockResolvedValue(null);
    await expect(monitoreoService.procesarTelemetria({ ses_codi: 'X' })).rejects.toThrow('Sesión no encontrada');
  });

  it('lanza error si la configuración no existe', async () => {
    mockPrisma.tr_sesio.findUnique.mockResolvedValue(baseSession);
    mockPrisma.tc_confi.findUnique.mockResolvedValue(null);
    await expect(monitoreoService.procesarTelemetria({ ses_codi: 'S1', con_codi: 'C1' })).rejects.toThrow('Configuración no encontrada');
  });

  it('crea telemetría y emite sin alerta cuando no hay alerta', async () => {
    mockPrisma.tr_sesio.findUnique.mockResolvedValue(baseSession);
    mockPrisma.tc_confi.findUnique.mockResolvedValue({ con_codi: 'C1' });
    mockPrisma.tr_telem.create.mockImplementation(async (args) => ({ tel_codi: args.data.tel_codi }));
    const io = { to: jest.fn(() => ({ emit: jest.fn() })) };

    const result = await monitoreoService.procesarTelemetria({
      ses_codi: 'S1', con_codi: 'C1', tel_regi: 80, tel_marc: 999, tel_calid: 99.9, tel_mov: 1.0, tel_stress: 15
    }, io);

    expect(mockPrisma.tr_telem.create).toHaveBeenCalled();
    expect(mockPrisma.tr_alert.create).not.toHaveBeenCalled();
    expect(io.to).toHaveBeenCalledWith('child:N1');
    expect(result.telemetria).toBeTruthy();
  });

  it('crea telemetría y alerta y emite new_alert cuando hay alerta', async () => {
    mockPrisma.tr_sesio.findUnique.mockResolvedValue(baseSession);
    mockPrisma.tc_confi.findUnique.mockResolvedValue({ con_codi: 'C1' });
    mockPrisma.tr_telem.create.mockImplementation(async (args) => ({ tel_codi: args.data.tel_codi }));
    mockPrisma.tr_alert.create.mockImplementation(async (args) => ({ ale_codi: args.data.ale_codi, ale_time: new Date(), ale_meto: args.data.ale_meto }));

    const ioEmits = [];
    const io = { to: jest.fn(() => ({ emit: jest.fn((evt, payload) => ioEmits.push({ evt, payload })) })) };

    const result = await monitoreoService.procesarTelemetria({
      ses_codi: 'S1', con_codi: 'C1', tel_regi: 125, tel_marc: 999, tel_calid: 99.9,
      tel_mov: 0.6, tel_stress: 92, is_alert: true, ins_codi: 'I001', ale_meto: 'SOBRECARGA_SENSORIAL'
    }, io);

    expect(mockPrisma.tr_alert.create).toHaveBeenCalled();
    expect(ioEmits.length).toBeGreaterThan(0);
    expect(ioEmits.some(e => e.evt === 'new_alert')).toBe(true);
    expect(ioEmits.some(e => e.evt === 'new_telemetry')).toBe(true);
    expect(result.alerta.ale_meto).toBe('SOBRECARGA_SENSORIAL');
  });
});

describe('MonitoreoService.getActiveSessionAndConfig', () => {
  beforeEach(() => jest.clearAllMocks());

  it('usa la sesión activa (no cerrada) y su configuración', async () => {
    const sesion = { ...baseSession, ses_cerr: null, dis_codi: 'D1' };
    mockPrisma.tr_sesio.findFirst.mockResolvedValue(sesion);
    mockPrisma.tc_confi.findFirst.mockResolvedValue({ con_codi: 'C1' });

    const result = await monitoreoService.getActiveSessionAndConfig();

    expect(mockPrisma.tr_sesio.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { ses_cerr: null }
    }));
    expect(result.sesion).toBe(sesion);
    expect(result.config).toEqual({ con_codi: 'C1' });
  });
});