#!/bin/bash
# SolarFlow Auto-Start Script
echo "🚀 Starting SolarFlow with bootloader..."

# Run auto-start system
node auto-start.js

# Start the application (if server.js exists)
if [ -f "server.js" ]; then
    echo "🌐 Starting production server..."
    node server.js
else
    echo "📄 Static mode - files served via GitHub Pages"
fi
