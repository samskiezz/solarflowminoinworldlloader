# 🚀 SolarFlow Production Deployment Guide

This guide covers deploying SolarFlow to a production VPS server (like OpenClaw) with proper data persistence, monitoring, and management.

## 📋 **Prerequisites**

### **Server Requirements**
- **OS:** Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Node.js:** v18.0.0 or higher
- **RAM:** Minimum 2GB (4GB recommended)
- **Storage:** 10GB+ available space
- **Network:** HTTP/HTTPS access (ports 80/443 or custom)

### **Local Requirements**
- Git installed
- SSH access to your VPS
- Basic command line knowledge

## 🌐 **OpenClaw VPS Deployment**

### **Step 1: Prepare Your VPS**

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 20 (recommended)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Create solarflow user (security best practice)
sudo useradd -m -s /bin/bash solarflow
sudo usermod -aG sudo solarflow

# Create application directories
sudo mkdir -p /var/lib/solarflow /var/log/solarflow
sudo chown -R solarflow:solarflow /var/lib/solarflow /var/log/solarflow
```

### **Step 2: Deploy Application**

```bash
# Switch to solarflow user
sudo su - solarflow

# Clone the repository
git clone https://github.com/samskiezz/solarflowminoinworldlloader.git
cd solarflowminoinworldlloader

# Install dependencies
npm install

# Make bootloader executable
chmod +x boot.js

# Test the application
npm start
```

### **Step 3: Production Configuration**

Create or modify `config.production.json`:

```bash
# Edit production config
nano config.production.json
```

**Key settings to configure:**
```json
{
  "server": {
    "port": 3000,
    "staticDir": "./docs"
  },
  "openclaw": {
    "dataDirectory": "/var/lib/solarflow",
    "logDirectory": "/var/log/solarflow",
    "domain": "your-domain.com",
    "enableSSL": true
  }
}
```

### **Step 4: Start with PM2**

```bash
# Start with PM2
pm2 start boot.js --name "solarflow" --log /var/log/solarflow/pm2.log

# Save PM2 configuration
pm2 save

# Enable auto-start on boot
pm2 startup
# Follow the instructions to enable startup script

# Check status
pm2 status
pm2 logs solarflow
```

## 🔧 **Manual VPS Deployment**

### **Step 1: Server Setup**

```bash
# Install Node.js (if not using OpenClaw)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

# Install process manager
sudo npm install -g pm2

# Create application user
sudo useradd -m -s /bin/bash solarflow
sudo mkdir -p /home/solarflow/app /var/lib/solarflow /var/log/solarflow
sudo chown -R solarflow:solarflow /home/solarflow /var/lib/solarflow /var/log/solarflow
```

### **Step 2: Application Deployment**

```bash
# Deploy as solarflow user
sudo su - solarflow

# Clone and setup
cd /home/solarflow
git clone https://github.com/samskiezz/solarflowminoinworldlloader.git app
cd app

# Install dependencies
npm install

# Set environment variables
export NODE_ENV=production
export SOLARFLOW_DATA_DIR=/var/lib/solarflow
export SOLARFLOW_LOG_DIR=/var/log/solarflow
export SOLARFLOW_PORT=3000
```

### **Step 3: Reverse Proxy Setup (Nginx)**

```bash
# Install Nginx
sudo apt install nginx

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/solarflow
```

**Nginx configuration:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/solarflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### **Step 4: SSL Certificate (Let's Encrypt)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test auto-renewal
sudo certbot renew --dry-run
```

## 🔄 **Data Persistence & Backups**

### **Automatic Backups**

The bootloader automatically creates backups every 5 minutes and keeps 48 backups (24 hours).

**Backup locations:**
- `/var/lib/solarflow/backups/` - Automated backups
- `/var/lib/solarflow/state/solarflow.json` - Current state

### **Manual Backup**

```bash
# Create manual backup
cd /home/solarflow/app
npm run backup

# Or manually
sudo tar -czf /tmp/solarflow-backup-$(date +%Y%m%d).tar.gz /var/lib/solarflow
```

### **Restore from Backup**

```bash
# Stop application
pm2 stop solarflow

# Restore data
sudo tar -xzf /tmp/solarflow-backup-YYYYMMDD.tar.gz -C /

# Restart application
pm2 start solarflow
```

