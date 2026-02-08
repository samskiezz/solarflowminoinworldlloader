#!/bin/bash

# Start SolarFlow Neural Production API Server
# This script launches the FastAPI server on port 3000

echo "🚀 Starting SolarFlow Neural Production API Server..."

# Change to the correct directory
cd /opt/solarflow/solarflowminoinworldlloader 2>/dev/null || {
    echo "⚠️  VPS path not found, using current directory"
    cd "$(dirname "$0")"
}

# Activate Python virtual environment if it exists
if [ -d "venv" ]; then
    echo "📦 Activating virtual environment..."
    source venv/bin/activate
elif [ -d "/opt/solarflow/venv" ]; then
    echo "📦 Activating system virtual environment..."
    source /opt/solarflow/venv/bin/activate
fi

# Install required packages if not already installed
echo "📋 Checking dependencies..."
python3 -m pip install fastapi uvicorn --quiet

# Start the server
echo "🌟 Launching FastAPI server on port 3000..."
echo "📍 Server will be available at: http://localhost:3000"
echo "📍 API documentation at: http://localhost:3000/docs"
echo ""
echo "Press Ctrl+C to stop the server"
echo "================================="

# Run the server
python3 neural_production_api.py