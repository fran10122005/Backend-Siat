jest.mock('../config/db', () => ({
  tm_repre: { findUnique: jest.fn() },
  tm_espec: { findUnique: jest.fn() },
  tm_admin: { findUnique: jest.fn() },
  tm_ninos: { findMany: jest.fn() }
}));

const prisma = require('../config/db');
const { roomsForUser, canAccessChild } = require('./socket.service');

describe('socket.service - Aislamiento de salas y permisos por rol', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('roomsForUser', () => {
    test('ROL_ADM solo se une a user:<usu_codi> y admin:<ins_codi>, nunca a salas child:*', async () => {
      prisma.tm_admin.findUnique.mockResolvedValue({ ins_codi: 'I001' });

      const rooms = await roomsForUser('U_ADM', 'ROL_ADM');

      expect(prisma.tm_ninos.findMany).not.toHaveBeenCalled();
      expect(rooms).toEqual(['user:U_ADM', 'admin:I001']);
      expect(rooms.some((r) => r.startsWith('child:'))).toBe(false);
    });

    test('ROL_ADM sin institución asignada usa admin:global sin salas child:*', async () => {
      prisma.tm_admin.findUnique.mockResolvedValue(null);

      const rooms = await roomsForUser('U_ADM2', 'ROL_ADM');

      expect(rooms).toEqual(['user:U_ADM2', 'admin:global']);
    });

    test('ROL_REP obtiene user:<usu_codi> y todas sus salas child:* vía tm_repre_ninos', async () => {
      prisma.tm_repre.findUnique.mockResolvedValue({
        rep_cod: 'R001',
        tm_repre_ninos: [{ nin_codi: 'N001' }, { nin_codi: 'N002' }]
      });

      const rooms = await roomsForUser('U_REP', 'ROL_REP');

      expect(rooms).toEqual(['user:U_REP', 'child:N001', 'child:N002']);
    });

    test('ROL_ESP consulta únicamente asignaciones activas (asi_stdo: Activo)', async () => {
      prisma.tm_espec.findUnique.mockResolvedValue({
        esp_cod: 'E001',
        tc_asign: [{ nin_codi: 'N010', asi_stdo: 'Activo' }]
      });

      const rooms = await roomsForUser('U_ESP', 'ROL_ESP');

      expect(prisma.tm_espec.findUnique).toHaveBeenCalledWith({
        where: { usu_codi: 'U_ESP' },
        include: { tc_asign: { where: { asi_stdo: 'Activo' } } }
      });
      expect(rooms).toEqual(['user:U_ESP', 'child:N010']);
    });
  });

  describe('canAccessChild', () => {
    test('ROL_ADM siempre recibe false para telemetría infantil', async () => {
      const allowed = await canAccessChild('U_ADM', 'ROL_ADM', 'N001');
      expect(allowed).toBe(false);
    });

    test('ROL_REP solo puede acceder a niños vinculados en tm_repre_ninos', async () => {
      prisma.tm_repre.findUnique.mockResolvedValue({
        rep_cod: 'R001',
        tm_repre_ninos: [{ nin_codi: 'N001' }, { nin_codi: 'N003' }]
      });

      expect(await canAccessChild('U_REP', 'ROL_REP', 'N003')).toBe(true);
      expect(await canAccessChild('U_REP', 'ROL_REP', 'N999')).toBe(false);
    });

    test('ROL_ESP solo accede a niños con asignación Activa', async () => {
      prisma.tm_espec.findUnique.mockResolvedValue({
        esp_cod: 'E001',
        tc_asign: [
          { nin_codi: 'N001', asi_stdo: 'Activo' },
          { nin_codi: 'N002', asi_stdo: 'Inactivo' }
        ]
      });

      expect(await canAccessChild('U_ESP', 'ROL_ESP', 'N001')).toBe(true);
      expect(await canAccessChild('U_ESP', 'ROL_ESP', 'N002')).toBe(false);
      expect(await canAccessChild('U_ESP', 'ROL_ESP', 'N999')).toBe(false);
    });
  });
});

