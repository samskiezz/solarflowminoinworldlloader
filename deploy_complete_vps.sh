#!/bin/bash

# Deploy Complete VPS Integration
# This script sets up the full production environment on Sam's VPS

set -e

echo "🚀 SolarFlow VPS Complete Deployment"
echo "====================================="
echo ""

# VPS connection details
VPS_HOST="76.13.176.135"
VPS_USER="root"
VPS_PATH="/opt/solarflow/solarflowminoinworldlloader"

# Check if we're running on the VPS or need to deploy
if [[ "$(hostname -I)" == *"76.13.176.135"* ]] || [[ -d "/opt/solarflow" ]]; then
    echo "📍 Running directly on VPS - local deployment mode"
    LOCAL_MODE=true
else
    echo "📍 Remote deployment to VPS"
    LOCAL_MODE=false
fi

if [ "$LOCAL_MODE" = true ]; then
    # Direct deployment on VPS
    echo "📦 Setting up VPS environment..."
    
    # Ensure we're in the right directory
    cd /opt/solarflow/solarflowminoinworldlloader
    
    # Install Python dependencies
    echo "🐍 Installing Python dependencies..."
    pip3 install fastapi uvicorn requests --quiet
    
    # Make scripts executable
    chmod +x start_server.sh
    chmod +x test_api.py
    
    # Test the API
    echo "🧪 Testing API server..."
    python3 test_api.py &
    SERVER_PID=$!
    
    # Wait a moment for server to start
    sleep 3
    
    # Run tests
    python3 test_api.py
    TEST_RESULT=$?
    
    # Stop test server
    kill $SERVER_PID 2>/dev/null || true
    
    if [ $TEST_RESULT -eq 0 ]; then
        echo "✅ API tests passed"
    else
        echo "❌ API tests failed"
        exit 1
    fi
    
    # Create systemd service for production
    echo "⚙️  Creating systemd service..."
    cat > /etc/systemd/system/solarflow-neural.service << EOF
[Unit]
Description=SolarFlow Neural Production API
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/solarflow/solarflowminoinworldlloader
ExecStart=/usr/bin/python3 neural_production_api.py
Restart=always
RestartSec=10
Environment=PYTHONPATH=/opt/solarflow/solarflowminoinworldlloader

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start service
    systemctl daemon-reload
    systemctl enable solarflow-neural
    systemctl start solarflow-neural
    
    echo "🔄 Checking service status..."
    sleep 3
    systemctl status solarflow-neural --no-pager
    
    # Test the production service
    echo "🌐 Testing production API..."
    curl -s http://localhost:3000/api/health | head -c 200
    echo ""
    
    # Setup nginx proxy (if nginx is available)
    if command -v nginx &> /dev/null; then
        echo "🌍 Setting up nginx proxy..."
        cat > /etc/nginx/sites-available/solarflow << EOF
server {
    listen 80;
    server_name 76.13.176.135;
    
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        # CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "Origin, Authorization, Accept";
        add_header Access-Control-Allow-Credentials true;
    }
    
    location / {
        root /opt/solarflow/solarflowminoinworldlloader/docs;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
        
        ln -sf /etc/nginx/sites-available/solarflow /etc/nginx/sites-enabled/
        nginx -t && systemctl reload nginx
        echo "✅ Nginx configured"
    fi
    
    echo ""
    echo "🎉 VPS Deployment Complete!"
    echo "=========================="
    echo "🌐 API Server: http://76.13.176.135:3000"
    echo "📊 Dashboard: http://76.13.176.135:3000/docs"
    echo "🖥️  VPS Monitor: http://76.13.176.135/vps_neural_dashboard.html"
    echo "📋 Service: systemctl status solarflow-neural"
    echo ""
    
else
    # Remote deployment
    echo "🔗 Deploying to VPS remotely..."
    
    # Copy files to VPS
    echo "📤 Uploading files..."
    scp -r . $VPS_USER@$VPS_HOST:$VPS_PATH/
    
    # Run deployment on VPS
    echo "🚀 Running deployment on VPS..."
    ssh $VPS_USER@$VPS_HOST "cd $VPS_PATH && chmod +x deploy_complete_vps.sh && ./deploy_complete_vps.sh"
    
    echo "✅ Remote deployment complete"
fi

echo ""
echo "🔍 Integration Status:"
echo "====================="
echo "Frontend: GitHub Pages (https://samskiezz.github.io/solarflowminoinworldlloader/)"
echo "Backend:  VPS FastAPI (http://76.13.176.135:3000)"
echo "Monitor:  VPS Dashboard (http://76.13.176.135/vps_neural_dashboard.html)"
echo ""
echo "🧪 Test the integration:"
echo "curl http://76.13.176.135:3000/api/health"