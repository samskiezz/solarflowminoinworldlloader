#!/bin/bash
# SolarFlow Neural Cluster - One-Click Setup
# Run this script on a fresh Ubuntu 22.04 VPS to get everything working

set -e

echo "🚀 SolarFlow Neural Cluster - One-Click Setup"
echo "=============================================="
echo ""
echo "This script will install:"
echo "  ✅ Complete neural cluster (180+ repositories)"
echo "  ✅ Python ML environment (TensorFlow, PyTorch, etc.)"
echo "  ✅ Production API server"
echo "  ✅ Web interface with real backend"
echo "  ✅ Database and Redis"
echo "  ✅ Nginx reverse proxy"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

# Check if running as root
if [[ $EUID -ne 0 ]]; then
   echo "❌ This script must be run as root (use: sudo bash one_click_setup.sh)"
   exit 1
fi

# Get server IP for final message
SERVER_IP=$(curl -s ifconfig.me || echo "your-server-ip")

echo ""
echo "🎯 Starting installation on server: $SERVER_IP"
echo "⏱️  Estimated time: 15-30 minutes"
echo ""

# Run main deployment
chmod +x deploy_to_vps.sh
./deploy_to_vps.sh

echo ""
echo "🔍 Running verification tests..."
cd /opt/solarflow/solarflowminoinworldlloader
source venv/bin/activate
python3 verify_installation.py

echo ""
echo "🎉 INSTALLATION COMPLETE!"
echo "=========================="
echo ""
echo "🌐 Your SolarFlow Neural Cluster is now live at:"
echo "   http://$SERVER_IP/"
echo ""
echo "📊 API Documentation:"
echo "   http://$SERVER_IP/api/docs"
echo ""
echo "🧠 Neural Cluster Status:"
echo "   http://$SERVER_IP/api/neural/status"
echo ""
echo "📋 Management Commands:"
echo "   solarflow-status          # Check system status"
echo "   supervisorctl status      # Check services"
echo "   tail -f /var/log/solarflow-neural-api.log  # View logs"
echo ""
echo "🔧 Next Steps:"
echo "1. Point your domain to $SERVER_IP"
echo "2. Setup SSL with: certbot --nginx -d yourdomain.com"
echo "3. Configure firewall rules as needed"
echo ""
echo "💡 The neural cluster is now actually running real ML libraries!"
echo "   No more fake progress bars - everything is operational."
echo ""