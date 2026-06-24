# SIAT Backend Modular

Backend para el Sistema Integral de Apoyo a Padres de niños con Trastorno del Espectro Autista (SIAT).

## Stack Tecnológico
- Node.js + Express
- PostgreSQL
- Prisma ORM
- JWT para Autenticación
- Zod para validaciones

## Requisitos
- Node.js v18+
- PostgreSQL v14+

## Instalación y Configuración

1. Clonar o descargar el repositorio.
2. Instalar dependencias:
   ```bash
   npm install
   ```
3. Configurar variables de entorno:
   Copiar `.env.example` a `.env` y configurar `DATABASE_URL` (para PostgreSQL local o remoto) y el `JWT_SECRET`.
   ```bash
   cp .env.example .env
   ```
4. Sincronizar Prisma y base de datos (Migración inicial):
   Asegúrate de que la BD de PostgreSQL exista (ej. `siat_db`).
   ```bash
   npx prisma db push
   ```
   *(También puedes correr `npx prisma migrate dev` para crear una migración oficial).*
5. Generar cliente de Prisma:
   ```bash
   npx prisma generate
   ```

## Ejecución
**Desarrollo (con nodemon):**
```bash
npm run dev
```

**Producción:**
```bash
npm start
```

## Simulador IoT (Wearable)
El proyecto incluye un script independiente para simular una pulsera enviando telemetría al servidor. Este script debe ejecutarse mientras el backend esté corriendo.

Para iniciarlo, abre una nueva terminal en la raíz del proyecto backend y ejecuta:
```bash
node wearable_simulator.js
```

**Controles del Simulador:**
Una vez en ejecución, la terminal del simulador capturará tus teclas para cambiar el estado de la pulsera en tiempo real:
- `s` (Gatillar Crisis): Simula una alerta de sobrecarga sensorial aumentando los BPM y cambiando patrones de movimiento.
- `c` (Restaurar Calma): Retorna las constantes fisiológicas a la línea base (Calma).
- `q` (Salir): Detiene el simulador.

## Estructura Modular
El proyecto está dividido en módulos dentro de `src/modules/`:
- **Auth**: Autenticación, JWT, registro de representantes.
- **Ninos**: CRUD de perfiles y vinculación, configuración de umbrales.
- **Sesiones**: Inicio y fin de rutinas diarias.
- **Monitoreo**: Recepción de datos Edge computing de sensores.
- **Reportes**: Generación de reportes y feedback de alertas.node wearable_simulator.js
