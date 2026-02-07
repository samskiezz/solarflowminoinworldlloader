# PRODUCTION DOCKER CONTAINER - ADDRESSES PROBLEM 102
FROM node:18-alpine AS base

# Install security updates and dependencies
RUN apk update && apk upgrade && \
    apk add --no-cache \
    dumb-init \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S solarflow -u 1001

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Copy application code
COPY --chown=solarflow:nodejs . .

# Create necessary directories
RUN mkdir -p logs data/standards && \
    chown -R solarflow:nodejs logs data

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Switch to non-root user
USER solarflow

# Expose ports
EXPOSE 3000

# Start application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]

# Multi-stage build for development
FROM base AS development

# Switch back to root for dev dependencies
USER root

# Install development dependencies
RUN npm ci && npm cache clean --force

# Install development tools
RUN apk add --no-cache git

USER solarflow

CMD ["npm", "run", "dev"]