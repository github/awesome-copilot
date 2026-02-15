---
name: aspire
description: 'Aspire skill covering the Aspire CLI, AppHost orchestration, service discovery, integrations, MCP server, VS Code extension, Dev Containers, GitHub Codespaces, templates, dashboard, and deployment. Use when the user asks to create, run, debug, configure, deploy, or troubleshoot an Aspire distributed application.'
---

# Aspire — Polyglot Distributed-App Orchestration

Aspire is a **code-first, polyglot toolchain** for building observable, production-ready distributed applications. It orchestrates containers, executables, and cloud resources from a single AppHost project — regardless of whether the workloads are C#, Python, JavaScript/TypeScript, Go, Java, Rust, Bun, Deno, or PowerShell.

> **Mental model:** The AppHost is a *conductor* — it doesn't play the instruments, it tells every service when to start, how to find each other, and watches for problems.

Detailed reference material lives in the `references/` folder — load on demand.

---

## References

| Reference | When to load |
|---|---|
| [CLI Reference](references/cli-reference.md) | Command flags, options, or detailed usage |
| [MCP Server](references/mcp-server.md) | Setting up MCP for AI assistants, available tools |
| [Integrations Catalog](references/integrations-catalog.md) | Discovering integrations via MCP tools, wiring patterns |
| [Polyglot APIs](references/polyglot-apis.md) | Method signatures, chaining options, language-specific patterns |
| [Architecture](references/architecture.md) | DCP internals, resource model, service discovery, networking, telemetry |
| [Dashboard](references/dashboard.md) | Dashboard features, standalone mode, GenAI Visualizer |
| [Deployment](references/deployment.md) | Docker, Kubernetes, Azure Container Apps, App Service |
| [Testing](references/testing.md) | Integration tests against the AppHost |
| [Troubleshooting](references/troubleshooting.md) | Diagnostic codes, common errors, and fixes |

---

## 1. Researching Aspire Documentation

The Aspire team ships an **MCP server** that provides documentation tools directly inside your AI assistant. See [MCP Server](references/mcp-server.md) for setup details.

### Aspire CLI 13.2+ (recommended — has built-in docs search)

If running Aspire CLI **13.2 or later** (`aspire --version`), the MCP server includes docs search tools:

| Tool | Description |
|---|---|
| `list_docs` | Lists all available documentation from aspire.dev |
| `search_docs` | Performs weighted lexical search across indexed documentation |
| `get_doc` | Retrieves a specific document by its slug |

