# Microsoft Store Developer CLI (msstore): extended guide

Sections moved verbatim from [SKILL.md](../SKILL.md) to keep it under 500 lines.

## Core Commands Reference

### reconfigure - Configure Credentials

Configure or update Microsoft Store API credentials.

```bash
msstore reconfigure [options]
```

**Options:**

| Option | Description |
| ------ | ----------- |
| `-t, --tenantId` | Azure AD Tenant ID |
| `-s, --sellerId` | Partner Center Seller ID |
| `-c, --clientId` | Azure AD Application Client ID |
| `-cs, --clientSecret` | Client Secret for authentication |
| `-ct, --certificateThumbprint` | Certificate thumbprint (alternative to client secret) |
| `-cfp, --certificateFilePath` | Certificate file path (alternative to client secret) |
| `-cp, --certificatePassword` | Certificate password |
| `--reset` | Reset credentials without full reconfiguration |

**Examples:**

```bash
# Configure with client secret
msstore reconfigure --tenantId $TENANT_ID --sellerId $SELLER_ID --clientId $CLIENT_ID --clientSecret $CLIENT_SECRET

# Configure with certificate
msstore reconfigure --tenantId $TENANT_ID --sellerId $SELLER_ID --clientId $CLIENT_ID --certificateFilePath ./cert.pfx --certificatePassword MyPassword
```

### flights - Package Flight Management

Manage package flights (beta testing groups).

| Sub-Command | Description |
| ----------- | ----------- |
| `list` | List all flights for an app |
| `get` | Get flight details |
| `delete` | Delete a flight |
| `create` | Create a new flight |
| `submission` | Manage flight submissions |

#### List Flights

```bash
msstore flights list <productId>
```

#### Get Flight Details

```bash
msstore flights get <productId> <flightId>
```

#### Create Flight

```bash
msstore flights create <productId> <friendlyName> --group-ids <group-ids>
```

**Options:**

| Option | Description |
| ------ | ----------- |
| `-g, --group-ids` | Flight group IDs (comma-separated) |
| `-r, --rank-higher-than` | Flight ID to rank higher than |

#### Delete Flight

```bash
msstore flights delete <productId> <flightId>
```

#### Flight Submissions

```bash
# Get flight submission
msstore flights submission get <productId> <flightId>

# Publish flight submission
msstore flights submission publish <productId> <flightId>

# Check flight submission status
msstore flights submission status <productId> <flightId>

# Poll flight submission
msstore flights submission poll <productId> <flightId>

# Delete flight submission
msstore flights submission delete <productId> <flightId>
```

#### Flight Rollout Management

```bash
# Get rollout status
msstore flights submission rollout get <productId> <flightId>

# Update rollout percentage
msstore flights submission rollout update <productId> <flightId> <percentage>

# Halt rollout
msstore flights submission rollout halt <productId> <flightId>

# Finalize rollout (100%)
msstore flights submission rollout finalize <productId> <flightId>
```

## Troubleshooting

| Issue | Solution |
| ----- | -------- |
| Authentication failed | Verify credentials with `msstore info`; re-run `msstore reconfigure` |
| App not found | Ensure the product ID is correct; run `msstore apps list` to verify |
| Insufficient permissions | Check Azure AD app role in Partner Center (needs Manager or Developer) |
| Package validation failed | Ensure package meets Store requirements; check Partner Center for details |
| Submission stuck | Run `msstore submission poll <productId>` to check status |
| Flight not found | Verify flight ID with `msstore flights list <productId>` |
| Rollout percentage invalid | Value must be between 0 and 100 |
| Init fails for PWA | Ensure URL is publicly accessible and has valid web app manifest |