## 📊 **Monitoring & Maintenance**

### **System Monitoring**

```bash
# Check application status
pm2 status
pm2 logs solarflow

# Check system resources
htop
df -h
free -h

# Check application health
curl http://localhost:3000/api/health
```

### **Log Management**

```bash
# View application logs
sudo tail -f /var/log/solarflow/solarflow-$(date +%Y-%m-%d).log

# View PM2 logs
pm2 logs solarflow --lines 100

# Rotate logs (if needed)
sudo logrotate -f /etc/logrotate.d/solarflow
```

### **Performance Monitoring**

The application provides a health endpoint:
```bash
curl http://localhost:3000/api/health
```

Response includes:
- System uptime
- Memory usage
- Application version
- Health status

## 🔧 **Environment Variables**

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `SOLARFLOW_PORT` | Server port | `3000` |
| `SOLARFLOW_DATA_DIR` | Data directory | `/var/lib/solarflow` |
| `SOLARFLOW_LOG_DIR` | Log directory | `/var/log/solarflow` |
| `SOLARFLOW_AUTO_SAVE_INTERVAL` | Auto-save interval (ms) | `30000` |

## 🚀 **Available Scripts**

```bash
# Start production server
npm start

# Start with bootloader (recommended)
node boot.js

# Run with PM2 (production)
pm2 start boot.js --name solarflow

# Build static assets
npm run build

# Validate data integrity
npm run validate

# Create backup
npm run backup

# Deploy updates
npm run deploy
```

## 🔒 **Security Considerations**

### **Firewall Setup**
```bash
# UFW configuration
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### **Application Security**
- Change default ports if needed
- Use strong passwords for any admin features
- Regular security updates: `sudo apt update && sudo apt upgrade`
- Monitor logs for suspicious activity

### **SSL/HTTPS**
- Always use HTTPS in production
- Set up automatic certificate renewal
- Use security headers (handled by application)

## 🔄 **Updates & Maintenance**

### **Updating SolarFlow**

```bash
# As solarflow user
cd /home/solarflow/app

# Pull latest changes
git pull origin main

# Install new dependencies
npm install

# Restart application
pm2 restart solarflow
```

### **Scheduled Maintenance**

Create a cron job for automated maintenance:
```bash
# Edit crontab
crontab -e

# Add maintenance tasks
0 2 * * * cd /home/solarflow/app && npm run validate >> /var/log/solarflow/maintenance.log 2>&1
0 4 * * 0 cd /home/solarflow/app && git pull && npm install && pm2 restart solarflow
```

## 🆘 **Troubleshooting**

### **Common Issues**

**Application won't start:**
```bash
# Check logs
pm2 logs solarflow
sudo tail -f /var/log/solarflow/solarflow-*.log

# Check port usage
sudo netstat -tulpn | grep :3000

# Check permissions
ls -la /var/lib/solarflow /var/log/solarflow
```

**Memory issues:**
```bash
# Check memory usage
free -h
pm2 monit

# Restart if needed
pm2 restart solarflow
```

**Database corruption:**
```bash
# Restore from backup
pm2 stop solarflow
cp /var/lib/solarflow/backups/backup-latest.json /var/lib/solarflow/state/solarflow.json
pm2 start solarflow
```

## 📞 **Support**

For deployment issues:
1. Check the logs first: `/var/log/solarflow/`
2. Verify configuration: `config.production.json`
3. Test health endpoint: `/api/health`
4. Create GitHub issue with logs and system info

## ✅ **Production Checklist**

- [ ] Server meets minimum requirements
- [ ] Node.js 18+ installed
- [ ] Application user created
- [ ] Directories created with correct permissions
- [ ] Dependencies installed
- [ ] Configuration file created
- [ ] PM2 process manager configured
- [ ] Reverse proxy configured (if needed)
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backup system verified
- [ ] Monitoring setup
- [ ] Health checks working
- [ ] Auto-startup configured
- [ ] Domain name pointing to server
- [ ] Application accessible via web browser

Once complete, your SolarFlow installation will be production-ready with automatic data persistence, backups, and monitoring!