# ==========================================
# Stage 1: Dependencies
# ==========================================
FROM node:20-alpine AS dependencies
WORKDIR /app

# Install native build tools if required
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# ==========================================
# Stage 2: Builder
# ==========================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules

COPY . .

# Generate Prisma Client
RUN npm run db:generate --workspace=apps/api

# Build both API and Frontend
RUN npm run build

# ==========================================
# Stage 3: Production Runtime
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install Nginx, OpenSSL for Prisma, and dumb-init for clean process supervision
RUN apk add --no-cache nginx openssl dumb-init bash

# Create directories
RUN mkdir -p /app/uploads /run/nginx /var/log/nginx

# Copy package descriptors and node_modules
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Copy internal Nginx configuration and entrypoint
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["/app/entrypoint.sh"]
