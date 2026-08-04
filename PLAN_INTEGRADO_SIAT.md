# Plan Integrado de Mejoras — SIAT (Backend + Frontend)

> Hoja de ruta unificada para 12 semanas (3 meses) antes del lanzamiento.
> Integra el plan del backend (`PLAN_MEJORA_BACKEND.md`) y el del frontend (`PLAN_DE_IMPLEMENTACION.md`).
> Marco la coordinación entre ambas partes donde tocan el mismo contrato, para que no choquen.

**Nota de hardware:** la telemetría sigue 100% en simulación (`wearable_simulator.js` + `forzarCrisisInmediata`/`forzarCalmaInmediata`) hasta que llegue el **LilyGO T-Watch 2020 v3**. Se mantiene una capa de abstracción de dispositivo (misma API `procesarTelemetria`) para migrar a hardware real sin tocar el resto.

**Estado (2026-08-04):** Fase 0 y Fase 1 **completas** (backend y frontend). Sprint en curso: **Acceso rápido con huella (WebAuthn)** — backend terminado, frontend pendiente. Fases 2 y 3 pendientes.

---

## 0. Reglas para evitar choques entre frontend y backend

Toda mejora que cambie el *contrato* (API REST, eventos Socket.io, forma de los datos) debe respetar estas reglas para no romper el otro lado:

1. **Nunca cambiar formato de respuesta o evento sin coordinación en el mismo sprint.** Los puntos que tocan dos lados están marcados con 🔗 y agendados en la *misma línea de tiempo*.
2. **El payload es el contrato.** Si se toca `new_alert`/`new_telemetry` (backend) y su consumidor (frontend) deben hacerse en la misma iteración, con el formato acordado por escrito antes de codificar.
3. **API versionada en lo posible** (`/api/v1/...`) para cambios futuros sin romper clientes.
4. **Un solo fuente de verdad para CORS, errores y eventos.** Código compartido y documentado.

---

## 1. Fase 0 — Blindaje y estabilidad (Semanas 1–2)

**Objetivo:** que nada falle ni filtre datos en producción. Sin cambios de contrato → sin riesgo de choque.

### Backend
- [x] B0.1 **Bugfix telemetría**: corregir `.substring(3)` en `monitoreo.service.js:151` (formatea mal la hora). Usar `Intl.DateTimeFormat`. *(Hecho: se usa `Intl.DateTimeFormat('es-ES', { hour12: false })`.)*
- [x] B0.2 **Secrets/entorno**: `JWT_SECRET` y passwords sólidos; ignorar `.env` (git). Solo variables de entorno del hosting. *(Hecho: `.env` fuera de git, `.env.example` con placeholders.)*
- [x] B0.3 **Migraciones versionadas**: pasar de `prisma db push` a `prisma migrate dev`. *(Hecho. Nota: el baseline `20260804000000_init` y `20260804120000_add_passkeys` se registraron a mano en `_prisma_migrations`; el flujo está documentado en `scratch/apply_passkeys.js` y en la nota de migraciones de la sección 8.)*
- [x] B0.4 **IDs robustas**: usar `nanoid` (ya instalado) o UUID; eliminar `generateId` artesanal e `idGenerator.js`. *(Hecho: `src/utils/idGenerator.js` mantiene generación `nanoid`; monitoreo/sesiones/ninos/auth lo usan.)*
- [x] B0.5 **Desacoplar CORS** en un helper compartido (`app.js` + `index.js`). *(Hecho: `src/middleware/cors.js`.)*
- [x] B0.6 **`errorHandler`**: no filtrar detalles internos; mapear códigos Prisma P2000/P2003/P2010. *(Hecho: `src/middleware/errorHandler.js`, oculta internos en prod.)*

### Frontend
- [x] F0.1 **Corregir bugs críticos** (punto 1 del plan frontend): `TrendingUp is not defined`, agenda en blanco, validación ADMIN, gráfica de latencia. *(Hecho: fix de `UserProfile.jsx` y endpoint nuevo `GET /api/admin/health` con `latencyHistory`.)*
- [x] F0.2 **ESLint + Husky pre-commit** activos (ESLint ya instalado; falta pre-commit que impida commits con errores de sintaxis). *(Hecho: husky + lint-staged + prettier, hook `.husky/pre-commit`.)*

### Coordinación F0
- Ningún cambio de contrato. Bugfixes aislados por lado → sin conflictos.

---

## 2. Fase 1 — Fiabilidad y pruebas (Semanas 3–6)

**Objetivo:** cubrir el sistema con pruebas y hacer confiables los canales críticos (correo, tiempo real, telemetría).

