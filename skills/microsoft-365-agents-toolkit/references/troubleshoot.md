# Troubleshooting

## Error Quick Reference

| Error | Cause | Fix |
|-------|-------|-----|
| `AADSTS7000229: missing service principal` | `aadApp/create` missing `generateServicePrincipal: true` | Add field to YAML, re-provision |
| 401 from Bot Connector (bot can't reply) | `TENANT_ID` missing from `.localConfigs` | Copy from `env/.env.local` to `.localConfigs` |
| 401 persists after auth fix | Devtunnel URL blacklisted | Delete tunnel, create fresh one, update `BOT_ENDPOINT`, re-provision |
| `Authorization: Bearer null` | `clientId`/`clientSecret` not passed to SDK | Pass credentials to `new App({ adapter: { credentials: { clientId, clientSecret, tenantId } } })` |
| Port already in use | Previous process still running on 3978 | Kill existing process: `lsof -ti:3978 | xargs kill` |
| Playground won't start | Agents Playground not installed | `npm install -g @microsoft/agents-playground` |
| Stale bot after re-provisioning | Old AAD app still referenced | Delete `env/.env.local`, re-provision |
| Bot works in Playground but not Teams | Missing devtunnel or wrong `BOT_ENDPOINT` | Start devtunnel, set `BOT_ENDPOINT` before provisioning |

## Fix: Missing TENANT_ID

```bash
# Check if TENANT_ID exists
grep TENANT_ID .localConfigs

# Get the value from env file
grep TENANT_ID env/.env.local

# Add to .localConfigs:
echo "TENANT_ID=<value>" >> .localConfigs
```

## Fix: AADSTS7000229

In `m365agents.local.yml`, find the `aadApp/create` action and add `generateServicePrincipal: true`:

```yaml
- uses: aadApp/create
  with:
    generateServicePrincipal: true  # ← add this
    name: ${{APP_NAME}}-aad
    generateClientSecret: true
```

Then re-provision: `atk provision --env local -i false`

## Fix: Blacklisted Devtunnel

```bash
devtunnel delete <tunnel-id>     # Remove old tunnel
devtunnel create --allow-anonymous
devtunnel host -p 3978 --allow-anonymous
# Copy new tunnel URL → update BOT_ENDPOINT in env/.env.local
atk provision --env local -i false
```

## Auth Status Check

```bash
atk auth list
az account show
```

Ensure both show the same account/tenant.
