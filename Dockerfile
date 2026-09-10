FROM node:20-slim

# Instalar OpenSSL, certificados y wget necesarios para Prisma Engine y Healthcheck
RUN apt-get update -y && apt-get install -y openssl ca-certificates wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar manifiesto de dependencias y esquema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar solo dependencias de producción de forma determinista (ejecuta prisma generate vía postinstall)
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Healthcheck de producción para monitoreo de contenedor con wget
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -q --spider http://localhost:3000/api/health || exit 1

# Ejecutar migraciones pendientes de Prisma y arrancar el servidor HTTP/Socket.IO
CMD ["npm", "start"]
