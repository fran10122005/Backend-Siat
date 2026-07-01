
# Plan de Implementación - Backend SIAT

**Versión:** 1.0  
**Fecha:** Junio 2026  
**Proyecto:** Sistema de Monitoreo y Atención Temprana (SIAT)

---

## Índice

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Fase 1: Correcciones Críticas de Seguridad](#2-fase-1-correcciones-críticas-de-seguridad)
3. [Fase 2: Mejoras en Calidad de Código](#3-fase-2-mejoras-en-calidad-de-código)
4. [Fase 3: Base de Datos y Performance](#4-fase-3-base-de-datos-y-performance)
5. [Fase 4: Pruebas y Documentación](#5-fase-4-pruebas-y-documentación)
6. [Priorización y Esfuerzo Estimado](#6-priorización-y-esfuerzo-estimado)

---

## 1. Resumen Ejecutivo

Este plan describe las acciones necesarias para llevar el backend SIAT a un nivel de producción seguro, mantenible y performante. Se identificaron **22 hallazgos** organizados en 4 fases de implementación.

### Stack actual
- **Runtime:** Node.js + Express 5
- **Base de datos:** PostgreSQL + Prisma ORM
- **Autenticación:** JWT + bcrypt
- **Tiempo real:** Socket.io
- **Validación:** Zod
- **Correos:** Nodemailer + Handlebars

### Prioridades
1. **Seguridad** (Fase 1) — Crítico, debe hacerse antes de cualquier despliegue
2. **Calidad de código** (Fase 2) — Importante para mantenibilidad
3. **Base de datos** (Fase 3) — Preventivo
4. **Pruebas** (Fase 4) — Continuo

---

## 2. Fase 1: Correcciones Críticas de Seguridad

### 1.1 Rotación de credenciales expuestas

**Problema:** El archivo `.env` contiene credenciales reales de producción (DB, JWT, SMTP) y está incluido en el repositorio.

**Acciones:**

| # | Acción | Responsable | Estatus |
|---|--------|-------------|---------|
| 1.1.1 | Rotar la contraseña de la base de datos PostgreSQL en Neon | Admin BD | ⬜ |
| 1.1.2 | Cambiar el JWT_SECRET por un valor generado criptográficamente (`openssl rand -hex 64`) | Backend | ⬜ |
| 1.1.3 | Revocar y regenerar la contraseña de aplicación de Gmail SMTP | Admin | ⬜ |
| 1.1.4 | Agregar `.env` al `.gitignore` (ya está, verificar que no haya commits previos con `.env`) | Backend | ⬜ |
| 1.1.5 | Usar `git-secrets` o similar para prevenir futuras fugas | DevOps | ⬜ |

**Criterio de aceptación:** Todas las credenciales anteriores son revocadas. El `.env` contiene claves nuevas. No hay credenciales reales en el historial de git.

---

### 1.2 Corrección de CORS y seguridad HTTP

| # | Acción | Archivos | Estatus |
|---|--------|----------|---------|
| 1.2.1 | Restringir `origin` de Socket.io a dominios específicos (no `'*'`) | `index.js:289` | ⬜ |
| 1.2.2 | Agregar middleware `helmet` para headers de seguridad HTTP | `app.js` | ⬜ |
| 1.2.3 | Sincronizar configuración CORS de Express con la de Socket.io | `app.js`, `index.js` | ⬜ |

---

### 1.3 Eliminación de IDOR (Insecure Direct Object Reference)

**Estrategia:** Agregar verificación de propiedad/permiso en cada endpoint que accede a recursos por ID.

**Endpoints afectados:**

| Ruta | Módulo | Verificación requerida |
|------|--------|----------------------|
| `GET /api/ninos/:nin_codi/ficha` | ninos | REP → solo su hijo; ESP → solo asignados |
| `PUT /api/ninos/:nin_codi/ficha` | ninos | ESP → solo asignados |
| `POST /api/ninos/:nin_codi/umbrales` | ninos | ESP → solo asignados |
| `GET /api/metas/:nin_codi` | metas | REP → solo su hijo; ESP → solo asignados |
| `GET /api/reportes/historial/:nin_codi` | reportes | REP → solo su hijo; ESP → solo asignados |
| `GET /api/reportes/historial-completo/:nin_codi` | reportes | REP → solo su hijo; ESP → solo asignados |
| `GET /api/sesiones/:nin_codi` | sesiones | REP → solo su hijo; ESP → solo asignados |

**Acción:** Crear un helper reutilizable `verifyChildAccess(usu_codi, rol_codi, nin_codi)` que verifique:
- `ROL_REP`: `tm_repre.nin_codi === nin_codi`
- `ROL_ESP`: existe `tc_asign` activa con ese `nin_codi`
- `ROL_ADM`/`ROL_DIR`: acceso total

**Criterio de aceptación:** Un REP no puede ver datos de otro niño. Un ESP no puede ver datos de niños no asignados.

---

### 1.4 Protección de contraseñas y tokens

| # | Acción | Archivos | Estatus |
|---|--------|----------|---------|
| 1.4.1 | Hashear el reset token con SHA-256 antes de guardarlo en `usu_rtok` | `auth.service.js` | ⬜ |
| 1.4.2 | NO incluir la contraseña en los correos de invitación. Enviar solo enlace para establecerla | `templates/*.hbs` | ⬜ |
| 1.4.3 | Eliminar `console.log` de contraseñas generadas | `ninos.service.js:228` | ⬜ |
| 1.4.4 | Agregar rate limiting a `forgot-password` y `reset-password` | `auth.routes.js` | ⬜ |
| 1.4.5 | Agregar rate limiting al endpoint `/complete-invitation` | `auth.routes.js` | ⬜ |

---

## 3. Fase 2: Mejoras en Calidad de Código

### 2.1 Centralizar generación de IDs

**Problema:** Existen 4+ implementaciones diferentes para generar IDs.

**Acción:**

| # | Acción | Archivos | Estatus |
|---|--------|----------|---------|
| 2.1.1 | Mantener solo `utils/idGenerator.js` con nanoid como única fuente | Todos los módulos | ⬜ |
| 2.1.2 | Reemplazar todos los `crypto.randomBytes(...)` inline por `generateId(prefix, length)` | `auth.service.js`, `citas.controller.js`, `metas.controller.js`, `ninos.service.js`, `monitoreo.service.js`, `reportes.controller.js`, `sesiones.service.js` | ⬜ |

---

### 2.2 Estandarizar capa de servicios

**Problema:** Algunos módulos tienen service layer y otros no.

| # | Acción | Módulos | Estatus |
|---|--------|---------|---------|
| 2.2.1 | Crear `citas.service.js` y mover lógica de negocio del controller | `citas/` | ⬜ |
| 2.2.2 | Crear `metas.service.js` y mover lógica de negocio del controller | `metas/` | ⬜ |
| 2.2.3 | Crear `reportes.service.js` y mover lógica de negocio del controller | `reportes/` | ⬜ |

---

### 2.3 Estandarizar manejo de errores

| # | Acción | Estatus |
|---|--------|---------|
| 2.3.1 | Usar `AppError` en todos los lugares donde se lance error con status code | ⬜ |
| 2.3.2 | Eliminar `Object.assign(new Error(...), { status })` en `auth.controller.js` | ⬜ |
| 2.3.3 | En services, siempre retornar errores mediante `throw new AppError(msg, code)` | ⬜ |

---

### 2.4 Agregar validación Zod faltante

| Ruta | Módulo | Estatus |
|------|--------|---------|
| `GET /sesiones/actividades` | sesiones | ⬜ |
| `POST /sesiones/actividades` | sesiones | ⬜ |
| `POST /reportes/indicacion` | reportes | ⬜ |
| `POST /reportes/alertas/:ale_codi/feedback` | reportes | ⬜ |
| `PATCH /admin/users/:usu_codi/estado` | admin | ⬜ |
| `GET /admin/auditoria` | admin | ⬜ |

---

### 2.5 Correcciones específicas

| # | Acción | Archivo | Estatus |
|---|--------|---------|---------|
| 2.5.1 | Corregir `secure: process.env.SMTP_PORT == 465 \|\| true` → `secure: parseInt(process.env.SMTP_PORT) === 465` | `email.service.js:1105` | ⬜ |
| 2.5.2 | Eliminar exports inválidos `createInstitucionSchema`, `toggleInstitucionSchema` | `admin.schema.js:1630` | ⬜ |
| 2.5.3 | Reemplazar `requireAdmin` middleware por `requireRole(['ROL_ADM'])` | `admin.routes.js` | ⬜ |
| 2.5.4 | Eliminar hardcodeo de `ins_codi = 'I001'` — obtener del usuario autenticado | `admin.controller.js:1459`, `admin.service.js:1681` | ⬜ |

---

### 2.6 Refactor módulo monitoreo

| # | Acción | Estatus |
|---|--------|---------|
| 2.6.1 | Mover `simulatedCrisisMode` de memoria local a Redis o tabla en BD para persistencia | ⬜ |
| 2.6.2 | Enviar correo real al representante cuando se genera una alerta (reemplazar el `console.log` actual) | ⬜ |

---

## 4. Fase 3: Base de Datos y Performance

### 3.1 Esquema de base de datos

| # | Acción | Tabla/Campo | Estatus |
|---|--------|-------------|---------|
| 3.1.1 | Renombrar `tm_activ.rep_codi` → `tm_activ.cat_codi` (nombre engañoso) | `tm_activ` | ⬜ |
| 3.1.2 | Agregar `@@index` en todas las foreign keys (`nin_codi`, `esp_codi`, `usu_codi`, `ses_codi`) | Múltiples tablas | ⬜ |
| 3.1.3 | Cambiar `tr_telem.tel_regi` de `Float` a `Int` (BPM es entero) | `tr_telem` | ⬜ |
| 3.1.4 | Revisar y unificar longitudes de IDs a `VarChar(10)` en toda la base | Múltiples tablas | ⬜ |
| 3.1.5 | Documentar el enum `gender_enum` (`M`/`F`) con comentarios en el schema | `schema.prisma` | ⬜ |

---

### 3.2 Performance

| # | Acción | Estatus |
|---|--------|---------|
| 3.2.1 | Implementar paginación (cursor o offset) en todos los GET list: `GET /admin/ninos`, `GET /admin/especialistas`, `GET /admin/asignaciones`, `GET /admin/users`, `GET /admin/auditoria`, `GET /ninos/mis-ninos`, `GET /sesiones/:nin_codi` | ⬜ |
| 3.2.2 | Optimizar consultas usando `select` explícito en vez de `include` completo donde no se necesiten todos los campos | ⬜ |
| 3.2.3 | Agregar límite `take` por defecto en endpoints de listado | ⬜ |

---

## 5. Fase 4: Pruebas y Documentación

### 4.1 Tests automatizados

**Framework:** Jest + Supertest (ya instalados)

| # | Prioridad | Módulo | Estatus |
|---|-----------|--------|---------|
| 4.1.1 | Crítica | **Auth** — login, registro, forgot/reset password, invitación | ⬜ |
| 4.1.2 | Alta | **Admin** — CRUD especialistas, asignaciones, métricas | ⬜ |
| 4.1.3 | Alta | **Ninos** — registro, bitácora, ficha clínica, umbrales | ⬜ |
| 4.1.4 | Media | **Sesiones** — inicio, cierre, listado | ⬜ |
| 4.1.5 | Media | **Monitoreo** — telemetría, alertas, simulación | ⬜ |
| 4.1.6 | Media | **Citas** — solicitud, agenda, cambio de estado | ⬜ |
| 4.1.7 | Media | **Metas** — creación, ensayo, progreso | ⬜ |
| 4.1.8 | Baja | **Reportes** — historial, feedback, indicaciones | ⬜ |

**Cobertura objetivo:** Mínimo 70% en módulos críticos (auth, admin, ninos).

---

### 4.2 Documentación

| # | Acción | Estatus |
|---|--------|---------|
| 4.2.1 | Configurar Swagger/OpenAPI con `swagger-ui-express` (dependencia ya instalada) | ⬜ |
| 4.2.2 | Documentar todas las rutas con schemas de request/response | ⬜ |
| 4.2.3 | Agregar comentarios JSDoc en funciones principales | ⬜ |

---

## 6. Priorización y Esfuerzo Estimado

### Matriz de prioridades

| Fase | Prioridad | Esfuerzo | Dependencias | Impacto |
|------|-----------|----------|--------------|---------|
| Fase 1 — Seguridad | **Crítica** | 2-3 días | Ninguna | Evita exposición de datos |
| Fase 2 — Calidad | Alta | 3-4 días | Fase 1 | Mantenibilidad |
| Fase 3 — BD/Perf | Media | 1-2 días | Fase 1 | Performance a futuro |
| Fase 4 — Pruebas | Alta | 4-5 días | Fase 2 (refactors) | Calidad y regresión |

### Orden sugerido de ejecución

```
Semana 1:  Fase 1 (seguridad) + Fase 3.1 (esquema BD)
Semana 2:  Fase 2 (calidad de código)
Semana 3-4: Fase 4 (pruebas)
Semana 4:  Fase 3.2 (performance) + 4.2 (documentación)
```

---

## Apéndice: Checklist rápido de despliegue seguro

- [ ] Credenciales rotadas, `.env` en `.gitignore`
- [ ] JWT_SECRET generado con `openssl rand -hex 64`
- [ ] CORS restringido a dominios conocidos
- [ ] Helmet configurado
- [ ] Rate limiting en auth endpoints
- [ ] Verificación de acceso en todos los endpoints IDOR
- [ ] Reset tokens hasheados en BD
- [ ] Contraseñas no se envían por correo
- [ ] No hay `console.log` de datos sensibles
- [ ] Pruebas de regresión pasando
