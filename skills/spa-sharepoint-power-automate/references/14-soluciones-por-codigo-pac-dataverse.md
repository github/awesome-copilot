<!-- spa-sharepoint-power-automate · references/14-soluciones-por-codigo-pac-dataverse.md · sección §26 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn (manage-flows-with-code, pac solution, pac auth, deployment settings). Lo no verificado está marcado. Índice: ../SKILL.md -->

# 26 · Flows de soluciones por código: PAC CLI y tabla `workflow` de Dataverse

§20 automatiza flows **sueltos** ("Mis flujos") con el paquete legacy y la API `api.flow.microsoft.com`. Este capítulo es el camino **soportado** para flows que viven en una **solución** (§24): se manejan como cualquier tabla de Dataverse.

## 26.1 Qué vía corresponde a cada flow

| Tipo de flow | Vía soportada por Microsoft | Vía no soportada |
|---|---|---|
| **Flow de solución** (pestaña *Soluciones*) | **Dataverse Web API / SDK** (tabla `workflow`) y **PAC CLI** (`pac solution …`) | — |
| **Flow suelto** (*Mis flujos*) | **Ninguna por código.** La doc dice que administrarlos con código "no está soportado" | Paquete legacy por la UI (§20.1) + `api.flow.microsoft.com` (§20.2) |

Dos advertencias oficiales que cambian cómo leer §20:

- Microsoft dice que la API de `api.flow.microsoft.com` **"no está soportada"**: se puede usar **bajo tu propio riesgo**, y "está sujeta a cambios, por lo que pueden ocurrir cambios que rompan". Sirve para iterar rápido en desarrollo, **no** como base de un proceso de producción.
- La alternativa oficial fuera de Dataverse son los conectores de administración (*Power Automate Management*, *Power Automate for Admins*).

**Regla práctica:** para iterar flows sueltos rápido, §20. Para todo lo que vaya a producción o necesite auditoría, **pasar a solución (§24.4) y usar este capítulo**.

## 26.2 PAC CLI: instalación, autenticación y perfiles

`pac` es la Power Platform CLI. Se instala aparte (herramienta .NET, paquete NuGet `Microsoft.PowerApps.CLI` o extensión de VS Code); `pac install latest` la actualiza. Las funciones de formato YAML de §26.4 exigen **2.4.1 o superior**.

```powershell
pac auth create --name Dev  --environment "<id | url | nombre único | nombre parcial>"
pac auth create --name Dev  --environment "<...>" --deviceCode     # sin navegador (Codespaces, WSL2, servidores)
pac auth list                                                       # perfiles guardados en esta máquina
pac auth select --index 2                                           # cambiar de perfil activo
pac auth who                                                        # cuál está activo
```

- Se pueden tener **varios perfiles** (dev, prueba, producción, o varios tenants) y alternar con `select`. **Tener el perfil de producción activo por error es el riesgo principal**: mirar `pac auth who` antes de importar.
- Para automatización sin persona: **service principal** (`--applicationId`, `--clientSecret` o certificado, `--tenant`; hay que **agregarlo al entorno**), identidad administrada (`--managedIdentity`) o federación de GitHub/Azure DevOps (`--githubFederated`, `--azureDevOpsFederated`, sin secretos en el repo).
- Microsoft aclara que las identidades de service principal **no se pueden licenciar** en Entra: las APIs relacionadas con Flow funcionan con ellas "en situaciones donde no se requiere licencia". Para flows con conector Premium, revisá §21.2 antes de asumir que un SPN alcanza. **NO VERIFICADO** en un tenant propio.
- Es la vía oficial y auditada: `pac auth` usa la aplicación de Microsoft para la CLI. Es la **alternativa correcta a §18.1** cuando lo que se automatiza es Power Platform/Dataverse (no reemplaza a §18.1 para llamar a SharePoint REST directamente).

## 26.3 El ciclo exportar → desempaquetar → editar → empaquetar → importar

```powershell
pac solution list                                                    # nombres únicos de las soluciones del entorno
pac solution export --name MiSolucion --path .\MiSolucion.zip --overwrite      # no administrada por defecto; --managed para administrada
pac solution unpack --zipfile .\MiSolucion.zip --folder .\src --packagetype Unmanaged
#   editar  .\src\Workflows\<NombreDelFlow>-<GUID>.json
pac solution pack   --zipfile .\MiSolucion.zip --folder .\src --packagetype Unmanaged
pac solution import --path .\MiSolucion.zip --publish-changes --settings-file .\dev.settings.json
```

