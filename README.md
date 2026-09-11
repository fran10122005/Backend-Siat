# SIAT Backend — API REST & Telemetría IoT en Tiempo Real

> **Nombre Oficial del Sistema:** SIAT — Sistema Inteligente de Acompañamiento Terapéutico  
> **Propósito:** Backend modular de alta disponibilidad para la plataforma clínica SaaS SIAT, especializada en la intervención terapéutica, seguimiento conductual, gestión de metas PEI y monitoreo IoT de constantes fisiológicas en niños dentro del Trastorno del Espectro Autista (TEA).

---

## 🚀 Stack Tecnológico

| Componente | Tecnología | Propósito |
|---|---|---|
| **Runtime & Servidor** | **Node.js 18+** / **Express 5** | Servidor HTTP RESTful modular y escalable |
| **Base de Datos** | **PostgreSQL** / **Neon Serverless** | Persistencia relacional con conexiones SSL y pooling |
| **ORM & Migraciones** | **Prisma 5** | Tipado estricto, migraciones deterministas y client query builder |
| **Tiempo Real (IoT)** | **Socket.io 4** | WebSockets bidireccionales con salas autenticadas por paciente |
| **Seguridad & Auth** | **JWT** + **bcrypt** | Tokens de sesión stateless y hashing seguro de contraseñas |
| **Biometría Passwordless** | **@simplewebauthn/server** | Autenticación FIDO2 / WebAuthn (Passkeys / Huella dactilar) |
| **Validación de Datos** | **Zod 4** | Validación estricta de esquemas de entrada en controladores |
| **Documentación API** | **Swagger UI Express** (OpenAPI 3.0) | Explorador interactivo de endpoints en `/api/docs` |
| **Mailing Transaccional** | **Handlebars** + **EmailJS** | Plantillas HTML responsivas para alertas e invitaciones |
| **Archivos & Media** | **Cloudinary v2** | Almacenamiento seguro en la nube para fotos clínicas y reportes |
| **Seguridad HTTP** | **Helmet** + **express-rate-limit** | Headers de seguridad HTTP y mitigación de abuso de API |
| **Testing** | **Jest** + **Supertest** | Suite de pruebas unitarias e integración de servicios |

---

## 👥 Roles de Usuario y Control de Acceso (RBAC)

El sistema implementa control de acceso basado en roles mediante el middleware `requireRole`:

| Código Rol | Nombre | Alcance y Responsabilidades |
|---|---|---|
| `ROL_DIR` | **Director Global** | Supervisión institucional, reportería ejecutiva y auditoría global. |
| `ROL_ADM` | **Administrador de Institución** | Gestión de usuarios, terapeutas, altas de pacientes, asignaciones y catálogos. |
| `ROL_ESP` | **Especialista / Terapeuta** | Registro de sesiones terapéuticas, asignación de actividades, metas PEI SMART, incidentes conductuales e indicaciones médicas. |
| `ROL_REP` | **Representante Legal / Familiar** | Consulta del expediente clínico, registro de bitácoras de hogar, firma de consentimientos informados y visualización de telemetría. |

---

## 📋 Requisitos Previos

- **Node.js** v18.0.0 o superior
- **npm** v9.0.0 o superior
- **PostgreSQL** v14+ (local) o instancia de **Neon Serverless Postgres**
- Cuenta en **EmailJS** (para correos transaccionales)
- Cuenta en **Cloudinary** (opcional, para almacenamiento de imágenes)

---

## ⚙️ Variables de Entorno

Copia el archivo de plantilla `.env.example` a `.env` en la raíz del backend:

```bash
cp .env.example .env
```

### Tabla de Variables

