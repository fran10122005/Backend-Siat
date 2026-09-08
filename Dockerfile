FROM node:20-slim

# Instalar OpenSSL y certificados necesarios para Prisma Engine
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copiar manifiesto de dependencias y esquema de Prisma
COPY package*.json ./
COPY prisma ./prisma/

# Instalar dependencias (ejecuta automaticamente prisma generate por postinstall)
RUN npm install

# Copiar codigo fuente
COPY . .

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

# Ejecutar migraciones pendientes de Prisma y arrancar el servidor HTTP/Socket.IO
CMD ["npm", "start"]
