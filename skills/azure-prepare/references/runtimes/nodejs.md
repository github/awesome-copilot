# Node.js/Express Production Configuration for Azure

Configure Express/Node.js applications for production deployment on Azure Container Apps and App Service.

## Required Production Settings

### 1. Trust Proxy (CRITICAL)

Azure load balancers and reverse proxies sit in front of your app. Without trust proxy, you'll get wrong client IPs, HTTPS detection failures, and cookie issues.

```javascript
const app = express();

// REQUIRED for Azure - trust the Azure load balancer
app.set('trust proxy', 1);  // Trust first proxy

// Or trust all proxies (less secure but simpler)
app.set('trust proxy', true);
```

### 2. Cookie Configuration

Azure's infrastructure requires specific cookie settings:

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',  // HTTPS only in prod
    sameSite: 'lax',  // Required for Azure
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000  // 24 hours
  }
}));
```

**Key settings:**
- `sameSite: 'lax'` — Required for cookies through Azure's proxy
- `secure: true` — Only in production (HTTPS)
- `httpOnly: true` — Prevent XSS attacks

### 3. Health Check Endpoint

Azure Container Apps and App Service check your app's health:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});
```

**Configure in Container Apps:**
```bash
az containerapp update \
  --name APP \
  --resource-group RG \
  --health-probe-path /health \
  --health-probe-interval 30
```

### 4. Port Configuration

Azure sets the port via environment variable:

```javascript
const port = process.env.PORT || process.env.WEBSITES_PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

**Important:** Bind to `0.0.0.0`, not `localhost` or `127.0.0.1`.

### 5. Environment Detection

```javascript
const isProduction = process.env.NODE_ENV === 'production';
const isAzure = process.env.WEBSITE_SITE_NAME || process.env.CONTAINER_APP_NAME;

if (isProduction || isAzure) {
  app.set('trust proxy', 1);
}
```

---

## Complete Production Configuration

```javascript
// app.js - Production-ready Express configuration for Azure
const express = require('express');
const session = require('express-session');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';

// Trust Azure load balancer
if (isProduction) {
  app.set('trust proxy', 1);
}

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session (if using)
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-prod',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: isProduction,
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Your routes here
app.get('/', (req, res) => {
  res.json({ message: 'Hello from Azure!' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: isProduction ? 'Internal error' : err.message });
});

// Start server
const port = process.env.PORT || 3000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
});
```

---

## Dockerfile for Azure

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy app
COPY . .

# Set production environment
ENV NODE_ENV=production

# Expose port (Azure uses PORT env var)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Start app
CMD ["node", "app.js"]
```

---

## Common Issues

### Cookies Not Setting

**Symptom:** Session lost between requests

**Fix:**
1. Add `app.set('trust proxy', 1)`
2. Set `sameSite: 'lax'` in cookie config
3. Set `secure: true` only if using HTTPS

### Wrong Client IP

**Symptom:** `req.ip` returns Azure internal IP

**Fix:** `app.set('trust proxy', 1);`

### HTTPS Redirect Loop

**Symptom:** Infinite redirects when forcing HTTPS

**Fix:**
```javascript
const TRUSTED_HOST = process.env.APP_PUBLIC_HOSTNAME;

app.use((req, res, next) => {
  if (req.get('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    if (!TRUSTED_HOST) return next();
    return res.redirect(`https://${TRUSTED_HOST}${req.originalUrl}`);
  }
  next();
});
```

### Health Check Failing

**Symptom:** Container restarts repeatedly

**Fix:**
1. Ensure `/health` endpoint returns 200
2. Check app starts within startup probe timeout
3. Verify port matches container configuration

---

## Environment Variables

> ⚠️ **Important distinction**: `azd env set` vs Application Environment Variables
>
> **`azd env set`** sets variables for the **azd provisioning process**, NOT application runtime. These are used by azd and Bicep during deployment.
>
> **Application environment variables** must be configured via:
> 1. **Bicep templates** — Define in the resource's `env` property
> 2. **Azure CLI** — Use `az containerapp update --set-env-vars`
> 3. **azure.yaml** — Use the `env` section in service configuration

**Azure CLI:**
```bash
az containerapp update \
  --name APP \
  --resource-group RG \
  --set-env-vars \
    NODE_ENV=production \
    SESSION_SECRET=your-secret-here \
    PORT=3000
```

**azure.yaml:**
```yaml
services:
  api:
    host: containerapp
    env:
      NODE_ENV: production
      PORT: "3000"
```

**Bicep:**
```bicep
env: [
  { name: 'NODE_ENV', value: 'production' }
  { name: 'SESSION_SECRET', secretRef: 'session-secret' }
]
```