| Variable | Requerida | Descripción | Ejemplo / Valor por defecto |
|---|---|---|---|
| `PORT` | No | Puerto en el que escucha el servidor | `3000` |
| `NODE_ENV` | Sí | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `DATABASE_URL` | Sí | Cadena de conexión PostgreSQL (con SSL para Neon) | `postgresql://user:pass@ep-host.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET` | Sí | Clave secreta para la firma criptográfica de JWT | *(Generar con crypto random)* |
| `FRONTEND_URL` | Sí | Origen permitido por CORS para el cliente web | `http://localhost:5173` |
| `EMAILJS_SERVICE_ID` | Sí | ID del servicio configurado en EmailJS | `service_xxxxxxx` |
| `EMAILJS_TEMPLATE_ID` | Sí | ID de la plantilla transaccional en EmailJS | `template_xxxxxxx` |
| `EMAILJS_PUBLIC_KEY` | Sí | Clave pública del SDK de EmailJS | `pk_xxxxxxx` |
| `EMAILJS_PRIVATE_KEY` | Sí | Clave privada API de EmailJS | `sk_xxxxxxx` |
| `WEBAUTHN_RP_ID` | No | ID de la Relying Party para Passkeys | `localhost` |
| `WEBAUTHN_RP_NAME` | No | Nombre legible de la aplicación WebAuthn | `SIAT` |
| `WEBAUTHN_ORIGIN` | No | Origen de solicitud esperado para WebAuthn | `http://localhost:5173` |
| `CLOUDINARY_CLOUD_NAME` | No | Cloud name de Cloudinary | `siat-cloud` |
| `CLOUDINARY_API_KEY` | No | API Key de Cloudinary | `xxxxxxxxxxxx` |
| `CLOUDINARY_API_SECRET` | No | API Secret de Cloudinary | `xxxxxxxxxxxx` |
| `SIAT_LOGO_URL` | No | URL del logo oficial alojado en Cloudinary | `https://res.cloudinary.com/...` |

> [!TIP]
> Para generar un `JWT_SECRET` criptográficamente seguro de 48 bytes en Node.js ejecuta:
> ```bash
> node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
> ```

---

## 🛠️ Instalación y Puesta en Marcha

### 1. Instalar dependencias
```bash
npm install
```

### 2. Generar el cliente Prisma
```bash
npx prisma generate
```

### 3. Sincronizar la Base de Datos
Para entornos de desarrollo rápido:
```bash
npx prisma db push
```
Para aplicar migraciones formales en staging o producción:
```bash
npx prisma migrate deploy
```

### 4. Sembrar Datos Iniciales (Seeders)
```bash
npm run seed
```
El seeder inicializa:
- Catálogo de Roles (`ROL_DIR`, `ROL_ADM`, `ROL_ESP`, `ROL_REP`) y Permiso Universal (`P_ALL`).
- Institución `I001` (*Fundación Una Luz Para el Autismo*).
- Especialidades médicas base (Neurología, Psicología Infantil, Terapia Ocupacional, Terapia de Lenguaje, Psicopedagogía).
- Usuario Administrador institucional de demostración con contraseña hasheada mediante `bcrypt`.

---

## 🏃 Comandos de Ejecución

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor en modo desarrollo con recarga automática (`nodemon`). |
| `npm start` | Ejecuta migraciones seguras y arranca el servidor en producción. |
| `npm test` | Ejecuta la suite de pruebas unitarias con **Jest**. |
| `npm run simulator` | Inicia el simulador de telemetría IoT interactivo en terminal. |
| `npm run seed` | Puebla la base de datos con los catálogos y perfiles base. |
| `npx prisma studio` | Abre la interfaz gráfica web de Prisma para inspeccionar la base de datos. |

---

## 📖 Documentación Interactiva de la API (Swagger)

Con el backend en ejecución, accede al explorador interactivo OpenAPI 3.0:

📍 **URL Swagger:** `http://localhost:3000/api/docs`

Permite explorar los esquemas, headers de autorización `Bearer <JWT>` y probar las respuestas directamente desde el navegador.

---

## 📡 Catálogo de Endpoints RESTful

### 🩺 Salud del Sistema
| Método | Ruta | Autenticación | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | Pública | Verifica el estado sintético (`healthy`, `degraded`, `unhealthy`) sin filtrar detalles internos. |
| `GET` | `/api/health/detail` | `X-Healthcheck-Token` | Desglose granular de dependencias (PostgreSQL/Neon, Socket.io, EmailJS, Cloudinary). |

---

## 🔭 Observabilidad y Monitoreo

SIAT implementa una arquitectura integral de observabilidad estructurada para entornos de misión crítica:

