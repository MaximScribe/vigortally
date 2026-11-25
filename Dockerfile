# syntax=docker/dockerfile:1

# VigorTally: API server + web app in one image. Builds for linux/amd64 and linux/arm64
# (Raspberry Pi, ARM NAS):
#   docker buildx build --platform linux/amd64,linux/arm64 -t vigortally/vigortally .

ARG NODE_VERSION=24

# ---- build -------------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS build
WORKDIR /app

COPY . .
# Only the server and web workspaces (and the shared packages they use) are installed;
# the companion app's toolchain is not needed here.
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm ci --workspace=@vigortally/server --workspace=@vigortally/web --include-workspace-root \
 && npm run build --workspace=@vigortally/web \
 && npm run build --workspace=@vigortally/server

# ---- runtime -----------------------------------------------------------------
FROM node:${NODE_VERSION}-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080 \
    DATA_DIR=/data \
    WEB_DIR=/app/apps/web/dist

# Only the production dependencies of the server.
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/apps/server/package.json ./apps/server/
RUN npm config set fetch-retries 5 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm ci --workspace=@vigortally/server --omit=dev --ignore-scripts \
 && npm cache clean --force

COPY --from=build /app/apps/server/dist ./apps/server/dist
COPY --from=build /app/apps/server/drizzle ./apps/server/drizzle
COPY --from=build /app/apps/web/dist ./apps/web/dist

RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]

USER node
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT}/api/health" > /dev/null || exit 1

CMD ["node", "--enable-source-maps", "apps/server/dist/main.js"]
