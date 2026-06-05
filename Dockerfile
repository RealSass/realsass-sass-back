# syntax=docker/dockerfile:1.7
# =============================================================================
# Stage 1: deps — instala TODAS las dependencias (incluyendo devDeps para build)
# =============================================================================
FROM node:22-alpine AS deps
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 2: build — compila TypeScript y genera artefactos Prisma
# =============================================================================
FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@latest --activate
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Genera el Prisma client y compila TypeScript
RUN pnpm prisma generate && pnpm build
# Elimina devDependencies para reducir el tamaño del runtime
RUN pnpm prune --prod --force

# =============================================================================
# Stage 3: runtime — imagen mínima de producción
# =============================================================================
FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist         ./dist
COPY --from=build --chown=app:app /app/package.json ./package.json
COPY --from=build --chown=app:app /app/prisma       ./prisma

# Cambiar al user sin privilegios ANTES de exponer
USER app

EXPOSE 3000

# Ejecutar el bundle compilado directamente con node (no nest start)
CMD ["node", "dist/src/main.js"]