### 1. Sentry Frontend (Cliente React PWA)
- **Monitoreo de Errores de Interfaz:** Captura excepciones no capturadas, fallos en renders de React y errores en llamadas asíncronas de Axios.
- **Trazas de Rendimiento Web:** Medición de Core Web Vitals (FCP, LCP, CLS, INP) y tiempos de navegación entre módulos clínicos.
- **Contexto Clínico Seguro:** Captura únicamente identificadores anonimizados y códigos de error, omitiendo estrictamente PII/PHI.

### 2. Sentry Backend (API Node.js / Express)
- **Inicialización Condicional:** Activado automáticamente mediante la variable de entorno `SENTRY_DSN`. Si no está configurada, el backend opera normalmente sin emitir advertencias de bloqueo.
- **Captura Centralizada de Excepciones:** Integrado con el middleware `errorHandler.js` para capturar errores 500 no gestionados con stack trace completo.
- **Rendimiento de Transacciones:** Muestreo de transacciones HTTP (`tracesSampleRate: 0.2` en producción) para identificar endpoints lentos o cuellos de botella en consultas Prisma.

### 3. Endpoints de Diagnóstico (`/api/health` y `/api/health/detail`)
- **`GET /api/health` (Público):** Diseñado para balanceadores de carga (Cloudflare, Railway, Nginx) y orquestadores Docker/Kubernetes. Retorna exclusivamente `{ status: "healthy" | "degraded" | "unhealthy" }`. Si dependencias auxiliares fallan pero PostgreSQL está activo, responde `degraded` con código HTTP 200 para evitar reinicios cíclicos de contenedores.
- **`GET /api/health/detail` (Protegido):** Requiere el header `X-Healthcheck-Token` configurado en `process.env.HEALTHCHECK_TOKEN`. Retorna latencia exacta de DB, cantidad de clientes WebSocket conectados y estado de EmailJS y Cloudinary.

### 4. Logging Seguro en JSON Estructurado
- **Formato Estándar:** Todos los registros emitidos por `src/utils/logger.js` son serializados en JSON estricto (`timestamp`, `level`, `message`, `context`), facilitando la ingesta directa en CloudWatch, Datadog o Grafana Loki.
- **Nivel de Producción:** Configurado con `LOG_LEVEL=info` en entornos productivos.


---

### 🔐 Autenticación y Cuentas (`/api/auth`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/auth/login` | Pública | Inicio de sesión estándar (`usu_crro`, `usu_clve`). Retorna token JWT y perfil. |
| `POST` | `/api/auth/register/repre` | Pública | Registro de cuenta para representantes legales. |
| `POST` | `/api/auth/register/esp` | Pública | Registro de cuenta para especialistas clínicos. |
| `POST` | `/api/auth/forgot-password` | Pública | Genera token de recuperación y envía correo transaccional vía EmailJS. |
| `POST` | `/api/auth/reset-password` | Pública | Restablece contraseña mediante token de verificación. |
| `GET` | `/api/auth/invitation-details` | Pública | Valida token de invitación y retorna datos preliminares. |
| `POST` | `/api/auth/complete-invitation` | Pública | Finaliza el alta de un usuario invitado. |
| `GET` | `/api/auth/me` | Autenticado | Obtiene la información del perfil del usuario autenticado. |
| `PUT` | `/api/auth/me` | Autenticado | Actualiza datos del perfil propio (nombre, teléfono, etc.). |
| `GET` | `/api/auth/notificaciones` | Autenticado | Consulta preferencias de notificación por correo y push. |
| `PUT` | `/api/auth/notificaciones` | Autenticado | Actualiza canales y tipos de alerta habilitados. |

---

### 🔑 Passkeys / WebAuthn (`/api/auth`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/auth/passkey` | Autenticado | Lista las credenciales biométricas registradas por el usuario. |
| `DELETE` | `/api/auth/passkey/:pk_id` | Autenticado | Revoca y elimina una passkey registrada. |
| `POST` | `/api/auth/passkey/register/start` | Autenticado | Inicia el desafío criptográfico para registrar una passkey. |
| `POST` | `/api/auth/passkey/register/complete` | Autenticado | Verifica y persiste la credencial pública WebAuthn. |
| `POST` | `/api/auth/passkey/login/start` | Pública | Genera opciones de autenticación biométrica sin contraseña. |
| `POST` | `/api/auth/passkey/login/complete` | Pública | Valida la aserción criptográfica y emite JWT de sesión. |

