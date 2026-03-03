# Azure Static Web Apps

Serverless hosting for static sites and SPAs with integrated APIs.

## When to Use

- Single Page Applications (React, Vue, Angular)
- Static sites (HTML/CSS/JS)
- JAMstack applications
- Sites with serverless API backends
- Documentation sites

## Service Type in azure.yaml

```yaml
services:
  my-web:
    host: staticwebapp
    project: ./src/web
```

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| None required | Static Web Apps is fully managed |
| Application Insights | Monitoring (optional) |

## SKU Selection

| SKU | Features |
|-----|----------|
| Free | 2 custom domains, 0.5GB storage, shared bandwidth |
| Standard | 5 custom domains, 2GB storage, SLA, auth customization |

## Build Configuration

| Framework | outputLocation |
|-----------|----------------|
| React | `build` |
| Vue | `dist` |
| Angular | `dist/my-app` |
| Next.js (Static) | `out` |

## API Integration

Integrated Functions API structure:

```
project/
├── src/           # Frontend
└── api/           # Azure Functions API
    ├── hello/
    │   └── index.js
    └── host.json
```

## References

- [Region Availability](region-availability.md)
- [Bicep Patterns](bicep.md)
- [Routing and Auth](routing.md)
- [Deployment](deployment.md)
