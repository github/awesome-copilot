# ATK CLI Commands Reference

## Package and Validate

```bash
# Validate app
atk validate --env dev -i false

# Create app package
atk package --env dev -i false

# Sideload app
atk install --file-path ./appPackage.zip -i false

# Uninstall
atk uninstall --mode env --env dev --folder . -i false
```

## Share and Collaborate

```bash
# Share with entire tenant
atk share --scope tenant -i false

# Share with specific users
atk share --scope users --email 'user@example.com' -i false

# Grant collaborator access
atk collaborator grant -i false

# Check collaborator status
atk collaborator status
```

## Environment Management

```bash
# List environments
atk env list

# Add new environment
atk env add staging

# Reset environment
atk env reset --env dev -i false
```

## Adding Actions to Declarative Agents

`atk add action` adds an API action to an existing declarative agent project.

**Required parameters:**
| Option | Description |
|--------|-------------|
| `--api-plugin-type api-spec` | Must be set explicitly (CLI bug: default is invalid) |
| `--openapi-spec-type` | How to specify the API: `enter-url-or-open-local-file` or `search-api` |
| `--openapi-spec-location -a` | OpenAPI spec file path or URL (for `enter-url-or-open-local-file`) |

**Optional parameters:**
| Option | Description |
|--------|-------------|
| `--api-operation -o` | Select specific operation(s) Copilot can interact with |
| `--search-openapi-spec-query` | Search query (when using `search-api`) |
| `--select-openapi-spec` | Select from search results (when using `search-api`) |
| `--manifest-file -t` | App manifest path. Default: `./appPackage/manifest.json` |
| `--folder -f` | Project folder. Default: `./` |

```bash
# Add API action from local file
atk add action --api-plugin-type api-spec --openapi-spec-type enter-url-or-open-local-file -a ./openapi.yaml -i false

# Add API action from URL
atk add action --api-plugin-type api-spec --openapi-spec-type enter-url-or-open-local-file -a https://example.com/openapi.yaml -i false

# Add authentication config
atk add auth-config -i false

# Regenerate action after modifying OpenAPI spec
atk regenerate action -i false
```

## Troubleshooting

```bash
# Check system prerequisites
atk doctor

# Validate app manifest
atk validate --env dev -i false

# Upgrade project to latest toolkit version
atk upgrade -i false
```

**Port already in use:**

```powershell
# Windows: Find and kill process using port 3978
Get-NetTCPConnection -LocalPort 3978 | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }
```

```bash
# macOS/Linux
lsof -ti:3978 | xargs kill -9
```

## Get Help

```bash
atk --help
atk new --help
atk add action --help
```
