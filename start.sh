#!/bin/bash

# SolarFlow Server Startup Script
# This script starts the working server

echo "🚀 Starting SolarFlow Server..."
echo "📁 Working directory: $(pwd)"
echo "⏰ Started at: $(date)"

cd /home/node/.openclaw/workspace/solarflowminoinworldlloader

# Check if server is already running
if curl -s http://127.0.0.1:3000/health >/dev/null 2>&1; then
    echo "⚠️ Server already running at http://localhost:3000"
    echo "📊 Health: $(curl -s http://127.0.0.1:3000/health | grep -o '"status":"[^"]*"')"
    exit 0
fi

echo "🔧 Starting server..."
node server_working.js