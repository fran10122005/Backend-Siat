# 🚀 Guía de Despliegue en Producción con Docker y Docker Compose

Este documento establece el flujo estándar para compilar, versionar con tags semánticos (`v1.0.0`), desplegar y monitorear la plataforma **SIAT** (Frontend PWA y Backend API) en un servidor de producción.

---

## 🏗️ 1. Requisitos Previos en el Servidor

- **Docker Engine** v24+ y **Docker Compose** v2.20+
- Acceso a Internet para descargar imágenes base (`node:20-alpine`, `nginx:alpine`, `node:20-slim`)
- Archivo `.env` configurado en el servidor con las credenciales de base de datos Neon, JWT y EmailJS

---

## 🏷️ 2. Flujo de Construcción y Versionado con Tags

Para garantizar trazabilidad y facilitar rollbacks inmediatos, etiqueta siempre las imágenes con la versión semántica de la release:

```bash
# Definir la versión del release
export VERSION=v1.0.0

# 1. Construir la imagen del Backend con tag de versión y latest
docker build -t siat-backend:$VERSION -t siat-backend:latest -f "Backend SIAT/Dockerfile" "Backend SIAT"

# 2. Construir la imagen del Frontend PWA con tag de versión y latest
docker build -t siat-frontend:$VERSION -t siat-frontend:latest -f "SIAT/Dockerfile" "SIAT"
```

---

## 🚢 3. Despliegue con Docker Compose

El archivo `docker-compose.yml` gestiona ambos microservicios, define límites estrictos de CPU y memoria RAM, y habilita rotación automática de logs.

### A. Primer Despliegue o Actualización Completa
```bash
# Levantar los servicios en segundo plano recreando contenedores
docker compose up -d
```

### B. Despliegue Individual (Actualización de un solo servicio)
Si solo se modificó el frontend o backend:
```bash
# Solo actualizar Frontend
docker compose up -d --build frontend

# Solo actualizar Backend
docker compose up -d --build backend
```

---

## 🩺 4. Verificación y Monitoreo de Healthchecks

Ambos contenedores tienen directivas `HEALTHCHECK` configuradas:
- **Frontend:** Verifica `wget -q --spider http://localhost/` cada 30s.
- **Backend:** Verifica `wget -q --spider http://localhost:3000/api/health` cada 30s.

### Comandos de Diagnóstico:

```bash
# 1. Ver estado general de salud (debe mostrar (healthy))
docker compose ps

# 2. Inspeccionar el log detallado del healthcheck del backend
docker inspect --format='{{json .State.Health}}' siat-backend | jq

# 3. Monitorear logs en vivo
docker compose logs -f

# 4. Ver uso en tiempo real de CPU y memoria contra los límites
docker stats siat-backend siat-frontend-pwa
```

---

## 🛡️ 5. Gestión de Recursos y Logs en Producción

### Límites de Recursos Asignados:
| Contenedor | Límite RAM | Límite CPU | Reserva Mínima |
|---|---|---|---|
| `siat-frontend-pwa` | **256 MB** | **0.50 CPU** | 64 MB / 0.10 CPU |
| `siat-backend` | **512 MB** | **0.50 CPU** | 128 MB / 0.20 CPU |

### Rotación de Logs:
Configurada en formato `json-file` con:
- `max-size: "10m"` (máximo 10 megabytes por archivo de log).
- `max-file: "3"` (guarda hasta 3 archivos históricos rotados, liberando disco automáticamente).

---

## ⏪ 6. Procedimiento de Rollback de Contenedores

Si la nueva versión presenta anomalías y se requiere volver a la versión anterior inmediatamente:

```bash
# Re-etiquetar la versión estable anterior como latest
docker tag siat-backend:v1.0.0 siat-backend:latest
docker tag siat-frontend:v1.0.0 siat-frontend:latest
docker compose up -d
```

---

## 🌐 7. Primer Despliegue en Producción e Infraestructura

### A. Opciones Recomendadas de Hosting
1. **VPS Dedicado (Hetzner Cloud / DigitalOcean) + Cloudflare (Recomendado):**
   - Costo-eficiente, control total de Docker y escalabilidad vertical sencilla.
   - Instancia mínima recomendada: 2 vCPU, 4 GB RAM, Ubuntu 24.04 LTS.
2. **Plataformas PaaS (Railway / Fly.io):**
   - Ideal para despliegue serverless de contenedores con escalado automático y DNS administrado.

---

### B. Configuración de HTTPS y Terminación TLS

Las funciones PWA y WebAuthn (Passkeys) **requieren obligatoriamente HTTPS**:

#### Opción 1: Cloudflare Tunnel (`cloudflared`) — Máxima Seguridad (Sin abrir puertos en router)
```bash
# Instalar cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Crear el túnel seguro hacia los puertos locales
cloudflared tunnel create siat-prod
cloudflared tunnel route dns siat-prod app.tudominio.com
cloudflared tunnel route dns siat-prod api.tudominio.com
```

#### Opción 2: Reverse Proxy con Caddy (Certificados SSL automáticos Let's Encrypt)
Crear un archivo `Caddyfile`:
```caddy
app.tudominio.com {
    reverse_proxy localhost:8080
}

api.tudominio.com {
    reverse_proxy localhost:3000
}
```
Iniciar con: `caddy run --config Caddyfile`.

---

### C. Verificación de PWA Instalable
1. **Auditoría Lighthouse en Chrome DevTools:**
   - Abrir pestaña de incógnito en `https://app.tudominio.com`.
   - Ejecutar auditoría Lighthouse en categoría **Progressive Web App**.
   - Validar que el score sea **≥ 90** y cumpla los requisitos de manifest, service worker, viewport e iconos adaptativos.
2. **Prueba Física en iPhone / iPad (Safari):**
   - Navegar a `https://app.tudominio.com`.
   - Presionar botón *Compartir* > *Agregar al inicio*.
   - Abrir la app desde el icono de inicio y verificar que el splash screen azul (`#0F172A`) y la vista sin barra de navegación de Safari funcionen fluidamente.
3. **Prueba Física en Android (Chrome):**
   - Verificar la aparición del prompt nativo de instalación o botón *Instalar App* en el Topbar.

---

### D. Estrategia de Rollback ante Fallos en Migraciones de Prisma

Si un despliegue de backend falla debido a una migración SQL fallida en Neon Serverless Postgres:

1. **Identificar la migración con error:**
   ```bash
   npx prisma migrate status
   ```
2. **Marcar la migración fallida como revertida:**
   ```bash
   npx prisma migrate resolve --rolled-back "20260910120000_nombre_migracion"
   ```
3. **Restaurar un Point-in-Time Restore (PITR) o Branch en Neon:**
   - En la consola de [Neon Console](https://console.neon.tech), crear un branch instantáneo previo al momento del despliegue o restaurar el snapshot temporal.
   - Actualizar `DATABASE_URL` en el archivo `.env` del servidor.
   - Reiniciar el backend: `docker compose restart backend`.
