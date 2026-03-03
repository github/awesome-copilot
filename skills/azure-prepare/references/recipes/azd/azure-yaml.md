# azure.yaml Generation

> ⛔ **CRITICAL: Check for .NET Aspire projects FIRST**
>
> **DO NOT manually create azure.yaml for .NET Aspire projects.** If you detect:
> - Files ending with `*.AppHost.csproj` (e.g., `MyApp.AppHost.csproj`)
> - `Aspire.Hosting` or `Aspire.AppHost.Sdk` in `.csproj` files
>
> **STOP and use `azd init --from-code` instead.** See [aspire.md](aspire.md) for details.

Create `azure.yaml` in project root for AZD.

## Structure

### Basic (Bicep - default)

```yaml
name: <project-name>
metadata:
  template: azd-init

services:
  <service-name>:
    project: <path-to-source>
    language: <python|js|ts|java|dotnet|go>
    host: <containerapp|appservice|function|staticwebapp|aks>
```

### With Terraform Provider

```yaml
name: <project-name>
metadata:
  template: azd-init

# Specify Terraform as IaC provider
infra:
  provider: terraform
  path: ./infra

services:
  <service-name>:
    project: <path-to-source>
    language: <python|js|ts|java|dotnet|go>
    host: <containerapp|appservice|function|staticwebapp|aks>
```

> 💡 **Tip:** Omit `infra` section to use Bicep (default). Add `infra.provider: terraform` to use Terraform. See [terraform.md](terraform.md) for details.

## Host Types

| Host | Azure Service | Use For |
|------|---------------|---------|
| `containerapp` | Container Apps | APIs, microservices, workers |
| `appservice` | App Service | Traditional web apps |
| `function` | Azure Functions | Serverless functions |
| `staticwebapp` | Static Web Apps | SPAs, static sites |
| `aks` | AKS | Kubernetes workloads |

## Examples

### Container App with Bicep (default)

```yaml
name: myapp

services:
  api:
    project: ./src/api
    language: python
    host: containerapp
    docker:
      path: ./src/api/Dockerfile
```

### Container App with Terraform

```yaml
name: myapp

infra:
  provider: terraform
  path: ./infra

services:
  api:
    project: ./src/api
    language: python
    host: containerapp
    docker:
      path: ./src/api/Dockerfile
```

### Container App with Custom Docker Context

When the Dockerfile expects files relative to a specific directory (e.g., Aspire `AddDockerfile` with custom context):

```yaml
name: myapp

services:
  ginapp:
    project: .
    host: containerapp
    image: ginapp
    docker:
      path: ginapp/Dockerfile
      context: ginapp
```

> 💡 **Tip:** The `context` field specifies the Docker build context directory. This is crucial for:
> - **Aspire apps** using `AddDockerfile("service", "./path")` - use the second parameter as `context`
> - Dockerfiles with `COPY` commands expecting files relative to a subdirectory
> - Multi-service repos where each service has its own context

> ⚠️ **Important:** For Aspire apps, extract the Docker context from:
> 1. AppHost code: Second parameter of `AddDockerfile("name", "./context")`
> 2. Aspire manifest: `build.context` field (generated via `dotnet run apphost.cs -- --publisher manifest`)
>
> 📖 **See [aspire.md](aspire.md) for complete .NET Aspire deployment guide**

> ⚠️ **Language Field:** When using the `docker` section, the `language` field should be **omitted** or set to the language that azd will use for framework-specific behaviors. For containerized apps with custom Dockerfiles (including Aspire `AddDockerfile`), the language is not used by azd since the build is handled by Docker. Only include `language` if you need azd to perform additional framework-specific actions beyond Docker build.

### Azure Functions

```yaml
services:
  functions:
    project: ./src/functions
    language: js
    host: function
```

### Static Web App (with framework build)

For React, Vue, Angular, Next.js, etc. that require `npm run build`:

```yaml
services:
  web:
    project: ./src/web     # folder containing package.json
    language: js           # triggers: npm install && npm run build
    host: staticwebapp
    dist: dist             # build output folder (e.g., dist, build, out)
```

### Static Web App (pure HTML/CSS - no build)

For pure HTML sites without a framework build step:

**Static files in subfolder (recommended):**
```yaml
services:
  web:
    project: ./src/web     # folder containing index.html
    host: staticwebapp
    dist: .                # works when project != root
```

**Static files in root - requires build script:**

> ⚠️ **SWA CLI Limitation:** When `project: .`, you cannot use `dist: .`. Files must be copied to a separate output folder.

Add a minimal `package.json` with a build script:
```json
{
  "scripts": {
    "build": "node -e \"require('fs').mkdirSync('public',{recursive:true});require('fs').readdirSync('.').filter(f=>/\\.(html|css|js|png|jpe?g|gif|svg|ico|json|xml|txt|webmanifest|map)$/i.test(f)).forEach(f=>require('fs').copyFileSync(f,'public/'+f))\""
  }
}
```

Then configure azure.yaml with `language: js` to trigger the build:
```yaml
services:
  web:
    project: .
    language: js           # triggers npm install && npm run build
    host: staticwebapp
    dist: public
```

### SWA Project Structure Detection

| Layout | Configuration |
|--------|---------------|
| Static in root | `project: .`, `language: js`, `dist: public` + package.json build script |
| Framework in root | `project: .`, `language: js`, `dist: <output>` |
| Static in subfolder | `project: ./path`, `dist: .` |
| Framework in subfolder | `project: ./path`, `language: js`, `dist: <output>` |

> **Key rules:**
> - `dist` is **relative to `project`** path
> - **SWA CLI limitation**: When `project: .`, cannot use `dist: .` - must use a distinct folder
> - For static files in root, add `package.json` with build script to copy files to dist folder
> - Use `language: js` to trigger npm build even for pure static sites in root
> - `language: html` and `language: static` are **NOT valid** - will fail

### SWA Bicep Requirement

Bicep must include the `azd-service-name` tag:
```bicep
resource staticWebApp 'Microsoft.Web/staticSites@2022-09-01' = {
  name: name
  location: location
  tags: union(tags, { 'azd-service-name': 'web' })}
```
}
```

### App Service

```yaml
services:
  api:
    project: ./src/api
    language: dotnet
    host: appservice
```

## Hooks (Optional)

```yaml
hooks:
  preprovision:
    shell: sh
    run: ./scripts/setup.sh
  postprovision:
    shell: sh
    run: ./scripts/seed-data.sh
```

## Valid Values

| Field | Options |
|-------|---------|
| `language` | python, js, ts, java, dotnet, go (omit for staticwebapp without build) |
| `host` | containerapp, appservice, function, staticwebapp, aks |
| `docker.path` | Path to Dockerfile (relative to project root) |
| `docker.context` | Docker build context directory (optional, defaults to directory containing Dockerfile) |

> 💡 **Docker Context:** When `docker.context` is omitted, azd uses the directory containing the Dockerfile as the build context. Specify `context` explicitly when the Dockerfile expects files from a different directory.

## Output

- `./azure.yaml`
