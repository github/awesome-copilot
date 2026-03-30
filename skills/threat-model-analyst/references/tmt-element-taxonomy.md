# TMT Element Taxonomy — Code to Threat Model DFD Reference

Complete reference for identifying DFD elements from source code analysis.
Aligns with Microsoft Threat Modeling Tool (TMT) element types for TM7 compatibility.
This is the **single authoritative file** for all TMT type classifications.

**Diagram styling & rendering rules** are in: [diagram-conventions.md](./diagram-conventions.md)
**This file covers:** What to look for in code, how to classify it, and how to name it.

---

## 1. Element Types

**NOTE:** TMT IDs (e.g., `SE.P.TMCore.OSProcess`) are for classification reference only. **Do NOT use TMT IDs as Mermaid node IDs.** Use concise, readable PascalCase IDs (e.g., `WebServer`, `SqlDatabase`).

### 1.1 Process Types

| TMT ID | Name | Code Patterns to Identify |
|--------|------|---------------------------|
| `SE.P.TMCore.OSProcess` | OS Process | Native executables, system processes, spawned processes |
| `SE.P.TMCore.Thread` | Thread | Thread pools, `Task`, `pthread`, worker threads |
| `SE.P.TMCore.WinApp` | Native Application | Win32 apps, C/C++ executables, desktop apps |
| `SE.P.TMCore.NetApp` | Managed Application | .NET apps, C# services, F# programs |
| `SE.P.TMCore.ThickClient` | Thick Client | Desktop GUI apps, WPF, WinForms, Electron |
| `SE.P.TMCore.BrowserClient` | Browser Client | SPAs, JavaScript apps, WebAssembly |
| `SE.P.TMCore.WebServer` | Web Server | IIS, Apache, Nginx, Express, Kestrel |
| `SE.P.TMCore.WebApp` | Web Application | ASP.NET, Django, Rails, Spring MVC |
| `SE.P.TMCore.WebSvc` | Web Service | REST APIs, SOAP, GraphQL endpoints |
| `SE.P.TMCore.VM` | Virtual Machine | VMs, containers, Docker |
| `SE.P.TMCore.Win32Service` | Win32 Service | Windows services, `ServiceBase` |
| `SE.P.TMCore.KernelThread` | Kernel Thread | Kernel modules, drivers, ring-0 code |
| `SE.P.TMCore.Modern` | Windows Store Process | UWP apps, Windows Store apps, sandboxed apps |
| `SE.P.TMCore.PlugIn` | Browser and ActiveX Plugins | Browser extensions, ActiveX, BHO plugins |
| `SE.P.TMCore.NonMS` | Applications Running on a non Microsoft OS | Linux apps, macOS apps, Unix processes |

### 1.2 External Interactor Types

| TMT ID | Name | Code Patterns to Identify |
|--------|------|---------------------------|
| `SE.EI.TMCore.Browser` | Browser | Browser clients, user agents, web UI consumers |
| `SE.EI.TMCore.AuthProvider` | Authorization Provider | OAuth servers, OIDC providers, IdP, SAML |
| `SE.EI.TMCore.WebSvc` | External Web Service | External APIs, vendor services, SaaS endpoints |
| `SE.EI.TMCore.User` | Human User | End users, operators, administrators |
| `SE.EI.TMCore.Megaservice` | Megaservice | Large cloud platforms (Azure, AWS, GCP services) |
| `SE.EI.TMCore.WebApp` | External Web Application | Third-party web apps, external portals |
| `SE.EI.TMCore.CRT` | Windows Runtime | WinRT APIs, Windows runtime components |
| `SE.EI.TMCore.NFX` | Windows .NET Runtime | .NET Framework, CLR, BCL |
| `SE.EI.TMCore.WinRT` | Windows RT Runtime | Windows RT platform, ARM Windows apps |

### 1.3 Data Store Types

| TMT ID | Name | Code Patterns to Identify |
|--------|------|---------------------------|
| `SE.DS.TMCore.CloudStorage` | Cloud Storage | Azure Blob, S3, GCS |
| `SE.DS.TMCore.SQL` | SQL Database | PostgreSQL, MySQL, SQL Server, SQLite |
| `SE.DS.TMCore.NoSQL` | Non-Relational DB | MongoDB, CosmosDB, Redis, Cassandra |
| `SE.DS.TMCore.FS` | File System | Local files, NFS, shared drives |
| `SE.DS.TMCore.Cache` | Cache | Redis, Memcached, in-memory caches |
| `SE.DS.TMCore.ConfigFile` | Configuration File | `.env`, `appsettings.json`, YAML configs |
| `SE.DS.TMCore.Cookie` | Cookies | HTTP cookies, session cookies |
| `SE.DS.TMCore.Registry` | Registry Hive | Windows Registry, system configuration stores |
| `SE.DS.TMCore.HTML5LS` | HTML5 Local Storage | `localStorage`, `sessionStorage`, IndexedDB |
| `SE.DS.TMCore.Device` | Device | Hardware devices, USB, peripheral storage |

### 1.4 Data Flow Types

