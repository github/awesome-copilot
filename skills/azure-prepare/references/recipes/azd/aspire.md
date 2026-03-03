# .NET Aspire Projects with AZD

**⛔ MANDATORY: For .NET Aspire projects, NEVER manually create azure.yaml. Use `azd init --from-code` instead.**

## Detection

| Indicator | How to Detect |
|-----------|---------------|
| `*.AppHost.csproj` | `find . -name "*.AppHost.csproj"` |
| `Aspire.Hosting` package | `grep -r "Aspire\.Hosting" . --include="*.csproj"` |
| `Aspire.AppHost.Sdk` | `grep -r "Aspire\.AppHost\.Sdk" . --include="*.csproj"` |

## Workflow

### ⛔ DO NOT (Wrong Approach)

```yaml
# ❌ WRONG - Missing services section
name: aspire-app
metadata:
  template: azd-init
# Results in: "Could not find infra\main.bicep" error
```

### ✅ DO (Correct Approach)

```bash
# Generate environment name
ENV_NAME="$(basename "$PWD" | tr '[:upper:]' '[:lower:]' | tr ' _' '-')-dev"

# Use azd init with auto-detection
azd init --from-code -e "$ENV_NAME"
```

**Generated azure.yaml:**
```yaml
name: aspire-app
metadata:
  template: azd-init
services:
  app:
    language: dotnet
    project: ./MyApp.AppHost/MyApp.AppHost.csproj
    host: containerapp
```

## Command Flags

| Flag | Required | Purpose |
|------|----------|---------|
| `--from-code` | ✅ | Auto-detect AppHost, no prompts |
| `-e <name>` | ✅ | Environment name (non-interactive) |
| `--no-prompt` | Optional | Skip all confirmations |

**Why `--from-code` is critical:**
- Without: Prompts "How do you want to initialize?" (needs TTY)
- With: Auto-detects AppHost, no interaction needed
- Essential for agents and CI/CD

## Docker Context (AddDockerfile Services)

When an Aspire app uses `AddDockerfile()`, the second parameter specifies the Docker build context:

```csharp
builder.AddDockerfile("servicename", "./path/to/context")
//                                    ^^^^^^^^^^^^^^^^
//                                    This is the Docker build context
```

The build context determines:
- Where Docker looks for files during `COPY` commands
- The base directory for all Dockerfile operations
- What `azd init --from-code` sets as `docker.context` in azure.yaml

**Generated azure.yaml includes context:**
```yaml
services:
  ginapp:
    docker:
      path: ./ginapp/Dockerfile
      context: ./ginapp
```

### Aspire Manifest (for verification)

Generate the manifest to verify the exact build configuration:

```bash
dotnet run <apphost-project> -- --publisher manifest --output-path manifest.json
```

Manifest structure for Dockerfile-based services:
```json
{
  "resources": {
    "servicename": {
      "type": "container.v1",
      "build": {
        "context": "path/to/context",
        "dockerfile": "path/to/context/Dockerfile"
      }
    }
  }
}
```

### Common Docker Patterns

**Single Dockerfile service:**
```csharp
builder.AddDockerfile("api", "./src/api")
```
Generated azure.yaml:
```yaml
services:
  api:
    project: .
    host: containerapp
    image: api
    docker:
      path: src/api/Dockerfile
      context: src/api
```

**Multiple Dockerfile services:**
```csharp
builder.AddDockerfile("frontend", "./src/frontend");
builder.AddDockerfile("backend", "./src/backend");
```
Generated azure.yaml:
```yaml
services:
  frontend:
    project: .
    host: containerapp
    image: frontend
    docker:
      path: src/frontend/Dockerfile
      context: src/frontend
  backend:
    project: .
    host: containerapp
    image: backend
    docker:
      path: src/backend/Dockerfile
      context: src/backend
```

**Root context:**
```csharp
builder.AddDockerfile("app", ".")
```
Generated azure.yaml:
```yaml
services:
  app:
    project: .
    host: containerapp
    image: app
    docker:
      path: Dockerfile
      context: .
```

### azure.yaml Rules for Docker Services

| Rule | Explanation |
|------|-------------|
| **Omit `language`** | Docker handles the build; azd doesn't need language-specific behavior |
| **Use relative paths** | All paths in azure.yaml are relative to project root |
| **Extract from manifest** | When in doubt, generate the Aspire manifest and use `build.context` |
| **Match Dockerfile expectations** | The `context` must match what the Dockerfile's `COPY` commands expect |

### ❌ Common Docker Mistakes

**Missing context causes build failures:**
```yaml
services:
  ginapp:
    project: .
    host: containerapp
    docker:
      path: ginapp/Dockerfile
      # ❌ Missing context - COPY commands will fail
```

**Unnecessary language field:**
```yaml
services:
  ginapp:
    project: .
    language: go              # ❌ Not needed for Docker builds
    host: containerapp
    docker:
      path: ginapp/Dockerfile
      context: ginapp
```

## Troubleshooting

### Error: "Could not find infra\main.bicep"

**Cause:** Manual azure.yaml without services section

**Fix:**
1. Delete manual azure.yaml
2. Run `azd init --from-code -e <env-name>`
3. Verify services section exists

### Error: "no default response for prompt"

**Cause:** Missing `--from-code` flag

**Fix:** Always use `--from-code` for Aspire:
```bash
azd init --from-code -e "$ENV_NAME"
```

### AppHost Not Detected

**Solutions:**
1. Verify: `find . -name "*.AppHost.csproj"`
2. Build: `dotnet build`
3. Check package references in .csproj
4. Run from solution root

## Infrastructure Auto-Generation

| Traditional | Aspire |
|------------|--------|
| Manual infra/main.bicep | Auto-gen from AppHost |
| Define in IaC | Define in C# code |
| Update IaC per service | Add to AppHost |

**How it works:**
1. AppHost defines services in C#
2. `azd provision` analyzes AppHost
3. Generates Bicep automatically
4. Deploys to Azure Container Apps

## Validation Steps

1. Verify azure.yaml has services section
2. Check Dockerfile COPY paths are relative to the specified context
3. Generate manifest to verify `build.context` matches azure.yaml
4. Run `azd package` to validate Docker build succeeds
5. Review generated infra/ (don't modify)

## Next Steps

1. Set subscription: `azd env set AZURE_SUBSCRIPTION_ID <id>`
2. Proceed to **azure-validate**
3. Deploy with **azure-deploy** (`azd up`)

## References

- [.NET Aspire Docs](https://learn.microsoft.com/dotnet/aspire/)
- [azd + Aspire](https://learn.microsoft.com/dotnet/aspire/deployment/azure/aca-deployment-azd-in-depth)
- [Samples](https://github.com/dotnet/aspire-samples)
- [Main Guide](../../aspire.md)
- [azure.yaml Schema](azure-yaml.md)
- [Docker Guide](docker.md)