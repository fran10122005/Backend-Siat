# SIAT Backend Modular

Backend para el **Sistema Integral de Apoyo a Padres** de niños con Trastorno del Espectro Autista (SIAT).

> **Nombre completo del sistema:** Sistema Inteligente de Acompañamiento Terapéutico

## Stack Tecnológico

| Tecnología | Uso |
|---|---|
| **Node.js + Express** | Servidor web y API REST |
| **PostgreSQL** | Base de datos relacional |
| **Prisma ORM** | ORM y migraciones de BD |
| **JWT** | Autenticación de usuarios |
| **Zod** | Validación de esquemas de entrada |
| **Socket.io** | Comunicación en tiempo real (WebSockets) |
| **Handlebars** | Generación de plantillas HTML para correos |
| **EmailJS** | Envío de correos transaccionales |
| **Cloudinary** | Almacenamiento de fotos e informes |
| **WebAuthn** | Acceso rápido por huella dactilar (Passkeys) |
| **express-rate-limit** | Protección contra abuso de API |
| **helmet** | Cabeceras de seguridad |
| **Jest** | Pruebas unitarias |

## Roles de Usuario

| Código | Rol | Descripción |
|---|---|---|
| `ROL_ADM` | Administrador | Gestión completa de la institución |
| `ROL_ESP` | Especialista | Terapeuta — notas SOAP, indicaciones, incidentes |
| `ROL_REP` | Representante | Padre/tutor del niño — expediente, bitácora, consentimientos |
| `ROL_DIR` | Director | Supervisión y gestión institucional |

## Requisitos

- **Node.js** v18+
- **PostgreSQL** v14+ (o Neon Serverless Postgres)
- Cuenta de **EmailJS** (para correos transaccionales)
- Cuenta de **Cloudinary** (opcional, para fotos e informes)

## Variables de Entorno

