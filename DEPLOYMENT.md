# SolarFlow Deployment Guide

**Version**: 2.3.0  
**Last Updated**: 2026-02-08

---

## Deployment Options

1. **GitHub Pages** (Current - Static)
2. **VPS** (Full Features - Dynamic)
3. **Local Development**

---

## 1. GitHub Pages Deployment

### Current Setup

**URL**: `https://samskiezz.github.io/solarflowminoinworldlloader/`

**Auto-deploys** on push to `main` branch.

### Manual Deployment

```bash
# 1. Build (if needed - currently static)
cd solarflowminoinworldlloader

# 2. Commit changes
git add .
git commit -m "Deploy update"

# 3. Push to main
git push origin main

# GitHub Actions will auto-deploy to gh-pages branch
```

### Configuration

**Settings → Pages**:
- Source: Deploy from branch
- Branch: `gh-pages`
- Folder: `/` (root)

### Limitations

- ✅ All static features work
- ✅ localStorage persistence
- ✅ Client-side processing
- ❌ No server-side processing
- ❌ No real-time VPS sync
- ❌ No backend API

---

## 2. VPS Deployment (Full Features)

### Requirements

- Ubuntu 20.04+ or similar
- Nginx
- Node.js 16+ (optional - for build tools)
- SSL certificate (Let's Encrypt)
- Domain name (e.g., projectsolar.cloud)

### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install nginx
sudo apt install nginx -y

# Install Node.js (optional)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Step 2: Clone Repository

```bash
# Create directory
sudo mkdir -p /var/www/solarflow
cd /var/www/solarflow

# Clone
sudo git clone https://github.com/samskiezz/solarflowminoinworldlloader.git .

# Set permissions
sudo chown -R www-data:www-data /var/www/solarflow
```

### Step 3: Nginx Configuration

Create `/etc/nginx/sites-available/solarflow`:

```nginx
server {
    listen 80;
    server_name projectsolar.cloud www.projectsolar.cloud;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name projectsolar.cloud www.projectsolar.cloud;
    
    # SSL Configuration (certbot will add these)
    ssl_certificate /etc/letsencrypt/live/projectsolar.cloud/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/projectsolar.cloud/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    # Root directory
    root /var/www/solarflow/docs;
    index index.html;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    
    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/javascript application/xml+rss application/json;
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # No cache for HTML
    location ~* \.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
    }
    
    # Main location
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # API endpoint (if backend added)
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/solarflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 4: SSL Certificate

```bash
# Get certificate
sudo certbot --nginx -d projectsolar.cloud -d www.projectsolar.cloud

# Auto-renewal is configured by default
# Test renewal
sudo certbot renew --dry-run
```

### Step 5: Auto-Deploy Script

Create `/var/www/solarflow/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "🚀 Deploying SolarFlow..."

# Navigate to directory
cd /var/www/solarflow

# Pull latest
echo "📥 Pulling latest code..."
git fetch origin
git reset --hard origin/main

# Set permissions
echo "🔒 Setting permissions..."
chown -R www-data:www-data /var/www/solarflow

# Reload nginx
echo "🔄 Reloading nginx..."
systemctl reload nginx

echo "✅ Deployment complete!"
echo "🌐 Site: https://projectsolar.cloud"
```

Make executable:

```bash
sudo chmod +x /var/www/solarflow/deploy.sh
```

### Step 6: Deploy

```bash
sudo /var/www/solarflow/deploy.sh
```

### Step 7: Configure VPS Integration

Update `/var/www/solarflow/docs/real-vps-integration.js`:

```javascript
// Change VPS endpoint
this.vpsEndpoint = 'https://projectsolar.cloud/api';
```

---

## 3. Local Development

### Setup

```bash
# Clone
git clone https://github.com/samskiezz/solarflowminoinworldlloader.git
cd solarflowminoinworldlloader

# Serve with Python
python -m http.server 8000

# OR with Node.js
npx http-server -p 8000 docs/

# OR with PHP
php -S localhost:8000 -t docs/
```

### Access

Open browser: `http://localhost:8000`

### Development Mode

For development with auto-reload:

```bash
# Install live-server
npm install -g live-server

# Run
cd docs
live-server --port=8000
```

---

## Post-Deployment Checklist

### Functionality Tests

- [ ] Page loads without errors
- [ ] All 18 systems show "Operational"
- [ ] Central Data Loader initializes
- [ ] Minions load from minions.json (24 total)
- [ ] CER Products load (9,247 total)
- [ ] Health monitor shows real metrics
- [ ] Credits can be awarded
- [ ] localStorage persists across refresh
- [ ] System test passes all checks
- [ ] No console errors

### Performance Tests

- [ ] Page load < 3 seconds
- [ ] First contentful paint < 1.5 seconds
- [ ] API calls complete in < 1 second
- [ ] No memory leaks (refresh 10 times, check growth)
- [ ] localStorage usage < 5MB

### Security Tests

- [ ] HTTPS enabled (VPS only)
- [ ] Security headers present
- [ ] XSS prevention works
- [ ] Input validation active
- [ ] Rate limiting functional
- [ ] No exposed secrets in source

### Browser Compatibility

- [ ] Chrome/Edge (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Chrome
- [ ] Mobile Safari

---

## Monitoring

### Health Checks

**Endpoint**: `/health` (VPS only)

```bash
curl https://projectsolar.cloud/health
# Should return: healthy
```

### Performance Monitoring

From browser console:

```javascript
// Get performance summary
const summary = performanceMonitor.getSummary();
console.log('Page load:', summary.pageLoad.fullLoad + 'ms');
console.log('Memory:', summary.memory.percentage);

// Check for slow operations
const slow = performanceMonitor.getMetrics().slowOperations;
console.log('Slow operations:', slow.length);
```

### Error Monitoring

```javascript
// Get error statistics
const stats = errorHandler.getErrorStats();
console.log('Total errors:', stats.total);
console.log('Last 24h:', stats.last24h);
console.log('Top errors:', stats.topErrors);
```

### Security Monitoring

```javascript
// Check security log
const log = securityUtils.getSecurityLog(50);
console.log('Security events:', log.length);

// Look for rate limit violations
const rateLimit = log.filter(e => e.type === 'rate-limit');
console.log('Rate limit violations:', rateLimit.length);
```

---

## Backup & Recovery

### Backup localStorage Data

```javascript
// Export all data
const backup = {};
for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
        backup[key] = localStorage[key];
    }
}

// Download as JSON
const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'solarflow-backup-' + Date.now() + '.json';
a.click();
```

### Restore from Backup

```javascript
// Load backup file, then:
const backup = JSON.parse(backupData);
for (let key in backup) {
    localStorage.setItem(key, backup[key]);
}
console.log('✅ Backup restored');
```

### VPS File Backup

```bash
# Backup entire site
sudo tar -czf /backup/solarflow-$(date +%Y%m%d).tar.gz /var/www/solarflow

# Automated daily backup (cron)
echo "0 2 * * * root tar -czf /backup/solarflow-\$(date +\%Y\%m\%d).tar.gz /var/www/solarflow" | sudo tee /etc/cron.d/solarflow-backup
```

---

## Troubleshooting

### Site not loading

**Check**:
1. Nginx running: `sudo systemctl status nginx`
2. Config valid: `sudo nginx -t`
3. Permissions: `ls -la /var/www/solarflow/docs/`
4. Firewall: `sudo ufw status`

**Fix**:
```bash
sudo systemctl restart nginx
sudo chown -R www-data:www-data /var/www/solarflow
```

### SSL errors

**Check**:
1. Certificate valid: `sudo certbot certificates`
2. Renewal working: `sudo certbot renew --dry-run`

**Fix**:
```bash
sudo certbot --nginx -d projectsolar.cloud
```

### Data not loading

**Check browser console**:
- 404 errors → File paths wrong
- CORS errors → Check nginx config
- Parse errors → Check JSON validity

**Fix**:
```javascript
// Check central data loader
const status = centralDataLoader.getStatus();
console.log(status);

// Manual load
await centralDataLoader.init();
```

### Performance issues

**Check**:
```javascript
const summary = performanceMonitor.getSummary();
console.log('Slow API calls:', summary.apiCalls.slowCalls);
console.log('Slow renders:', summary.renders.slowRenders);
```

**Optimize**:
```javascript
performanceMonitor.optimizeLocalStorage();
```

---

## Rollback

### GitHub Pages

```bash
# Revert last commit
git revert HEAD
git push origin main
```

### VPS

```bash
# Checkout previous version
cd /var/www/solarflow
sudo git log --oneline  # Find commit hash
sudo git checkout <previous-hash>
sudo systemctl reload nginx
```

---

## Update Process

### Regular Updates

```bash
# 1. Pull latest code
cd /var/www/solarflow
sudo git pull origin main

# 2. Test locally (optional)
python -m http.server 8000

# 3. Deploy
sudo /var/www/solarflow/deploy.sh

# 4. Verify
curl https://projectsolar.cloud/health
```

### Breaking Changes

1. **Announce** maintenance window
2. **Backup** current version
3. **Test** in staging environment
4. **Deploy** during low-traffic period
5. **Monitor** error logs
6. **Rollback** if issues detected

---

## Scaling

### Current Capacity

- **Static hosting**: Unlimited (GitHub/CDN)
- **VPS**: ~1000 concurrent users (single server)

### If Load Increases

1. **Enable CDN** (Cloudflare)
2. **Add caching** (Redis)
3. **Load balancer** (multiple VPS)
4. **Database** (PostgreSQL for state)

---

## Security

### Regular Tasks

**Weekly**:
- [ ] Review security log
- [ ] Check for failed login attempts
- [ ] Monitor rate limit violations

**Monthly**:
- [ ] Update packages: `sudo apt update && sudo apt upgrade`
- [ ] Review SSL certificate
- [ ] Check nginx logs
- [ ] Update Node.js if needed

**Quarterly**:
- [ ] Security audit
- [ ] Performance review
- [ ] Backup verification
- [ ] Disaster recovery test

---

## Support

**Issues**: https://github.com/samskiezz/solarflowminoinworldlloader/issues  
**Email**: support@projectsolar.cloud  
**Documentation**: /docs/README.md

---

**Deployed with evidence-first principles. Every deployment verified.**