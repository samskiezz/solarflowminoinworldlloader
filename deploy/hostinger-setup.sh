#!/bin/bash
# HOSTINGER VPS DEPLOYMENT SCRIPT FOR OPENCLAW SOLARFLOW
# Automated setup for real data persistence and knowledge growth

echo "🚀 Setting up OpenClaw SolarFlow on Hostinger VPS..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Create application directory
sudo mkdir -p /opt/openclaw
sudo chown -R $USER:$USER /opt/openclaw

# Create data directory for VPS persistence
sudo mkdir -p /opt/openclaw/data
sudo chown -R www-data:www-data /opt/openclaw/data

# Clone/copy application code
cd /opt/openclaw
# Note: In real deployment, this would clone from your repo
# git clone https://github.com/samskiezz/solarflowminoinworldlloader.git app

# For now, copy files from local deployment
cp -r /home/node/.openclaw/workspace/solarflowminoinworldlloader/* ./app/

# Install dependencies
cd app
npm install express ws

# Create PM2 ecosystem file
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'openclaw-solarflow',
    script: 'server/vps-server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
};
EOF

# Configure Nginx
sudo tee /etc/nginx/sites-available/openclaw-solarflow << 'EOF'
server {
    listen 80;
    server_name your-domain.com;  # Replace with actual domain
    
    # Serve static files
    location / {
        root /opt/openclaw/app/docs;
        index index.html;
        try_files $uri $uri/ /index.html;
        
        # Enable gzip compression
        gzip on;
        gzip_types text/css text/javascript application/javascript application/json;
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # WebSocket support
    location /ws {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# Enable the site
sudo ln -sf /etc/nginx/sites-available/openclaw-solarflow /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start services
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start application with PM2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup

echo "✅ OpenClaw SolarFlow VPS deployment complete!"
echo "📊 Server running on port 3001"
echo "🌐 Nginx serving static files and proxying API"
echo "💾 Data will persist in /opt/openclaw/data"

echo ""
echo "🔧 Next steps:"
echo "1. Update your domain DNS to point to this VPS IP"
echo "2. Configure SSL certificate with Let's Encrypt:"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d your-domain.com"
echo "3. Test the API endpoints:"
echo "   curl http://your-domain.com/api/health"
echo ""

echo "📝 Monitoring commands:"
echo "   pm2 status          # Check application status"
echo "   pm2 logs            # View application logs"
echo "   sudo systemctl status nginx  # Check Nginx status"
echo "   ls -la /opt/openclaw/data/    # Check saved data"