- **No abras el `.zip` con herramientas comunes**: la doc pide usar `unpack`/`pack` (SolutionPackager). En el desempaquetado, el flow es `Workflows/<Nombre>-<GUID>.json`, con `properties.definition` (el mismo lenguaje de definición de §20.1) y `properties.connectionReferences`.
- `pac solution import` acepta `--force-overwrite` (pisar personalizaciones no administradas), `--async`, `--skip-lower-version` y `--stage-and-upgrade`. Sin `--path` asume que la carpeta actual es un proyecto `.cdsproj`.
- **`clone` vs `export`**: `pac solution clone` genera un proyecto `.cdsproj` compilable (para **agregar** componentes); `export` + `unpack` es para **modificar** lo que ya existe. Para editar un flow alcanza con `export`.
- **Formato YAML**: si el repo usa la integración nativa de Git de Dataverse (o `clone`), la carpeta trae `solutions/<Nombre>/solution.yml`; `pack` lo detecta solo por la presencia de `solutions/`. Si no existe esa carpeta, se usa el formato XML clásico (`Other/Solution.xml`). Ojo: si un componente figura en `rootcomponents.yml` pero faltan sus archivos, el `pack` **termina bien y lo omite del zip**.
- Versionado: `pac solution online-version --solution-name X --solution-version 1.0.0.2` lee o fija la versión en el entorno; `pac solution version` ajusta build/revisión en `Solution.xml` (`--strategy GitTags | FileTracking | Solution`).
- **`pac solution check`** corre el Power Apps Checker (regla *Solution Checker*) sobre el zip antes de importar. Para revisar **buenas prácticas de los flows** (complejidad, seguridad, rendimiento) sobre el mismo zip está la skill `powercat-overflow` (§24.5, §25).

### Archivo de despliegue (conexiones y variables por entorno)

```powershell
pac solution create-settings --solution-zip .\MiSolucion.zip --settings-file .\dev.settings.json
```

Genera el JSON que después se pasa a `import --settings-file`:

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

- Los `ConnectionId` salen del entorno destino: **Datos → Conexiones**, abrir la conexión y leer el id en la URL.
- Validación al importar: la conexión debe pertenecer al **dueño de la connection reference** o estar **compartida** con él. Si no, el flow importa apagado.
- Guardá un archivo por entorno (`dev.settings.json`, `prod.settings.json`) **sin secretos** (solo ids y URLs) en el repo.

## 26.4 Dataverse Web API: la tabla `workflow`

Todos los flows de solución son filas de la tabla `workflow`. URL base: `https://<org>.<región>.dynamics.com/api/data/v9.2` (la del entorno, en *View developer resources*). Se autentica con OAuth de Entra (ver MS Learn *Use OAuth authentication with Microsoft Dataverse*).

| Columna | Significado |
|---|---|
| `category` | `5` = flow moderno (automatizado, instantáneo o programado); `6` = desktop flow; `4` = business process flow |
| `clientdata` | **Cadena JSON** con `properties.connectionReferences` y `properties.definition` |
| `statecode` | `0` borrador (apagado) · `1` activado · `2` suspendido |
| `type` | `1` definición · `2` activación · `3` plantilla |
| `ismanaged` | Instalado por una solución administrada |
| `workflowid` / `workflowidunique` | Id del flow en todas las importaciones / de esta instalación |

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

- **Todo flow creado por API nace apagado**: hay que hacer `PATCH` con `statecode = 1`. Si el flow usa conexiones, las `connectionReferences` de `clientdata` tienen que resolverse en el entorno o no enciende.
- Exportar/importar soluciones enteras: acciones `ExportSolution` (`{"SolutionName": "...", "Managed": false}`, devuelve `ExportSolutionFile` en **base64**) e `ImportSolution` (`OverwriteUnmanagedCustomizations: true`, `CustomizationFile` en base64). Necesitás `OverwriteUnmanagedCustomizations = true` para que un flow existente se pise.
- Compartir/quitar acceso: acciones `GrantAccess`, `ModifyAccess`, `RevokeAccess` sobre la fila.
- Las `clientdata` y la definición son **texto JSON dentro de un JSON**: escapar comillas y no romper `@{...}`/`@(...)`. Generarlas con un serializador, no con plantillas de texto (misma lección que §20.4).
- **NO VERIFICADO**: la forma exacta de obtener el token de Dataverse desde la línea de comandos con `az` (`az account get-access-token --resource https://<org>.crm.dynamics.com` es lo habitual, pero no está en la doc consultada).

