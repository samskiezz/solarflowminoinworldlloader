#!/bin/bash
# Run this ON THE VPS to update to v2.3.0

set -e

echo "🚀 Updating VPS to SolarFlow v2.3.0..."

# Find where SolarFlow is currently deployed
CURRENT_DIR=$(find /var/www /home -name "index.html" -path "*/solarflow*/docs/*" 2>/dev/null | head -1 | xargs dirname 2>/dev/null)

if [ -z "$CURRENT_DIR" ]; then
    echo "❌ Could not find current SolarFlow deployment"
    echo "Looking in common locations..."
    
    # Check common paths
    for path in /var/www/solarflow/docs /var/www/html /opt/solarflow/docs /home/*/solarflow/docs; do
        if [ -d "$path" ]; then
            CURRENT_DIR="$path"
            echo "✅ Found at: $CURRENT_DIR"
            break
        fi
    done
fi

if [ -z "$CURRENT_DIR" ]; then
    echo "❌ SolarFlow not found. Creating new installation at /var/www/solarflow"
    CURRENT_DIR="/var/www/solarflow"
    mkdir -p "$CURRENT_DIR"
fi

echo "📂 Deploy directory: $CURRENT_DIR"

# Backup current version
BACKUP_DIR="${CURRENT_DIR}_backup_$(date +%Y%m%d_%H%M%S)"
echo "💾 Backing up current version to: $BACKUP_DIR"
cp -r "$CURRENT_DIR" "$BACKUP_DIR"

# Pull from GitHub
echo "📥 Pulling latest from GitHub..."
cd "$(dirname "$CURRENT_DIR")"

if [ -d ".git" ]; then
    git pull origin main
else
    # Clone fresh if not a git repo
    cd /tmp
    git clone https://github.com/samskiezz/solarflowminoinworldlloader.git solarflow-latest
    cp -r solarflow-latest/docs/* "$CURRENT_DIR/"
    rm -rf solarflow-latest
fi

# Verify critical files
echo "🔍 Verifying critical files..."
CRITICAL_FILES=(
    "index.html"
    "central-data-loader.js"
    "unified-credit-system.js"
    "cer-product-database.json"
    "minions.json"
)

for file in "${CRITICAL_FILES[@]}"; do
    if [ ! -f "$CURRENT_DIR/$file" ]; then
        echo "❌ Missing critical file: $file"
        exit 1
    fi
done

echo "✅ All critical files present"

# Set permissions
echo "🔒 Setting permissions..."
chown -R www-data:www-data "$CURRENT_DIR" 2>/dev/null || chown -R $(whoami):$(whoami) "$CURRENT_DIR"
chmod -R 755 "$CURRENT_DIR"

# Restart service
echo "🔄 Restarting web service..."
if systemctl is-active --quiet solarflow; then
    systemctl restart solarflow
    echo "✅ Restarted solarflow service"
elif systemctl is-active --quiet nginx; then
    systemctl reload nginx
    echo "✅ Reloaded nginx"
else
    echo "⚠️  No service to restart - manual restart may be needed"
fi

# Test endpoint
echo "🧪 Testing endpoint..."
sleep 2
if curl -f -s http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Port 3000 responding"
elif curl -f -s http://localhost:80 > /dev/null 2>&1; then
    echo "✅ Port 80 responding"
else
    echo "⚠️  No response on ports 3000 or 80"
fi

# Show version
VERSION=$(grep -o 'v2\.[0-9]\.[0-9]' "$CURRENT_DIR/index.html" | head -1)
echo ""
echo "✅ UPDATE COMPLETE!"
echo "📊 Version: $VERSION"
echo "📂 Location: $CURRENT_DIR"
echo "💾 Backup: $BACKUP_DIR"
echo ""
echo "🌐 Access at:"
echo "  - http://76.13.176.135:3000"
echo "  - http://projectsolar.cloud (if DNS configured)"
echo ""
