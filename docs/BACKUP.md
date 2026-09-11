# 💾 Guía de Respaldos y Recuperación ante Desastres (Disaster Recovery) — Neon PostgreSQL

Este documento describe la arquitectura de respaldos, la estrategia de recuperación en el tiempo (PITR) y los procedimientos operativos estándar para la base de datos de producción **SIAT** alojada en **Neon Serverless Postgres**.

---

## 🏛️ 1. Arquitectura de Respaldos en Neon

Neon Serverless Postgres implementa una arquitectura desacoplada donde el almacenamiento (*Pageserver*) y el cómputo (*Compute Nodes*) funcionan de forma independiente con un registro continuo de transacciones (Write-Ahead Logging / WAL) distribuido en almacenamiento inmutable:

| Capacidad | Detalle en SIAT |
|---|---|
| **Estrategia Principal** | **Point-in-Time Recovery (PITR)** continuo a nivel de milisegundos. |
| **Ventana de Retención PITR** | **7 a 30 días** (según el plan Neon contratado: Free / Launch / Scale). |
| **Tiempo de Recuperación (RTO)** | **< 2 minutos** (creación instantánea de ramas desde el historial WAL). |
| **Punto Objetivo de Recuperación (RPO)** | **0 segundos** (cero pérdida de datos en transacciones confirmadas). |
| **Tecnología de Branching** | Copy-on-Write (CoW) a nivel de bloques de almacenamiento. |

---

## 🛠️ 2. Procedimiento de Restauración Manual Paso a Paso

Si ocurre una corrupción de datos, error humano o fallo catastrófico tras una migración, sigue este protocolo:

### A. Método Rápido: Restauración Instantánea mediante Branching (Consola Neon)

1. **Acceder a la Consola:**
   - Inicia sesión en [https://console.neon.tech](https://console.neon.tech) y selecciona el proyecto **SIAT**.
2. **Crear una Rama Histórica (PITR Branch):**
   - Ve a la pestaña **Branches** y haz clic en **New Branch**.
   - Asigna un nombre claro, por ejemplo: `recovery-20260911-1800`.
   - Selecciona como rama origen: `main`.
   - En la sección **Point in time**, selecciona la marca de tiempo exacta (UTC) anterior al incidente (ej. 5 minutos antes de la corrupción).
   - Haz clic en **Create Branch**.
3. **Obtener la Nueva Cadena de Conexión:**
   - En el panel del nuevo branch, copia la `DATABASE_URL` generada (con flag `sslmode=require`).
4. **Actualizar el Backend:**
   - En el servidor de producción (o variables de entorno en Railway/Render/Docker), actualiza la variable:
     ```env
     DATABASE_URL=postgresql://usuario:password@ep-recovery-host.neon.tech/neondb?sslmode=require
     ```
5. **Reiniciar el Servicio:**
   ```bash
   docker compose restart backend
   ```
6. **Validar la Integridad:**
   - Ejecuta `GET /api/health` para comprobar conectividad y verifica la consistencia de los registros en SIAT.

---

### B. Método Automatizado: Restauración vía Neon CLI (`neonctl`)

```bash
# 1. Instalar o autenticar Neon CLI
npm install -g neonctl
neonctl auth

# 2. Listar branches existentes
neonctl branches list --project-id <SIAT_PROJECT_ID>

# 3. Crear branch restaurado a una hora específica (ISO 8601)
neonctl branches create \
  --project-id <SIAT_PROJECT_ID> \
  --name "hotfix-pitr-$(date +%Y%m%d)" \
  --parent main \
  --timestamp "2026-09-11T17:55:00Z"

# 4. Obtener la cadena de conexión del nuevo branch
neonctl connection-string --project-id <SIAT_PROJECT_ID> --branch "hotfix-pitr-$(date +%Y%m%d)"
```

---

## 📦 3. Snapshots Lógicos Externos con `pg_dump`

Para cumplir con normativas de retención médica independiente a largo plazo (auditoría clínica de expedientes TEA), se deben generar respaldos fríos fuera de la nube de Neon.

### A. Script de Respaldo Lógico Automatizado (`backup.sh`)

Crea un script en el servidor de despliegue:

```bash
#!/bin/bash
# ==============================================================================
# SIAT — Script de Respaldo Lógico de Base de Datos PostgreSQL
# ==============================================================================
set -e

BACKUP_DIR="/var/backups/siat"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="siat_backup_${TIMESTAMP}.dump"
ENCRYPTED_FILE="${FILENAME}.gpg"

# Crear directorio si no existe
mkdir -p "${BACKUP_DIR}"

echo "⏳ Iniciando exportación de base de datos..."

# Generar dump en formato binario comprimido optimizado para pg_restore
pg_dump "${DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="${BACKUP_DIR}/${FILENAME}"

echo "🔒 Cifrando archivo de respaldo..."
# Opcional: cifrado asimétrico con GPG o OpenSSL
gpg --symmetric --batch --passphrase "${BACKUP_ENCRYPTION_KEY}" \
  --output "${BACKUP_DIR}/${ENCRYPTED_FILE}" "${BACKUP_DIR}/${FILENAME}"
rm "${BACKUP_DIR}/${FILENAME}"

echo "✅ Respaldo generado con éxito: ${BACKUP_DIR}/${ENCRYPTED_FILE}"

# Purgar respaldos locales con antigüedad superior a 30 días
find "${BACKUP_DIR}" -type f -name "siat_backup_*.dump.gpg" -mtime +30 -delete
```

### B. Restauración de un Snapshot con `pg_restore`

```bash
# 1. Descifrar el archivo
gpg --decrypt --batch --passphrase "${BACKUP_ENCRYPTION_KEY}" \
  --output "siat_restore.dump" "siat_backup_20260911.dump.gpg"

# 2. Restaurar hacia una base de datos limpia o de pruebas
pg_restore \
  --dbname="${DATABASE_URL}" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  --verbose \
  "siat_restore.dump"

# 3. Limpiar archivo descifrado
rm "siat_restore.dump"
```

---

## ⏰ 4. Frecuencia Recomendada de Snapshots Externos

| Tipo de Respaldo | Frecuencia | Destino Recomendado | Período de Retención |
|---|---|---|---|
| **Neon PITR Continuo** | Continuo (Tiempo real) | Almacenamiento Neon / S3 integrado | 7 a 30 días |
| **Dump Lógico Diario** | Todos los días a las `03:00 UTC` | Bucket privado AWS S3 / Cloudflare R2 | 30 días |
| **Snapshot Semanal Frío** | Cada domingo a las `04:00 UTC` | Almacenamiento Glacier / Backup secundario | 90 días |
| **Respaldo Mensual / Anual** | Fin de mes / Cierre de año fiscal | Disco seguro desconectado (Cold Storage) | 5 años (Normativa clínica) |

### Programación mediante Cron Job en Linux:

```cron
# Respaldo diario a las 3:00 AM UTC
0 3 * * * /usr/local/bin/siat-backup.sh >> /var/log/siat-backup.log 2>&1
```