---

### 👶 Gestión de Pacientes (`/api/ninos`)
| Método | Ruta | Roles Permitidos | Descripción |
|---|---|---|---|
| `GET` | `/api/ninos/mis-ninos` | Todos | Lista los niños vinculados al usuario autenticado. |
| `POST` | `/api/ninos` | `ROL_REP`, `ROL_ESP`, `ROL_ADM` | Crea un nuevo expediente de paciente con diagnósticos base. |
| `POST` | `/api/ninos/invite-representative` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Envía correo de invitación para vincular a un representante legal. |
| `GET` | `/api/ninos/representante` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Busca representantes registrados por correo electrónico. |
| `POST` | `/api/ninos/:nin_codi/umbrales` | Autenticado | Configura umbrales de alerta fisiológica (BPM mín/máx, sensibilidad). |
| `GET` | `/api/ninos/mi-expediente` | `ROL_REP` | Ficha y resumen clínico del niño para su representante legal. |
| `GET` | `/api/ninos/bitacora` | `ROL_REP` | Consulta el historial de bitácoras registradas por el representante. |
| `GET` | `/api/ninos/:nin_codi/bitacora` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Consulta las bitácoras y registros de hogar de un paciente. |
| `POST` | `/api/ninos/bitacora` | `ROL_REP` | Registra una nueva entrada de bitácora en el hogar. |
| `GET` | `/api/ninos/:nin_codi/ficha` | Autenticado | Obtiene la ficha clínica completa y datos de filiación. |
| `PUT` | `/api/ninos/:nin_codi/ficha` | `ROL_ESP`, `ROL_ADM`, `ROL_DIR` | Actualiza la información clínica y antecedentes del paciente. |

---

### 📋 Sesiones Terapéuticas y Catálogo (`/api/sesiones`)
| Método | Ruta | Roles Permitidos | Descripción |
|---|---|---|---|
| `POST` | `/api/sesiones/iniciar` | Todos | Inicia una sesión de terapia activa vinculando paciente, terapeuta y actividad. |
| `PUT` | `/api/sesiones/:ses_codi/cerrar` | Todos | Cierra la sesión activa registrando duración, notas clínicas y métricas. |
| `GET` | `/api/sesiones/ninos/:nin_codi/sesiones` | Autenticado | Lista el historial de sesiones realizadas por un niño. |
| `GET` | `/api/sesiones/categorias` | Autenticado | Lista categorías del catálogo terapéutico. |
| `POST` | `/api/sesiones/categorias` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Registra una nueva categoría de intervención. |
| `PUT` | `/api/sesiones/categorias/:cat_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Modifica una categoría existente. |
| `DELETE` | `/api/sesiones/categorias/:cat_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Desactiva una categoría del catálogo. |
| `GET` | `/api/sesiones/actividades` | Autenticado | Lista todas las actividades terapéuticas disponibles. |
| `GET` | `/api/sesiones/actividades/:act_codi` | Autenticado | Obtiene el detalle, objetivos y guía de una actividad. |
| `POST` | `/api/sesiones/actividades` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Crea una nueva actividad terapéutica. |
| `PUT` | `/api/sesiones/actividades/:act_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Actualiza una actividad terapéutica. |
| `DELETE` | `/api/sesiones/actividades/:act_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Elimina una actividad del catálogo. |
| `POST` | `/api/sesiones/actividades/:act_codi/asignar/:nin_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Asigna una rutina de actividad a un paciente. |
| `GET` | `/api/sesiones/ninos/:nin_codi/asignaciones` | Autenticado | Consulta las rutinas asignadas a un paciente. |
| `PATCH` | `/api/sesiones/asignaciones/:acn_codi/estado` | Todos | Actualiza el estado de completitud de una rutina asignada. |
| `DELETE` | `/api/sesiones/asignaciones/:acn_codi` | `ROL_ADM`, `ROL_ESP`, `ROL_DIR` | Remueve la asignación de una actividad. |

---

### 📊 Monitoreo IoT & Telemetría (`/api/monitoreo`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `POST` | `/api/monitoreo/telemetria` | Autenticado | Ingesta paquetes de telemetría (BPM, aceleración, estrés) y emite por WebSockets. |
| `GET` | `/api/monitoreo/simular-estado` | Autenticado | Consulta el estado actual de simulación sensorial. |
| `POST` | `/api/monitoreo/simular-estado` | Autenticado | Establece forzadamente un estado de calma o sobrecarga sensorial. |

---

### 📈 Reportes, Alertas & Evolución (`/api/reportes`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/reportes/historial/:nin_codi` | Autenticado | Resumen de sesiones, bitácoras y evolución de un niño. |
| `GET` | `/api/reportes/alertas-representante` | `ROL_REP` | Alertas fisiológicas recientes generadas en el paciente. |
| `GET` | `/api/reportes/evolucion-representante` | `ROL_REP` | Métricas de autorregulación y progreso semanal. |
| `GET` | `/api/reportes/historial-completo/:nin_codi` | Autenticado | Expediente consolidado (sesiones, alertas, metas, indicaciones). |
| `POST` | `/api/reportes/alertas/:ale_codi/feedback` | Autenticado | Registra retroalimentación clínica sobre una alerta recibida. |
| `POST` | `/api/reportes/indicacion` | `ROL_ESP` | Crea una prescripción o recomendación terapéutica. |

