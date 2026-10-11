#!/bin/bash
# Start the SolarFlow API server from the repository directory.
set -euo pipefail

cd "$(cd "$(dirname "$0")" && pwd)"
PORT="${PORT:-3000}"

echo "🚀 Starting SolarFlow server (port $PORT) from $(pwd)"

if curl -fsS "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "⚠️ A server is already responding on port ${PORT}:"
    curl -s "http://127.0.0.1:${PORT}/health"
    echo
    exit 0
fi

if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm ci --omit=dev
fi

exec node server.js