### Backend
- [x] B1.1 **Suite de tests (Jest + supertest)**: Auth, Sesiones, Ninos, Monitoreo, Reportes. *(Hecho: 23 tests en 5 suites; hoy 35 tests en 6 suites con passkey.)*
- [x] B1.2 **Conectar SMTP real**: migrar la "simulación de correo" a envíos reales (alertas, recuperación de contraseña, invitaciones) con cola/retry. *(Hecho: `monitoreo.service.js` envía por SMTP real vía `emailService.sendEmail` con template `alert-notification`; fix `secure: String(port)==='465'`; guard si falta SMTP.)*
- [x] B1.3 🔗 **🔗 Socket.io robusto + reescucha de salas** (reconexión, heartbeat, recalcular rooms en reconexión y por cambios de asignación). *Acordar contrato de eventos con F1.3.* *(Hecho en `index.js`: heartbeat 25s/10s, `syncRooms`, eventos `join_child`/`leave_child`/`resync_rooms`, control por rol con `roomsForUser`/`canAccessChild`.)*
- [x] B1.4 🔗 **🔗 Validación Zod de telemetría** y mover `ale_meto`/umbrales a configuración. *Si cambia el payload, coordinarse con F1.3.* *(Hecho: `monitoreo.schema.js` valida `tel_mov`/`tel_stress` con rangos, `req.validatedBody` en `validate.middleware.js`, detección automática de umbral `tc_umbra`.)*

### Frontend
- [x] F1.1 **Tests (Vitest + Testing Library)**: Auth, RBAC, telemetría, gráficas. *(Hecho: Vitest configurado, 7 tests en 2 archivos.)*
- [x] F1.2 **Axios timeout + manejo de errores**: 30s + reintentos + indicador de carga (ServerWarmup). *(Hecho: `src/api/axios.js` con reintentos backoff para 502/503/504.)*
- [x] F1.3 🔗 **🔗 WebSockets con reconexión robusta + indicador Conectado/Reconectando + cola de mensajes.** *PAR con B1.3; mismo sprint y mismo formato de eventos.* *(Hecho: `src/hooks/socket.js` con reconexión exponencial, `onSocketStateChange`, listeners persistentes, `resync_rooms`/`join_child`.)*
- [ ] F1.4 **UX autenticación/registro**: simplificar textos, validación Zod en tiempo real, feedback de contraseña.

### Coordinación F1
- **B1.3 ↔ F1.3** deben ejecutarse juntos: el contrato de eventos Socket.io (nombres, payloads, IDs de sala `child:{nin_codi}`) se fija por escrito antes de codificar.
- **B1.4 ↔ F1.3**: si la validación cambia campos de `new_alert`/`new_telemetry`, los consumidores se actualizan en el mismo sprint.

---

## 3. Sprint en curso — Acceso rápido con huella (WebAuthn/passkeys)

**Decisión tomada:** opción **(a)**: el enrollamiento de huella ocurre **solo tras un login exitoso con contraseña**, y está disponible para todos los roles (ROL_ADM, ROL_ESP, ROL_REP). El acceso rápido (login con huella) es público y usa credenciales *discoverable*.

### Backend — COMPLETO
- [x] Modelo `tm_passkeys` en `prisma/schema.prisma` (pk_id PK, usu_codi FK → `tm_usuar`, pk_nomb, pk_public_key, pk_transports, pk_counter, pk_created, pk_last_used) + relación en `tm_usuar`.
- [x] Migración `prisma/migrations/20260804120000_add_passkeys` aplicada en Neon y baseline registrado (`npx prisma migrate status` → up to date; `npx prisma generate`).
- [x] `@simplewebauthn/server` v13.3.2 instalado (carga en CommonJS vía `require(esm)` en Node 24; conversiones base64url con `Buffer`, ya que v13 no exporta `isoBase64URL`).
- [x] Vars `WEBAUTHN_RP_ID`/`WEBAUTHN_RP_NAME`/`WEBAUTHN_ORIGIN` en `src/config/env.js` y `.env.example` (defaults `localhost`, `SIAT`, `http://localhost:5173`).
- [x] Módulo `src/modules/passkey/` (service + controller + schema Zod + routes), montado en `/api/auth`:
  - `GET /api/auth/passkey` (auth) — listar huellas.
  - `DELETE /api/auth/passkey/:pk_id` (auth, solo propias).
  - `POST /api/auth/passkey/register/start|complete` (auth) — enrolar.
  - `POST /api/auth/passkey/login/start|complete` (público) — acceso rápido.
- [x] Store de desafíos en memoria (TTL 5 min) con `clearChallenges()` para tests. **Pendiente a futuro:** mover a Redis en Fase 3 (multi-instancia).
- [x] Tests unitarios del servicio (`passkey.service.test.js`): 12 tests. Suite completa: **6 suites, 35 tests OK**.

