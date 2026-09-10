# ✅ Checklist de Verificación Pre-Deploy para SIAT

Antes de abrir la plataforma **SIAT** al uso clínico real en producción, completa y valida cada uno de los siguientes puntos de infraestructura, seguridad y calidad:

---

## 📋 Lista de Verificación Pre-Lanzamiento

- [ ] **1. HTTPS Activo y Certificado TLS Válido**
  - **Requisito:** Obligatorio para WebAuthn (Passkeys), Web BLE, Service Worker y WebSockets seguros (`wss://`).
  - **Verificación:** Certificado emitido por Let's Encrypt o Cloudflare con calificación A+ en SSL Labs (`https://app.tudominio.com`).

- [ ] **2. Passkeys (WebAuthn) Operativas en Dispositivos Reales**
  - **Requisito:** Acceso rápido biométrico mediante FaceID / TouchID / Sensor de huella.
  - **Verificación:** Probar flujo de registro y login por huella en **Safari iOS (iPhone)** y **Chrome en Android**.
  - **Configuración:** `WEBAUTHN_RP_ID` y `WEBAUTHN_ORIGIN` apuntando al dominio oficial de producción.

- [ ] **3. PWA Instalable y Auditoría Lighthouse (Score > 90)**
  - **Requisito:** PWA con Service Worker activo, manifest válido e iconos de alta resolución.
  - **Verificación:** Ejecutar auditoría Lighthouse en Chrome DevTools en modo incógnito; confirmar score PWA ≥ 90.
  - **Prueba móvil:** Instalar desde Safari (*Compartir* > *Agregar al inicio*) y Chrome Android (*Instalar aplicación*).

- [ ] **4. Monitoreo de Errores con Sentry Operativo**
  - **Requisito:** Captura de excepciones frontend y backend en tiempo real.
  - **Verificación:** Configurar `VITE_SENTRY_DSN` en frontend y `SENTRY_DSN` en backend.
  - **Prueba:** Disparar un error de prueba controlado y confirmar la recepción del evento en el panel de Sentry.

- [ ] **5. Monitoreo de Uptime y Healthcheck Externo**
  - **Requisito:** Detección inmediata de caídas del servidor.
  - **Verificación:** Crear un monitor HTTP en **UptimeRobot** (o BetterStack) apuntando a `https://api.tudominio.com/api/health` con intervalo de verificación de 5 minutos y alerta a Telegram / Correo.

- [ ] **6. Respaldos y Branching en Neon Serverless Postgres**
  - **Requisito:** Respaldo continuo de base de datos clínica.
  - **Verificación:** Confirmar en la consola de Neon que los snapshots automáticos y la retención PITR (Point-in-Time Restore) estén activos.

- [ ] **7. Aislamiento de Variables de Entorno en el Servidor**
  - **Requisito:** Cero secretos en repositorios Git.
  - **Verificación:** Confirmar que `.env` esté en `.gitignore` y que las variables reales (`DATABASE_URL`, `JWT_SECRET`, `EMAILJS_PRIVATE_KEY`, etc.) estén configuradas únicamente en el entorno del host de producción.

- [ ] **8. Prueba Manual de Rate Limiting (Protección contra Fuerza Bruta)**
  - **Requisito:** Mitigación de ataques de fuerza bruta en `/api/auth/login`.
  - **Verificación:** Realizar 10 intentos consecutivos de inicio de sesión con contraseña incorrecta; validar que el servidor responda con HTTP 429 y que el frontend muestre el aviso: *"Demasiados intentos. Por motivos de seguridad, espera 15 minutos antes de reintentar."*

---

## ✍️ Aprobación Final de Despliegue

| Rol | Responsable | Firma / Aprobación | Fecha |
|---|---|---|---|
| **Tech Lead / Arquitecto** | | Aprobado | |
| **Auditor de Seguridad / QA** | | Aprobado | |
| **Director Institucional** | | Aprobado | |
