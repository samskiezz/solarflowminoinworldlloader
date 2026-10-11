# syntax=docker/dockerfile:1
#
# SolarFlow API server image.
#   docker build -t solarflow:latest .
#   docker run --rm -p 3000:3000 --env-file .env solarflow:latest

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Production dependencies only (bcryptjs is pure JS, so no build toolchain needed).
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runtime
RUN apk add --no-cache dumb-init curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -S solarflow -u 1001 -G nodejs
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    DATA_DIR=/app/data \
    LOG_DIR=/app/logs

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=solarflow:nodejs package.json server.js ./
COPY --chown=solarflow:nodejs src ./src
COPY --chown=solarflow:nodejs docs ./docs
COPY --chown=solarflow:nodejs server ./server
COPY --chown=solarflow:nodejs scripts ./scripts

RUN mkdir -p /app/data /app/logs && chown -R solarflow:nodejs /app/data /app/logs
VOLUME ["/app/data", "/app/logs"]

USER solarflow
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