### Frontend — PENDIENTE (siguiente sesión)
- [ ] F2-PK.1 Instalar `@simplewebauthn/browser` en `SIAT/`.
- [ ] F2-PK.2 Botón "Acceso rápido con huella" en `Login.jsx`: `passkey/login/start` → `startAuthentication(options)` → `passkey/login/complete` → guardar token.
- [ ] F2-PK.3 Enrolar huella tras login con contraseña (pantalla/aviso en login o perfil): `passkey/register/start` → `startRegistration(options)` → `passkey/register/complete`; listar y eliminar desde el perfil.
- [ ] F2-PK.4 Indicar en UI que el login con huella solo funciona en la misma RP/origin (`WEBAUTHN_ORIGIN`) y que `localhost` requiere HTTPS/`localhost` del navegador (WebAuthn requiere contexto seguro).

### Contrato (para no chocar)
- Los endpoints aceptan el `RegistrationResponseJSON`/`AuthenticationResponseJSON` que produce `@simplewebauthn/browser` (campo `credential` en el body).
- El login por huella devuelve el mismo `{ token, user }` que el login por contraseña.

---

## 4. Fase 2 — Endurecimiento de producción (Semanas 7–9)

**Objetivo:** rendimiento, seguridad y calidad de datos.

### Backend
- [ ] B2.1 **Observabilidad**: logging estructurado (pino/winston); opcional Sentry.
- [ ] B2.2 **Auditoría**: conectar `tr_audito` (logins, cambios de umbral, alta/baja de pacientes, roles).
- [ ] B2.3 🔗 **🔗 Rendimiento de datos**: índices (tr_telem, tr_alert, tc_umbra), **paginación** en listados, agregación/poda de telemetría (job diario). *Definir contrato de paginación con F2.1.*
- [ ] B2.4 🔗 **🔗 Manejo de sesión**: rotación/expiración de refresh token (`usu_rtok`/`usu_rexp`). *PAR con F2.1 (interceptor de auth).*
- [ ] B2.5 **CI/CD**: GitHub Actions (lint + tests + build + deploy).
- [ ] B2.6 **Passkeys en multi-instancia**: mover el store de desafíos en memoria a Redis/BD.

### Frontend
- [ ] F2.1 🔗 **🔗 TanStack Query (React Query)** para caché/paginación de pacientes e historial. *Usa el contrato de paginación definido en B2.3 y el manejo de token de B2.4.*
- [ ] F2.2 **Refactor de GlobalState (588 líneas)** en contextos separados: Auth, Clinical, Hardware, UI.
- [ ] F2.3 **RBAC declarativo** (`src/config/rbac.js`) en lugar del `switch` en App.jsx.
- [ ] F2.4 **Memorización/rendimiento**: React.memo, useMemo, useCallback en tablas y gráficas.

### Coordinación F2
- **B2.3 ↔ F2.1**: el frontend asume el contrato de paginación (page/pageSize/total, cursor si aplica) que defina el backend.
- **B2.4 ↔ F2.1**: si cambia la estrategia de tokens/refresh, el interceptor de axios del frontend se actualiza en el mismo sprint.
- **F2.2 (refactor)**: hacerlo *después* de F2.1 para no refactorizar datos que ya pasan por React Query.

---

## 5. Fase 3 — Calibración, portabilidad y lanzamiento (Semanas 10–12)

**Objetivo:** preparar la carga, los dispositivos y el despliegue final.

### Backend
- [ ] B3.1 **Pruebas de carga**: extender `wearable_simulator.js` para simular múltiples wearables (concurrencia).
- [ ] B3.2 **Ajustar rate limiters**: la telemetría del wearable no pasa por el limitador global.
- [ ] B3.3 **Backups y restauración**: política en Neon + drill documentado.
- [ ] B3.4 **Runbook/Go-Live**: variables, migraciones, checklist post-deploy.
- [ ] B3.5 🔗 **🔗 Endpoints de reportes** listos y documentados para F3.2.

### Frontend
- [ ] F3.1 **PWA** (vite-plugin-pwa): service worker, manifiesto, soporte offline.
- [ ] F3.2 🔗 **🔗 Reportes avanzados + exportación programada**: consume los endpoints de B3.5 (dashboard embebido, comparativo multi-paciente, envío por email).
- [ ] F3.3 **TypeScript**: migración progresiva (capa de datos → hooks → contextos → UI crítica).
- [ ] F3.4 **i18n** (react-i18next) e **Storybook** (documentación de componentes).
- [ ] F3.5 **Hardware**: preparar la capa de abstracción del T-Watch 2020 v3 para cuando llegue (aún sin romper el simulador).