These tools were added in [PR #14028](https://github.com/dotnet/aspire/pull/14028). To update: `aspire update --self --channel daily`.

For more on this approach, see David Pine's post: https://davidpine.dev/posts/aspire-docs-mcp-tools/

### Aspire CLI 13.1 (integration tools only)

On 13.1, the MCP server provides integration lookup but **not** docs search:

| Tool | Description |
|---|---|
| `list_integrations` | Lists available Aspire hosting integrations |
| `get_integration_docs` | Gets documentation for a specific integration package |

For general docs queries on 13.1, use **Context7** as your primary source (see below).

### Fallback: Context7

Use **Context7** (`mcp_context7`) when the Aspire MCP docs tools are unavailable (13.1) or the MCP server isn't running:

**Step 1 — Resolve the library ID** (one-time per session):

Call `mcp_context7_resolve-library-id` with `libraryName: ".NET Aspire"`.

| Rank | Library ID | Use when |
|---|---|---|
| 1 | `/microsoft/aspire.dev` | Primary source. Guides, integrations, CLI reference, deployment. |
| 2 | `/dotnet/aspire` | API internals, source-level implementation details. |
| 3 | `/communitytoolkit/aspire` | Non-Microsoft polyglot integrations (Go, Java, Node.js, Ollama). |

**Step 2 — Query docs:**

```
libraryId: "/microsoft/aspire.dev", query: "Python integration AddPythonApp service discovery"
libraryId: "/communitytoolkit/aspire", query: "Golang Java Node.js community integrations"
```

### Fallback: GitHub search (when Context7 is also unavailable)

Search the official docs repo on GitHub:
- **Docs repo:** `microsoft/aspire.dev` — path: `src/frontend/src/content/docs/`
- **Source repo:** `dotnet/aspire`
- **Samples repo:** `dotnet/aspire-samples`
- **Community integrations:** `CommunityToolkit/Aspire`

---

## 2. Prerequisites & Install

| Requirement | Details |
|---|---|
| **.NET SDK** | 10.0+ (required even for non-.NET workloads — the AppHost is .NET) |
| **Container runtime** | Docker Desktop, Podman, or Rancher Desktop |
| **IDE (optional)** | VS Code + C# Dev Kit, Visual Studio 2022, JetBrains Rider |

```bash
# Linux / macOS
curl -sSL https://aspire.dev/install.sh | bash

# Windows PowerShell
irm https://aspire.dev/install.ps1 | iex

# Verify
aspire --version

# Install templates
dotnet new install Aspire.ProjectTemplates
```

---

## 3. Project Templates

| Template | Command | Description |
|---|---|---|
| **aspire-starter** | `aspire new aspire-starter` | ASP.NET Core/Blazor starter + AppHost + tests |
| **aspire-ts-cs-starter** | `aspire new aspire-ts-cs-starter` | ASP.NET Core/React starter + AppHost |
| **aspire-py-starter** | `aspire new aspire-py-starter` | FastAPI/React starter + AppHost |
| **aspire-apphost-singlefile** | `aspire new aspire-apphost-singlefile` | Empty single-file AppHost |

---

## 4. AppHost Quick Start (Polyglot)

The AppHost orchestrates all services. Non-.NET workloads run as containers or executables.

```csharp
var builder = DistributedApplication.CreateBuilder(args);

// Infrastructure
var redis = builder.AddRedis("cache");
var postgres = builder.AddPostgres("pg").AddDatabase("catalog");

// .NET API
var api = builder.AddProject<Projects.CatalogApi>("api")
    .WithReference(postgres).WithReference(redis);

// Python ML service
var ml = builder.AddPythonApp("ml-service", "../ml-service", "main.py")
    .WithHttpEndpoint(targetPort: 8000).WithReference(redis);

// React frontend (Vite)
var web = builder.AddViteApp("web", "../frontend")
    .WithHttpEndpoint(targetPort: 5173).WithReference(api);

// Go worker
var worker = builder.AddGolangApp("worker", "../go-worker")
    .WithReference(redis);

builder.Build().Run();
```

For complete API signatures, see [Polyglot APIs](references/polyglot-apis.md).

---

## 5. Core Concepts (Summary)

| Concept | Key point |
|---|---|
| **Run vs Publish** | `aspire run` = local dev (DCP engine). `aspire publish` = generate deployment manifests. |
| **Service discovery** | Automatic via env vars: `ConnectionStrings__<name>`, `services__<name>__http__0` |
| **Resource lifecycle** | DAG ordering — dependencies start first. `.WaitFor()` gates on health checks. |
| **Resource types** | `ProjectResource`, `ContainerResource`, `ExecutableResource`, `ParameterResource` |
| **Integrations** | 144+ across 13 categories. Hosting package (AppHost) + Client package (service). |
| **Dashboard** | Real-time logs, traces, metrics, GenAI visualizer. Runs automatically with `aspire run`. |
| **MCP Server** | AI assistants can query running apps and search docs via CLI (STDIO). |
| **Testing** | `Aspire.Hosting.Testing` — spin up full AppHost in xUnit/MSTest/NUnit. |
| **Deployment** | Docker, Kubernetes, Azure Container Apps, Azure App Service. |

---

## 6. CLI Quick Reference

Valid commands in Aspire CLI 13.1:

| Command | Description | Status |
|---|---|---|
| `aspire new <template>` | Create from template | Stable |
| `aspire init` | Initialize in existing project | Stable |
| `aspire run` | Start all resources locally | Stable |
| `aspire add <integration>` | Add an integration | Stable |
| `aspire publish` | Generate deployment manifests | Preview |
| `aspire config` | Manage configuration settings | Stable |
| `aspire cache` | Manage disk cache | Stable |
| `aspire deploy` | Deploy to defined targets | Preview |
| `aspire do <step>` | Execute a pipeline step | Preview |
| `aspire update` | Update integrations (or `--self` for CLI) | Preview |
| `aspire mcp init` | Configure MCP for AI assistants | Stable |
| `aspire mcp start` | Start the MCP server | Stable |

Full command reference with flags: [CLI Reference](references/cli-reference.md).

---

## 7. Common Patterns

### Adding a new service

1. Create your service directory (any language)
2. Add to AppHost: `Add*App()` or `AddProject<T>()`
3. Wire dependencies: `.WithReference()`
4. Gate on health: `.WaitFor()` if needed
5. Run: `aspire run`

### Migrating from Docker Compose

1. `aspire new aspire-apphost-singlefile` (empty AppHost)
2. Replace each `docker-compose` service with an Aspire resource
3. `depends_on` → `.WithReference()` + `.WaitFor()`
4. `ports` → `.WithHttpEndpoint()`
5. `environment` → `.WithEnvironment()` or `.WithReference()`

---

## 8. Key URLs

| Resource | URL |
|---|---|
| **Documentation** | https://aspire.dev |
| **Runtime repo** | https://github.com/dotnet/aspire |
| **Docs repo** | https://github.com/microsoft/aspire.dev |
| **Samples** | https://github.com/dotnet/aspire-samples |
| **Community Toolkit** | https://github.com/CommunityToolkit/Aspire |
| **Dashboard image** | `mcr.microsoft.com/dotnet/aspire-dashboard` |
| **Discord** | https://aka.ms/aspire/discord |
| **Reddit** | https://www.reddit.com/r/aspiredotdev/ |