---

### 👨‍⚕️ Módulo del Especialista (`/api/especialista`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/especialista/indicaciones/:nin_codi` | Autenticado | Lista las indicaciones terapéuticas emitidas para un paciente. |
| `POST` | `/api/especialista/indicaciones` | `ROL_ESP` | Crea una nueva indicación médica o conductual. |
| `PATCH` | `/api/especialista/indicaciones/:ind_codi/leer` | Autenticado | Marca una indicación como leída y confirmada por el representante. |
| `GET` | `/api/especialista/incidentes/:nin_codi` | Autenticado | Consulta el registro de incidentes y crisis conductuales. |
| `POST` | `/api/especialista/incidentes/:nin_codi` | `ROL_ESP` | Registra un incidente conductual con análisis A-B-C. |
| `GET` | `/api/especialista/alertas/:nin_codi` | Autenticado | Lista las alertas de sobrecarga y desregulación registradas por IoT. |

---

### 📄 Consentimiento Informado (`/api/consentimiento`)
| Método | Ruta | Roles Permitidos | Descripción |
|---|---|---|---|
| `POST` | `/api/consentimiento/aceptar` | `ROL_REP` | Registra la aceptación y firma digital del consentimiento informado. |
| `GET` | `/api/consentimiento/estado/:nin_codi` | Autenticado | Verifica si un paciente cuenta con consentimiento activo. |
| `GET` | `/api/consentimiento/mis-consentimientos` | `ROL_REP` | Lista consentimientos otorgados por el representante. |
| `GET` | `/api/consentimiento/historial` | Autenticado | Auditoría de consentimientos y revocaciones. |

---

### 🎯 Metas PEI SMART (`/api/metas`)
| Método | Ruta | Acceso | Descripción |
|---|---|---|---|
| `GET` | `/api/metas/:nin_codi` | Autenticado | Lista las metas terapéuticas PEI (área, criterio SMART, progreso). |
| `POST` | `/api/metas` | `ROL_ESP` | Crea una meta terapéutica individualizada con objetivo porcentual. |
| `PATCH` | `/api/metas/:met_codi/ensayo` | `ROL_ESP` | Registra un ensayo clínico (éxito/intento) actualizando el progreso SMART. |

---