### Coordinación F3
- **B3.5 ↔ F3.2**: reportes avanzados requieren que el backend exponga los datos; definir juntos el contrato del reporte (rango, métricas, exportación).
- **B3.1/3.2 ↔ F3.1 (PWA)**: la PWA cachea `/api/*`; asegurar que telemetría/push no se cacheen y que el rate limiter no bloquee el sleep/wake de Render.

---

## 6. Mapa de dependencias (quién espera a quién)

| Tarea | Depende de | Para no chocar |
|-------|-----------|----------------|
| B1.3 / F1.3 (Socket.io) | — | Ejecutar juntas, mismo contrato |
| B1.4 (validación telemetría) | F1.3 | Acordar payload antes |
| F2-PK (frontend passkeys) | módulo backend passkey | Usar el contrato de `/api/auth/passkey/*` (apartado 3) |
| F2.1 (React Query) | B2.3 (paginación), B2.4 (token) | Usar contratos de B2.3/B2.4 |
| F2.2 (refactor GlobalState) | F2.1 | Antes de que los datos pasen por Query |
| F3.2 (reportes) | B3.5 (endpoints) | Definir contrato de reporte juntos |
| B0.3 (migraciones) | — | Método temprano, antes de congelar esquema |

---

## 7. Orden recomendado y checklist de lanzamiento

**Secuencia:** `Fase 0` → `Fase 1` → **Sprint WebAuthn** → `Fase 2` → `Fase 3`.

**Primeros no-negociables:** B0.3 (migraciones), B1.1/F1.1 (tests), y la pareja B1.3/F1.3 (WebSockets). Sin ellos, el resto es una apuesta.

### Checklist pre-Go-Live (final de la semana 12)
- [ ] Variables de entorno documentadas y en el hosting, sin secretos en git.
- [ ] Migraciones Prisma aplicadas en producción y backup verificado.
- [ ] Tests backend y frontend pasando en CI.
- [ ] Telemetría entregada vía API `procesarTelemetria` (simulador) sin bloqueos de rate limiter.
- [ ] Notificaciones Socket.io (salas `child:{nin_codi}`) horas de recarga correctas.
- [ ] Correo (alertas/recuperación) verificado con envío real.
- [ ] Auditoría (`tr_audito`) registrando acciones críticas.
- [ ] PWA instalable y datos clave visibles offline.
- [ ] Runbook de despliegue completado y drill de restauración ejecutado.
- [ ] Passkeys: enrolar + acceder por huella verificado en el hosting (HTTPS; `WEBAUTHN_ORIGIN` correcto).

---

## 8. Del backlog del plan frontend (puntos 1–15) → fase asignada

| Punto del plan frontend | Fase |
|------------------------|------|
| 1. Bugs críticos | F0 |
| 2. Tests Vitest | F1 |
| 3. Refactor GlobalState | F2 |
| 4. Axios timeout | F1 |
| 5. TypeScript | F3 |
| 6. TanStack Query | F2 |
| 7. WebSockets robustos | F1 |
| 8. PWA | F3 |
| 9. Memorización | F2 |
| 10. RBAC declarativo | F2 |
| 11. i18n | F3 |
| 12. Storybook | F3 |
| 13. Reportes avanzados | F3 |
| 14. UX autenticación | F1 |
| 15. ESLint + Husky | F0 |

*Los puntos marcados 🔗 en el documento tienen contraparte backend ejecutada en la misma fase.*

---

## 9. Notas operativas (para retomar el trabajo)

**Backend (`Backend SIAT/`):**
- Migraciones Prisma: `prisma migrate dev` puede fallar al no poder diffear contra el esquema existente; el flujo seguro es escribir `migration.sql` a mano y registrarlo insertando en `_prisma_migrations` (patrón en `scratch/apply_passkeys.js`). Recordatorio: **no generar migraciones con redirección de PowerShell `>`** (escribe UTF-16); usar la herramienta de escritura UTF-8 y ejecutar `npx prisma generate`.
- `prisma migrate status` debe decir "Database schema is up to date!"; `prisma generate` tras cada cambio de `schema.prisma`.
- Tests: `npx jest` (23→35 tests, 6 suites). Backend **no** tiene ESLint (eso es solo del frontend).
- Login: `auth.service.js` devuelve `{ token, user }` con JWT `expiresIn: '24h'`; passkeys reutilizan el mismo contrato (`passkey.service.js::buildSession`).
- Prisma client no ejecuta varias sentencias en un `$executeRawUnsafe`; dividir por `;` (ver `apply_passkeys.js`).

**Frontend (`SIAT/`):**
- Tests: Vitest. Lint+husky: `npx lint-staged` en pre-commit; ESLint requiere que `CustomEvent` esté en globals.
- Axios: `src/api/axios.js` con reintentos backoff. WS: `src/hooks/socket.js`.
- Retomar con: `F2-PK.1` a `F2-PK.4` de la sección 3, luego F1.4 y Fase 2.