## 26.5 Aplicado al pipeline SPA → Power Automate → SharePoint

1. **La URL del trigger HTTP cambia por entorno y por importación.** Después de cada import a un entorno nuevo hay que leerla del flow y actualizar `VITE_POWER_AUTOMATE_URL` del build de ese entorno (§24.2). Automatizarlo es un buen candidato a script del repo. **NO VERIFICADO** cómo leer la URL de un flow de solución por código sin el diseñador.
2. En `clientdata`, el trigger debe seguir teniendo el modo de autenticación que corresponde: para la SPA pública, `Anyone` (en definiciones, `"triggerAuthenticationType": "All"` como en §20.1), o el flow rechaza al navegador (§21.1).
3. Los sitios y listas de SharePoint van como **environment variables** (§24.2) y no como texto en cada acción: si `pac solution create-settings` no los lista, están escritos a mano dentro del flow.
4. Flujo de trabajo recomendado: **desarrollo** (flow en solución) → `export` + `unpack` al repo (diff legible) → `pack` → `import` a prueba/producción con `--settings-file`.
5. Después de cada import: activar, **probar de punta a punta** (§20.7) y correr `power-automate-documentation` (§24.5) si cambió el esquema de listas.

## 26.6 Qué existe en la comunidad (relevado 2026-09-24, no auditado)

Skills de terceros que tocan este camino: `alvinwills/power-automate-claude-skills` (`power-automate-pac`: exportar con PAC, editar el JSON en disco, reimportar), `tomdam/flowforger` (traer y subir flows desde Dataverse), `excelano/paxc` (compilador de un DSL), `ericrisco/rsc-harness` y `mbadali25/useful-claude-add-ons` (Dataverse Web API / API de flows). Ninguna cubre nuestro contexto de SPA pública ni las trampas de §20.4. Registro completo en §25.

## 26.7 Receta probada: un flow HTTP creado desde cero, solo con `pac` (prueba real, 2026-09-24)

Probado con `pac` 2.12.2 en un entorno de **desarrollador** (no producción). Lo que no se probó está marcado.

1. **`pac` tiene que arrancar.** En una máquina, la 2.7.4 instalada fallaba con "no puede encontrar el archivo especificado"; `pac install latest` la dejó en 2.12.2 y anduvo. `pac --version` no existe: usar `pac help`. En Git Bash de Windows `pac` no está en el PATH: correrlo con `powershell -NoProfile -Command "pac ..."`.
2. **Sesión sin navegador:** `pac auth create --name Dev --environment "<url>" --deviceCode`, y confirmar con `pac auth who` y `pac org who`. Si el token venció, el error es `AADSTS50173` y hay que crear el perfil de nuevo.
3. **Proyecto:** `pac solution init --publisher-name X --publisher-prefix xx --outputDirectory sol`. **No crea la carpeta de flows.** El `UniqueName` de la solución sale del nombre de la carpeta de salida: corregirlo en `Other/Solution.xml` **antes del primer import**, porque cambiarlo después crea una segunda solución en el entorno.
4. **El flow:** generar `src/Workflows/<Nombre>-<GUID EN MAYÚSCULAS>.json` con un script que serialice JSON (no plantillas de texto): `properties.definition` con un trigger `Request` / `Http` y `"triggerAuthenticationType": "All"` si lo llama una web pública (§21.1).
5. **Registrarlo:** en `Other/Customizations.xml`, dentro de `<Workflows>`, un `<Workflow WorkflowId="{GUID EN MAYÚSCULAS}" Name="...">` con `JsonFileName`, `Type` 1, `Category` 5, `Scope` 4, `StateCode` 1, `StatusCode` 2 y `PrimaryEntity` none (mismos campos que un export real). En `Other/Solution.xml`: `<Managed>0</Managed>` y, en `<RootComponents>`, `<RootComponent type="29" id="{guid en minúsculas}" behavior="0" />`.
6. **Empaquetar e importar:** `pac solution pack --zipfile x.zip --folder .\sol\src --packagetype Unmanaged` y `pac solution import --path x.zip --publish-changes`.

**Lo observado:**

