<!-- spa-sharepoint-power-automate · references/04-sharepoint.md · secciones §10, §18 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 10 · SharePoint setup

## List creation via REST — depende del tenant, PROBALO primero

`POST /_api/web/lists` devuelve HTTP 400 en **algunos** tenants por política, sin importar los permisos del usuario. Pero **no es universal**: en `tenant-b.sharepoint.com` (agosto 2026) funcionó a la primera y creó las dos listas sin chistar.

> **Corrección de una versión anterior de esta skill**, que decía *"don't try to script list creation"* como regla general. Eso hizo que se le pidiera al usuario un paso manual que su tenant no necesitaba. **Intentá el POST una vez** —cuesta diez segundos y no rompe nada— y recién si devuelve 400 mandá a la UI.

```powershell
$body = @{
    '__metadata'  = @{ type = 'SP.List' }
    Title         = $nombre
    Description   = $desc
    BaseTemplate  = 100          # 100 = lista generica (Custom List)
} | ConvertTo-Json -Depth 8
Invoke-SP -Method POST -Uri "$ApiSP/web/lists" `
    -BodyBytes ([Text.Encoding]::UTF8.GetBytes($body)) `
    -Extra @{ 'Content-Type' = 'application/json;odata=verbose;charset=utf-8' }
```

El script tiene que **degradar con elegancia**: si el POST falla, imprimir la URL que abre el diálogo con el nombre puesto y salir con código 1, en vez de morir con un stack trace.

Fallback para cuando sí está bloqueado:
- `https://<tenant>.sharepoint.com/sites/<site>/Lists/<List>/AllItems.aspx?npsAction=createList` — abre "Crear lista" con el nombre pre-cargado
- O: sitio → **+ Nuevo** → **Lista** → **En blanco**

En cualquiera de los dos casos, una vez que la lista existe, `_api/.../fields` para agregar columnas funciona siempre.

> **El bloqueo es por tenant, no por producto.** Si trabajás con más de un tenant (ej. `tenant-a` y `tenant-b`), lo que aprendiste en uno no aplica al otro. Verificá en cada uno antes de dar por sentado que hace falta el paso manual.

## List Title vs URL-name discrepancy

When you create `Foo Bar` via UI, SharePoint may store:
- **Display Title:** `Foo Bar` (or `Foo-Bar`, depends on UI version) — what `getbytitle()` uses
- **URL path:** `/Lists/FooBar/...` — different! No spaces/hyphens, used in URL only

**Always discover the actual Title via REST before doing anything else:**
```powershell
$lists = Invoke-RestMethod -Uri "$ApiSP/web/lists?`$select=Title&`$filter=Hidden eq false" -Headers $authHeaders
$lists.d.results | Where-Object { $_.Title -match "Foo" } | ForEach-Object { Write-Host $_.Title }
```

Real-world example: user creates a list at URL `/Lists/CheckListSemiRemolque/...`, but the actual Title is `Check-List-Semi-Remolque` (with hyphens). All `getbytitle('CheckListSemiRemolque')` calls return 404 until you use the real Title.

## Idempotent column setup script

For repeatability, create columns from a versioned script that authenticates with an **organization-approved app registration** (for example PnP PowerShell with your own Entra app, or an app limited to the site with `Sites.Selected`, §32). Add each column only if it does not exist, and keep the script in Git. This distribution does not include a sample that borrows a Microsoft first-party client ID.

## REST + PowerShell — UTF-8 trap

**The single most painful integration bug.** `Invoke-RestMethod` with a string `-Body` sends the body using **ISO-8859-1**, not UTF-8. Any accented character (`ó`, `á`, `é`, `í`, `ú`, `ñ`) anywhere in `Title`, `Description`, or `Choices` will cause SharePoint to reject the request with HTTP 400 and:

> `"Unable to translate bytes [F3] at index N from specified code page to Unicode"`

(`F3` = `ó` in Latin-1.) Plain-ASCII columns work, accented ones silently fail and the script "succeeds" with half the columns missing.

**The fix is mandatory** for any column whose Title or Choices may have accents:

```powershell
$json = $body | ConvertTo-Json -Depth 8
$bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
$h2 = @{}; foreach ($k in $h.Keys) { $h2[$k] = $h[$k] }
$h2["Content-Type"] = "application/json;odata=verbose;charset=utf-8"
Invoke-RestMethod -Method POST -Uri $url -Headers $h2 -Body $bodyBytes
```

**Always send body as UTF-8 byte array, never as string.** Apply this to every POST/PATCH against `_api/web/lists/...`. The fix is local to each call — there's no global flag to set.

### PowerShell 5.1 .ps1 file encoding

