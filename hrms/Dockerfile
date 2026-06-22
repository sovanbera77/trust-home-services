FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./

FROM node:20-alpine
RUN apk add --no-cache tini
WORKDIR /app
COPY --from=client-build /app/client/dist ./client/dist
COPY --from=server-build /app/server ./server
EXPOSE 5000
ENV NODE_ENV=production
ENV PORT=5000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server/dist/index.js"]
