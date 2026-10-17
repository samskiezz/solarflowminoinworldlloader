#!/bin/bash
# SolarFlow VPS deployment: installs the API server as a systemd service
# behind nginx with a Let's Encrypt certificate.
#
#   DOMAIN=solarflow.example.com ADMIN_EMAIL=you@example.com ./deploy.sh
set -euo pipefail

DOMAIN="${DOMAIN:-}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
APP_DIR="${APP_DIR:-/opt/solarflow}"
DATA_DIR="${DATA_DIR:-/var/lib/solarflow}"
LOG_DIR="${LOG_DIR:-/var/log/solarflow}"
USER_NAME="${SERVICE_USER:-solarflow}"
SERVICE="solarflow-quantum"
SRC_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -z "$DOMAIN" ] || [ -z "$ADMIN_EMAIL" ]; then
    echo "Usage: DOMAIN=<host> ADMIN_EMAIL=<email> $0" >&2
    exit 1
fi

echo "🚀 Deploying SolarFlow to $DOMAIN ..."

if ! id "$USER_NAME" &>/dev/null; then
    echo "Creating user $USER_NAME..."
    sudo useradd -r -s /usr/sbin/nologin -d "$APP_DIR" "$USER_NAME"
fi

echo "Creating directories..."
sudo mkdir -p "$APP_DIR" "$DATA_DIR" "$LOG_DIR"
sudo chown -R "$USER_NAME:$USER_NAME" "$DATA_DIR" "$LOG_DIR"

if ! command -v node &>/dev/null || [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 18 ]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "Installing system dependencies..."
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx git rsync

echo "Copying application files..."
sudo rsync -a --delete \
    --exclude node_modules --exclude backups --exclude artifacts --exclude .git \
    --exclude data --exclude logs --exclude .env \
    "$SRC_DIR/" "$APP_DIR/"
sudo chown -R "$USER_NAME:$USER_NAME" "$APP_DIR"

if [ ! -f "$APP_DIR/.env" ]; then
    echo "Creating $APP_DIR/.env with a generated JWT secret (edit DATABASE_URL etc. as needed)..."
    sudo cp "$APP_DIR/.env.example" "$APP_DIR/.env"
    sudo sed -i "s|^JWT_SECRET=.*|JWT_SECRET=$(openssl rand -hex 32)|" "$APP_DIR/.env"
    sudo sed -i "s|^NODE_ENV=.*|NODE_ENV=production|" "$APP_DIR/.env"
    sudo sed -i "s|^TRUST_PROXY=.*|TRUST_PROXY=true|" "$APP_DIR/.env"
    sudo sed -i "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN,https://samskiezz.github.io|" "$APP_DIR/.env"
    sudo chown "$USER_NAME:$USER_NAME" "$APP_DIR/.env"
    sudo chmod 600 "$APP_DIR/.env"
fi

echo "Installing Node.js dependencies..."
(cd "$APP_DIR" && sudo -u "$USER_NAME" npm ci --omit=dev)

echo "Installing systemd service..."
sudo cp "$APP_DIR/systemd/$SERVICE.service" "/etc/systemd/system/$SERVICE.service"
sudo systemctl daemon-reload
sudo systemctl enable "$SERVICE"

echo "Installing nginx configuration..."
sudo sed "s/solarflow.example.com/$DOMAIN/g" "$APP_DIR/nginx/solarflow.conf" | sudo tee /etc/nginx/sites-available/solarflow.conf >/dev/null
sudo ln -sf /etc/nginx/sites-available/solarflow.conf /etc/nginx/sites-enabled/solarflow.conf
sudo mkdir -p /var/www/letsencrypt

if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
    echo "Requesting SSL certificate..."
    sudo certbot certonly --webroot -w /var/www/letsencrypt -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL" \
        || sudo certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$ADMIN_EMAIL"
fi

sudo nginx -t

echo "Starting services..."
sudo systemctl restart "$SERVICE"
sudo systemctl reload nginx

sleep 2
if curl -fsS "http://127.0.0.1:3000/health" >/dev/null; then
    echo "✅ Deployment complete: https://$DOMAIN (health: https://$DOMAIN/health)"
else
    echo "⚠️ Service started but /health did not respond yet. Check: sudo journalctl -u $SERVICE -n 50"
    exit 1
fi