| TMT ID | Name | Code Patterns to Identify |
|--------|------|---------------------------|
| `SE.DF.TMCore.HTTP` | HTTP | `fetch()`, `axios`, `HttpClient`, REST without TLS |
| `SE.DF.TMCore.HTTPS` | HTTPS | TLS-secured REST, `https://` endpoints |
| `SE.DF.TMCore.Binary` | Binary | gRPC, Protobuf, raw binary protocols |
| `SE.DF.TMCore.NamedPipe` | Named Pipe | IPC via named pipes |
| `SE.DF.TMCore.SMB` | SMB | SMB/CIFS file shares |
| `SE.DF.TMCore.UDP` | UDP | UDP sockets, datagram protocols |
| `SE.DF.TMCore.SSH` | SSH | SSH tunnels, SFTP, SCP |
| `SE.DF.TMCore.LDAP` | LDAP | LDAP queries, AD lookups |
| `SE.DF.TMCore.LDAPS` | LDAPS | Secure LDAP over TLS |
| `SE.DF.TMCore.IPsec` | IPsec | VPN tunnels, IPsec-secured connections |
| `SE.DF.TMCore.RPC` | RPC or DCOM | COM+, DCOM, RPC calls, WCF net.tcp |
| `SE.DF.TMCore.ALPC` | ALPC | Advanced Local Procedure Call, Windows IPC |
| `SE.DF.TMCore.IOCTL` | IOCTL Interface | Device I/O control, driver communication |

### 1.5 Trust Boundary Types

**Line Boundaries:**

| TMT ID | Name | Code Indicators |
|--------|------|-----------------|
| `SE.TB.L.TMCore.Internet` | Internet Boundary | Public endpoints, API gateways |
| `SE.TB.L.TMCore.Machine` | Machine Boundary | Process boundaries, VM separation |
| `SE.TB.L.TMCore.Kernel` | Kernel/User Mode | Drivers, ring 0/3 transitions |
| `SE.TB.L.TMCore.AppContainer` | AppContainer | UWP sandboxes, app containers |

**Border Boundaries:**

| TMT ID | Name | Code Indicators |
|--------|------|-----------------|
| `SE.TB.B.TMCore.CorpNet` | CorpNet | Corporate network, VPN perimeter |
| `SE.TB.B.TMCore.Sandbox` | Sandbox | Sandboxed execution environments |
| `SE.TB.B.TMCore.IEB` | Internet Explorer Boundaries | IE zones, IE security settings |
| `SE.TB.B.TMCore.NonIEB` | Other Browsers Boundaries | Chrome, Firefox, Edge security contexts |

---

## 2. Trust Boundary Detection

Create a trust boundary (`subgraph`) when code crosses:

| Boundary Type | Code Indicators |
|---------------|-----------------|
| **Internet/Public** | Public endpoints, API gateways, load balancers |
| **Machine** | Process boundaries, host separation |
| **Kernel/User Mode** | Kernel calls, drivers, syscalls |
| **AppContainer** | UWP sandboxes, containerized apps |
| **CorpNet** | Corporate network perimeter, VPN |
| **Sandbox** | Sandboxed execution environments |

---

## 3. Data Flow Detection

Look for these patterns to identify flows:

| Flow Type | Code Patterns |
|-----------|---------------|
| **HTTP/HTTPS** | `fetch()`, `axios`, `HttpClient`, REST calls |
| **SQL Database** | ORM queries, SQL connections, `DbContext` |
| **Message Queue** | Pub/sub, queue send/receive, Dapr pub/sub |
| **File I/O** | File read/write, blob upload/download |
| **gRPC** | Protobuf calls, gRPC streams |
| **Named Pipe** | IPC via named pipes |
| **SSH** | SSH tunnels, SFTP, SCP transfers |
| **LDAP/LDAPS** | Directory queries, AD lookups |

---

## 4. Code Analysis Checklist

When analyzing code, systematically identify:

1. **Entry Points** → External Interactors + inbound flows
   - API controllers, event handlers, webhook endpoints

2. **Services/Logic** → Processes
   - Business logic classes, service layers, workers

3. **Data Access** → Data Stores + flows
   - Repository classes, DB contexts, cache clients

4. **External Calls** → External Interactors + outbound flows
   - HTTP clients, SDK integrations, third-party APIs

5. **Security Boundaries** → Trust Boundaries
   - Auth middleware, network segments, deployment units

6. **Kubernetes Pod Composition** → Sidecar co-location
   - Look for Helm charts, K8s manifests, deployment YAMLs
   - Common sidecars: Dapr, MISE, Envoy, Istio proxy, Linkerd, log collectors
   - **Apply rules from `diagram-conventions.md` Rule 1** — annotate host nodes, never create standalone sidecar nodes

---

## 5. Naming Conventions

See [diagram-conventions.md](./diagram-conventions.md) Naming Conventions section for the full table with quoting rules.

---

## 6. Output Files

Generate **TWO files** for maximum flexibility:

### File 1: Pure Mermaid (`.mmd`)
- Raw Mermaid code only, no markdown wrapper
- Used for: CLI tools, editors, CI/CD, direct rendering

### File 2: Markdown (`.md`)
- Mermaid in ` ```mermaid ` code fence
- Include element, flow, and boundary summary tables
- Used for: GitHub, VS Code, documentation

### Format Comparison

| Format | Extension | Contents | Best For |
|--------|-----------|----------|----------|
| Pure Mermaid | `.mmd` | Raw diagram code | CLI, editors, tools |
| Markdown | `.md` | Diagram + tables | GitHub, docs, viewing |
