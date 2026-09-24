<!-- spa-sharepoint-power-automate · references/06-operacion-y-errores.md · secciones §13, §14, §15, §16, §17 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 13 · Monitoring & observability

There's no APM here — but the pipeline is not blind:

- **Power Automate failure emails**: by default, Power Automate emails the **flow owner** when a flow run fails (after a few failures it can also auto-disable the flow). Make sure the flow owner is a monitored mailbox — this is your primary "something broke in prod" signal. Don't suppress these.
- **Run history is the log**: `make.powerautomate.com` → flow → **Run history** is the authoritative record of every submission attempt, with full Inputs/Outputs per action. Treat it as the server log.
- **Analytics tab**: the flow's Analytics view shows success/failure rate over time — a quick health check.
- **Client-side**: the SPA has no telemetry by default. If you need to know about *client* failures (POSTs that never reached the flow), you'd have to add something — but for an internal tool, "user reports it didn't work" + Run history is usually enough. Don't add analytics SDKs to a public no-login bundle without thinking about what they leak.
- **SharePoint as ground truth**: the parent list itself is the record of what got through. A gap in folios (or missing child items / attachments for a row) tells you a run partially failed.

---

# 14 · Testing

The reference project ships **no automated tests** — `npm run lint` is just `tsc --noEmit` (type check, not behavior). That's a deliberate trade-off for a small internal tool, but be honest about it: type-checking proves the code compiles, not that the form works.

What actually catches regressions here:

- **`tsc --noEmit`** on every build — keep it; it's cheap and catches real breakage (renamed fields, bad payload shape).
- **Manual end-to-end smoke test after every deploy** (see *Build order* step 8 and the diagnostic playbook). This is the real test suite. Do it on a real phone, not just desktop — half the bugs in this skill are mobile-only (SignaturePad, GPS, camera capture).
- **If you add automated tests**, the highest-value targets are the **pure functions**: `formatPatente` / `isValidPatente`, `parseKms` / `formatKms`, `compressImage` (idempotency), the `pendientes` derivation, payload-building in `uploadInspeccion`. These are deterministic and bug-prone. Vitest fits a Vite project with near-zero config. The flow and SharePoint side can't be unit-tested — they're covered by the manual smoke test.

Don't pretend a green `tsc` means "tested". State explicitly what was and wasn't verified.

## Actualización (2026-09-24): qué conviene probar hoy

La sección de arriba describe el proyecto de referencia original, que no traía pruebas automatizadas. En la práctica posterior del autor sí se probaron las piezas deterministas en **10 repos**, y se comprobó que rinde. Pirámide recomendada para este pipeline:

| Nivel | Qué probar | Herramienta | Sección |
|---|---|---|---|
| **Unitarias** (rápidas, sin red) | Funciones puras: formato de patente, parseo de números es-AR, versión y purga del borrador, cálculo de límites de imágenes, armado del payload | `vitest` | §4, §6 |
| **Contrato del payload** | Que lo que la SPA envía tenga los campos y tipos que el flow espera (un archivo de ejemplo compartido) | `vitest` + JSON de ejemplo | §8 |
| **Cliente de envío** | 200, 401/403, 429 con `Retry-After`, 502/504, timeout y modo demo, con `fetch` simulado | `vitest` | §21, §22, §23.4 |
| **Flow de punta a punta** | POST real a un flow de **prueba**, lectura del ítem creado y verificación de columnas, adjuntos e hijos | script de humo (`scripts/test-flow.mjs` del kit de arranque) | §20.7, §28.8 |
| **Definición del flow** | Reglas de buenas prácticas sobre la solución exportada | `pac solution check`, skill `powercat-overflow` | §24.5, §26 |
| **En el celular** | Firma, cámara, GPS, instalación de la PWA y actualización del service worker | Manual, en un teléfono real | §5, §7 |

Reglas:

