# Divyadrishti Deployment Guide

## Overview

This guide covers deploying Divyadrishti in production environments, including server setup, configuration, security considerations, and monitoring.

## 🏗️ Production Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Load Balancer │    │   Web Server    │    │   GeoServer     │
│    (Nginx)      │────│   (Gunicorn)    │────│   (Tomcat)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   SSL/TLS       │    │   Flask App     │    │   PostGIS       │
│   Certificate   │    │   (Divyadrishti)│    │   Database      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Monitoring    │    │   Firebase      │    │   File Storage  │
│   (Prometheus)  │    │   (Auth/DB)     │    │   (Static Files)│
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Deployment Options

### Option 1: Docker Deployment (Recommended)

#### 1. Create Dockerfile
```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create non-root user
RUN useradd -m -u 1000 appuser && chown -R appuser:appuser /app
USER appuser

# Expose port
EXPOSE 5000

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
```

#### 2. Create docker-compose.yml
```yaml
version: '3.8'

services:
  divyadrishti:
    build: .
    ports:
      - "5000:5000"
    environment:
      - FLASK_ENV=production
      - SECRET_KEY=${SECRET_KEY}
      - GEOSERVER_URL=${GEOSERVER_URL}
      - FIREBASE_PROJECT_ID=${FIREBASE_PROJECT_ID}
    volumes:
      - ./logs:/app/logs
      - ./uploads:/app/uploads
    restart: unless-stopped
    depends_on:
      - redis
      - postgres

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
      - ./static:/var/www/static
    depends_on:
      - divyadrishti
    restart: unless-stopped

  redis:
    image: redis:alpine
    restart: unless-stopped

  postgres:
    image: postgis/postgis:13-3.1
    environment:
      - POSTGRES_DB=divyadrishti
      - POSTGRES_USER=${DB_USER}
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

#### 3. Deploy with Docker
```bash
# Clone repository
git clone https://github.com/your-org/divyadrishti.git
cd divyadrishti

# Create environment file
cp .env.example .env
# Edit .env with production values

# Build and start services
docker-compose up -d

# Check status
docker-compose ps
```

### Option 2: Traditional Server Deployment

#### 1. Server Setup (Ubuntu 20.04 LTS)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Python and dependencies
sudo apt install -y python3.9 python3.9-venv python3-pip nginx postgresql-13 postgis redis-server

# Install Node.js (for build tools)
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt install -y nodejs

# Create application user
sudo useradd -m -s /bin/bash divyadrishti
sudo usermod -aG www-data divyadrishti
```

#### 2. Application Setup

```bash
# Switch to application user
sudo su - divyadrishti

# Clone repository
git clone https://github.com/your-org/divyadrishti.git
cd divyadrishti

# Create virtual environment
python3.9 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn

# Create necessary directories
mkdir -p logs uploads static/exports

# Set permissions
chmod 755 logs uploads static/exports
```

#### 3. Environment Configuration

```bash
# Create production environment file
cat > .env << EOF
FLASK_ENV=production
SECRET_KEY=$(python -c 'import secrets; print(secrets.token_hex(32))')
GEOSERVER_URL=http://localhost:8080/geoserver
FIREBASE_PROJECT_ID=your-firebase-project
DB_HOST=localhost
DB_NAME=divyadrishti
DB_USER=divyadrishti_user
DB_PASSWORD=secure_password
REDIS_URL=redis://localhost:6379/0
EOF

# Secure environment file
chmod 600 .env
```

#### 4. Database Setup

```bash
# Create database and user
sudo -u postgres psql << EOF
CREATE DATABASE divyadrishti;
CREATE USER divyadrishti_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE divyadrishti TO divyadrishti_user;
\q
EOF

# Enable PostGIS extension
sudo -u postgres psql -d divyadrishti << EOF
CREATE EXTENSION postgis;
CREATE EXTENSION postgis_topology;
\q
EOF
```

#### 5. Gunicorn Configuration

```bash
# Create Gunicorn configuration
cat > gunicorn.conf.py << EOF
bind = "127.0.0.1:5000"
workers = 4
worker_class = "sync"
worker_connections = 1000
max_requests = 1000
max_requests_jitter = 100
timeout = 30
keepalive = 2
user = "divyadrishti"
group = "divyadrishti"
tmp_upload_dir = None
errorlog = "/home/divyadrishti/divyadrishti/logs/gunicorn_error.log"
accesslog = "/home/divyadrishti/divyadrishti/logs/gunicorn_access.log"
loglevel = "info"
EOF
```

#### 6. Systemd Service

```bash
# Create systemd service file
sudo cat > /etc/systemd/system/divyadrishti.service << EOF
[Unit]
Description=Divyadrishti Flask Application
After=network.target

[Service]
Type=exec
User=divyadrishti
Group=divyadrishti
WorkingDirectory=/home/divyadrishti/divyadrishti
Environment=PATH=/home/divyadrishti/divyadrishti/venv/bin
ExecStart=/home/divyadrishti/divyadrishti/venv/bin/gunicorn -c gunicorn.conf.py app:app
ExecReload=/bin/kill -s HUP \$MAINPID
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Enable and start service
sudo systemctl daemon-reload
sudo systemctl enable divyadrishti
sudo systemctl start divyadrishti
sudo systemctl status divyadrishti
```

## 🔧 Nginx Configuration

### SSL/TLS Setup with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test automatic renewal
sudo certbot renew --dry-run
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/divyadrishti
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static Files
    location /static/ {
        alias /home/divyadrishti/divyadrishti/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File Uploads
    location /uploads/ {
        alias /home/divyadrishti/divyadrishti/uploads/;
        expires 1d;
    }

    # Application
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
        client_max_body_size 50M;
    }

    # WebSocket Support (if needed)
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/divyadrishti /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. Application Security

