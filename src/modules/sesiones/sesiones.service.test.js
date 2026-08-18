const mockPrisma = {
  tm_ninos: { findUnique: jest.fn() },
  tm_activ: { findUnique: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), updateMany: jest.fn() },
  tm_categ: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn(), create: jest.fn(), update: jest.fn() },
  tm_dispo: { findUnique: jest.fn() },
  tr_sesio: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  tc_activ_ninos: { findUnique: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn() }
};

jest.mock('../../config/db', () => mockPrisma);

const sesionesService = require('./sesiones.service');

describe('SesionesService', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('iniciarSesion', () => {
    it('lanza error si el niño no existe', async () => {
      mockPrisma.tm_ninos.findUnique.mockResolvedValue(null);
      await expect(sesionesService.iniciarSesion({ nin_codi: 'N1' })).rejects.toThrow('Niño no encontrado');
    });

    it('lanza error si la actividad está inactiva', async () => {
      mockPrisma.tm_ninos.findUnique.mockResolvedValue({ nin_codi: 'N1' });
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'A1', act_estd: 'Inactiva' });
      await expect(sesionesService.iniciarSesion({ nin_codi: 'N1', act_codi: 'A1', dis_codi: 'D1' }))
        .rejects.toThrow('La actividad se encuentra inactiva');
    });

    it('crea la sesión cuando niño, actividad y dispositivo existen', async () => {
      mockPrisma.tm_ninos.findUnique.mockResolvedValue({ nin_codi: 'N1' });
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'A1', act_estd: 'Activa' });
      mockPrisma.tm_dispo.findUnique.mockResolvedValue({ dis_codi: 'D1' });
      mockPrisma.tr_sesio.create.mockImplementation(async (args) => args.data);

      const result = await sesionesService.iniciarSesion({ nin_codi: 'N1', act_codi: 'A1', dis_codi: 'D1' });

      expect(mockPrisma.tr_sesio.create).toHaveBeenCalled();
      expect(result.ses_codi).toMatch(/^S/);
      expect(result.nin_codi).toBe('N1');
    });
  });

  describe('cerrarSesion', () => {
    it('lanza error si la sesión no existe', async () => {
      mockPrisma.tr_sesio.findUnique.mockResolvedValue(null);
      await expect(sesionesService.cerrarSesion('S1')).rejects.toThrow('Sesión no encontrada');
    });

    it('lanza error si la sesión ya está cerrada', async () => {
      mockPrisma.tr_sesio.findUnique.mockResolvedValue({ ses_codi: 'S1', ses_cerr: new Date() });
      await expect(sesionesService.cerrarSesion('S1')).rejects.toThrow('ya se encuentra cerrada');
    });

    it('cierra la sesión estableciendo ses_cerr', async () => {
      mockPrisma.tr_sesio.findUnique.mockResolvedValue({ ses_codi: 'S1', ses_cerr: null });
      mockPrisma.tr_sesio.update.mockImplementation(async (args) => args.data);
      const result = await sesionesService.cerrarSesion('S1', 'nota');
      expect(mockPrisma.tr_sesio.update).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ ses_cerr: expect.any(Date) })
      }));
      expect(result).toBeTruthy();
    });
  });

  describe('listarActividades', () => {
    it('aplica paginación y retorna estructura con items y paginación', async () => {
      mockPrisma.tm_activ.count.mockResolvedValue(25);
      mockPrisma.tm_activ.findMany.mockResolvedValue([{ act_codi: 'ACT1' }]);

      const result = await sesionesService.listarActividades({ pagina: 2, limite: 10 });

      expect(mockPrisma.tm_activ.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 10, take: 10
      }));
      expect(result.paginacion.total).toBe(25);
      expect(result.paginacion.totalPaginas).toBe(3);
      expect(result.items).toHaveLength(1);
    });

    it('construye filtros por categoría y estado', async () => {
      mockPrisma.tm_activ.count.mockResolvedValue(0);
      mockPrisma.tm_activ.findMany.mockResolvedValue([]);

      await sesionesService.listarActividades({ cat_codi: 'CAT1', estado: 'Activa', pagina: 1, limite: 10 });

      const args = mockPrisma.tm_activ.findMany.mock.calls[0][0];
      expect(args.where.cat_codi).toBe('CAT1');
      expect(args.where.act_estd).toBe('Activa');
    });
  });

  describe('crearActividad', () => {
    it('lanza error si la categoría no existe', async () => {
      mockPrisma.tm_categ.findUnique.mockResolvedValue(null);
      await expect(sesionesService.crearActividad({ cat_codi: 'X', act_trea: 'Título' }))
        .rejects.toThrow('Categoría no encontrada o inactiva');
    });

    it('crea la actividad con la categoría existente', async () => {
      mockPrisma.tm_categ.findUnique.mockResolvedValue({ cat_codi: 'CAT1', cat_estd: true });
      mockPrisma.tm_activ.create.mockImplementation(async (args) => args.data);

      const result = await sesionesService.crearActividad({ cat_codi: 'CAT1', act_trea: 'Bingo de Emociones', act_time: 20 });

      expect(result.act_codi).toMatch(/^ACT/);
      expect(result.act_trea).toBe('Bingo de Emociones');
      expect(result.act_estd).toBe('Activa');
      expect(result.act_difi).toBe('Baja');
    });
  });

  describe('obtenerActividad', () => {
    it('lanza 404 si la actividad no existe', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue(null);
      await expect(sesionesService.obtenerActividad('ACT1')).rejects.toThrow('Actividad no encontrada');
    });

    it('retorna la actividad con sus asignaciones', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'ACT1', tc_activ_ninos: [] });
      const result = await sesionesService.obtenerActividad('ACT1');
      expect(result.act_codi).toBe('ACT1');
    });
  });

  describe('eliminarActividad', () => {
    it('lanza error si la actividad no existe', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue(null);
      await expect(sesionesService.eliminarActividad('ACT1')).rejects.toThrow('Actividad no encontrada');
    });

    it('hace soft-delete si la actividad tiene sesiones', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'ACT1' });
      mockPrisma.tr_sesio.count.mockResolvedValue(3);
      mockPrisma.tm_activ.update.mockImplementation(async (args) => args.data);

      await sesionesService.eliminarActividad('ACT1');

      expect(mockPrisma.tm_activ.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { act_estd: 'Inactiva' }
      }));
    });

    it('elimina definitivamente si no tiene sesiones', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'ACT1' });
      mockPrisma.tr_sesio.count.mockResolvedValue(0);

      const result = await sesionesService.eliminarActividad('ACT1');

      expect(mockPrisma.tc_activ_ninos.deleteMany).toHaveBeenCalledWith({ where: { act_codi: 'ACT1' } });
      expect(mockPrisma.tm_activ.delete).toHaveBeenCalledWith({ where: { act_codi: 'ACT1' } });
      expect(result.eliminada).toBe(true);
    });
  });

  describe('crearCategoria', () => {
    it('lanza error si ya existe una categoría con el mismo nombre', async () => {
      mockPrisma.tm_categ.findFirst.mockResolvedValue({ cat_codi: 'CAT1' });
      await expect(sesionesService.crearCategoria({ cat_nomb: 'Motricidad' }))
        .rejects.toThrow('Ya existe una categoría');
    });

    it('crea la categoría', async () => {
      mockPrisma.tm_categ.findFirst.mockResolvedValue(null);
      mockPrisma.tm_categ.create.mockImplementation(async (args) => args.data);

      const result = await sesionesService.crearCategoria({ cat_nomb: 'Motricidad' });

      expect(result.cat_codi).toMatch(/^CAT/);
      expect(result.cat_estd).toBe(true);
    });
  });

  describe('asignarActividad', () => {
    it('lanza error si la actividad no existe', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue(null);
      await expect(sesionesService.asignarActividad('ACT1', 'N1')).rejects.toThrow('Actividad no encontrada');
    });

    it('lanza error si ya existe una asignación activa', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'ACT1', act_estd: 'Activa' });
      mockPrisma.tm_ninos.findUnique.mockResolvedValue({ nin_codi: 'N1' });
      mockPrisma.tc_activ_ninos.findFirst.mockResolvedValue({ acn_codi: 'ASN1' });

      await expect(sesionesService.asignarActividad('ACT1', 'N1')).rejects.toThrow('ya está asignada');
    });

    it('crea la asignación', async () => {
      mockPrisma.tm_activ.findUnique.mockResolvedValue({ act_codi: 'ACT1', act_estd: 'Activa' });
      mockPrisma.tm_ninos.findUnique.mockResolvedValue({ nin_codi: 'N1' });
      mockPrisma.tc_activ_ninos.findFirst.mockResolvedValue(null);
      mockPrisma.tc_activ_ninos.create.mockImplementation(async (args) => args.data);

      const result = await sesionesService.asignarActividad('ACT1', 'N1', { acn_nota: 'Realizar en casa' });

      expect(result.acn_codi).toMatch(/^ASN/);
      expect(result.act_codi).toBe('ACT1');
      expect(result.acn_estd).toBe('Activa');
    });
  });

  describe('cambiarEstadoAsignacion', () => {
    it('lanza error si la asignación no existe', async () => {
      mockPrisma.tc_activ_ninos.findUnique.mockResolvedValue(null);
      await expect(sesionesService.cambiarEstadoAsignacion('ASN1', 'Completada'))
        .rejects.toThrow('Asignación no encontrada');
    });

    it('actualiza el estado', async () => {
      mockPrisma.tc_activ_ninos.findUnique.mockResolvedValue({ acn_codi: 'ASN1' });
      mockPrisma.tc_activ_ninos.update.mockImplementation(async (args) => args.data);

      const result = await sesionesService.cambiarEstadoAsignacion('ASN1', 'Completada');

      expect(mockPrisma.tc_activ_ninos.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { acn_estd: 'Completada' }
      }));
      expect(result.acn_estd).toBe('Completada');
    });
  });

  describe('desasignarActividad', () => {
    it('lanza error si la asignación no existe', async () => {
      mockPrisma.tc_activ_ninos.findUnique.mockResolvedValue(null);
      await expect(sesionesService.desasignarActividad('ASN1')).rejects.toThrow('Asignación no encontrada');
    });

    it('elimina la asignación', async () => {
      mockPrisma.tc_activ_ninos.findUnique.mockResolvedValue({ acn_codi: 'ASN1' });
      const result = await sesionesService.desasignarActividad('ASN1');
      expect(mockPrisma.tc_activ_ninos.delete).toHaveBeenCalledWith({ where: { acn_codi: 'ASN1' } });
      expect(result.eliminada).toBe(true);
    });
  });
});