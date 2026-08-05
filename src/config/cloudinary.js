/**
 * cloudinary.js — Configuración de Cloudinary para SIAT
 *
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  INSTRUCCIONES DE CONFIGURACIÓN (una sola vez)                  ║
 * ╠══════════════════════════════════════════════════════════════════╣
 * ║  1. Crear cuenta en https://cloudinary.com (gratis, 25 GB/mes)  ║
 * ║  2. Copiar Cloud Name, API Key y API Secret del Dashboard.       ║
 * ║  3. Ir a Settings → Upload → Add upload preset.                  ║
 * ║     • Nombre: siat_unsigned                                      ║
 * ║     • Signing Mode: Unsigned                                     ║
 * ║     • Folder: siat                                               ║
 * ║  4. Agregar las credenciales al archivo .env del backend:        ║
 * ║     CLOUDINARY_CLOUD_NAME=tu_cloud_name                          ║
 * ║     CLOUDINARY_API_KEY=tu_api_key                                ║
 * ║     CLOUDINARY_API_SECRET=tu_api_secret                          ║
 * ║     CLOUDINARY_UPLOAD_PRESET=siat_unsigned                       ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

const cloudinary = require('cloudinary').v2;
const env = require('./env');

// Configurar solo si las credenciales están disponibles
if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true
  });
  console.log('☁️  Cloudinary configurado correctamente para almacenamiento de archivos SIAT.');
} else {
  console.warn('⚠️  Cloudinary no configurado. Las fotos y documentos se guardarán de forma local hasta que se agreguen las credenciales en .env');
}

/**
 * Sube un archivo a Cloudinary y retorna la URL segura.
 * @param {Buffer|string} fileInput - Buffer del archivo o ruta local.
 * @param {object} options - Opciones de carga (folder, resource_type, etc.).
 * @returns {Promise<{url: string, public_id: string}>}
 */
async function uploadFile(fileInput, options = {}) {
  if (!env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary no está configurado. Agrega las credenciales en el .env.');
  }
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: options.folder || 'siat/general',
        resource_type: options.resource_type || 'auto',
        allowed_formats: options.allowed_formats || ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
        transformation: options.transformation || [],
        public_id: options.public_id
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, public_id: result.public_id });
      }
    );
    
    if (Buffer.isBuffer(fileInput)) {
      uploadStream.end(fileInput);
    } else {
      cloudinary.uploader.upload(fileInput, options).then(resolve).catch(reject);
    }
  });
}

/**
 * Elimina un archivo de Cloudinary por su public_id.
 * @param {string} publicId
 * @param {string} resourceType - 'image' | 'raw' (para PDFs)
 */
async function deleteFile(publicId, resourceType = 'image') {
  if (!env.CLOUDINARY_CLOUD_NAME) return;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = { cloudinary, uploadFile, deleteFile };
