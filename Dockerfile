FROM node:20-alpine AS base
WORKDIR /app

# Build shared types
FROM base AS shared-builder
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
RUN npm install

# Build server
FROM base AS server-builder
COPY package.json package-lock.json* ./
COPY --from=shared-builder /app/packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN npm install && npm run build -w packages/server
RUN mkdir -p data uploads/invoices

# Build Vite frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY home-repair-vite ./home-repair-vite
RUN cd home-repair-vite && npm ci && npm run build

# Production image
FROM node:20-alpine
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

# Server
COPY --from=server-builder /app/packages/server/dist ./server/dist
COPY --from=server-builder /app/packages/server/node_modules ./server/node_modules
COPY --from=server-builder /app/packages/server/package.json ./server/
COPY --from=server-builder /app/server/data ./server/data
COPY --from=server-builder /app/server/uploads ./server/uploads

# Vite frontend (served by Express)
COPY --from=frontend-builder /app/home-repair-vite/dist ./frontend/dist

EXPOSE 3001

USER appuser

ENV PORT=3001
CMD ["node", "server/dist/index.js"]
