# 📧 Activación de Correos con EmailJS — Guía SIAT

Esta guía te lleva paso a paso para activar el envío de correos transaccionales
de SIAT mediante **EmailJS**. El backend ya está preparado; solo falta crear la
cuenta, el servicio, la plantilla y completar las variables de entorno.

---

## 1. Crear la cuenta de EmailJS

1. Ve a <https://dashboard.emailjs.com> y regístrate (gratis).
2. Inicia sesión. El plan gratuito permite **200 correos/mes**, suficiente para desarrollo y pruebas.

## 2. Conectar un servicio (emisor)

1. En el dashboard ve a **"Email Services"** → **"Add New Service"**.
2. Elige el proveedor con el que vas a enviar:
   - **Gmail** (más fácil): conectarás tu cuenta de Google. *Recomendado para probar.*
   - **Otro SMTP** (ReSend, Outlook, etc.): si ya tienes credenciales SMTP de otro proveedor.
3. Dale un nombre (ej. `siat-email`), conéctalo y guárdalo.
4. Copia el **Service ID** (formato `service_XXXXXXX`) → va en `EMAILJS_SERVICE_ID`.

> ⚠️ Si usas Gmail, activa "Less secure app access" o usa una **contraseña de aplicación**
> si tienes verificación en dos pasos. En producción se recomienda un SMTP dedicado (ReSend, SES, etc.).

## 3. Crear la plantilla maestro

1. Ve a **"Email Templates"** → **"+ Create New Template"**.
2. En la pestaña **"Content"**, borra el contenido y pega **TODO** el archivo
   [`emailjs/EMAILJS_DASHBOARD_TEMPLATE.html`](emailjs/EMAILJS_DASHBOARD_TEMPLATE.html).
   El contenido inyecta el HTML compilado por el backend con **triple llave**
   `{{{html_content}}}`.
   > ⚠️ **Importante:** la variable debe estar **envuelta en una estructura HTML**
   > (`<!DOCTYPE html>...<body>{{{html_content}}}</body></html>`). Si el Content es
   > solo `{{{html_content}}}` sin etiquetas, EmailJS envía el correo como texto
   > plano y se ve el código HTML crudo en lugar del diseño renderizado.
3. En **"Settings"** (panel superior derecho):
   - **Subject**: `{{subject}}`
   - **Reply To**: déjalo vacío (o el correo de soporte de SIAT).
4. Verifica en la pestaña **"Variables"** que reconoce:
   `to_email`, `subject` y `html_content`.
5. Guarda y copia el **Template ID** (formato `template_XXXXXXX`) → va en `EMAILJS_TEMPLATE_ID`.

## 4. Obtener las llaves públicas y privadas

1. Ve a **"Account" → "General"** (o **"API"** según tu plan).
2. Copia:
   - **Public Key** → `EMAILJS_PUBLIC_KEY`
   - **Private Key** → `EMAILJS_PRIVATE_KEY` (requerida para llamadas REST desde el backend)

> ⚠️ La **Private Key** es obligatoria: desde 2024 EmailJS exige `accessToken`
> en el endpoint `/api/v1.0/email/send` cuando se llama desde el backend.
> Sin ella, el servidor omitirá los correos con el aviso `[EmailJS no configurado completamente]`.

## 5. Configurar el `.env` del backend

Edita `Backend SIAT/.env`:

```env
# === CONFIGURACIÓN DE CORREOS (EMAILJS) ===
EMAILJS_SERVICE_ID=service_XXXXXXX
EMAILJS_TEMPLATE_ID=template_XXXXXXX
EMAILJS_PUBLIC_KEY=TU_PUBLIC_KEY_AQUI
EMAILJS_PRIVATE_KEY=TU_PRIVATE_KEY_AQUI
```

Reinicia el servidor: `npm run dev` (en `Backend SIAT/`).

## 6. Probar el envío

- **Recuperar contraseña**: POST `/api/auth/forgot-password` con `{ "email": "tucorreo@x.com" }`.
- **Invitación de representante**: desde el módulo de admisión de pacientes (correo de invitación con credenciales).
- **Alta de especialista**: desde el panel admin (correo de bienvenida con credenciales).
- **Alerta de monitoreo**: se dispara cuando una sesión genera una alerta de sobrecarga.

En consola deberías ver:

```
📧 Correo enviado correctamente vía EmailJS a: tucorreo@x.com
```

Si falta alguna variable, verás un aviso tipo:

```
📧 [EmailJS no configurado completamente] Correo omitido.
```

## 7. Personalizar el diseño de los correos

El diseño vive en el backend, versionado y sin depender del dashboard:

| Archivo | Correo |
| --- | --- |
| `src/templates/base.hbs` | Estructura + estilos + header/footer |
| `src/templates/recover-password.hbs` | Recuperación de contraseña |
| `src/templates/welcome-especialista.hbs` | Bienvenida especialista |
| `src/templates/invite-representative.hbs` | Invitación representante |
| `src/templates/alert-notification.hbs` | Alerta de monitoreo |

- Los placeholders usan sintaxis Handlebars `{{variable}}`.
- El **logo** actual es un wordmark de texto (los adjuntos CID no funcionan en EmailJS).
  Para usar el logo real, sube `src/templates/Logo.png` a Cloudinary y pega su URL en `base.hbs`.

## 8. Notas de seguridad

- `EMAILJS_PRIVATE_KEY` no debe filtrarse al frontend ni a repositorios públicos.
- El plan gratuito limita el envío; revisa el panel de EmailJS si los correos dejan de llegar.
- El correo de invitación y recuperación nunca deben incluir la contraseña en texto plano en producción; se pueden ajustar a flujos de token + alta segura.
