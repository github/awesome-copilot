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

## 26.7 Tested recipe: an HTTP flow created from scratch with `pac` only (real test, 2026-09-24)

Tested with `pac` 2.12.2 in a **developer** environment (not production). Anything not tested is marked.

1. **`pac` has to start.** On one machine the installed 2.7.4 failed with "the system cannot find the file specified"; `pac install latest` moved it to 2.12.2 and it worked. `pac --version` does not exist: use `pac help`. In Git Bash on Windows `pac` is not on the PATH: run it as `powershell -NoProfile -Command "pac ..."`.
2. **Sign in without a browser:** `pac auth create --name Dev --environment "<url>" --deviceCode`, then confirm with `pac auth who` and `pac org who`. If the token expired, the error is `AADSTS50173` and the profile has to be created again.
3. **Project:** `pac solution init --publisher-name X --publisher-prefix xx --outputDirectory sol`. **It does not create the flows folder.** The solution `UniqueName` comes from the output folder name: fix it in `Other/Solution.xml` **before the first import**, because changing it later creates a second solution in the environment.
4. **The flow:** generate `src/Workflows/<Name>-<GUID IN UPPERCASE>.json` with a script that serializes JSON (not text templates): `properties.definition` with a `Request` / `Http` trigger and `"triggerAuthenticationType": "All"` if a public web page calls it (§21.1).
5. **Register it:** in `Other/Customizations.xml`, inside `<Workflows>`, a `<Workflow WorkflowId="{GUID IN UPPERCASE}" Name="...">` with `JsonFileName`, `Type` 1, `Category` 5, `Scope` 4, `StateCode` 1, `StatusCode` 2 and `PrimaryEntity` none (the same fields as a real export). In `Other/Solution.xml`: `<Managed>0</Managed>` and, in `<RootComponents>`, `<RootComponent type="29" id="{guid in lowercase}" behavior="0" />`.
6. **Pack and import:** `pac solution pack --zipfile x.zip --folder .\sol\src --packagetype Unmanaged` and `pac solution import --path x.zip --publish-changes`.

**What was observed:**

- `StateCode` 1 / `StatusCode` 2 in the XML left the flow turned on after import (a flow with no connections). `pac power-automate list-cloud-flows --workflow-id <id>` showed `stateCode: Published`.
- An outside POST to the trigger URL answered 200, and `pac power-automate list-flow-runs --workflow-id <id>` showed the run as `Succeeded`.
- Changing the flow in code (a new field in the schema and in the response), repacking and reimporting gave "The original workflow definition has been deactivated and replaced", and the new definition was live.

**Traps observed** (not in Microsoft documentation: **NOT VERIFIED** outside this test):

- **GUID letter case.** With the GUID in lowercase in both the `<Workflow>` and the `RootComponent`, `pack` warned "root components are not defined in customizations". With uppercase in both, `import` failed with "component ... of type 29 is not declared in the solution file as a root component". It worked with `WorkflowId` and the file name in uppercase and the `RootComponent` `id` in lowercase.
- **The trigger URL does not come from `pac`.** Copy it from the designer (§26.5, point 1). `pac power-automate` (2.12, preview, read-only: `list-cloud-flows`, `list-flow-actions`, `list-flow-runs`) shows status and runs, not the URL.
- **Value type.** An `@{...}` expression inside a JSON object returned text (`"True"`). With the expression alone, `"@coalesce(...)"`, the response returned the real boolean (`true`): tested.
- **A flow with SharePoint: the connection reference.** Create it once in the portal (Solutions, New, More, Connection reference) and export the solution (`pac solution export` and `unpack`) to copy its XML. It sits in `Other/Customizations.xml` as `<connectionreferences><connectionreference connectionreferencelogicalname="...">` with `connectionreferencedisplayname`, `connectorid`, `iscustomizable`, `promptingbehavior`, `statecode` and `statuscode`, and it is **not** listed as a `RootComponent`. Declaring it as a `RootComponent` of type 372 failed ("not in the target system") and with 10150 it failed ("Invalid component type"). The connection id goes in the deployment settings file (`--settings-file`, §26.3). With the reference and that file, the import finished correctly.
- **"Create item" validates the columns on save.** The `PostItem` action with dynamic columns is validated against the real list: with a list that did not exist, saving gave `WorkflowOperationParametersExtraParameter` ("the API operation does not contain a definition for the parameter 'item/Comentario'") and the flow stayed in draft after import. Create the list before importing the flow, or use the REST call below.
- **Writing to SharePoint (tested end to end).** Two flows. One with a `Recurrence` trigger and two "Send an HTTP request to SharePoint" actions (`POST _api/web/lists` and `POST _api/web/lists/getbytitle('<list>')/fields`) created the list and the column without opening SharePoint. Another with an HTTP trigger wrote the row with `POST _api/web/lists/getbytitle('<list>')/items`, and the outside POST answered 200 with the row `Id`. With `Accept` and `Content-Type` set to `application/json;odata=nometadata`. The connection and the connection reference were created in the portal.
- **After import, with a connection, the flows did not start on their own.** They stayed in draft or without runs until they were opened, turned on and run in the portal; which of those steps was the one needed was not confirmed. Once active, everything worked.
- **Text-only REST body.** With `@{...}` inside a JSON built as text, a value with quotes or line breaks breaks the JSON: how to escape it was not tested.
- **`pac power-automate list-flow-runs` can lag.** Right after the POST it showed the previous run and not the new one; the flow's own response (the row `Id`) was the evidence.

## Sources (Microsoft Learn)

- *Work with cloud flows using code* — `learn.microsoft.com/power-automate/manage-flows-with-code`
- *pac solution* — `learn.microsoft.com/power-platform/developer/cli/reference/solution`
- *pac auth* — `learn.microsoft.com/power-platform/developer/cli/reference/auth`
- *Pre-populate connection references and environment variables for automated deployments* — `learn.microsoft.com/power-platform/alm/conn-ref-env-variables-build-tools`
- *Creating a service principal application* (SPN limitations) — `learn.microsoft.com/power-platform/admin/powerplatform-api-create-service-principal`
