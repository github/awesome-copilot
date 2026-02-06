---
name: aspire
description: 'Aspire skill covering the Aspire CLI, AppHost orchestration, service discovery, integrations, MCP server, VS Code extension, Dev Containers, GitHub Codespaces, templates, dashboard, and deployment. Use when the user asks to create, run, debug, configure, deploy, or troubleshoot an Aspire distributed application.'
metadata:
  author: chrismckee
  version: "2.0"
---

# Aspire — Polyglot Distributed-App Orchestration

Aspire is a **code-first, polyglot toolchain** for building observable, production-ready distributed applications. It orchestrates containers, executables, and cloud resources from a single AppHost project — regardless of whether the workloads are C#, Python, JavaScript/TypeScript, Go, Java, Rust, Bun, Deno, or PowerShell.

> **Mental model:** The AppHost is a *conductor* — it doesn't play the instruments, it tells every service when to start, how to find each other, and watches for problems.

## Deep-dive references

This skill follows progressive disclosure. The sections below cover essentials. For detailed reference, load these on demand:

| Reference | When to load |
|---|---|
| [Polyglot APIs](references/polyglot-apis.md) | Need full method signatures, chaining options, or language-specific patterns |
| [Integrations Catalog](references/integrations-catalog.md) | Looking up specific integrations, NuGet packages, or wiring patterns |
| [CLI Reference](references/cli-reference.md) | Need command flags, options, or detailed usage examples |
| [Architecture](references/architecture.md) | Need DCP internals, resource model, service discovery, networking, or telemetry details |
| [Deployment](references/deployment.md) | Deploying to Docker, Kubernetes, Azure Container Apps, or App Service |
| [MCP Server](references/mcp-server.md) | Setting up the MCP server for AI assistants |
| [Dashboard](references/dashboard.md) | Dashboard features, standalone mode, or GenAI Visualizer |
| [Testing](references/testing.md) | Writing integration tests against the AppHost |
| [Troubleshooting](references/troubleshooting.md) | Diagnostic codes, common errors, and fixes |

---

## 1. Researching Aspire Documentation (Agent Guidance)

When you need deeper or newer information than this skill provides, use **Context7** (`mcp_context7`) to query up-to-date documentation and code examples directly. This is the fastest approach — a single query returns code snippets, explanations, and source links without needing to search and then separately read files.

### Preferred: Context7 (single-step lookup)

**Step 1 — Resolve the library ID** (one-time per session):

Call `mcp_context7_resolve-library-id` with `libraryName: ".NET Aspire"` to get the Context7-compatible library IDs. Context7 indexes both GitHub repos and websites — below is a quality-ranked breakdown based on testing:

| Rank | Library ID | Source type | Snippets | Quality | Use when |
|---|---|---|---|---|---|
| 1 | `/microsoft/aspire.dev` | GitHub repo (MDX source) | 1865 | **Best** — most complete, highest detail, full Aspire 13+ coverage | Primary source. Guides, integrations, CLI reference, what's-new, deployment. |
| 2 | `/websites/learn_microsoft-en-us-dotnet-aspire` | Website crawl (learn.microsoft.com) | 2506 | **Good** — mirrors Learn content, occasionally has formatting artifacts | Rendered docs. Good alternative if repo source has gaps. |
| 3 | `/dotnet/aspire` | GitHub repo (runtime C#) | 1185 | **Good** — source code, READMEs, test scenarios, playground examples | API internals, source-level implementation details, playground demos. |
| 4 | `/communitytoolkit/aspire` | GitHub repo (community) | 311 | **Best for community** — Golang, Java, Node.js, Vite, Ollama | Non-Microsoft polyglot integrations, community-contributed hosting packages. |
| 5 | `/dotnet/docs-aspire` | GitHub repo (old docs) | 482 | **Superseded** — compatibility/breaking-change notes only, missing newer APIs | Avoid for tutorials. Only useful for migration/deprecation references. |

> **Important:** `/dotnet/docs-aspire` is the **legacy** docs repo being superseded by `microsoft/aspire.dev`. It lacks newer APIs (e.g., `AddPythonExecutable`, `AddPythonModule`) and tutorials. Prefer `/microsoft/aspire.dev` for all general lookups.

**Step 2 — Query docs**:

Call `mcp_context7_query-docs` with the library ID and a descriptive query. Be specific — include method names, concepts, or language names for best results.

```
# Primary source — covers most needs:
libraryId: "/microsoft/aspire.dev", query: "Python integration AddPythonApp AddUvicornApp service discovery"
libraryId: "/microsoft/aspire.dev", query: "deployment Azure Container Apps Kubernetes publish manifest"
libraryId: "/microsoft/aspire.dev", query: "aspire CLI commands aspire run aspire publish aspire new"
libraryId: "/microsoft/aspire.dev", query: "Redis caching integration WithReference"

# Community integrations (Golang, Java, Node.js):
libraryId: "/communitytoolkit/aspire", query: "Golang Java Node.js community integrations"

# Runtime source (when you need API internals or test patterns):
libraryId: "/dotnet/aspire", query: "PythonAppResource AddPythonApp implementation"

# Microsoft Learn website (alternative rendered view):
libraryId: "/websites/learn_microsoft-en-us-dotnet-aspire", query: "aspire starter template quickstart"
```

Each result includes the code snippet, source URL, and context — no second tool call needed.

### Fallback: GitHub search (when Context7 is unavailable)

If Context7 tools are not available, fall back to searching the official documentation repos on GitHub. The source-of-truth MDX files live here:

- **Docs repo:** `microsoft/aspire.dev` — path: `src/frontend/src/content/docs/`
- **Source repo:** `dotnet/aspire` — runtime (C#)
- **Samples repo:** `dotnet/aspire-samples`
- **Community integrations:** `CommunityToolkit/Aspire`

Use `mcp_github_search_code` with patterns like:
```
path:src/frontend/src/content/docs/ extension:mdx repo:microsoft/aspire.dev <topic>
```

**Exclude** `path:src/frontend/src/content/docs/ja/` (Japanese translations). After finding file paths, use the GitHub file contents tool to read the full MDX.

### Documentation map

| Folder | Files | Coverage |
|---|---|---|
| `get-started/` | 16 | Install, quickstarts, templates, Dev Containers, Codespaces |
| `architecture/` | 7 | DCP, resource model, networking, service discovery |
| `app-host/` | 8 | Orchestration, resources, configuration, eventing |
| `fundamentals/` | 13 | Health checks, telemetry, configuration, security |
| `integrations/` | 90+ | Caching, databases, messaging, AI, cloud, frameworks |
| `dashboard/` | 11 | Monitoring, logs, traces, metrics, MCP server |
| `deployment/` | 5 | Docker, K8s, Azure Container Apps, App Service |
| `reference/cli/` | 13 | All CLI commands |
| `testing/` | 3 | Integration testing patterns |
| `diagnostics/` | 30 | Diagnostic codes ASPIRE001–008 + experimental |
| `whats-new/` | 9 | Release notes, breaking changes |

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
| **aspire-starter** | `aspire new aspire-starter` | .NET API + web frontend + AppHost + tests |
| **aspire-ts-cs-starter** | `aspire new aspire-ts-cs-starter` | TypeScript frontend + C# API + AppHost |
| **aspire-py-starter** | `aspire new aspire-py-starter` | Python backend + AppHost |
| **aspire** | `aspire new aspire` | Empty AppHost only |

---

## 4. AppHost Quick Start (Polyglot)

The AppHost orchestrates all services. Non-.NET workloads run as containers or executables — they don't need the .NET SDK themselves.

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

For complete API signatures and all chaining methods, see [Polyglot APIs](references/polyglot-apis.md).

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
| **MCP Server** | AI assistants can query running apps via CLI (STDIO) or Dashboard (HTTP/SSE). |
| **Testing** | `Aspire.Hosting.Testing` — spin up full AppHost in xUnit/MSTest/NUnit. |
| **Deployment** | Docker, Kubernetes, Azure Container Apps, Azure App Service. |

For architecture details, see [Architecture](references/architecture.md).

---

## 6. CLI Quick Reference

| Command | Description |
|---|---|
| `aspire new <template>` | Create from template |
| `aspire init` | Initialize in existing project |
| `aspire run` | Start all resources locally |
| `aspire publish` | Generate deployment manifests |
| `aspire add` | Add an integration |
| `aspire mcp init` | Configure MCP for AI assistants |
| `aspire test` | Run integration tests |

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

1. `aspire new aspire` (empty AppHost)
2. Replace each `docker-compose` service → Aspire resource
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
