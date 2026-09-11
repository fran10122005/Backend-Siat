# 🛡️ Política de Seguridad, Autenticación y Privacidad de Datos — SIAT

Este documento establece las directrices de seguridad de la información, políticas de contraseñas, arquitectura criptográfica y normativas de privacidad clínica aplicadas en la plataforma **SIAT** (Sistema Inteligente de Acompañamiento Terapéutico).

---

## 🔑 1. Política Oficial de Contraseñas

Para resguardar el acceso a los datos clínicos y terapéuticos de los pacientes, todos los usuarios (`ROL_DIR`, `ROL_ADM`, `ROL_ESP`, `ROL_REP`) deben cumplir con las siguientes reglas al registrarse o cambiar credenciales:

| Parámetro | Requisito Obligatorio |
|---|---|
| **Longitud Mínima** | **8 caracteres** |
| **Complejidad de Caracteres** | Al menos **1 letra mayúscula** (`A-Z`) |
| | Al menos **1 número** (`0-9`) |
| **Hashing Criptográfico** | **bcrypt** con **10 rondas de salt** (resistencia contra ataques de diccionario y rainbow tables). |
| **Política de Bloqueo por Fuerza Bruta** | **Bloqueo tras 5 intentos fallidos** consecutivos en una ventana de 15 minutos mediante el middleware `authLimiter` y suspensión preventiva temporal. |
| **Tokens de Recuperación** | Hash criptográfico aleatorio con expiración improrrogable de **1 hora**. |

---

## 🚫 2. Datos que NO se Registran en Logs (Protección PII / PHI)

En estricto cumplimiento con normativas de protección de datos de salud de menores de edad (HIPAA / GDPR / Leyes Nacionales de Protección de Datos Personales), el sistema de registro estructurado (`src/utils/logger.js`) prohíbe taxativamente la inclusión de Información Personal Identificable (PII) o Información de Salud Protegida (PHI):

> [!CAUTION]
> **Queda estrictamente prohibido imprimir en logs (consola, archivos o agregadores):**
> 1. **Nombres y apellidos de pacientes** (niños o adolescentes bajo tratamiento).
> 2. **Diagnósticos clínicos**, niveles de soporte TEA o notas de evolución psicológica/médica.
> 3. **Valores biométricos específicos en texto plano** (ej. "BPM: 145" asociado a la identidad del menor).
> 4. **Direcciones residenciales** o ubicaciones geográficas de familiares.
> 5. **Números de teléfono**, cédulas de identidad o correos personales en trazas de depuración.
> 6. **Contraseñas en texto plano**, tokens JWT completos o payloads crudos de WebAuthn.

### Prácticas de Registro Permitidas:
- Utilizar exclusivamente identificadores sintéticos ofuscados o códigos técnicos (ej. `nin_codi: "N001"`, `usu_codi: "U012"`).
- Registrar únicamente el tipo de evento, código de error HTTP y tiempos de respuesta.
- En entornos de producción, la variable de entorno debe configurarse en:
  ```env
  LOG_LEVEL=info
  ```

---

## 👆 3. Autenticación Biométrica Passwordless (Passkeys / WebAuthn)

SIAT soporta autenticación FIDO2 mediante `@simplewebauthn/server`:
- **Claves Asimétricas Públicas/Privadas:** La clave privada biométrica nunca sale del enclave seguro del dispositivo del usuario (TouchID, FaceID, Windows Hello, Huella en Android).
- **Verificación Criptográfica:** El backend almacena únicamente la clave pública y el contador de firmas.
- **Requisito HTTPS Estricto:** WebAuthn queda inhabilitado automáticamente en cualquier origen que no sea HTTPS seguro (salvo `localhost` en desarrollo).

---

## 🌐 4. Seguridad en la Capa HTTP y Red

1. **HTTP Strict Transport Security (HSTS):**
   - Configurado con `maxAge: 31536000` (1 año) e `includeSubDomains: true`.
   - `preload: false` temporalmente hasta la consolidación del dominio final de producción.
2. **Control de Abuso y Rate Limiting Multi-Nivel:**
   - **Global:** 300 peticiones / 15 min por IP (`globalLimiter`).
   - **Autenticación:** 10 intentos / 15 min por IP (`authLimiter`).
   - **Telemetría IoT (Global por IP):** 300 peticiones / 1 min (`telemetriaIpLimiter`).
   - **Telemetría IoT (Por Paciente):** 120 peticiones / 1 min por `nin_codi` (`telemetriaNinoLimiter`).
3. **Trust Proxy:**
   - Activado `app.set('trust proxy', 1)` para resolver IPs reales detrás de Cloudflare, Railway o Nginx.
4. **Validación Estricta de Esquemas:**
   - Todas las entradas de datos son parseadas y sanitizadas mediante esquemas fuertemente tipados con **Zod 4**.