- **El flow de prueba es un flow aparte**, con su propia URL y su propia lista (§9, "Flow backup & environments"); nunca se prueba contra producción.
- Los tests **no llevan la URL real** del trigger ni claves: van por variables de entorno.
- Un test verde **no** reemplaza la prueba manual en un teléfono real: el 50% de los errores de este pipeline solo aparece en móvil.
- Al terminar, decí **qué se probó y qué no** (regla 15 del índice).

---

# 15 · Diagnostic playbook

## End-to-end failure — walk this in order

When something fails end-to-end:

1. **Open browser DevTools → Network**: did the SPA actually POST? Status code? Response body?
2. **Open Power Automate → Run history**: was the flow triggered? Click the run → which step is red?
3. **Click the failed step → Inputs/Outputs**: see the actual values. The body PA received (under "Inputs" of the trigger) is gold — copy it and verify each field.
4. **Click Create Item → Inputs**: confirm exact JSON sent to SharePoint, with all column mappings expanded.
5. **Open SharePoint list → Settings → Columns**: every column the flow writes to MUST exist with the expected type.
6. **If stuck on Pages**: `gh api repos/<owner>/<repo>/pages/deployments/<sha>/cancel -X POST` then re-dispatch the workflow.

## "No se realizaron los cambios" — the fix didn't work

When a user reports "your fix didn't work" / changes aren't visible:

1. **Did the commit get pushed?** `git log origin/main -5` — if commit not in remote, push.
2. **Did the workflow finish?** Check Actions tab. If running, wait. If failed, fix the workflow.
3. **Is the new code in the live bundle?** `curl` the hashed asset, grep for a unique string from the change. If absent → re-trigger workflow. If present → continue.
4. **Is the user's SW serving stale JS?** They installed the PWA pre-auto-reload-fix. Tell them: DevTools → Application → Service Workers → Unregister → reload. Or Clear site data.
5. **Is the user's localStorage holding stale state?** (Old draft, old config.) Bump storage version, add to LEGACY_KEYS purge list, push.
6. **Is the user looking at the right URL?** Sometimes there's a forked stale deploy at an old repo path AND the new one.

Always do steps 1-3 before assuming a code bug. Most "didn't work" reports are deploy/cache issues, not code issues.

## Si una corrección no funciona

1. **¿Es la corrida de después del arreglo?** Antes de dar una corrección por fallada, **comparar la hora de la corrida con la fecha de modificación del flujo** (Detalles del flow → *Modificado*). Una corrida anterior al guardado, o del disparador viejo que todavía estaba en cola, muestra el error de antes aunque el arreglo esté bien.
2. **Si el error sigue igual después de dos correcciones, cambiá de enfoque.** Dos intentos con el mismo mensaje significan que se está retocando un valor cuando el problema es de otra naturaleza (un id que pide otra cosa, una conexión, una acción equivocada). Volvé al paso 3 (Inputs/Outputs de la acción que falla) y replanteá **qué** se le está pasando y **por qué** lo rechaza, en lugar de probar una tercera variante del mismo valor. Ejemplo: `Route did not match` no se arregla probando rutas con y sin `.pdf` (§28.2).

---

# 16 · Build order (new project from scratch)

Doing these in **exactly this order** prevents 90% of the "what do I do now?" loops:

1. **Create SharePoint lists via UI** (skip the script — REST creation is blocked in many tenants)
   - Use `?npsAction=createList` URL or site → New → List → Blank
   - Verify the actual Title via `_api/web/lists?$select=Title&$filter=Hidden eq false`
2. **Run idempotent column setup script** (with UTF-8 byte body!)
   - Adapt list `$listHeader` to the **real Title** (not the URL-name)
   - Use distinct InternalNames for any column with potential conflicts (`CategoriaItem` not `Categoria`)
3. **Create the lookup column manually** in the **child** list via UI (REST creation usually fails)
4. **Build the Power Automate flow** in the UI (see §9 flow build template):
   - HTTP trigger with **empty schema**
   - Optional `Check_key` 401 gate
   - Init varFolio → Create item (parent) with `fx` + defensive wrappers
   - `Respuesta` 200 before the loops
   - Loop `triggerBody()?['attachments']` (concurrency 1) → Add attachment
   - Loop `triggerBody()?['checklist']` (concurrency 20) → Create child item with lookup = parent ID
   - Send email V2 at root, `Configure run after` = succeeded only
