#!/bin/bash
# SolarFlow VPS Deployment Script for OpenClaw Hostinger
set -e

echo "🚀 Deploying SolarFlow Quantum System to VPS..."

# Configuration
APP_DIR="/opt/solarflow"
DATA_DIR="/var/lib/solarflow"
LOG_DIR="/var/log/solarflow"
USER="solarflow"
SERVICE="solarflow-quantum"

# Create user if doesn't exist
if ! id "$USER" &>/dev/null; then
    echo "Creating user $USER..."
    sudo useradd -r -s /bin/false -d /opt/solarflow $USER
fi

# Create directories
echo "Creating directories..."
sudo mkdir -p $APP_DIR $DATA_DIR $LOG_DIR
sudo chown -R $USER:$USER $DATA_DIR $LOG_DIR

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx git

# Copy application files
echo "Copying application files..."
sudo cp -r . $APP_DIR/
sudo chown -R $USER:$USER $APP_DIR

# Install Node dependencies
echo "Installing Node.js dependencies..."
cd $APP_DIR
sudo -u $USER npm install express ws

# Install systemd service
echo "Installing systemd service..."
sudo cp systemd/$SERVICE.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable $SERVICE

# Install nginx configuration
echo "Installing nginx configuration..."
sudo cp nginx/solarflow.conf /etc/nginx/sites-available/
sudo ln -sf /etc/nginx/sites-available/solarflow.conf /etc/nginx/sites-enabled/
sudo nginx -t

# Get SSL certificate
echo "Setting up SSL certificate..."
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m admin@$DOMAIN

# Start services
echo "Starting services..."
sudo systemctl start $SERVICE
sudo systemctl restart nginx

# Check status
echo "Checking service status..."
sudo systemctl status $SERVICE

echo "✅ Deployment complete!"
echo "🌐 SolarFlow is now running at: https://$DOMAIN"
echo "📊 Health check: https://$DOMAIN/health"
echo "🧠 Quantum system: https://$DOMAIN/docs/autonomous-world.html"

# Show logs
echo "📋 Service logs:"
sudo journalctl -u $SERVICE --no-pager -l
