/**
 * upload-logo.js — Sube el logo oficial de SIAT a Cloudinary
 * 
 * Uso:
 *   node scripts/upload-logo.js
 *
 * Al terminar, copia la URL que aparece en pantalla y pégala
 * en tu .env como:  SIAT_LOGO_URL=https://res.cloudinary.com/...
 */

require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const path = require('path');

const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
  console.error('\n❌ Faltan credenciales de Cloudinary en el .env\n');
  console.error('   Asegúrate de tener:\n   CLOUDINARY_CLOUD_NAME\n   CLOUDINARY_API_KEY\n   CLOUDINARY_API_SECRET\n');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure: true
});

const logoPath = path.join(__dirname, '../src/templates/Logo.png');

console.log('\n☁️  Subiendo logo a Cloudinary...\n');

cloudinary.uploader.upload(logoPath, {
  folder: 'siat/branding',
  public_id: 'logo_oficial',
  overwrite: true,
  resource_type: 'image',
  transformation: [
    { width: 400, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
  ]
})
.then((result) => {
  console.log('✅ Logo subido correctamente!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  URL del logo (cópiala al .env):\n');
  console.log(`  SIAT_LOGO_URL=${result.secure_url}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n  Public ID: ${result.public_id}`);
  console.log(`  Dimensiones: ${result.width}x${result.height}px`);
  console.log(`  Formato: ${result.format}\n`);
})
.catch((err) => {
  console.error('\n❌ Error al subir el logo:', err.message, '\n');
  process.exit(1);
});