5. **Save the flow**, copy the trigger URL, **Export the package `.zip`** and commit it
6. **Set GitHub secret** `VITE_POWER_AUTOMATE_URL` (and `VITE_APP_KEY` if used) via API or UI
7. **Push to main** → workflow auto-deploys
8. **Test end-to-end**: submit a real form **on a real phone**, check SP item, attachments, child items, email. Verify accents render in the PDF.

If you skip step 1 or 5, the SPA won't error but data silently disappears. If you skip step 4's empty-schema rule with a populated schema, the flow won't save.

## Field-add checklist (when adding a new data field)

Three places to keep in sync — plus the SP column:

1. **SP**: add column to the list (or update Setup script and re-run)
2. **SPA types.ts**: add field to `InspeccionDraft`
3. **SPA form**: add input/control bound to the new field with **functional setState**
4. **SPA payload**: add to `buildPayload()` in uploadInspeccion.ts
5. **Power Automate flow**: add the field in Create item with `triggerBody()?['newField']` (in `fx` tab!), with the defensive wrapper for its type
6. **Power Automate trigger schema** (if you kept one): add the property — or keep the schema empty
7. **Re-export the flow package** `.zip` and commit it
8. **Test**: submit a record, verify the column gets populated in SP

---

# 17 · Error catalog (unified)