### ⚙️ Panel de Administración (`/api/admin`)
> Todos los endpoints requieren autenticación con rol `ROL_ADM`.

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/admin/health` | Estado del subsistema administrativo y carga. |
| `GET` | `/api/admin/metricas` | KPIs de la institución (total pacientes, especialistas activos, sesiones del mes). |
| `GET` | `/api/admin/catalogos` | Obtiene catálogos maestros de instituciones, roles y especialidades. |
| `GET` | `/api/admin/ninos` | Listado consolidado de todos los pacientes de la institución. |
| `GET` | `/api/admin/especialistas` | Listado y carga de pacientes por especialista. |
| `GET` | `/api/admin/asignaciones` | Matriz de asignación paciente-terapeuta. |
| `GET` | `/api/admin/users` | Listado global de cuentas de usuario. |
| `GET` | `/api/admin/auditoria` | Bitácora inmutable de auditoría de acciones administrativas. |
| `PATCH` | `/api/admin/users/:usu_codi/estado` | Activa o desactiva el acceso a un usuario. |
| `POST` | `/api/admin/users/:usu_codi/password` | Restablece administrativamente la contraseña de un usuario. |
| `PUT` | `/api/admin/representantes/:usu_codi` | Actualiza los datos de filiación de un representante. |
| `PATCH` | `/api/admin/ninos/:nin_codi/foto` | Actualiza la fotografía de perfil clínico del paciente. |
| `PATCH` | `/api/admin/ninos/:nin_codi` | Modifica datos institucionales o diagnósticos del paciente. |
| `POST` | `/api/admin/ninos/:nin_codi/documentos` | Adjunta documentación clínica (evaluaciones, informes). |
| `POST` | `/api/admin/especialistas` | Da de alta a un nuevo especialista vinculando su especialidad. |
| `PUT` | `/api/admin/especialistas/:esp_codi` | Modifica el perfil y colegiatura de un especialista. |
| `PATCH` | `/api/admin/especialistas/:esp_codi/estado` | Cambia el estado operativo de un terapeuta. |
| `POST` | `/api/admin/asignar` | Asigna formalmente un paciente a un terapeuta. |
| `PATCH` | `/api/admin/asignaciones/:asi_codi/estado` | Modifica o suspende una asignación clínica. |
| `PUT` | `/api/admin/instituciones/:ins_codi` | Actualiza los datos institucionales (dirección, teléfono, nombre). |
| `POST` | `/api/admin/especialidades` | Registra una nueva especialidad médica. |
| `PUT` | `/api/admin/especialidades/:esc_codi` | Modifica una especialidad existente. |
| `PATCH` | `/api/admin/especialidades/:esc_codi/estado` | Cambia la vigencia de una especialidad. |
| `GET` | `/api/admin/reportes/programados` | Consulta la configuración de envíos automáticos de reportes. |
| `POST` | `/api/admin/reportes/programados` | Actualiza la programación periódica de reportes. |
| `POST` | `/api/admin/reportes/enviar-ahora` | Despacha inmediatamente el reporte ejecutivo consolidado. |

---

## ⚡ Comunicación en Tiempo Real (WebSockets con Socket.io)

El backend integra un servidor Socket.io en el mismo puerto HTTP para la transmisión en vivo de telemetría y alertas clínicas.

### Autenticación del Socket
El cliente debe enviar el token JWT en el handshake de conexión:
```javascript
import { io } from "socket.io-client";

