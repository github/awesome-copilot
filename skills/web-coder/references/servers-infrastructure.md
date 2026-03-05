# Servers & Infrastructure Reference

Web servers, hosting, deployment, and infrastructure concepts.

## Web Servers

### Popular Web Servers

#### Nginx

High-performance web server and reverse proxy.

**Features**:
- Load balancing
- Reverse proxy
- Static file serving
- SSL/TLS termination

**Basic Configuration**:
```nginx
server {
    listen 80;
    server_name example.com;
    
    # Serve static files
    location / {
        root /var/www/html;
        index index.html;
    }
    
    # Proxy to backend
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
    
    # SSL configuration
    listen 443 ssl;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
}
```

#### Apache HTTP Server

Widely-used web server.

**Features**:
- .htaccess support
- Module system
- Virtual hosting

**Basic .htaccess**:
```apache
# Redirect to HTTPS
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# Custom error pages
ErrorDocument 404 /404.html

# Cache control
<FilesMatch "\.(jpg|jpeg|png|gif|css|js)$">
    Header set Cache-Control "max-age=31536000, public"
</FilesMatch>
```

#### Node.js Servers

**Express.js**:
```javascript
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));

app.get('/api/users', (req, res) => {
  res.json({ users: [] });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

**Built-in HTTP Server**:
```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html' });
  res.end('<h1>Hello World</h1>');
});

server.listen(3000);
```

## Hosting Options

### Static Hosting

For static sites (HTML, CSS, JS).

**Platforms**:
- **Vercel**: Automatic deployments, serverless functions
- **Netlify**: Build automation, edge functions
- **GitHub Pages**: Free for public repos
- **Cloudflare Pages**: Fast global CDN
- **AWS S3 + CloudFront**: Scalable, requires setup

**Deployment**:
```bash
# Vercel
npx vercel

# Netlify
npx netlify deploy --prod

# GitHub Pages (via Git)
git push origin main
```

### Platform as a Service (PaaS)

Managed application hosting.

**Platforms**:
- **Heroku**: Easy deployment, add-ons
- **Railway**: Modern developer experience
- **Render**: Unified platform
- **Google App Engine**: Automatic scaling
- **Azure App Service**: Microsoft cloud

**Example (Heroku)**:
```bash
# Deploy
git push heroku main

# Scale
heroku ps:scale web=2

# View logs
heroku logs --tail
```

### Infrastructure as a Service (IaaS)

Virtual servers (more control, more setup).

**Providers**:
- **AWS EC2**: Amazon virtual servers
- **Google Compute Engine**: Google VMs
- **DigitalOcean Droplets**: Simple VPS
- **Linode**: Developer-friendly VPS

### Containerization

**Docker**:
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

```bash
# Build image
docker build -t my-app .

# Run container
docker run -p 3000:3000 my-app
```

**Docker Compose**:
```yaml
version: '3'
services:
  web:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://db:5432
  db:
    image: postgres:15
    environment:
      POSTGRES_PASSWORD: password
```

### Kubernetes

Container orchestration platform.

**Concepts**:
- **Pods**: Smallest deployable units
- **Services**: Expose pods
- **Deployments**: Manage replicas
- **Ingress**: HTTP routing

## Content Delivery Network (CDN)

Distributed network for fast content delivery.

**Benefits**:
- Faster load times
- Reduced server load
- DDoS protection
- Geographic distribution

**Popular CDNs**:
- **Cloudflare**: Free tier, DDoS protection
- **AWS CloudFront**: Amazon CDN
- **Fastly**: Edge computing
- **Akamai**: Enterprise CDN

**CDN for Libraries**:
```html
<!-- CDN-hosted library -->
<script src="https://cdn.jsdelivr.net/npm/vue@3/dist/vue.global.js"></script>
```

## Domain Name System (DNS)

Translates domain names to IP addresses.

### DNS Records

| Type | Purpose | Example |
|------|---------|---------|
| A | IPv4 address | `example.com → 192.0.2.1` |
| AAAA | IPv6 address | `example.com → 2001:db8::1` |
| CNAME | Alias to another domain | `www → example.com` |
| MX | Mail server | `mail.example.com` |
| TXT | Text information | SPF, DKIM records |
| NS | Nameserver | DNS delegation |

**DNS Lookup**:
```bash
# Command line
nslookup example.com
dig example.com

# JavaScript (not direct DNS, but IP lookup)
fetch('https://dns.google/resolve?name=example.com')
```

### DNS Propagation

Time for DNS changes to spread globally (typically 24-48 hours).

## SSL/TLS Certificates

Encrypt data between client and server.

### Certificate Types

- **Domain Validation (DV)**: Basic, automated
- **Organization Validation (OV)**: Verified business
- **Extended Validation (EV)**: Highest validation

### Getting Certificates

**Let's Encrypt** (Free):
```bash
# Certbot
sudo certbot --nginx -d example.com
```

**Cloudflare** (Free with Cloudflare DNS)

### HTTPS Configuration

```nginx
# Nginx HTTPS
server {
    listen 443 ssl http2;
    server_name example.com;
    
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}
```

## Load Balancing

Distribute traffic across multiple servers.

### Load Balancing Algorithms

- **Round Robin**: Rotate through servers
- **Least Connections**: Send to server with fewest connections
- **IP Hash**: Route based on client IP
- **Weighted**: Servers have different capacities

**Nginx Load Balancer**:
```nginx
upstream backend {
    server server1.example.com weight=3;
    server server2.example.com;
    server server3.example.com;
}

