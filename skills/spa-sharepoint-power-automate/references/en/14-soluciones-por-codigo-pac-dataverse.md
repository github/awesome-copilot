<!-- spa-sharepoint-power-automate · references/14-soluciones-por-codigo-pac-dataverse.md · section §26 · English translation of the Spanish original -->
<!-- New (2026-09-24). Verified against Microsoft Learn (manage-flows-with-code, pac solution, pac auth, deployment settings). Anything not verified is marked. Index: ../SKILL.md -->

# 26 · Solution flows by code: PAC CLI and the Dataverse `workflow` table

§20 automates **standalone** flows ("My flows") with the legacy package and the `api.flow.microsoft.com` API. This chapter is the **supported** path for flows that live in a **solution** (§24): they are handled like any Dataverse table.

## 26.1 Which route applies to each flow

| Flow type | Route supported by Microsoft | Unsupported route |
|---|---|---|
| **Solution flow** (*Solutions* tab) | **Dataverse Web API / SDK** (`workflow` table) and **PAC CLI** (`pac solution …`) | — |
| **Standalone flow** (*My flows*) | **None by code.** The docs say that managing them with code "aren't supported" | Legacy package via the UI (§20.1) + `api.flow.microsoft.com` (§20.2) |

Two official warnings that change how to read §20:

- Microsoft says that the `api.flow.microsoft.com` API **"isn't supported"**: customers can use it **"at their own risk"**, and these APIs "are subject to change, so breaking changes could occur". It is useful for iterating quickly in development, **not** as the basis of a production process.
- The official alternative outside Dataverse is the administration connectors (*Power Automate Management*, *Power Automate for Admins*).

**Rule of thumb:** to iterate quickly on standalone flows, §20. For anything going to production or needing auditing, **move to a solution (§24.4) and use this chapter**.

## 26.2 PAC CLI: installation, authentication and profiles

`pac` is the Power Platform CLI. It is installed separately (a .NET tool, NuGet package `Microsoft.PowerApps.CLI`, or the VS Code extension); `pac install latest` updates it. The YAML format features in §26.4 require **2.4.1 or later**.

```powershell
pac auth create --name Dev  --environment "<id | url | nombre único | nombre parcial>"
pac auth create --name Dev  --environment "<...>" --deviceCode     # sin navegador (Codespaces, WSL2, servidores)
pac auth list                                                       # perfiles guardados en esta máquina
pac auth select --index 2                                           # cambiar de perfil activo
pac auth who                                                        # cuál está activo
```

- You can have **several profiles** (dev, test, production, or several tenants) and switch between them with `select`. **Having the production profile active by mistake is the main risk**: check `pac auth who` before importing.
- For unattended automation: **service principal** (`--applicationId`, `--clientSecret` or certificate, `--tenant`; it must be **added to the environment**), managed identity (`--managedIdentity`) or GitHub/Azure DevOps federation (`--githubFederated`, `--azureDevOpsFederated`, no secrets in the repo).
- Microsoft clarifies that service principal identities **cannot be licensed** in Entra: the Flow-related APIs work with them "in situations where no license is required". For flows with a Premium connector, check §21.2 before assuming an SPN is enough. **NOT VERIFIED** in your own tenant.
- It is the official, audited route: `pac auth` uses Microsoft's application for the CLI. It is the **correct alternative to §18.1** when what you are automating is Power Platform/Dataverse (it does not replace §18.1 for calling SharePoint REST directly).

## 26.3 The export → unpack → edit → pack → import cycle

```powershell
pac solution list                                                    # nombres únicos de las soluciones del entorno
pac solution export --name MiSolucion --path .\MiSolucion.zip --overwrite      # no administrada por defecto; --managed para administrada
pac solution unpack --zipfile .\MiSolucion.zip --folder .\src --packagetype Unmanaged
#   editar  .\src\Workflows\<NombreDelFlow>-<GUID>.json
pac solution pack   --zipfile .\MiSolucion.zip --folder .\src --packagetype Unmanaged
pac solution import --path .\MiSolucion.zip --publish-changes --settings-file .\dev.settings.json
```

- **Do not open the `.zip` with ordinary tools**: the docs ask you to use `unpack`/`pack` (SolutionPackager). When unpacked, the flow is `Workflows/<Name>-<GUID>.json`, with `properties.definition` (the same definition language as §20.1) and `properties.connectionReferences`.
- `pac solution import` accepts `--force-overwrite` (overwrite unmanaged customizations), `--async`, `--skip-lower-version` and `--stage-and-upgrade`. Without `--path` it assumes the current folder is a `.cdsproj` project.
- **`clone` vs `export`**: `pac solution clone` generates a buildable `.cdsproj` project (to **add** components); `export` + `unpack` is for **modifying** what already exists. To edit a flow, `export` is enough.
- **YAML format**: if the repo uses Dataverse's native Git integration (or `clone`), the folder contains `solutions/<Name>/solution.yml`; `pack` detects it just from the presence of `solutions/`. If that folder does not exist, the classic XML format is used (`Other/Solution.xml`). Note: if a component is listed in `rootcomponents.yml` but its files are missing, `pack` **finishes successfully and omits it from the zip**.
- Versioning: `pac solution online-version --solution-name X --solution-version 1.0.0.2` reads or sets the version in the environment; `pac solution version` adjusts build/revision in `Solution.xml` (`--strategy GitTags | FileTracking | Solution`).
- **`pac solution check`** runs the Power Apps Checker (*Solution Checker* rule) on the zip before importing. To review the flows' **best practices** (complexity, security, performance) on the same zip there is the `powercat-overflow` skill (§24.5, §25).

### Deployment file (connections and variables per environment)