- `StateCode` 1 / `StatusCode` 2 en el XML dejó el flow activado al importar (un flow sin conexiones). `pac power-automate list-cloud-flows --workflow-id <id>` mostró `stateCode: Published`.
- Un POST desde fuera a la URL del trigger respondió 200, y `pac power-automate list-flow-runs --workflow-id <id>` mostró la corrida `Succeeded`.
- Cambiar el flow por código (un campo nuevo en el esquema y en la respuesta), volver a empaquetar y reimportar dio "The original workflow definition has been deactivated and replaced", y la definición nueva quedó activa.

**Trampas observadas** (no están en la documentación de Microsoft: **NO VERIFICADO** fuera de esta prueba):

- **Mayúsculas y minúsculas del GUID.** Con el GUID en minúsculas en el `<Workflow>` y en el `RootComponent`, `pack` avisó "root components are not defined in customizations". Con mayúsculas en ambos, `import` falló con "component ... of type 29 is not declared in the solution file as a root component". Funcionó con `WorkflowId` y nombre de archivo en mayúsculas y el `id` del `RootComponent` en minúsculas.
- **La URL del trigger no sale de `pac`.** Se copia del diseñador (§26.5, punto 1). `pac power-automate` (2.12, en versión preliminar, solo lectura: `list-cloud-flows`, `list-flow-actions`, `list-flow-runs`) sirve para ver el estado y las corridas, no para obtener la URL.
- **Tipo del valor.** Una expresión `@{...}` dentro de un objeto JSON devolvió texto (`"True"`). Con la expresión sola, `"@coalesce(...)"`, la respuesta devolvió el booleano real (`true`): probado.
- **Flow con SharePoint: la connection reference.** Crearla una vez en el portal (Soluciones, Nuevo, Más, Connection reference) y exportar la solución (`pac solution export` y `unpack`) para copiar su XML. Queda en `Other/Customizations.xml` como `<connectionreferences><connectionreference connectionreferencelogicalname="...">` con `connectionreferencedisplayname`, `connectorid`, `iscustomizable`, `promptingbehavior`, `statecode` y `statuscode`, y **no** figura como `RootComponent`. Declararla como `RootComponent` de tipo 372 falló ("not in the target system") y con 10150 falló ("Invalid component type"). El id de la conexión va en el archivo de despliegue (`--settings-file`, §26.3). Con la referencia y ese archivo, el import terminó bien.
- **"Crear elemento" valida las columnas al guardar.** La acción `PostItem` con columnas dinámicas se valida contra la lista real: con la lista inexistente, guardar dio `WorkflowOperationParametersExtraParameter` ("La operación API no contiene una definición para el parámetro 'item/Comentario'") y el flow quedó en borrador tras el import. Crear la lista antes de importar el flow, o usar la llamada REST de abajo.
- **Escribir en SharePoint (probado de punta a punta).** Dos flows. Uno con trigger `Recurrence` y dos acciones "Send an HTTP request to SharePoint" (`POST _api/web/lists` y `POST _api/web/lists/getbytitle('<lista>')/fields`) creó la lista y la columna sin abrir SharePoint. Otro con trigger HTTP escribió la fila con `POST _api/web/lists/getbytitle('<lista>')/items`, y el POST desde fuera respondió 200 con el `Id` de la fila. Con `Accept` y `Content-Type` en `application/json;odata=nometadata`. La conexión y la connection reference se crearon en el portal.
- **Tras el import, con conexión, los flows no arrancaron solos.** Quedaron en borrador o sin corridas hasta que se abrieron, se activaron y se ejecutaron en el portal; no se confirmó cuál de esos pasos fue el que hizo falta. Una vez activos, todo funcionó.
- **Solo texto en el cuerpo REST.** Con `@{...}` dentro de un JSON armado como texto, un valor con comillas o saltos de línea rompe el JSON: sin probar cómo escaparlo.
- **`pac power-automate list-flow-runs` puede ir por detrás.** Justo después del POST mostró la corrida anterior y no la nueva; la respuesta del propio flow (`Id` de la fila) fue la evidencia.

## Fuentes (Microsoft Learn)

- *Work with cloud flows using code* — `learn.microsoft.com/power-automate/manage-flows-with-code`
- *pac solution* — `learn.microsoft.com/power-platform/developer/cli/reference/solution`
- *pac auth* — `learn.microsoft.com/power-platform/developer/cli/reference/auth`
- *Pre-populate connection references and environment variables for automated deployments* — `learn.microsoft.com/power-platform/alm/conn-ref-env-variables-build-tools`
- *Creating a service principal application* (limitaciones de SPN) — `learn.microsoft.com/power-platform/admin/powerplatform-api-create-service-principal`
