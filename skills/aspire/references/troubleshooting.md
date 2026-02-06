# Troubleshooting — Diagnostics & Common Issues

---

## Diagnostic Codes

Aspire emits diagnostic codes for common issues. These appear in build warnings/errors and IDE diagnostics.

### Standard diagnostics

| Code | Severity | Description |
|---|---|---|
| **ASPIRE001** | Warning | Resource name contains invalid characters |
| **ASPIRE002** | Warning | Duplicate resource name detected |
| **ASPIRE003** | Error | Missing required package reference |
| **ASPIRE004** | Warning | Deprecated API usage |
| **ASPIRE005** | Error | Invalid endpoint configuration |
| **ASPIRE006** | Warning | Health check not configured for resource with `.WaitFor()` |
| **ASPIRE007** | Warning | Container image tag not specified (using `latest`) |
| **ASPIRE008** | Error | Circular dependency detected in resource graph |

### Experimental diagnostics (ASPIREHOSTINGX*)

These codes indicate usage of experimental/preview APIs. They may require `#pragma warning disable` or `<NoWarn>` if you intentionally use experimental features:

| Code | Area |
|---|---|
| ASPIRE_HOSTINGX_0001–0005 | Experimental hosting APIs |
| ASPIRE_HOSTINGX_0006–0010 | Experimental integration APIs |
| ASPIRE_HOSTINGX_0011–0015 | Experimental deployment APIs |
| ASPIRE_HOSTINGX_0016–0022 | Experimental resource model APIs |

To suppress experimental warnings:

```xml
<!-- In .csproj -->
<PropertyGroup>
  <NoWarn>$(NoWarn);ASPIRE_HOSTINGX_0001</NoWarn>
</PropertyGroup>
```

Or per-line:

```csharp
#pragma warning disable ASPIRE_HOSTINGX_0001
var resource = builder.AddExperimentalResource("test");
#pragma warning restore ASPIRE_HOSTINGX_0001
```

---

## Common Issues & Solutions

### Container runtime

| Problem | Solution |
|---|---|
| "Cannot connect to Docker daemon" | Start Docker Desktop / Podman / Rancher Desktop |
| Container fails to start | Check `docker ps -a` for exit codes; check dashboard console logs |
| Port already in use | Another process is using the port; Aspire auto-assigns, but `targetPort` must be free on the container |
| Container image pull fails | Check network connectivity; verify image name and tag |
| "Permission denied" on Linux | Add user to `docker` group: `sudo usermod -aG docker $USER` |

### Service discovery

| Problem | Solution |
|---|---|
| Service can't find dependency | Verify `.WithReference()` in AppHost; check env vars in dashboard |
| Connection string is null | The reference resource name doesn't match; check `ConnectionStrings__<name>` |
| Wrong port in service URL | Check `targetPort` vs actual service listen port |
| Env var not set | Rebuild AppHost; verify resource name matches exactly |

### Python workloads

| Problem | Solution |
|---|---|
| "Python not found" | Ensure Python is on PATH; specify full path in `AddPythonApp()` |
| venv not found | Use `.WithVirtualEnvironment()` or create venv manually |
| pip packages fail to install | Use `.WithPipPackages()` or install in venv before `aspire run` |
| ModuleNotFoundError | venv isn't activated; `.WithVirtualEnvironment()` handles this |
| "Port already in use" for Uvicorn | Check `targetPort` — another instance may be running |

### JavaScript / TypeScript workloads

| Problem | Solution |
|---|---|
| "node_modules not found" | Use `.WithNpmPackageInstallation()` to auto-install |
| npm install fails | Check `package.json` is valid; check npm registry connectivity |
| Vite dev server won't start | Verify `vite` is in devDependencies; check Vite config |
| Port mismatch | Ensure `targetPort` matches the port in your JS framework config |
| TypeScript compilation errors | These happen in the service, not Aspire — check service logs |

### Go workloads

| Problem | Solution |
|---|---|
| "go not found" | Ensure Go is installed and on PATH |
| Build fails | Check `go.mod` exists in working directory |
| "no Go files in directory" | Verify `workingDir` points to the directory with `main.go` |

### Java workloads

| Problem | Solution |
|---|---|
| "java not found" | Ensure JDK is installed and `JAVA_HOME` is set |
| Maven/Gradle build fails | Verify build files exist; check build tool installation |
| Spring Boot won't start | Check `application.properties`; verify main class |

### Rust workloads

| Problem | Solution |
|---|---|
| "cargo not found" | Install Rust via rustup |
| Build takes too long | Rust compile times are normal; use `.WithCargoBuild()` for pre-build |

### Health checks & startup

| Problem | Solution |
|---|---|
| Resource stuck in "Starting" | Health check endpoint not responding; check service logs |
| `.WaitFor()` timeout | Increase timeout or fix health endpoint; default is 30 seconds |
| Health check always fails | Verify endpoint path (default: `/health`); check service binds to correct port |
| Cascading startup failures | A dependency failed; check the root resource first |

### Dashboard

| Problem | Solution |
|---|---|
| Dashboard doesn't open | Check terminal for URL; use `--dashboard-port` for fixed port |
| No logs appearing | Service may not be writing to stdout/stderr; check console output |
| No traces for non-.NET services | Configure OpenTelemetry SDK in the service; see [Dashboard](dashboard.md) |
| Traces don't show cross-service calls | Propagate trace context headers (`traceparent`, `tracestate`) |

### Build & configuration

| Problem | Solution |
|---|---|
| "Project not found" for `AddProject<T>()` | Ensure `.csproj` is in the solution and referenced by AppHost |
| Package version conflicts | Pin all Aspire packages to the same version |
| AppHost won't build | Check `Aspire.AppHost.Sdk` is in the project; run `dotnet restore` |
| `aspire run` build error | Fix the build error first; `aspire run` requires a successful build |

### Deployment

| Problem | Solution |
|---|---|
| `aspire publish` fails | Check publisher package is installed (e.g., `Aspire.Hosting.Docker`) |
| Generated Bicep has errors | Check for unsupported resource configurations |
| Container image push fails | Verify registry credentials and permissions |
| Missing connection strings in deployment | Check generated ConfigMaps/Secrets match resource names |

---

## Debugging strategies

### 1. Check the dashboard first

The dashboard shows resource state, logs, traces, and metrics. Start here for any issue.

### 2. Check environment variables

In the dashboard, click a resource to see all injected environment variables. Verify connection strings and service URLs are correct.

### 3. Read console logs

Dashboard → Console Logs → filter by the failing resource. Raw stdout/stderr often contains the root cause.

### 4. Check the DAG

If services fail to start, check the dependency order. A failed dependency blocks all downstream resources.

### 5. Use MCP for AI-assisted debugging

If MCP is configured (see [MCP Server](mcp-server.md)), ask your AI assistant:
- "What resources are failing?"
- "Show me the logs for [service]"
- "What traces show errors?"

### 6. Isolate the problem

Run just the failing resource by commenting out others in the AppHost. This narrows whether the issue is the resource itself or a dependency.

---

## Getting help

| Channel | URL |
|---|---|
| GitHub Issues (runtime) | https://github.com/dotnet/aspire/issues |
| GitHub Issues (docs) | https://github.com/microsoft/aspire.dev/issues |
| Discord | https://aka.ms/aspire/discord |
| Stack Overflow | Tag: `dotnet-aspire` |
| Reddit | r/dotnet |