server {
    location / {
        proxy_pass http://backend;
    }
}
```

## Reverse Proxy

Server that forwards requests to backend servers.

**Benefits**:
- Load balancing
- SSL termination
- Caching
- Security (hide backend)

**Nginx Reverse Proxy**:
```nginx
server {
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Caching Strategies

### Browser Caching

```http
Cache-Control: public, max-age=31536000, immutable
```

### Server-Side Caching

**Redis**:
```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache data
await client.set('user:1', JSON.stringify(user), {
  EX: 3600 // Expire after 1 hour
});

// Retrieve cached data
const cached = await client.get('user:1');
```

### CDN Caching

Static assets cached at edge locations.

## Environment Variables

Configuration without hardcoding.

```bash
# .env file
DATABASE_URL=postgresql://localhost/mydb
API_KEY=secret-key-here
NODE_ENV=production
```

```javascript
// Access in Node.js
require('dotenv').config();
const dbUrl = process.env.DATABASE_URL;
```

**Best Practices**:
- Never commit .env to Git
- Use .env.example as template
- Different values per environment
- Secure secret values

## Deployment Strategies

### Continuous Deployment (CD)

Automatically deploy when code is pushed.

**GitHub Actions**:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

### Blue-Green Deployment

Two identical environments, switch traffic.

### Canary Deployment

Gradually roll out to subset of users.

### Rolling Deployment

Update instances incrementally.

## Process Managers

Keep applications running.

### PM2

```bash
# Start application
pm2 start app.js

# Start with name
pm2 start app.js --name my-app

# Cluster mode (use all CPUs)
pm2 start app.js -i max

# Monitor
pm2 monit

# Restart
pm2 restart my-app

# Stop
pm2 stop my-app

# Logs
pm2 logs

# Startup script (restart on reboot)
pm2 startup
pm2 save
```

### systemd

Linux service manager.

```ini
# /etc/systemd/system/myapp.service
[Unit]
Description=My Node App

[Service]
ExecStart=/usr/bin/node /path/to/app.js
Restart=always
User=nobody
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable myapp
sudo systemctl start myapp
sudo systemctl status myapp
```

## Monitoring & Logging

### Application Monitoring

- **New Relic**: APM, monitoring
- **Datadog**: Infrastructure monitoring
- **Grafana**: Visualization
- **Prometheus**: Metrics collection

### Log Aggregation

- **Elasticsearch + Kibana**: Search and visualize logs
- **Splunk**: Enterprise log management
- **Papertrail**: Cloud logging

### Uptime Monitoring

- **UptimeRobot**: Free uptime checks
- **Pingdom**: Monitoring service
- **StatusCake**: Website monitoring

## Security Best Practices

### Server Hardening

- Keep software updated
- Use firewall (ufw, iptables)
- Disable root SSH login
- Use SSH keys (not passwords)
- Limit user permissions
- Regular backups

### Application Security

- Use HTTPS everywhere
- Implement rate limiting
- Validate all input
- Use security headers
- Keep dependencies updated
- Regular security audits

## Backup Strategies

### Database Backups

```bash
# PostgreSQL
pg_dump dbname > backup.sql

# MySQL
mysqldump -u user -p dbname > backup.sql

# MongoDB
mongodump --db mydb --out /backup/
```

### Automated Backups

- Daily backups
- Multiple retention periods
- Off-site storage
- Test restores regularly

## Scalability

### Vertical Scaling

Increase server resources (CPU, RAM).

**Pros**: Simple  
**Cons**: Limited, expensive

### Horizontal Scaling

Add more servers.

**Pros**: Unlimited scaling  
**Cons**: Complex, requires load balancer

### Database Scaling

- **Replication**: Read replicas
- **Sharding**: Split data across databases
- **Caching**: Reduce database load

## Glossary Terms

**Key Terms Covered**:
- Apache
- Bandwidth
- CDN
- Cloud computing
- CNAME
- DNS
- Domain
- Domain name
- Firewall
- Host
- Hotlink
- IP address
- ISP
- Latency
- localhost
- Nginx
- Origin
- Port
- Proxy servers
- Round Trip Time (RTT)
- Server
- Site
- TLD
- Web server
- Website

## Additional Resources

- [Nginx Documentation](https://nginx.org/en/docs/)
- [Docker Documentation](https://docs.docker.com/)
- [AWS Documentation](https://docs.aws.amazon.com/)
- [Let's Encrypt](https://letsencrypt.org/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