| Error message / symptom | Root cause | Fix |
|---|---|---|
| `Property selection is not supported on values of type 'String'` | SPA sends Content-Type text/plain → flow sees String body | Switch SPA to `application/json`; or wrap expressions in `json(triggerBody())?['…']` |
| `'fieldName' ya no está presente en el esquema de la operación` | Trigger has stale JSON schema, or you used a chip from Dynamic Content | Clear the trigger schema; re-paste expression in `fx` tab |
| `Missing Authorization header for a privileged call on connection` | SharePoint/Outlook connector token expired | Power Automate UI → Conexiones → Reparar. Not a code issue. |
| `HTTP 502 NoResponse` from Power Automate | Flow took >110s; gateway timed out (payload size, or SP retries on missing column) | Compress images; ensure all SP columns exist; return `Respuesta` before the loops; check connector auth |
| `HTTP 400 ... deployment request failed for X due to in progress deployment Y` | Stuck Pages deployment in GitHub infra | `POST /pages/deployments/Y/cancel` → re-trigger |
| Logo / asset 404 with `/asset.png` from index.html | Absolute path doesn't account for GH Pages base | Use `./asset.png` (relative) or `${BASE_URL}asset.png` (in code) |
| Submit button never enables despite form filled | Hidden validation; user can't see what's missing | Implement `pendientes` array + visible checklist |
| Two emails per inspection | Email action inside Apply to each loop | Move email action to flow root, after loops |
| `e.preventDefault()` doesn't prevent native popup | HTML5 `required` fires before React onSubmit | Remove `required`, validate in JS only |
| Signature appears captured but field is null on submit | Stale closure in onChange — sibling component overwrote it | Use `setDraft(prev => ...)` functional form |
| `Unable to translate bytes [F3] at index N` | PowerShell sending body as ISO-8859-1, accented char in Title/Choices | Send body as UTF-8 byte array (`[Encoding]::UTF8.GetBytes($json)`) |
| `Falta la cadena en el terminador` (PS parse) | .ps1 file lacks UTF-8 BOM, accented chars mangled | Re-save with `UTF8Encoding($true)` |
| `Solicitud incorrecta (400)` from `_api/web/lists` POST | Tenant blocks list creation via REST | Have user create list via UI |
| `Add-Column` 400 for a name not found via `getbyinternalnameortitle` | InternalName collides with a hidden default column (`Categoria`, etc.) | Use a distinct ASCII InternalName, accents only in display Title |
| `404 No se encontró` on `getbytitle()` | List Title differs from URL-name | Check via `lists?$select=Title` and use real Title |
| Lookup field `Inspeccion Id` appears in the wrong list's Create item form | Lookup column added to parent list instead of child | Delete from parent, recreate in child |
| Apply to each iterates over body keys, not array entries | Input is `triggerBody()` instead of `triggerBody()?['attachments']` | Replace chip with `fx` expression pointing to the array |
| Choice column saved as empty string instead of null | Used `coalesce()` for required-empty Choice | Use `if(empty(...), null, ...)` instead |
| Number column saves 0 when source is null | Default JSON serialization / `""` coerced | Use `if(equals(..., null), null, float(...))` |
| New choice value reaches SP as empty column | SP Choice column with `FillInChoice=FALSE` rejects unknown values | Update setup script + re-run, or add choice manually in SP UI |
| `Save Conflict` on Add_attachment | Loop_attachments concurrency > 1, parallel writes to same SP item | Set loop Concurrency Control = 1 |
| Black preview + tiny broken-image icon in SP attachments | Add_attachment File Content is a JSON object `{contentBytes, name}` instead of raw `base64ToBinary(...)` | Code view → replace `body` with the plain `base64ToBinary(...)` expression string |
| SP attachment right size but won't open | Trailing `\r\n` / whitespace after `@expr` in body forces stringification of binary | Code view → trim `body` so it ends exactly at the expression `)` |
| `La acción que está intentando copiar y pegar no coincide con el esquema` | Copy-pasting an action across loop scope boundary | Add the action fresh, paste only the fx expressions |
| Signature pad inert on mobile | Canvas wrapped in `<label>`; touch absorbed | Move canvas out of label; use `<div>` for the title |
| Signature disappears on rotate / resize | naive `canvas.width` reset wipes bitmap | ResizeObserver + snapshot+restore via `toDataURL` |
| `data:,` saved as signature | empty canvas serialized | Validate `dataUrl.length > 200` before `onChange` |
| PDF text shows `Ã³` / `Ã±` / empty boxes where accents go | jsPDF built-in font isn't UTF-8 | Embed a UTF-8 TTF (`addFileToVFS` + `addFont`); ASCII-only is last resort |
| Cache.put TypeError in SW | `chrome-extension://` or `blob:` URL hit fetch listener | Early-return when `url.protocol !== "http(s):"` |
| PWA users see old version after deploy | Old SW still controlling tab; needs reload | Implement `controllerchange` auto-reload (see §7) |
| Removed checklist items still appear after deploy | Stale draft in localStorage with old items array | Bump `STORAGE_KEY` version + add old key to `LEGACY_KEYS` purge |
| Lighthouse: "icon size 'any' is not specific enough" | Manifest uses `sizes:"any"` | Provide explicit `192x192` and `512x512` entries |
| First push to new GitHub repo rejected | Repo was auto-initialized with README | `pull --allow-unrelated-histories` + `checkout --ours` |
| Checkbox click registers in React but tick never appears | CSS reset stripped `appearance` on `[type=checkbox]` | Exclude checkbox/radio from reset; use `accent-color` |
| `123,456` kilometraje saved as 123 in SP | `<input type="number">` parses up to first non-digit | Use `type=text` + `parseKms` helper that strips all non-digits |
| `URL.createObjectURL` memory blows up over time | Object URLs created in render, never revoked | `useMemo` for URL set + cleanup effect with `revokeObjectURL` |
| "Ver en SharePoint" button lands on 404 | Hardcoded list URL in flow Response doesn't match real list URL | Hide the link, or compose URL from `body/__metadata/uri` |
| Vencimientos email always sends warning even when docs are fine | Banner rendered unconditionally | Wrap banner in outer `if(or(less(ticks(...))), '<banner>', '')` |
| `⚠️ VENCIMIENTOS` shows on every email | Subject conditional uses wrong threshold / bad `coalesce` fallback | Verify each `coalesce(..., '2099-01-01')` — fallback must be FAR future |
| Success screen exposes internal email address | Hardcoded internal recipient in the SPA template | Use generic "sector correspondiente"; keep recipient in flow config only |
| Date in email/PDF shows raw UTC, confusing es-AR users | UTC value rendered without conversion | `convertTimeZone(..., 'Argentina Standard Time', ...)` in flow; `toLocaleString("es-AR", {timeZone})` in PDF |
| Submission failed and the user's filled form is gone | `clearDraft()` ran before confirmed success | Only `clearDraft()` after `uploadInspeccion` resolves ok; keep draft + Retry on failure |
| `Se necesita la aprobación del administrador` on device login | Used "Microsoft Graph Command Line Tools" (`14d82eec-...`) — not consented for non-admins in tenant | Use first-party pre-consented SP client `9bc3ab49-...` + resource-based v1 device flow (§18) |
| `AADSTS70011 invalid_scope` on device/token request | Combined a full-resource scope URL (`https://graph.microsoft.com/X`) with `offline_access` in one v2 request | Short scopes (`Sites.ReadWrite.All offline_access`) or resource-based v1 flow |
| `/items` returns `value: []` but `ItemCount` > 0 | Known SP OData quirk on some lists (even as Site Admin, ReadSecurity=1, no moderation) | Read via `RenderListDataAsStream` (RenderOptions=2 + ViewXml) by list GUID (§18) |
| Un JOIN entre dos listas SP da muchísimos "huérfanos" que no lo son | La FK es columna **Number** y `RenderListDataAsStream` la devuelve formateada con separador de miles es-AR (`1029` → `"1.029"`), mientras que el `ID` destino es Counter y viene plano. No falla: devuelve números mal | Canonicalizar **ambos lados** a solo dígitos (`-replace '[^\d]',''`) antes de comparar o de usar como clave de hashtable. Vale para toda clave numérica leída por RenderListData, no solo en cruces con Excel (§18.6) |
| MERGE a `/items(n)` devuelve 200 pero **el valor no se guarda** | Misma lista afectada por el quirk de `/items`: el endpoint acepta el POST y no persiste nada. Falla SILENCIOSA — el contador de "actualizadas" miente | Escribir por `GetItemById(n)`: `POST .../lists(guid'..')/GetItemById(n)` + `X-HTTP-Method: MERGE`. Verificar SIEMPRE por `RenderListDataAsStream`, nunca por `/items` |
| `ResourceNotFoundException` en `.../fields/addfieldasxml` | El endpoint REST se llama `createfieldasxml`; `addfieldasxml` es el nombre CSOM/PnP | Usar `createfieldasxml` (§10) |
| Token válido pero **401 en todos** los endpoints de SP, incluso `/_api/web` | Token emitido para OTRO tenant. El `WWW-Authenticate` de la respuesta trae `realm="<tenantId real>"`; compararlo con el claim `tid` del JWT | Reautenticar con una cuenta del tenant correcto. Un usuario con varias cuentas M365 puede tener refresh tokens cacheados de ambas |
| Nombre con acento llega mojibake (`Florès` → `FlorÃ¨s`) al pasar datos por JSON entre PS y node | `Get-Content -Raw` en PS 5.1 lee ANSI por defecto; `Set-Content -Encoding UTF8` escribe BOM y rompe `JSON.parse` | Leer con `Get-Content -Raw -Encoding UTF8`; escribir con `[IO.File]::WriteAllText($p,$json,(New-Object Text.UTF8Encoding($false)))` |
| Intermittent `401` on the 2nd–3rd REST call right after a fresh token | SPO transient token-validation race after refresh | Retry that re-tokenizes on 401 (2–3 attempts, ~800ms) |
| `getbytitle('...')` → 404 but list exists | URL slug ≠ display Title (slug strips accents; Title may be spelled differently, e.g. `Experta` vs slug `Experto`) | Resolve via `GetList('/sites/<site>/Lists/<slug>')` (server-relative URL) |
| Excel→SP upsert creates duplicates of existing rows | Numeric key shown with thousand separators in RenderListData (`2.273.333`) vs plain in Excel (`2273333`) | Canonicalize key by stripping non-digits on BOTH sides before compare |
| La página queda en modo demo aunque la URL del flow esté configurada | El módulo leía `window.FLOW_URL` al evaluarse. Los `import` de un `<script type="module">` corren **antes** que el cuerpo que los importa, así que el `window.X = …` todavía no pasó | Nunca leer globals en el top-level de un módulo. Pasar la config por una función `initFlow(url, key)` explícita (§19.1) |
| El usuario no puede tipear en un campo / la pantalla no scrollea | Un `setInterval` llama a una función que hace `contenedor.innerHTML = …` cada segundo: destruye los inputs a medio llenar y resetea `scrollTop` | Separar `pintar()` (cambio de estado) de `tick()` (actualiza solo los nodos que cambian) — §19.2 |
| El push nunca llega en iPhone | En iOS el Web Push solo funciona con la PWA **agregada a la pantalla de inicio** | Requisito de Safari, no del diseño. Va en la capacitación + `apple-touch-icon` en el `<head>` (§19.3) |
| Web Push no se puede disparar desde Power Automate | Web Push exige firmar un JWT **VAPID con ES256**, y Power Automate no puede firmar ES256 | OneSignal / FCM con una acción HTTP común (§19.3) |
| El ícono de "Agregar a inicio" en iPhone es una captura de pantalla | Falta `<link rel="apple-touch-icon">`; iOS **ignora** los iconos del manifest | Agregar el link al `<head>` de cada página instalable |
| Edge Tools / webhint marca `theme-color`, Wake Lock o Web Push por Firefox | Evalúa contra la browserslist por defecto, no contra los navegadores reales del proyecto | `.browserslistrc` con los targets reales. Para `theme-color`, inyectarlo por JS (§19.3) |
| Un cronómetro operativo se reinicia al bloquear el celular | El tiempo transcurrido se calculaba en el cliente | El instante de referencia vive en SP; el cliente relee estado y recalcula. §19.2 |
| Un chofer/operario "adivina" un PIN de 4 dígitos | 10.000 combinaciones sin bloqueo se agotan por fuerza bruta en minutos | Contador de fallidos + `BloqueadoHasta` en la lista, verificados **en el flow** (§19.4) |
| Los tiempos facturables vienen inflados | El flow tomó el timestamp del payload del cliente | `utcNow()` dentro del flow, siempre. §19.4 |
| Una guarda de negocio se saltea | Estaba implementada solo deshabilitando el botón en el HTML | Toda guarda que tenga consecuencia económica o legal se valida en el flow. El HTML es comodidad, no control |
| `Route did not match` en `Obtener contenido de archivo` (`Get file content`) | Se armó una **ruta a mano** en el campo *File Identifier*; la acción espera un **id**. Falla con o sin `.pdf` | Usar `{Identifier}` del disparador. Para trabajar por ruta, la acción *Get file content using path* (§28.2) |
| El nombre del archivo llega **sin extensión** (`informe` en vez de `informe.pdf`) | `{Name}` del disparador de archivos no trae la extensión | Usar `{FilenameWithExtension}` para nombres y filtros (§28.1) |
| *"Hay una conexión interrumpida para «Cuando se crea o se modifica un archivo (solo propiedades)»"* / *"Conexión no válida"* con todo en Conectado | Token vencido o cada acción guarda su propia referencia de conexión | *Reparar conexión*; si persiste, **Cambiar conexión** en cada acción y en el disparador eligiendo la del **tilde verde**. Guardar y volver a guardar re-registra el disparador (§28.5, §9) |
| El flow de archivos "no reacciona" a los 30 segundos de subir el archivo | El disparador es de **sondeo**: responde a los pocos minutos y puede agrupar cambios | Esperar unos minutos y mirar *Todas las ejecuciones*; para iterar, **Reenviar** la corrida fallida en lugar de esperar (§28.6, §28.7) |
