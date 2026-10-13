const request = require('supertest');
const app = require('./app');

describe('Server / rutas básicas', () => {
  it('GET /api/health responde con estado de salud válido', async () => {
    const res = await request(app).get('/api/health');
    expect([200, 503]).toContain(res.status);
    expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status);
  }, 15000);


  it('GET /api/v1/health responde con estado de salud válido y versión v1', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(['healthy', 'degraded', 'unhealthy']).toContain(res.body.status);
    expect(res.body.version).toBe('v1');
  }, 15000);

  it('respuesta 404 para rutas desconocidas', async () => {
    const res = await request(app).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Ruta no encontrada');
  });

  it('respuesta 404 para rutas v1 desconocidas', async () => {
    const res = await request(app).get('/api/v1/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Ruta no encontrada');
  });
});