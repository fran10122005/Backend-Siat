const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
  const baseUrl = 'http://localhost:3000/api';

  // Login
  const loginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      usu_crro: 'admin_fundacion@siat.com',
      usu_clve: '123456'
    })
  });
  const loginData = await loginRes.json();
  const token = loginData.data.token;
  console.log('Token:', token);

  // Decoded token values (JWT payload check)
  const jwt = require('jsonwebtoken');
  const env = require('../src/config/env');
  const decoded = jwt.verify(token, env.JWT_SECRET);
  console.log('Decoded Token User:', decoded);

  // Fetch catalogos to see what ins_codi frontend receives
  const catRes = await fetch(`${baseUrl}/admin/catalogos`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const catData = await catRes.json();
  console.log('Catalogos Institutions:', catData.data.instituciones);

  // Try updating the institution using PUT /api/admin/instituciones/I001
  const updateRes = await fetch(`${baseUrl}/admin/instituciones/I001`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      ins_nomb: 'Fundación Una Luz Para el Autismo Modificada',
      ins_dire: 'Sede Principal',
      ins_telf: '04140000000',
      ins_pers: 'Carlos'
    })
  });
  console.log('Update Status:', updateRes.status);
  console.log('Update Response:', await updateRes.json());
}

run().catch(console.error);