Even the script source itself: PowerShell 5.1 reads `.ps1` files as ANSI/Windows-1252 unless they have a **UTF-8 BOM**. Without BOM, parser errors like *"Falta la cadena en el terminador"* appear at lines containing accented characters. Save with BOM:
```powershell
$content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText($path, $content, (New-Object System.Text.UTF8Encoding($true)))
```

Validate with `[System.Management.Automation.Language.Parser]::ParseFile($path, [ref]$tokens, [ref]$errs)` before running.

## Hidden default columns conflict

Some internal names collide with SharePoint's built-in hidden columns even though they don't appear in the UI. Symptoms: `Add-Column` returns HTTP 400 *"Solicitud incorrecta"* for a name that doesn't appear via `getbyinternalnameortitle`. Common conflicts:
- `Categoria` / `Categoría` — collides with default content-type metadata
- `Author`, `Editor`, `Created`, `Modified` — system fields
- `ContentType`, `Title` — already exist (Title comes free, don't recreate)

**Workaround**: use a distinct InternalName, separate from the display Title:
```powershell
Add-Column -ListTitle $list -Name "CategoriaItem" -Title "Categoría" ...
#                            ^^ unique internal     ^^ what user sees
```

The display name (Title) can have accents and conflicts; only the InternalName needs to be unique and ASCII.

## Lookup column creation via REST

`SP.FieldLookup` creation through `_api/web/lists/.../fields` with `__metadata.type = "SP.FieldLookup"` returns HTTP 400 in most tenants, even with correct `LookupListId` and `LookupFieldName`. Known REST API limitation.

**Three options, in order of effort**:
1. **Manual via UI** (recommended for one-offs): list → **+ Add column** → **Lookup** → pick parent list + column
2. **Use `createfieldasxml` endpoint** with raw SP XML schema:
   ```
   POST /_api/web/lists/getbytitle('Items')/fields/createfieldasxml
   Body: { "parameters": { "__metadata": { "type": "SP.XmlSchemaFieldCreationInformation" },
                            "SchemaXml": "<Field Type='Lookup' DisplayName='Inspeccion' Name='Inspeccion' List='{guid}' ShowField='Title' />",
                            "Options": 28 } }
   ```
   ⚠️ El endpoint REST es **`createfieldasxml`**. `addfieldasxml` es el nombre del método en
   CSOM/PnP y por REST devuelve `ResourceNotFoundException` — *"No se encuentra el recurso para
   la solicitud addfieldasxml"*. Es un 404 disfrazado, fácil de confundir con un problema de permisos.

   `Options` es un bitmask: `4` AddToDefaultContentType + `8` AddFieldInternalNameHint +
   `16` AddFieldToDefaultView. `28` = las tres (lo habitual: crea la columna y además la muestra
   en la vista por defecto).

   Este endpoint **sí funciona** para columnas normales (Text, DateTime, URL, Choice) — es la
   forma más confiable de crearlas, porque permite fijar InternalName y DisplayName por separado
   y setear `Indexed='TRUE'` en el mismo XML.
3. **PnP PowerShell** (`Add-PnPField`) — but requires module install + auth

In practice, manual UI is fastest. Always include a fallback in the script that prints clear instructions when REST creation fails.

## Lookup column belongs on the CHILD list (very common mistake)

The lookup belongs on the **child** list (the one referencing the parent), not the parent. Symptom in Power Automate:
- The parent's Create item form shows an unexpected `Inspeccion Id` field
- The child's Create item form does NOT show any way to set the parent reference

**Fix**: delete the column from the parent list, recreate it in the child list. After saving, refresh make.powerautomate.com — the field appears in the right place.

## Verify SP Choice columns include all SPA values

When the SPA adds a new option to a dropdown that maps to a SharePoint **Choice** column (with `FillInChoice='FALSE'`), the new value is **silently dropped** by SP if it's not in the column's choices list. The flow's `Create item` succeeds (no error), but the column ends up empty for that row.

Whenever you add an option in `types.ts` (e.g. `PROYECTOS_SERVICIOS`), also:
1. Update the choices list in `Setup-AllColumns-*.ps1`
2. Either re-run the script (`Ensure-ChoiceField` updates choices via PATCH/MERGE) OR add manually in the SP UI

The script update needs the SP MERGE pattern (`X-HTTP-Method: MERGE` + `IF-MATCH: *`), with the same UTF-8 byte-body fix as above.

---

# 18 · Bulk data sync: Excel → SharePoint list via REST (NO Power Automate)

When the task is "load/update an **existing** SP list from an Excel" (not a public form pipeline), skip the flow entirely. Drive SharePoint REST directly with a resource token from a script.

## 18.1 Authentication for scripts that write to SharePoint

Use an **organization-approved app registration** with the least privilege that works: delegated permissions for a person-run script, or `Sites.Selected` scoped to the site (§32). Ask IT to approve it; §32 has a one-paragraph request they can sign off. Cache refresh tokens only in an OS-protected store, never in the repository, and never share them.

Do not borrow a Microsoft first-party client ID to avoid the consent review: that skips your tenant's app-approval process.

## 18.2 Reading existing items — the `/items` returns 0 quirk

On some lists the OData feed `_api/web/GetList('...')/items` returns `value: []` even though `ItemCount` says 314 — **even when** the caller is Site Admin, `ReadSecurity=1`, `WriteSecurity=1`, moderation off, full `EffectiveBasePermissions`. It is not a permission/moderation issue. **Fix: read via `RenderListDataAsStream`** (what the UI uses):

```powershell
$gid  = (Invoke-RestMethod ".../_api/web/GetList('$encUrl')?`$select=Id" -Headers $H).Id
$view = "<View><ViewFields><FieldRef Name='ID'/><FieldRef Name='$keyField'/></ViewFields><RowLimit>5000</RowLimit></View>"
$body = @{ parameters = @{ RenderOptions = 2; ViewXml = $view } } | ConvertTo-Json -Compress
$rd   = Invoke-RestMethod -Method POST ".../_api/web/lists(guid'$gid')/RenderListDataAsStream" -Headers $H -Body ([Text.Encoding]::UTF8.GetBytes($body))
$rd.Row   # array of { ID, field_1, ... } as DISPLAY strings
```
Page with `$rd.NextHref` when present; with `RowLimit` ≥ count it's one page. Each `Row` value is the **display-formatted** string (numbers carry thousand separators, dates are localized) — normalize before comparing.

## 18.3 Resolve the list by server-relative URL, not Title

`getbytitle('<slug>')` 404s constantly: the URL slug strips accents and can differ from the display Title in spelling (real case: slug `.../Lists/Histrico vs Actual Experto ART`, actual Title `Histórico vs Actual Experta ART`). Use `GetList('/sites/<site>/Lists/<slug>')` (URL-encode spaces to `%20`) — it resolves by the URL you already have from the browser.

## 18.4 Transient 401 right after a token

The 2nd–3rd REST call right after obtaining/refreshing a token intermittently returns `401`. Wrap every call in a retry that **re-tokenizes** on 401 (2–3 attempts, ~800ms sleep); also back off on 429/503 via `Retry-After`. Build the `Authorization` header fresh from a `$script:Token` each attempt so the refreshed token propagates.

## 18.5 Writes — nometadata, UTF-8, no digest

With an OAuth **Bearer** token you do **not** need `X-RequestDigest`. Create/update with `odata=nometadata` so you can omit `__metadata`:
- **Create**: `POST .../items` body `{ "field_1": 123, "Title": "..." }`
- **Update**: `POST .../items(<id>)` + headers `X-HTTP-Method: MERGE`, `IF-MATCH: *`, same body
- Always send the body as a **UTF-8 byte array** (accents in text values), Content-Type `application/json;odata=nometadata;charset=utf-8` (same trap as §10).
- Send only **non-null** converted values per row → empty Excel cells skip the field, so an update never clobbers an existing value with blank. Unparseable dates → skip that field, don't fail the row.
- **DateTime off-by-one trap**: writing `yyyy-MM-ddT00:00:00Z` (midnight UTC) makes a list in a UTC-negative timezone (e.g. Argentina UTC-3) display the **previous day** (midnight UTC = 21:00 the day before, local). Write **noon UTC** `yyyy-MM-ddT12:00:00Z` so it stays on the same calendar day for any tz from −12 to roughly +11. A Text column (not DateTime) is immune — it stores the literal string, no tz conversion (that's why one date col can look right while the DateTime ones shift). Verify dates after a bulk load, not just "0 errors".
- **A single DateTime column can't hold a multi-value cell**: Excel cells with several dates (`12/01/26 15/02/26`) have no valid single-date representation — detect (`>1` date token) and skip + report; decide with the user (take last date, or change the column to multi-line Text).
- **Audit comparator gotcha**: when verifying SP-vs-source, don't compare date strings raw — `06/05/26` (2-digit yr) ≠ `06/05/2026` as strings though they're the same day. Normalize both to `yyyyMMdd` via regex (year `<100` → `+2000`); `[datetime]::TryParseExact` with a format array silently no-ops in some PS hosts, so regex is safer.

## 18.6 Upsert keying for generic-column lists

Generic lists store custom columns as internal names `field_1..field_N`; map Excel headers → columns by **normalized displayName** (accent-strip + uppercase + alnum-only), same `Normalize-HeaderKey` as the flow scripts. Columns present in Excel but absent in the list (e.g. `POLIZA`) are simply skipped — **log them**, don't fail. Canonicalize the numeric upsert key by stripping non-digits on both the SP display value and the Excel value before matching.
