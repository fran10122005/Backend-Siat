# 👥 Matriz de Control de Acceso Basado en Roles (RBAC Matrix) — SIAT

Esta matriz documenta de forma exhaustiva los permisos de acceso por endpoint y recurso para los 4 roles del sistema:
- **`ROL_DIR`**: Director Global / Supervisor Institucional
- **`ROL_ADM`**: Administrador de Institución
- **`ROL_ESP`**: Especialista / Terapeuta Clínico
- **`ROL_REP`**: Representante Legal / Familiar del Paciente

---

## 🔐 1. Módulo de Autenticación y Credenciales (`/api/auth`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/auth/login` | `POST` | ✅ | ✅ | ✅ | ✅ | Público con rate limit (`authLimiter`). |
| `/api/auth/register/repre` | `POST` | ✅ | ✅ | ✅ | ✅ | Registro público de representantes. |
| `/api/auth/register/esp` | `POST` | ✅ | ✅ | ✅ | ✅ | Registro público de terapeutas. |
| `/api/auth/forgot-password` | `POST` | ✅ | ✅ | ✅ | ✅ | Envío de correo de recuperación. |
| `/api/auth/reset-password` | `POST` | ✅ | ✅ | ✅ | ✅ | Restablecimiento con token temporal. |
| `/api/auth/invitation-details` | `GET` | ✅ | ✅ | ✅ | ✅ | Consulta token de invitación de familiares. |
| `/api/auth/complete-invitation` | `POST` | ✅ | ✅ | ✅ | ✅ | Completa alta de familiar invitado. |
| `/api/auth/me` | `GET` / `PUT` | ✅ | ✅ | ✅ | ✅ | Perfil del usuario autenticado. |
| `/api/auth/notificaciones` | `GET` / `PUT` | ✅ | ✅ | ✅ | ✅ | Preferencias de alertas por correo. |
| `/api/auth/passkey` | `GET` / `DELETE` | ✅ | ✅ | ✅ | ✅ | Gestión de credenciales biométricas propias. |
| `/api/auth/passkey/register/*` | `POST` | ✅ | ✅ | ✅ | ✅ | Enrolamiento FIDO2 (sesión requerida). |
| `/api/auth/passkey/login/*` | `POST` | ✅ | ✅ | ✅ | ✅ | Login biométrico público. |

---

## 👶 2. Módulo de Pacientes / Niños (`/api/ninos`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/ninos/mis-ninos` | `GET` | ✅ | ✅ | ✅ | ✅ | Filtra por niños asignados o vinculados. |
| `/api/ninos` | `POST` | ❌ | ❌ | ✅ | ✅ | Creación / Alta inicial del niño. |
| `/api/ninos/invite-representative` | `POST` | ✅ | ✅ | ✅ | ❌ | Genera enlace/código de invitación. |
| `/api/ninos/representante` | `GET` | ✅ | ✅ | ✅ | ❌ | Búsqueda de familiar por correo. |
| `/api/ninos/:nin_codi/umbrales` | `POST` | ✅ | ✅ | ✅ | ✅ | Calibración de umbrales BPM/Estrés. |
| `/api/ninos/mi-expediente` | `GET` | ❌ | ❌ | ❌ | ✅ | Expediente clínico exclusivo del familiar. |
| `/api/ninos/bitacora` | `GET` / `POST` | ❌ | ❌ | ❌ | ✅ | Bitácora de comportamiento en el hogar. |
| `/api/ninos/:nin_codi/bitacora` | `GET` | ✅ | ✅ | ✅ | ❌ | Consulta de bitácoras por terapeutas. |
| `/api/ninos/:nin_codi/ficha` | `GET` | ✅ | ✅ | ✅ | ✅ | Ficha médica y antecedentes. |
| `/api/ninos/:nin_codi/ficha` | `PUT` | ✅ | ✅ | ✅ | ❌ | Actualización de diagnóstico y PEI. |

---