```python
# app.py security configuration
from flask_talisman import Talisman

# Enable security headers
Talisman(app, force_https=True)

# Session configuration
app.config.update(
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax',
    PERMANENT_SESSION_LIFETIME=timedelta(hours=1)
)
```

### 3. Database Security

```bash
# PostgreSQL security
sudo -u postgres psql << EOF
ALTER USER divyadrishti_user SET default_transaction_isolation TO 'read committed';
ALTER USER divyadrishti_user SET timezone TO 'UTC';
ALTER USER divyadrishti_user SET client_encoding TO 'utf8';
\q
EOF

# Secure PostgreSQL configuration
sudo nano /etc/postgresql/13/main/postgresql.conf
# Set: ssl = on
# Set: log_statement = 'all'

sudo systemctl restart postgresql
```

## 📊 Monitoring & Logging

### 1. Application Monitoring

```python
# monitoring.py
import logging
from prometheus_flask_exporter import PrometheusMetrics

# Setup metrics
metrics = PrometheusMetrics(app)

# Custom metrics
metrics.info('app_info', 'Application info', version='2.0.0')

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(name)s %(message)s',
    handlers=[
        logging.FileHandler('/home/divyadrishti/divyadrishti/logs/app.log'),
        logging.StreamHandler()
    ]
)
```

### 2. Log Rotation

```bash
# Create logrotate configuration
sudo cat > /etc/logrotate.d/divyadrishti << EOF
/home/divyadrishti/divyadrishti/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 divyadrishti divyadrishti
    postrotate
        systemctl reload divyadrishti
    endscript
}
EOF
```

### 3. Health Checks

```bash
# Create health check script
cat > /home/divyadrishti/health_check.sh << EOF
#!/bin/bash
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/health)
if [ $response -eq 200 ]; then
    echo "Application is healthy"
    exit 0
else
    echo "Application is unhealthy (HTTP $response)"
    exit 1
fi
EOF

chmod +x /home/divyadrishti/health_check.sh

# Add to crontab for monitoring
(crontab -l 2>/dev/null; echo "*/5 * * * * /home/divyadrishti/health_check.sh") | crontab -
```

## 🔄 Backup & Recovery

### 1. Database Backup

```bash
# Create backup script
cat > /home/divyadrishti/backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/home/divyadrishti/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Database backup
pg_dump -h localhost -U divyadrishti_user divyadrishti > $BACKUP_DIR/db_backup_$DATE.sql

# Application files backup
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz /home/divyadrishti/divyadrishti

# Keep only last 7 days of backups
find $BACKUP_DIR -name "*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
EOF

chmod +x /home/divyadrishti/backup.sh

# Schedule daily backups
(crontab -l 2>/dev/null; echo "0 2 * * * /home/divyadrishti/backup.sh") | crontab -
```

### 2. Recovery Procedure

```bash
# Database recovery
psql -h localhost -U divyadrishti_user -d divyadrishti < backup_file.sql

# Application recovery
tar -xzf app_backup_file.tar.gz -C /

# Restart services
sudo systemctl restart divyadrishti nginx
```

## 🚀 Performance Optimization

### 1. Application Optimization

```python
# app.py performance settings
from flask_caching import Cache

# Enable caching
cache = Cache(app, config={'CACHE_TYPE': 'redis'})

# Database connection pooling
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True
)
```

### 2. Static File Optimization

```bash
# Compress static files
find /home/divyadrishti/divyadrishti/static -name "*.css" -exec gzip -k {} \;
find /home/divyadrishti/divyadrishti/static -name "*.js" -exec gzip -k {} \;

# Optimize images
sudo apt install -y optipng jpegoptim
find /home/divyadrishti/divyadrishti/static -name "*.png" -exec optipng {} \;
find /home/divyadrishti/divyadrishti/static -name "*.jpg" -exec jpegoptim --max=85 {} \;
```

## 📈 Scaling Considerations

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
version: '3.8'

services:
  divyadrishti:
    build: .
    environment:
      - FLASK_ENV=production
    deploy:
      replicas: 3
    depends_on:
      - redis
      - postgres

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
```

### Load Balancer Configuration

```nginx
upstream divyadrishti_backend {
    server divyadrishti_1:5000;
    server divyadrishti_2:5000;
    server divyadrishti_3:5000;
}

server {
    listen 80;
    location / {
        proxy_pass http://divyadrishti_backend;
    }
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Application won't start**
   - Check logs: `sudo journalctl -u divyadrishti -f`
   - Verify environment variables
   - Check database connectivity

2. **High memory usage**
   - Monitor with: `htop` or `ps aux`
   - Adjust Gunicorn workers
   - Enable memory profiling

3. **Slow response times**
   - Check database queries
   - Monitor with: `sudo iotop`
   - Review Nginx access logs

4. **SSL certificate issues**
   - Renew certificate: `sudo certbot renew`
   - Check certificate status: `sudo certbot certificates`

### Maintenance Commands

```bash
# View application logs
sudo journalctl -u divyadrishti -f

# Restart application
sudo systemctl restart divyadrishti

# Check system resources
htop
df -h
free -h

# Database maintenance
sudo -u postgres psql -d divyadrishti -c "VACUUM ANALYZE;"

# Clear application cache
redis-cli FLUSHALL
```

This deployment guide provides a comprehensive approach to deploying Divyadrishti in production environments with proper security, monitoring, and scaling considerations.