```powershell
pac solution create-settings --solution-zip .\MiSolucion.zip --settings-file .\dev.settings.json
```

It generates the JSON that you then pass to `import --settings-file`:

```json
{
  "EnvironmentVariables": [
    { "SchemaName": "app_SharePointSiteUrl", "Value": "https://<tenant>.sharepoint.com/sites/<sitio>" }
  ],
  "ConnectionReferences": [
    { "LogicalName": "app_sharedsharepointonline_xxxxx",
      "ConnectionId": "<id de la conexión en el entorno destino>",
      "ConnectorId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline" }
  ]
}
```

- The `ConnectionId` values come from the target environment: **Data → Connections**, open the connection and read the id in the URL.
- Validation on import: the connection must belong to the **owner of the connection reference** or be **shared** with them. If not, the flow imports turned off.
- Keep one file per environment (`dev.settings.json`, `prod.settings.json`) **without secrets** (only ids and URLs) in the repo.

## 26.4 Dataverse Web API: the `workflow` table

All solution flows are rows in the `workflow` table. Base URL: `https://<org>.<región>.dynamics.com/api/data/v9.2` (the environment's, in *View developer resources*). Authenticate with Entra OAuth (see MS Learn *Use OAuth authentication with Microsoft Dataverse*).

| Column | Meaning |
|---|---|
| `category` | `5` = modern flow (automated, instant or scheduled); `6` = desktop flow; `4` = business process flow |
| `clientdata` | **JSON string** with `properties.connectionReferences` and `properties.definition` |
| `statecode` | `0` draft (off) · `1` activated · `2` suspended |
| `type` | `1` definition · `2` activation · `3` template |
| `ismanaged` | Installed by a managed solution |
| `workflowid` / `workflowidunique` | Flow id across all imports / of this installation |

```http
GET  …/workflows?$filter=category eq 5 and statecode eq 1&$select=name,workflowid,statecode,modifiedon,_ownerid_value

POST …/workflows                      (crear)
{ "category": 5, "name": "Mi flow", "type": 1, "primaryentity": "none", "clientdata": "<JSON como cadena>" }
→ 204 con cabecera OData-EntityId (ahí viene el workflowid). Queda en statecode 0 (apagado).

PATCH …/workflows(<workflowid>)       (actualizar: solo las propiedades a cambiar)
If-Match: *
{ "clientdata": "<JSON como cadena>", "statecode": 1 }          # encender

DELETE …/workflows(<workflowid>)
```

- **Every flow created by API starts turned off**: you must `PATCH` with `statecode = 1`. If the flow uses connections, the `connectionReferences` in `clientdata` must resolve in the environment or it will not turn on.
- Exporting/importing whole solutions: `ExportSolution` actions (`{"SolutionName": "...", "Managed": false}`, returns `ExportSolutionFile` in **base64**) and `ImportSolution` (`OverwriteUnmanagedCustomizations: true`, `CustomizationFile` in base64). You need `OverwriteUnmanagedCustomizations = true` for an existing flow to be overwritten.
- Sharing/removing access: `GrantAccess`, `ModifyAccess`, `RevokeAccess` actions on the row.
- `clientdata` and the definition are **JSON text inside a JSON**: escape quotes and do not break `@{...}`/`@(...)`. Generate them with a serializer, not with text templates (same lesson as §20.4).
- **NOT VERIFIED**: the exact way to obtain the Dataverse token from the command line with `az` (`az account get-access-token --resource https://<org>.crm.dynamics.com` is the usual way, but it is not in the documentation consulted).

## 26.5 Applied to the SPA → Power Automate → SharePoint pipeline

1. **The HTTP trigger URL changes per environment and per import.** After each import into a new environment you must read it from the flow and update `VITE_POWER_AUTOMATE_URL` in that environment's build (§24.2). Automating it is a good candidate for a repo script. **NOT VERIFIED** how to read the URL of a solution flow by code without the designer.
2. In `clientdata`, the trigger must keep the appropriate authentication mode: for the public SPA, `Anyone` (in definitions, `"triggerAuthenticationType": "All"` as in §20.1), or the flow rejects the browser (§21.1).
3. SharePoint sites and lists go as **environment variables** (§24.2) and not as text in each action: if `pac solution create-settings` does not list them, they are hand-written inside the flow.
4. Recommended workflow: **development** (flow in a solution) → `export` + `unpack` into the repo (readable diff) → `pack` → `import` into test/production with `--settings-file`.
5. After each import: activate, **test end to end** (§20.7) and run `power-automate-documentation` (§24.5) if the list schema changed.

## 26.6 What exists in the community (surveyed 2026-09-24, not audited)

Third-party skills that touch this path: `alvinwills/power-automate-claude-skills` (`power-automate-pac`: export with PAC, edit the JSON on disk, reimport), `tomdam/flowforger` (pull and push flows from Dataverse), `excelano/paxc` (a DSL compiler), `ericrisco/rsc-harness` and `mbadali25/useful-claude-add-ons` (Dataverse Web API / flows API). None covers our public SPA context or the traps of §20.4. Full registry in §25.

## Sources (Microsoft Learn)

- *Work with cloud flows using code* — `learn.microsoft.com/power-automate/manage-flows-with-code`
- *pac solution* — `learn.microsoft.com/power-platform/developer/cli/reference/solution`
- *pac auth* — `learn.microsoft.com/power-platform/developer/cli/reference/auth`
- *Pre-populate connection references and environment variables for automated deployments* — `learn.microsoft.com/power-platform/alm/conn-ref-env-variables-build-tools`
- *Creating a service principal application* (SPN limitations) — `learn.microsoft.com/power-platform/admin/powerplatform-api-create-service-principal`
