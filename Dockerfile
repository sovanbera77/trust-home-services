FROM node:20-alpine AS base
WORKDIR /app

# ── Build server (with shared types) ──
FROM base AS server-builder
COPY package.json package-lock.json* ./
COPY packages/shared ./packages/shared
COPY packages/server ./packages/server
RUN npm install --workspace=packages/server --include-workspace-root
RUN npm run build -w packages/server

# ── Build Vite frontend ──
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY home-repair-vite ./home-repair-vite
RUN cd home-repair-vite && npm ci && npm run build

# ── Production image ──
FROM node:20-alpine
WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 appuser

# Copy the entire workspace node_modules (hoisted by npm workspaces)
COPY --from=server-builder /app/node_modules ./node_modules
COPY --from=server-builder /app/package.json ./

# Copy compiled server code
COPY --from=server-builder /app/packages/server/dist ./packages/server/dist
COPY --from=server-builder /app/packages/server/package.json ./packages/server/

# Copy shared types (referenced by server at runtime)
COPY --from=server-builder /app/packages/shared ./packages/shared

# Create data directories
RUN mkdir -p data uploads/invoices && chown -R appuser:nodejs data uploads

# Vite frontend (served by Express)
COPY --from=frontend-builder /app/home-repair-vite/dist ./frontend/dist

EXPOSE 3001

USER appuser

ENV PORT=3001
CMD ["node", "packages/server/dist/index.js"]