Copia `.env.example` a `.env` y configura los valores:

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `PORT` | Puerto del servidor (default: `3000`) |
| `NODE_ENV` | Entorno: `development`, `production`, `test` |
| `DATABASE_URL` | URL de conexión a PostgreSQL |
| `JWT_SECRET` | Secreto para firmar tokens JWT (generar con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`) |
| `FRONTEND_URL` | URL del frontend (ej. `http://localhost:5173`) |
| `EMAILJS_SERVICE_ID` | ID del servicio de EmailJS |
| `EMAILJS_TEMPLATE_ID` | ID de la plantilla de EmailJS |
| `EMAILJS_PUBLIC_KEY` | Llave pública de EmailJS |
| `EMAILJS_PRIVATE_KEY` | Llave privada de EmailJS |
| `WEBAUTHN_RP_ID` | Dominio del RP para WebAuthn |
| `WEBAUTHN_RP_NAME` | Nombre de la Relying Party |
| `WEBAUTHN_ORIGIN` | Origen del frontend |
| `CLOUDINARY_CLOUD_NAME` | Nombre de cloud en Cloudinary |
| `CLOUDINARY_API_KEY` | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | API Secret de Cloudinary |
| `CLOUDINARY_UPLOAD_PRESET` | Upload preset de Cloudinary |
| `SIAT_LOGO_URL` | URL pública del logo de SIAT en Cloudinary |

## Instalación y Configuración

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copia `.env.example` a `.env` y completa los valores, especialmente:
- `DATABASE_URL` — conexión a PostgreSQL local o remoto (Neon)
- `JWT_SECRET` — genera uno seguro
- Correos EmailJS (ver [Guía de EmailJS](docs/emailjs/EMAILJS_SETUP.md))
- Cloudinary (opcional, ver `src/config/cloudinary.js`)

### 3. Sincronizar la base de datos

Asegúrate de que la BD de PostgreSQL exista (ej. `siat_db`).

```bash
# Opción rápida (sincroniza el schema directamente)
npx prisma db push

# O crear una migración oficial
npx prisma migrate dev --name init
```

### 4. Generar cliente de Prisma

```bash
npx prisma generate
```

### 5. Sembrar datos iniciales

```bash
npm run seed
# o mediante Prisma: npx prisma db seed
```

Esto crea:
- Roles (`ROL_DIR`, `ROL_ADM`, `ROL_ESP`, `ROL_REP`)
- Institución `I001` (Fundación Una Luz Para el Autismo)
- Especialidades (Neurología, Psicología Infantil, Terapia Ocupacional, etc.)
- Admin de institución: `admin_fundacion@siat.com` / `123456`

### 6. Ejecutar migraciones pendientes (producción)

```bash
node scripts/ensure-migrations.js
```

Limpia registros obsoletos de `_prisma_migrations` y asegura que solo estén las migraciones vigentes.

## Ejecución

**Desarrollo (con nodemon):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

**Tests:**
```bash
npm test
```

## API Endpoints

### Salud del sistema
```
GET /api/health
```

---

### 🔐 Autenticación (`/api/auth`)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/login` | Iniciar sesión con `usu_crro` y `usu_clve` |
| `POST` | `/register/repre` | Registrar representante legal |
| `POST` | `/register/esp` | Registrar especialista |
| `POST` | `/forgot-password` | Solicitar recuperación de contraseña |
| `POST` | `/reset-password` | Restablecer contraseña con token |
| `GET` | `/invitation-details` | Obtener detalles de invitación |
| `POST` | `/complete-invitation` | Completar proceso de invitación |
| `GET` | `/me` | Obtener perfil del usuario autenticado |
| `PUT` | `/me` | Actualizar perfil del usuario |
| `GET` | `/notificaciones` | Obtener preferencias de notificación |
| `PUT` | `/notificaciones` | Actualizar preferencias de notificación |

---

### 🔑 Passkeys / WebAuthn (`/api/auth`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/passkey` | Listar passkeys del usuario |
| `DELETE` | `/passkey/:pk_id` | Eliminar una passkey |
| `POST` | `/passkey/register/start` | Iniciar registro de passkey |
| `POST` | `/passkey/register/complete` | Completar registro de passkey |
| `POST` | `/passkey/login/start` | Iniciar acceso rápido por passkey |
| `POST` | `/passkey/login/complete` | Completar acceso rápido por passkey |

---

### 👶 Niños (`/api/ninos`)

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `GET` | `/mis-ninos` | Cualquiera | Niños asociados al usuario |
| `POST` | `/` | `ROL_REP`, `ROL_ESP` | Crear registro de niño |
| `POST` | `/invite-representative` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Invitar representante |
| `GET` | `/representante` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Buscar representante por correo |
| `POST` | `/:nin_codi/umbrales` | Autenticado | Configurar umbrales de alerta |
| `GET` | `/mi-expediente` | `ROL_REP` | Expediente del niño (representante) |
| `GET` | `/bitacora` | `ROL_REP` | Historial de bitácoras del representante |
| `GET` | `/:nin_codi/bitacora` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Bitácoras de un niño |
| `POST` | `/bitacora` | `ROL_REP` | Registrar bitácora de hogar |
| `GET` | `/:nin_codi/ficha` | Autenticado | Ficha clínica del niño |
| `PUT` | `/:nin_codi/ficha` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Actualizar ficha clínica |

---

### 📋 Sesiones y Terapia (`/api/sesiones`)

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/iniciar` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR`, `ROL_REP` | Iniciar sesión de terapia |
| `PUT` | `/:ses_codi/cerrar` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR`, `ROL_REP` | Cerrar sesión de terapia |
| `GET` | `/ninos/:nin_codi/sesiones` | Autenticado | Listar sesiones de un niño |
| `GET` | `/categorias` | Autenticado | Listar categorías de actividades |
| `POST` | `/categorias` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Crear categoría |
| `PUT` | `/categorias/:cat_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Actualizar categoría |
| `DELETE` | `/categorias/:cat_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Eliminar categoría |
| `GET` | `/actividades` | Autenticado | Listar actividades |
| `GET` | `/actividades/:act_codi` | Autenticado | Obtener actividad |
| `POST` | `/actividades` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Crear actividad |
| `PUT` | `/actividades/:act_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Actualizar actividad |
| `DELETE` | `/actividades/:act_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Eliminar actividad |
| `POST` | `/actividades/:act_codi/asignar/:nin_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Asignar actividad a un niño |
| `GET` | `/ninos/:nin_codi/asignaciones` | Autenticado | Listar asignaciones de un niño |
| `PATCH` | `/asignaciones/:acn_codi/estado` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR`, `ROL_REP` | Cambiar estado de asignación |
| `DELETE` | `/asignaciones/:acn_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Desasignar actividad |

---

### 📊 Monitoreo IoT (`/api/monitoreo`)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/telemetria` | Recibir datos de telemetría del wearable |
| `GET` | `/simular-estado` | Obtener estado de simulación actual |
| `POST` | `/simular-estado` | Establecer estado de simulación (crisis/calma) |

---

### 📈 Reportes (`/api/reportes`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/historial/:nin_codi` | Historial de reportes de un niño |
| `GET` | `/alertas-representante` | Alertas del representante |
| `GET` | `/evolucion-representante` | Datos de evolución del representante |
| `GET` | `/historial-completo/:nin_codi` | Historial completo de un niño |
| `POST` | `/alertas/:ale_codi/feedback` | Registrar feedback sobre una alerta |
| `POST` | `/indicacion` | Crear indicación médica |

---

### 👨‍⚕️ Especialista (`/api/especialista`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/soap/:nin_codi` | Listar notas SOAP de un niño |
| `POST` | `/soap` | Crear nota SOAP |
| `GET` | `/indicaciones/:nin_codi` | Listar indicaciones médicas |
| `POST` | `/indicaciones` | Crear indicación médica |
| `PATCH` | `/indicaciones/:ind_codi/leer` | Marcar indicación como leída |
| `GET` | `/incidentes/:nin_codi` | Listar incidentes conductuales |
| `POST` | `/incidentes/:nin_codi` | Crear incidente conductual |
| `GET` | `/alertas/:nin_codi` | Alertas y crisis de IoT de un niño |

---

### 📄 Consentimientos (`/api/consentimiento`)

| Método | Ruta | Roles | Descripción |
|---|---|---|---|
| `POST` | `/aceptar` | `ROL_REP` | Aceptar consentimiento informado |
| `GET` | `/estado/:nin_codi` | Autenticado | Estado de consentimiento de un niño |
| `GET` | `/mis-consentimientos` | `ROL_REP` | Consentimientos del representante |
| `GET` | `/historial` | Autenticado | Historial de consentimientos |

---

### 🎯 Metas Terapéuticas (`/api/metas`)

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/:nin_codi` | Obtener metas de un niño |
| `POST` | `/` | Crear nueva meta terapéutica |
| `PATCH` | `/:met_codi/ensayo` | Registrar ensayo de una meta |

---

### ⚙️ Administración (`/api/admin`)

> Todas las rutas requieren rol `ROL_ADM`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health` | Estado del sistema |
| `GET` | `/metricas` | Métricas generales |
| `GET` | `/catalogos` | Catálogos del sistema |
| `GET` | `/ninos` | Listar todos los niños |
| `GET` | `/especialistas` | Listar todos los especialistas |
| `GET` | `/asignaciones` | Listar asignaciones |
| `GET` | `/users` | Listar usuarios |
| `GET` | `/auditoria` | Log de auditoría |
| `PATCH` | `/users/:usu_codi/estado` | Cambiar estado de usuario |
| `POST` | `/users/:usu_codi/password` | Restablecer contraseña de usuario |
| `PUT` | `/representantes/:usu_codi` | Actualizar representante |
| `PATCH` | `/ninos/:nin_codi/foto` | Actualizar foto del niño |
| `PATCH` | `/ninos/:nin_codi` | Actualizar datos del niño |
| `POST` | `/ninos/:nin_codi/documentos` | Agregar documento al niño |
| `POST` | `/especialistas` | Crear especialista |
| `PUT` | `/especialistas/:esp_codi` | Actualizar especialista |
| `PATCH` | `/especialistas/:esp_codi/estado` | Cambiar estado de especialista |
| `POST` | `/asignar` | Asignar paciente a especialista |
| `PATCH` | `/asignaciones/:asi_codi/estado` | Cambiar estado de asignación |
| `PUT` | `/instituciones/:ins_codi` | Actualizar institución |
| `POST` | `/especialidades` | Crear especialidad |
| `PUT` | `/especialidades/:esc_codi` | Actualizar especialidad |
| `PATCH` | `/especialidades/:esc_codi/estado` | Cambiar estado de especialidad |
| `GET` | `/reportes/programados` | Obtener configuración de reportes programados |
| `POST` | `/reportes/programados` | Guardar configuración de reportes |
| `POST` | `/reportes/enviar-ahora` | Enviar reporte ejecutivo inmediatamente |

---

## Comunicación en Tiempo Real (Socket.io)

El backend expone un servidor WebSocket para notificaciones en tiempo real sobre sesiones y alertas de los niños.

**Conexión:** El cliente debe enviar el token JWT en `socket.handshake.auth.token`.

**Sala por niño:** Cada niño tiene una sala `child:{nin_codi}` a la que los usuarios con acceso se suscriben automáticamente.

**Roles y acceso a salas:**
- `ROL_REP`: Acceso solo al niño vinculado como representante
- `ROL_ESP`: Acceso a los niños asignados al especialista
- `ROL_ADM`: Acceso a todos los niños de la institución

**Eventos del cliente:**
- `join_child` — Suscribirse a un niño específico (con verificación de permisos)
- `leave_child` — Dejar la sala de un niño
- `resync_rooms` — Resincronizar salas tras cambios de asignación

## Simulador IoT (Wearable)

El proyecto incluye un script independiente para simular una pulsera enviando telemetría al servidor.

### Uso

Asegúrate de que el backend esté corriendo, luego ejecuta en una nueva terminal:

```bash
node wearable_simulator.js
```

El simulador:
1. Autentica como `padre@siat.com` / `123456`
2. Sincroniza el estado de la BD (roles, institución, niño, dispositivo, sensor, sesión)
3. Envía telemetría continua cada 10 segundos

### Controles del Simulador

Una vez en ejecución, la terminal captura tus teclas:

- **`s`** (Gatillar Crisis) — Simula una alerta de sobrecarga sensorial aumentando los BPM
- **`c`** (Restaurar Calma) — Retorna las constantes fisiológicas a la línea base
- **`q`** (Salir) — Detiene el simulador y desconecta

### Flujo de Telemetría

- **Modo Calma:** BPM 70-82, movimiento 0.8-2.8G, índice de estrés bajo
- **Modo Crisis:** BPM 120-132, movimiento 0.4-1.5G, índice de estrés > 88%
- Si el estrés supera el 75%, se genera una alerta `SOBRECARGA_SENSORIAL`

## Estructura del Proyecto

```
Backend SIAT/
├── index.js                    # Punto de entrada (HTTP + Socket.io)
├── src/
│   ├── app.js                  # Configuración de Express
│   ├── config/
│   │   ├── env.js              # Validación de variables de entorno (Zod)
│   │   ├── db.js               # Cliente de Prisma
│   │   ├── cloudinary.js       # Configuración de Cloudinary
│   │   ├── consentimiento_texto.js  # Texto de consentimiento informado
│   │   └── scheduled_reports.json     # Configuración de reportes programados
│   ├── middleware/
│   │   ├── auth.middleware.js  # Autenticación JWT y requireRole
│   │   ├── cors.js             # Configuración de CORS
│   │   ├── rateLimiter.js      # Rate limiting global y por endpoint
│   │   ├── validate.middleware.js    # Validación de esquemas Zod
│   │   └── errorHandler.js     # Manejo centralizado de errores
│   ├── modules/
│   │   ├── auth/               # Autenticación (login, registro, forgot-password)
│   │   ├── passkey/            # WebAuthn / Passkeys
│   │   ├── ninos/              # CRUD de niños y expedientes
│   │   ├── sesiones/           # Sesiones de terapia y gestión de actividades
│   │   ├── monitoreo/          # Recepción de telemetría IoT
│   │   ├── reportes/           # Reportes, alertas y feedback
│   │   ├── especialista/       # Notas SOAP, indicaciones, incidentes
│   │   ├── admin/              # Panel administrativo completo
│   │   ├── consentimiento/     # Gestión de consentimientos informados
│   │   └── metas/              # Metas terapéuticas
│   ├── assets/
│   │   └── images/             # Logos y recursos gráficos oficiales
│   │       ├── logo.png
│   │       └── siat_tech_variation_2.png
│   ├── services/
│   │   ├── email.service.js    # Servicio de envío de correos (EmailJS)
│   │   └── socket.service.js   # Gestión desacoplada de WebSockets
│   ├── templates/              # Plantillas Handlebars para correos
│   │   ├── base.hbs
│   │   ├── recover-password.hbs
│   │   ├── welcome-especialista.hbs
│   │   ├── invite-representative.hbs
│   │   └── alert-notification.hbs
│   └── utils/
│       ├── AppError.js         # Clase de error personalizada
│       ├── catchAsync.js       # Wrapper para controladores async
│       ├── logger.js           # Logger estructurado
│       └── idGenerator.js      # Generador de IDs seguros con nanoid
├── docs/                       # Documentación del sistema
│   └── emailjs/                # Guía y plantillas de EmailJS
│       ├── EMAILJS_DASHBOARD_TEMPLATE.html
│       └── EMAILJS_SETUP.md
├── prisma/
│   ├── schema.prisma           # Esquema de la base de datos
│   ├── seed.js                 # Sembrado de datos iniciales (Prisma seed)
│   └── migrations/             # Migraciones de Prisma
├── scripts/
│   ├── check_users.js          # Consulta de usuarios (debug)
│   ├── ensure-migrations.js    # Limpieza de migraciones obsoletas
│   ├── upload-logo.js          # Sube el logo a Cloudinary
│   └── wearable_simulator.js   # Simulador de pulsera IoT
└── .env.example                # Ejemplo de variables de entorno
```

## Modelos de Base de Datos (Prisma)

### Entidades principales

- **`tm_usuar`** — Usuarios del sistema (login, contraseña, rol)
- **`tm_roles`** — Roles (ADMIN, ESP, REP, DIR)
- **`tm_permi`** — Permisos asociados a roles
- **`tm_ninos`** — Perfiles de niños con TEA
- **`tm_espec`** — Perfiles de especialistas
- **`tm_repre`** — Perfiles de representantes legales
- **`tm_admin`** — Administradores de institución
- **`tm_insti`** — Instituciones
- **`tm_especi`** — Especialidades médicas
- **`tm_dispo`** — Dispositivos wearables
- **`tm_senso`** — Sensores registrados
- **`tc_confi`** — Configuraciones de sensores
- **`tc_umbra`** — Umbrales de alerta por niño
- **`tr_sesio`** — Sesiones de terapia
- **`tr_telem`** — Datos de telemetría
- **`tr_estad`** — Estados de sesión
- **`tr_alert`** — Alertas generadas
- **`tr_feedb`** — Feedback sobre alertas
- **`tr_soap`** — Notas de enfermería (S-O-A-P)
- **`tr_indic`** — Indicaciones médicas
- **`tr_incid`** — Incidentes conductuales
- **`tr_repor`** — Reportes de gestión
- **`tr_metaspei`** — Metas terapéuticas
- **`tm_activ`** / `tc_activ_ninos` — Actividades y asignaciones
- **`th_perfi`** — Perfil del niño
- **`tc_sensi`** — Sensibilidades del niño
- **`tm_conse`** — Consentimientos firmados
- **`tm_pref_notif`** — Preferencias de notificación
- **`tm_passkeys`** — Credenciales WebAuthn
- **`tr_audito`** — Auditoría de acciones
- **`tr_bitac`** — Bitácora de hogar (datos del wearable)
- **`tm_categ`** / `tc_guias` / `tm_instr` — Categorías, guías e instrucciones

## Ecosistema Neon (Base de Datos Serverless)

Este proyecto está diseñado para funcionar con **Neon Serverless Postgres**. Consulta la [guía de Neon](https://neon.tech) para:

- Crear un proyecto Neon y obtener la `DATABASE_URL`
- Configurar conexiones con SSL (`sslmode=require`)
- Usar branching para desarrollo
- Escalado automático y scale-to-zero

## Notas Adicionales

- **Logo de SIAT:** Para usar el logo real en los correos, ejecuta `node scripts/upload-logo.js` para subirlo a Cloudinary, luego configura `SIAT_LOGO_URL` en tu `.env`.
- **Correos en producción:** El plan gratuito de EmailJS permite 200 correos/mes. Para producción considera un SMTP dedicado (ReSend, SES, etc.).
- **Biometría:** Los passkeys (WebAuthn) solo almacenan credenciales criptográficas públicas. SIAT **nunca** almacena huellas dactilares.
- **Consentimiento:** El texto del consentimiento informado está definido en `src/config/consentimiento_texto.js` y se fundamenta en el Artículo 79 de la Ley de Infogobierno y el Artículo 65 de la LOPNNA.
- **Reportes programados:** La configuración de reportes ejecutivos semanales se define en `src/config/scheduled_reports.json` (actualmente deshabilitado).
