#!/bin/bash
# EMERGENCY FIX SCRIPT
# Quick fixes for common VPS deployment issues

echo "🚨 Emergency VPS Fix Script"
echo "============================"

# Stop all services first
echo "⏹️ Stopping services..."
sudo systemctl stop nginx 2>/dev/null
sudo pkill -f nginx 2>/dev/null

# Remove problematic configurations
echo "🧹 Cleaning up configurations..."
sudo rm -f /etc/nginx/sites-enabled/default
sudo rm -f /etc/nginx/sites-enabled/openclaw-solarflow

# Create minimal working nginx config
echo "📝 Creating minimal nginx configuration..."
sudo tee /etc/nginx/sites-available/solarflow-minimal << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    root /opt/openclaw/app/docs;
    index index.html;
    
    server_name _;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Enable the minimal config
sudo ln -sf /etc/nginx/sites-available/solarflow-minimal /etc/nginx/sites-enabled/

# Create the directory structure if it doesn't exist
echo "📁 Ensuring directory structure..."
sudo mkdir -p /opt/openclaw/app/docs

# Copy application files if the source exists
if [ -d "/opt/solarflowminoinworldlloader" ]; then
    echo "📋 Copying application files..."
    sudo cp -r /opt/solarflowminoinworldlloader/docs/* /opt/openclaw/app/docs/ 2>/dev/null || true
elif [ -d "/root/solarflowminoinworldlloader" ]; then
    echo "📋 Copying application files from /root..."
    sudo cp -r /root/solarflowminoinworldlloader/docs/* /opt/openclaw/app/docs/ 2>/dev/null || true
fi

# Set permissions
echo "🔐 Setting permissions..."
sudo chown -R www-data:www-data /opt/openclaw/app
sudo chmod -R 755 /opt/openclaw/app

# Create a simple index.html if none exists
if [ ! -f "/opt/openclaw/app/docs/index.html" ]; then
    echo "📄 Creating temporary index.html..."
    sudo tee /opt/openclaw/app/docs/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SolarFlow - VPS Setup Complete</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            background: linear-gradient(135deg, #0a0a0a, #1a1a2e); 
            color: white; 
            text-align: center; 
            padding: 50px 20px; 
            margin: 0;
        }
        .container { max-width: 600px; margin: 0 auto; }
        h1 { color: #00ff88; font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; line-height: 1.6; margin: 20px 0; }
        .status { background: rgba(0,255,136,0.1); padding: 20px; border-radius: 10px; margin: 30px 0; }
        .next-steps { text-align: left; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px; }
        .next-steps h3 { color: #00ff88; }
        .next-steps li { margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🌞 SolarFlow VPS</h1>
        <p>Your VPS deployment is now running!</p>
        
        <div class="status">
            <h3>✅ System Status</h3>
            <p>Nginx: Running<br>
            Files: Deployed<br>
            Access: HTTP Ready</p>
        </div>
        
        <div class="next-steps">
            <h3>📋 Next Steps</h3>
            <ol>
                <li>Upload your complete SolarFlow application files</li>
                <li>Configure your domain name in nginx</li>
                <li>Set up SSL certificate with Let's Encrypt</li>
                <li>Start the backend API server if needed</li>
            </ol>
        </div>
        
        <p>VPS Emergency Fix Applied Successfully</p>
        <p><small>Generated: $(date)</small></p>
    </div>
</body>
</html>
EOF
fi

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Configuration still has issues"
    exit 1
fi

# Start nginx
echo "🚀 Starting nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Check if it's running
sleep 2
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx started successfully"
    
    # Test HTTP access
    if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
        echo "✅ HTTP access working"
        
        # Get server IP
        SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || echo "unknown")
        echo ""
        echo "🎉 EMERGENCY FIX COMPLETE!"
        echo "=========================="
        echo ""
        echo "✅ Your site is now accessible at:"
        echo "   http://$SERVER_IP"
        echo "   (or your domain if DNS is configured)"
        echo ""
        echo "📋 What was fixed:"
        echo "   ✓ Nginx configuration simplified"
        echo "   ✓ File permissions corrected"
        echo "   ✓ Basic site structure created"
        echo "   ✓ Service restarted successfully"
        echo ""
        echo "🔧 To complete setup:"
        echo "   1. Upload your full application files"
        echo "   2. Run: ./fix-vps-deployment.sh"
        echo "   3. Configure SSL when ready"
        
    else
        echo "⚠️ Nginx is running but HTTP access failed"
        echo "   Check firewall settings: sudo ufw allow 80"
    fi
else
    echo "❌ Failed to start nginx"
    echo "🔍 Check status: sudo systemctl status nginx"
    echo "🔍 Check logs: sudo journalctl -xeu nginx.service"
fi

echo ""
echo "📞 For further help, run: ./diagnose-issues.sh"