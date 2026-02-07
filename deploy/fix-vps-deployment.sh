#!/bin/bash
# VPS DEPLOYMENT FIX SCRIPT
# Resolves SSL and Nginx issues on Hostinger VPS

echo "🔧 Fixing VPS deployment issues..."

# Get the domain name from user
echo "📝 Please enter your domain name (e.g., yourdomain.com):"
read DOMAIN_NAME

if [ -z "$DOMAIN_NAME" ]; then
    echo "❌ Domain name is required"
    exit 1
fi

echo "🌐 Setting up deployment for domain: $DOMAIN_NAME"

# Stop nginx to free port 80 for certbot
echo "⏹️ Stopping nginx..."
sudo systemctl stop nginx

# Check if the application directory exists
if [ ! -d "/opt/openclaw/app" ]; then
    echo "📁 Creating application directory..."
    sudo mkdir -p /opt/openclaw/app/docs
    
    # Copy application files if they don't exist
    if [ -d "/opt/solarflowminoinworldlloader" ]; then
        echo "📋 Copying application files..."
        sudo cp -r /opt/solarflowminoinworldlloader/* /opt/openclaw/app/
    else
        echo "⚠️ Application files not found. Please ensure the repository is cloned."
        echo "   Run: git clone https://github.com/samskiezz/solarflowminoinworldlloader.git /opt/solarflowminoinworldlloader"
        exit 1
    fi
fi

# Set proper ownership
sudo chown -R www-data:www-data /opt/openclaw/app
sudo chown -R $USER:$USER /opt/openclaw/app

# Create a simple nginx configuration first (without SSL)
echo "📝 Creating basic nginx configuration..."
sudo tee /etc/nginx/sites-available/openclaw-solarflow << EOF
server {
    listen 80;
    server_name $DOMAIN_NAME www.$DOMAIN_NAME;
    
    # Document root
    root /opt/openclaw/app/docs;
    index index.html;
    
    # Main location
    location / {
        try_files \$uri \$uri/ /index.html;
    }
    
    # Static files with caching
    location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # API endpoints (if backend is running)
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
    
    # WebSocket support (if backend is running)
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_connect_timeout 5s;
        proxy_send_timeout 5s;
        proxy_read_timeout 5s;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/css text/javascript application/javascript application/json application/xml text/xml;
}
EOF

# Remove default nginx site and enable our site
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/openclaw-solarflow /etc/nginx/sites-enabled/

# Test nginx configuration
echo "🧪 Testing nginx configuration..."
sudo nginx -t

if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration test failed. Please check the configuration."
    exit 1
fi

# Start nginx
echo "🚀 Starting nginx..."
sudo systemctl start nginx
sudo systemctl enable nginx

# Check if nginx is running
if ! sudo systemctl is-active --quiet nginx; then
    echo "❌ Failed to start nginx. Checking status..."
    sudo systemctl status nginx
    echo ""
    echo "🔍 Checking nginx error logs:"
    sudo tail -20 /var/log/nginx/error.log
    exit 1
fi

echo "✅ Nginx started successfully"

# Install certbot if not already installed
if ! command -v certbot &> /dev/null; then
    echo "📦 Installing certbot..."
    sudo apt update
    sudo apt install -y certbot python3-certbot-nginx
fi

# Get SSL certificate
echo "🔐 Obtaining SSL certificate for $DOMAIN_NAME..."
sudo certbot --nginx -d $DOMAIN_NAME -d www.$DOMAIN_NAME --non-interactive --agree-tos --email admin@$DOMAIN_NAME

if [ $? -ne 0 ]; then
    echo "⚠️ SSL certificate installation failed. This might be because:"
    echo "   1. DNS is not pointing to this server yet"
    echo "   2. Domain validation failed"
    echo "   3. Rate limits hit"
    echo ""
    echo "📋 Your site is still accessible via HTTP at: http://$DOMAIN_NAME"
    echo "   You can retry SSL later with: sudo certbot --nginx -d $DOMAIN_NAME"
else
    echo "✅ SSL certificate installed successfully"
    echo "🔐 Your site is now accessible via HTTPS at: https://$DOMAIN_NAME"
fi

# Install Node.js and dependencies if not already done
if ! command -v node &> /dev/null; then
    echo "📦 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

if ! command -v pm2 &> /dev/null; then
    echo "📦 Installing PM2..."
    sudo npm install -g pm2
fi

# Set up the backend server if it exists
if [ -f "/opt/openclaw/app/server/vps-server.js" ]; then
    echo "🖥️ Setting up backend server..."
    
    # Install server dependencies
    cd /opt/openclaw/app
    if [ ! -f "package.json" ]; then
        npm init -y
    fi
    npm install express ws
    
    # Create PM2 ecosystem file
    cat > ecosystem.config.js << 'EOFPM2'
module.exports = {
  apps: [{
    name: 'openclaw-solarflow',
    script: 'server/vps-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOFPM2
    
    # Start the backend with PM2
    echo "🚀 Starting backend server..."
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup
    
    echo "✅ Backend server started on port 3001"
else
    echo "ℹ️ No backend server found, running as static site only"
fi

# Create a simple health check script
cat > /opt/openclaw/health-check.sh << 'EOFHEALTH'
#!/bin/bash
# Health check script for SolarFlow

echo "🏥 SolarFlow Health Check - $(date)"
echo "=================================="

# Check nginx
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx: Running"
else
    echo "❌ Nginx: Not running"
    sudo systemctl status nginx --no-pager -l
fi

# Check if site is accessible
if curl -s -o /dev/null -w "%{http_code}" http://localhost | grep -q "200"; then
    echo "✅ HTTP: Site accessible"
else
    echo "❌ HTTP: Site not accessible"
fi

# Check SSL if configured
if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    if openssl x509 -checkend 2592000 -noout -in /etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem; then
        echo "✅ SSL: Certificate valid (expires in >30 days)"
    else
        echo "⚠️ SSL: Certificate expires soon"
    fi
else
    echo "ℹ️ SSL: Not configured"
fi

# Check backend if running
if pm2 list | grep -q "openclaw-solarflow"; then
    echo "✅ Backend: Running"
    pm2 show openclaw-solarflow | head -20
else
    echo "ℹ️ Backend: Not running (static site mode)"
fi

# Check disk space
df -h /opt/openclaw
echo ""

# Check logs
echo "📋 Recent Nginx access logs:"
sudo tail -5 /var/log/nginx/access.log 2>/dev/null || echo "No access logs yet"

echo ""
echo "🔚 Health check complete"
EOFHEALTH

chmod +x /opt/openclaw/health-check.sh

# Final status
echo ""
echo "🎉 VPS Deployment Setup Complete!"
echo "=================================="
echo ""
echo "📊 Status:"
echo "   Domain: $DOMAIN_NAME"
echo "   HTTP: http://$DOMAIN_NAME"
if [ -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo "   HTTPS: https://$DOMAIN_NAME ✅"
else
    echo "   HTTPS: Not configured (can be added later)"
fi
echo "   Files: /opt/openclaw/app/docs/"
echo "   Logs: /var/log/nginx/"
echo ""
echo "🔧 Management Commands:"
echo "   sudo systemctl status nginx     # Check nginx status"
echo "   sudo systemctl restart nginx    # Restart nginx"
echo "   /opt/openclaw/health-check.sh   # Run health check"
echo "   sudo tail -f /var/log/nginx/access.log  # Watch traffic"
echo ""
if [ -f "/opt/openclaw/app/server/vps-server.js" ]; then
    echo "   pm2 status                      # Check backend status"
    echo "   pm2 logs openclaw-solarflow     # View backend logs"
    echo "   pm2 restart openclaw-solarflow  # Restart backend"
    echo ""
fi

echo "🎯 Next Steps:"
echo "1. Point your DNS A record for $DOMAIN_NAME to this server's IP"
echo "2. Wait 5-10 minutes for DNS propagation"
echo "3. Test your site: http://$DOMAIN_NAME"
if [ ! -f "/etc/letsencrypt/live/$DOMAIN_NAME/fullchain.pem" ]; then
    echo "4. Retry SSL: sudo certbot --nginx -d $DOMAIN_NAME"
fi
echo ""
echo "✨ Your SolarFlow application is ready!"