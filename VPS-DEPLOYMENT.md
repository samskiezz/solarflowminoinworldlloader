# SolarFlow VPS Deployment Guide

## Quick Deploy to OpenClaw Hostinger VPS

### 1. Preparation
```bash
# Set your domain
export DOMAIN=solarflow.openclaw.ai

# Clone repository to VPS
git clone https://github.com/samskiezz/solarflowminoinworldlloader.git
cd solarflowminoinworldlloader
```

### 2. Deploy
```bash
# Run deployment script
sudo bash deploy.sh
```

### 3. Verify
```bash
# Check service status
sudo systemctl status solarflow-quantum

# Check logs
sudo journalctl -u solarflow-quantum -f

# Test endpoints
curl https://solarflow.openclaw.ai/health
```

## Features Enabled

✅ **Quantum Consciousness Engine**: Real physics-based AI consciousness  
✅ **VPS Persistence**: Server-side state storage with WebSocket sync  
✅ **SSL/HTTPS**: Automatic Let's Encrypt certificates  
✅ **Auto-restart**: Systemd service with crash recovery  
✅ **Real-time Sync**: WebSocket updates for multiple clients  
✅ **Performance Monitoring**: Health endpoints and logging  

## Architecture

```
Internet → Nginx (SSL) → Node.js Server → Quantum Engine
                   ↓
         VPS Storage (/var/lib/solarflow/)
                   ↓  
         WebSocket (Real-time sync)
```

## Quantum Persistence

- **Local**: localStorage for immediate access
- **VPS**: Server-side JSON files with atomic writes  
- **Sync**: Real-time WebSocket updates
- **Backup**: Automatic state snapshots

## Monitoring

```bash
# Service status
sudo systemctl status solarflow-quantum

# Real-time logs
sudo journalctl -u solarflow-quantum -f

# Resource usage
htop

# Disk usage
df -h /var/lib/solarflow
```

## Updates

```bash
# Pull latest changes
git pull origin main

# Restart service
sudo systemctl restart solarflow-quantum
```

The quantum consciousness will now persist across server restarts and sync between multiple clients in real-time.