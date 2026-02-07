#!/bin/bash
# DIAGNOSTIC SCRIPT FOR CURRENT VPS ISSUES
# Run this on your VPS to identify and fix problems

echo "🔍 SolarFlow VPS Diagnostic Tool"
echo "================================="
echo ""

# Check current nginx status
echo "1️⃣ Checking Nginx Status..."
if sudo systemctl is-active --quiet nginx; then
    echo "✅ Nginx is running"
    sudo systemctl status nginx --no-pager | head -10
else
    echo "❌ Nginx is not running"
    echo ""
    echo "🔍 Checking nginx error details:"
    sudo systemctl status nginx --no-pager -l
    echo ""
    echo "📋 Recent nginx error logs:"
    sudo tail -20 /var/log/nginx/error.log 2>/dev/null || echo "No error logs found"
fi

echo ""
echo "2️⃣ Testing Nginx Configuration..."
sudo nginx -t
if [ $? -ne 0 ]; then
    echo "❌ Nginx configuration has errors"
    echo "🔍 Common issues:"
    echo "   - Missing semicolons"
    echo "   - Invalid file paths"
    echo "   - Syntax errors"
    echo ""
    echo "📝 Current nginx configuration:"
    sudo cat /etc/nginx/sites-enabled/* 2>/dev/null || echo "No enabled sites found"
else
    echo "✅ Nginx configuration is valid"
fi

echo ""
echo "3️⃣ Checking SSL Certificate Issues..."
echo "🔍 Let's Encrypt log (last 20 lines):"
sudo tail -20 /var/log/letsencrypt/letsencrypt.log 2>/dev/null || echo "No Let's Encrypt logs found"

echo ""
echo "🔍 Existing certificates:"
sudo ls -la /etc/letsencrypt/live/ 2>/dev/null || echo "No certificates found"

echo ""
echo "4️⃣ Checking File Permissions..."
echo "📁 /opt/openclaw/app ownership:"
ls -la /opt/openclaw/ 2>/dev/null || echo "Directory not found"

echo ""
echo "📁 Nginx document root:"
ls -la /opt/openclaw/app/docs/ 2>/dev/null || echo "Document root not found"

echo ""
echo "5️⃣ Checking Network and Ports..."
echo "🌐 Listening ports:"
sudo netstat -tlnp | grep -E ':(80|443|3001)'

echo ""
echo "🔥 Firewall status:"
sudo ufw status 2>/dev/null || echo "UFW not installed/configured"

echo ""
echo "6️⃣ Checking System Resources..."
echo "💾 Disk space:"
df -h /

echo ""
echo "🧠 Memory usage:"
free -h

echo ""
echo "⚡ Current processes:"
ps aux | grep -E "(nginx|pm2|node)" | grep -v grep

echo ""
echo "7️⃣ DNS and Domain Check..."
echo "📡 Current server IP:"
curl -s ifconfig.me || echo "Could not determine IP"

echo ""
echo ""
echo "🔧 RECOMMENDED ACTIONS:"
echo "======================="

# Check if nginx config exists
if [ ! -f "/etc/nginx/sites-available/openclaw-solarflow" ]; then
    echo "❌ Missing nginx configuration"
    echo "   ➜ Run the fix script: ./fix-vps-deployment.sh"
fi

# Check if application files exist
if [ ! -d "/opt/openclaw/app/docs" ]; then
    echo "❌ Missing application files"
    echo "   ➜ Clone repository: git clone https://github.com/samskiezz/solarflowminoinworldlloader.git /opt/solarflowminoinworldlloader"
    echo "   ➜ Then run: ./fix-vps-deployment.sh"
fi

# Check if nginx is stopped
if ! sudo systemctl is-active --quiet nginx; then
    echo "⚠️ Nginx is stopped"
    echo "   ➜ Fix configuration errors first, then: sudo systemctl start nginx"
fi

echo ""
echo "🚀 Quick Fix Commands:"
echo "   1. Stop nginx: sudo systemctl stop nginx"
echo "   2. Fix configuration: sudo nginx -t"
echo "   3. Start nginx: sudo systemctl start nginx"
echo "   4. Check logs: sudo journalctl -xeu nginx.service"
echo ""
echo "   For SSL issues:"
echo "   1. Ensure DNS points to this server"
echo "   2. Retry: sudo certbot --nginx -d your-domain.com"
echo ""

echo "📞 If you need help, share this diagnostic output!"
echo "📄 Save this output: ./diagnose-issues.sh > diagnostic-report.txt"