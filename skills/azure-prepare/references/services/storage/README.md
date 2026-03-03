# Azure Storage

Scalable cloud storage for blobs, files, queues, and tables.

## When to Use

- Blob storage (files, images, videos)
- File shares (SMB/NFS)
- Queue storage (simple messaging)
- Table storage (NoSQL key-value)
- Static website hosting

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| None required | Storage is self-contained |
| Key Vault | Store connection strings |
| Private Endpoint | Secure access (optional) |

## SKU Selection

| SKU | Replication | Use Case |
|-----|-------------|----------|
| Standard_LRS | Local (3 copies) | Dev/test, non-critical |
| Standard_ZRS | Zone-redundant | Production, regional HA |
| Standard_GRS | Geo-redundant | DR requirements |
| Premium_LRS | Premium SSD | High performance |

## Storage Types

| Type | Best For |
|------|----------|
| Blob | Files, images, videos, backups, logs |
| Queue | Simple message queuing, decoupling |
| Table | NoSQL key-value data |
| File Share | Lift-and-shift, SMB/NFS access |

## Access Tiers

| Tier | Use Case |
|------|----------|
| Hot | Frequent access |
| Cool | Infrequent access (30+ days) |
| Archive | Rare access (180+ days) |

## Environment Variables

| Variable | Value |
|----------|-------|
| `AZURE_STORAGE_CONNECTION_STRING` | Connection string (Key Vault) |
| `AZURE_STORAGE_ACCOUNT` | Account name |
| `AZURE_STORAGE_CONTAINER` | Container name |

## References

- [Bicep Patterns](bicep.md)
- [Access Patterns](access.md)