## 🧩 3. Módulo de Sesiones y Actividades (`/api/sesiones`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/sesiones/iniciar` | `POST` | ✅ | ✅ | ✅ | ✅ | Inicia cronómetro y sesión terapéutica. |
| `/api/sesiones/:ses_codi/cerrar` | `PUT` | ✅ | ✅ | ✅ | ✅ | Cierre formal de sesión y resumen. |
| `/api/sesiones/ninos/:nin_codi/sesiones` | `GET` | ✅ | ✅ | ✅ | ✅ | Historial cronológico de sesiones. |
| `/api/sesiones/categorias` | `GET` | ✅ | ✅ | ✅ | ✅ | Catálogo de áreas terapéuticas. |
| `/api/sesiones/categorias` (C/U/D) | `POST`/`PUT`/`DEL` | ✅ | ✅ | ✅ | ❌ | Gestión de taxonomía de actividades. |
| `/api/sesiones/actividades` | `GET` | ✅ | ✅ | ✅ | ✅ | Biblioteca de ejercicios y tareas. |
| `/api/sesiones/actividades` (C/U/D) | `POST`/`PUT`/`DEL` | ✅ | ✅ | ✅ | ❌ | Creación y edición de actividades. |
| `/api/sesiones/actividades/:act/asignar/:nin` | `POST` | ✅ | ✅ | ✅ | ❌ | Prescripción de actividad a paciente. |
| `/api/sesiones/ninos/:nin/asignaciones` | `GET` | ✅ | ✅ | ✅ | ✅ | Lista de tareas asignadas al niño. |
| `/api/sesiones/asignaciones/:acn/estado` | `PATCH` | ✅ | ✅ | ✅ | ✅ | Marcar actividad como Completada/En curso. |
| `/api/sesiones/asignaciones/:acn` | `DELETE` | ✅ | ✅ | ✅ | ❌ | Desasignar actividad terapéutica. |

---

## ⌚ 4. Monitoreo IoT y Telemetría (`/api/monitoreo`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/monitoreo/telemetria` | `POST` | ✅ | ✅ | ✅ | ✅ | Doble rate limit: 300 req/min IP, 120 niño. |
| `/api/monitoreo/simular-estado` | `GET` / `POST` | ✅ | ✅ | ✅ | ✅ | Control del emulador de crisis sensorial. |

---

## 🩺 5. Módulo Clínico Especialista (`/api/especialista`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/especialista/soap/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ❌ | Consulta de notas SOAP confidenciales. |
| `/api/especialista/soap` | `POST` | ❌ | ❌ | ✅ | ❌ | Creación de nota clínica (Subjetivo-Objetivo-Análisis-Plan). |
| `/api/especialista/indicaciones/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ✅ | Prescripciones e indicaciones médicas. |
| `/api/especialista/indicaciones` | `POST` | ❌ | ❌ | ✅ | ❌ | Emisión de pauta clínica por terapeuta. |
| `/api/especialista/indicaciones/:id/leer` | `PATCH` | ✅ | ✅ | ✅ | ✅ | Confirmación de lectura de familiar. |
| `/api/especialista/incidentes/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ✅ | Registro paginado de crisis/incidentes. |
| `/api/especialista/incidentes/:nin_codi` | `POST` | ❌ | ❌ | ✅ | ❌ | Registro de evento disruptivo/detonante. |
| `/api/especialista/alertas/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ✅ | Alertas fisiológicas IoT paginadas. |

---

## 🎯 6. Metas PEI SMART (`/api/metas`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/metas/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ✅ | Plan Educativo Individualizado activo. |
| `/api/metas` | `POST` | ✅ | ✅ | ✅ | ❌ | Creación de meta conductual/cognitiva. |
| `/api/metas/:meta_codi/ensayo` | `POST`/`PATCH` | ✅ | ✅ | ✅ | ❌ | Registro de ensayo Discreto (DTT). |

---

## 📝 7. Consentimiento Informado (`/api/consentimiento`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/consentimiento/aceptar` | `POST` | ❌ | ❌ | ❌ | ✅ | Firma digital vinculante de consentimiento. |
| `/api/consentimiento/estado/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ✅ | Estado de validez y vigencia de firma. |
| `/api/consentimiento/mis-consentimientos` | `GET` | ❌ | ❌ | ❌ | ✅ | Documentos firmados por el representante. |
| `/api/consentimiento/historial` | `GET` | ✅ | ✅ | ✅ | ✅ | Auditoría legal de consentimientos. |

---

## 📊 8. Reportería y Evolución (`/api/reportes`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/reportes/historial/:nin_codi` | `GET` | ✅ | ✅ | ✅ | ✅ | Resumen de sesiones y evolución. |
| `/api/reportes/alertas-representante` | `GET` | ❌ | ❌ | ❌ | ✅ | Alertas recientes de niños a su cargo. |
| `/api/reportes/evolucion-representante` | `GET` | ❌ | ❌ | ❌ | ✅ | Gráficos diarios de calma vs agitación. |
| `/api/reportes/historial-completo/:nin` | `GET` | ✅ | ✅ | ✅ | ✅ | Historial clínico 360° paginado. |
| `/api/reportes/alertas/:ale/feedback` | `POST` | ✅ | ✅ | ✅ | ✅ | Retroalimentación del padre sobre crisis. |
| `/api/reportes/indicacion` | `POST` | ❌ | ❌ | ✅ | ❌ | Registro rápido de recomendación. |