const socket = io("http://localhost:3000", {
  auth: {
    token: "TU_TOKEN_JWT"
  }
});
```

### Aislamiento por Salas (`Rooms`)
- Cada paciente cuenta con una sala aislada: `child:{nin_codi}`.
- El servidor valida la suscripción del usuario según su rol y pertenencia antes de permitir el ingreso a la sala:
  - `ROL_REP`: Solo accede al niño que representa.
  - `ROL_ESP`: Solo accede a los niños asignados a su agenda.
  - `ROL_ADM` / `ROL_DIR`: Acceso a los pacientes de su institución.

### Eventos Emitidos por el Servidor
- `new_telemetry`: Emite paquetes `{ bpm, mov, stress, timestamp }` en tiempo real.
- `new_alert`: Notifica la generación de una alerta de sobrecarga sensorial o desconexión.
- `crisis_detected`: Notificación prioritaria de desregulación fisiológica activa.
- `session_updated`: Avisa sobre el inicio o finalización de una sesión terapéutica.

---

## ⌚ Simulador IoT de Wearable

El repositorio incluye un simulador de consola interactivo para pruebas de telemetría sin requerir hardware físico.

```bash
npm run simulator
```

### Controles Interactivos
- **`s`** — **Gatillar Sobrecarga:** Eleva los BPM (120–135) y el índice de estrés (> 85%) disparando alertas en el dashboard.
- **`c`** — **Restaurar Calma:** Devuelve las constantes a línea base (BPM 70–82, estrés bajo).
- **`q`** — **Salir:** Detiene la transmisión y desconecta de la base de datos.

---

## 📂 Estructura del Proyecto

```
Backend SIAT/
├── index.js                     # Punto de entrada HTTP y Socket.io
├── package.json                 # Scripts, dependencias y metadata
├── jest.config.js               # Configuración del framework de pruebas Jest
├── .env.example                 # Plantilla de variables de entorno
├── prisma/
│   ├── schema.prisma            # Esquema declarativo de base de datos
│   ├── seed.js                  # Sembrado determinista de datos base
│   └── migrations/              # Historial de migraciones SQL
├── scripts/
│   ├── check_users.js           # Diagnóstico rápido de usuarios
│   ├── ensure-migrations.js     # Sanitizador de migraciones para deploy
│   ├── upload-logo.js           # Utilidad para subir logos a Cloudinary
│   └── wearable_simulator.js    # Simulador interactivo de telemetría IoT
├── src/
│   ├── app.js                   # Configuración de Express, middlewares y rutas
│   ├── config/
│   │   ├── db.js                # Instancia singleton de PrismaClient
│   │   ├── env.js               # Validación de variables de entorno con Zod
│   │   ├── cloudinary.js        # Configuración del SDK de Cloudinary
│   │   ├── swagger.js           # Configuración OpenAPI 3.0
│   │   └── consentimiento_texto.js # Marco legal para consentimientos
│   ├── middleware/
│   │   ├── auth.middleware.js   # Validación JWT y requireRole
│   │   ├── cors.js              # Whitelist dinámica de orígenes CORS
│   │   ├── errorHandler.js      # Formateo y captura centralizada de errores
│   │   ├── rateLimiter.js       # Limitadores de peticiones por IP
│   │   └── validate.middleware.js # Middleware de validación con Zod
│   ├── modules/
│   │   ├── admin/               # Módulo de administración institucional
│   │   ├── auth/                # Módulo de autenticación estándar
│   │   ├── consentimiento/      # Módulo de consentimientos informados
│   │   ├── especialista/        # Módulo de herramientas clínicas del terapeuta
│   │   ├── metas/               # Módulo de metas SMART / PEI
│   │   ├── monitoreo/           # Ingesta de telemetría IoT
│   │   ├── ninos/               # Fichas y expedientes de pacientes
│   │   ├── passkey/             # WebAuthn / Passkeys
│   │   ├── reportes/            # Alertas, bitácoras e informes
│   │   └── sesiones/            # Sesiones terapéuticas y actividades
│   ├── services/
│   │   ├── email.service.js     # Envío de correos vía EmailJS
│   │   └── socket.service.js    # Lógica de emisión y gestión de WebSockets
│   ├── templates/               # Plantillas Handlebars para correos
│   │   ├── alert-notification.hbs
│   │   ├── base.hbs
│   │   ├── invite-representative.hbs
│   │   ├── recover-password.hbs
│   │   └── welcome-especialista.hbs
│   └── utils/
│       ├── AppError.js          # Clase de error operacional con código HTTP
│       ├── catchAsync.js        # Manejador de promesas asíncronas en controladores
│       ├── idGenerator.js       # Generador de identificadores seguros con nanoid
│       └── logger.js            # Registro estructurado de eventos en consola
└── docs/                        # Documentación técnica adicional
    └── emailjs/
        ├── EMAILJS_SETUP.md
        └── EMAILJS_DASHBOARD_TEMPLATE.html
```

---

## 🔒 Privacidad, Seguridad y Cumplimiento Normativo

- **Biometría WebAuthn (Passkeys):** Las claves privadas nunca abandonan el dispositivo del usuario. El backend solo almacena la clave pública y el contador de firmas, garantizando cumplimiento de privacidad de datos biométricos.
- **Protección de Datos Pediátricos:** Fundamentado en el **Artículo 65 de la LOPNNA** y el **Artículo 79 de la Ley de Infogobierno**, garantizando que el expediente y la telemetría solo sean accesibles por los representantes legales y especialistas expresamente asignados.
- **Seguridad en Tránsito y Reposo:** Conexiones forzadas con TLS/SSL (`sslmode=require`) hacia Neon Postgres y hashing de contraseñas mediante `bcrypt` con factor de coste 10.