---

## 🏢 9. Administración Institucional (`/api/admin`)

| Endpoint / Recurso | Método | ROL_DIR | ROL_ADM | ROL_ESP | ROL_REP | Notas / Restricciones |
|---|---|:---:|:---:|:---:|:---:|---|
| `/api/admin/health` | `GET` | ❌ | ✅ | ❌ | ❌ | Telemetría interna de infraestructura. |
| `/api/admin/metricas` | `GET` | ❌ | ✅ | ❌ | ❌ | KPI Dashboard (niños, horas, terapeutas). |
| `/api/admin/catalogos` | `GET` | ❌ | ✅ | ❌ | ❌ | Instituciones y especialidades. |
| `/api/admin/ninos` | `GET` | ❌ | ✅ | ❌ | ❌ | Padrón global institucional de niños. |
| `/api/admin/especialistas` | `GET` | ❌ | ✅ | ❌ | ❌ | Plantilla de terapeutas y licencias. |
| `/api/admin/asignaciones` | `GET` | ❌ | ✅ | ❌ | ❌ | Vínculos niño-terapeuta. |
| `/api/admin/users` / `/usuarios` | `GET` | ❌ | ✅ | ❌ | ❌ | Padrón paginado de cuentas de usuario. |
| `/api/admin/auditoria` | `GET` | ❌ | ✅ | ❌ | ❌ | Registro paginado de trazas de seguridad. |
| `/api/admin/users/:usu/estado` | `PATCH` | ❌ | ✅ | ❌ | ❌ | Activar / Suspender usuario. |
| `/api/admin/users/:usu/password` | `POST` | ❌ | ✅ | ❌ | ❌ | Reseteo administrativo de clave. |
| `/api/admin/representantes/:usu` | `PUT` | ❌ | ✅ | ❌ | ❌ | Modificación de datos de familiar. |
| `/api/admin/ninos/:nin/foto` | `PATCH` | ❌ | ✅ | ❌ | ❌ | Actualización de foto de perfil del niño. |
| `/api/admin/ninos/:nin` | `PATCH` | ❌ | ✅ | ❌ | ❌ | Edición de datos filiatorios del menor. |
| `/api/admin/ninos/:nin/documentos` | `POST` | ❌ | ✅ | ❌ | ❌ | Adjuntar evaluaciones o informes PDF. |
| `/api/admin/especialistas` (C/U/Estado) | `POST`/`PUT`/`PATCH` | ❌ | ✅ | ❌ | ❌ | Gestión de especialistas clínicos. |
| `/api/admin/asignar` | `POST` | ❌ | ✅ | ❌ | ❌ | Asignar paciente a terapeuta. |
| `/api/admin/asignaciones/:asi/estado` | `PATCH` | ❌ | ✅ | ❌ | ❌ | Concluir o pausar asignación clínica. |
| `/api/admin/instituciones/:ins` | `PUT` | ❌ | ✅ | ❌ | ❌ | Actualizar RIF y razón social. |
| `/api/admin/especialidades` (C/U/Estado)| `POST`/`PUT`/`PATCH` | ❌ | ✅ | ❌ | ❌ | Gestión de catálogo de especialidades. |
| `/api/admin/reportes/programados` | `GET` / `POST` | ❌ | ✅ | ❌ | ❌ | Configurar envío periódico de reportes. |
| `/api/admin/reportes/enviar-ahora` | `POST` | ❌ | ✅ | ❌ | ❌ | Disparador manual de informe por correo. |
