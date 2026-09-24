<!-- spa-sharepoint-power-automate · references/03-contrato-y-flow.md · secciones §8, §9 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 8 · SPA ↔ flow contract

## Payload shape (example)

What the SPA sends, what each field is for, and where it ends up:

```json
{
  "folio":            "INS-20260504-1234",        // → Title
  "fechaInspeccion":  "2026-05-04T16:30:00.000Z", // → FechaInspeccion (DateTime)
  "tipoInspeccion":   "Vehiculo",                 // → TipoInspeccion (Choice.Value)
  "tipoOperacion":    "RECEPCION",                // → TipoOperacion (Choice.Value)
  "activo":           "TOYOTA HILUX",             // → Activo
  "patente":          "ABC123",
  "interno":          "179",
  "kilometraje":      458789,                     // null if unset, never ""
  "ultimoServicio":   425687,
  "vtvVto":           "2026-06-25",
  "soVto":            "2026-07-22",
  "rutaVto":          "2026-07-30",
  "inspectorNombre":  "JORGE CASTRO",
  "inspectorEmail":   "",
  "inspectorDNI":     "29224981",
  "inspectorSector":  "QHSE",
  "combustible":      "1/4",                      // Choice
  "ubicacion":        "BASE CIPOLLETTI",
  "estadoGeneral":    "OK",                       // Choice — auto-derived from items
  "observaciones":    "",
  "latitud":          -38.9516,                   // null if no GPS
  "longitud":         -68.0591,
  "proyectoServicio": "QHSE",                     // Choice
  "tipoVehiculo":     "Camioneta Cabina Doble 4x2", // Choice
  "tenencia":         "Propia",                   // Choice
  "checklist":        [ /* { categoria, item, estado, comentarios, evidenciaURL, orden } × N */ ],
  "attachments":      [ /* { name, contentBase64 } × N — PDF first, then signature, then evidencias */ ]
}
```

## Date / timezone handling

- The SPA sends `fechaInspeccion` as a full **ISO-8601 UTC string** (`...Z`). The SP DateTime column stores UTC; SharePoint's UI renders it in the **viewer's** regional setting, which may not be es-AR.
- The flow's `coalesce(triggerBody()?['fechaInspeccion'], utcNow())` also produces UTC.
- For the **email body and the PDF**, format for the reader explicitly — don't show a raw UTC string to an Argentine user. In the flow: `convertTimeZone(triggerBody()?['fechaInspeccion'], 'UTC', 'Argentina Standard Time', 'dd/MM/yyyy HH:mm')`. In the SPA PDF: format with `toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })`.
- Keep the **payload and SP column in UTC**; only localize at presentation. Mixing local time into the stored value makes later reporting ambiguous.

## Payload & attachment limits

The whole pipeline has size ceilings — exceed them and you get opaque 502s or silent truncation:

- **Power Automate HTTP trigger request body**: practical ceiling is well under the theoretical max; large base64 payloads also push flow run time past the **~110s gateway timeout** (the *time* limit usually bites before the *size* limit). The mitigation is the same as for timeouts: compress images hard, and return the Response **before** the loops (see flow template §10.4).
- **base64 inflation**: every attachment is ~33% bigger as base64 than as bytes. Budget accordingly — 10 MB of photos becomes ~13 MB of JSON.
- **SharePoint attachment**: per-file and per-item limits apply at the SP end; oversized files fail inside `Add attachment`, not at the trigger.
- **Practical rule**: aim for a **total payload under a few MB**. With Layer-1 + Layer-2 JPEG compression at q≈0.72/1280px, typical evidence photos land ~80–150 KB each, so even 15–20 photos stay in budget. If a form genuinely needs more, that's a sign to upload attachments in a second call rather than one fat POST.
- **Client-side guard**: before POSTing, sum the base64 lengths; if over your chosen cap, block submit with a clear message ("Demasiadas fotos / fotos muy grandes — reducí la cantidad") rather than letting it fail as a 502.

---

# 9 · Power Automate

## HTTP trigger: Content-Type matters

**Critical pitfall**: with `Content-Type: text/plain`, Power Automate treats the body as a literal String. Then `triggerBody()?['folio']` fails with:

> "Property selection is not supported on values of type 'String'"

**Fix**: send `Content-Type: application/json`. **CORS — NOT VERIFIED:** Microsoft Learn does not document CORS behaviour for this trigger. `application/json` and any custom header (such as `x-app-key`) make the browser send a preflight `OPTIONS` request first. In the author's own pipeline the browser call worked, but that is a field observation, not a documented guarantee, and trigger URL formats have changed over time. **Test the call from a browser against the real trigger URL.** If the preflight fails, put a small CORS-capable proxy in front (Cloudflare Worker, Azure Functions or API Management) and keep the trigger URL on the server side.

```ts
const headers = { "Content-Type": "application/json" };
fetch(POWER_AUTOMATE_URL, { method: "POST", headers, body: JSON.stringify(payload) });
```

If you ever genuinely need text/plain (e.g., to bypass a misbehaving CORS layer), wrap every expression in the flow with `json()`:
```
json(triggerBody())?['folio']
```

## HTTP trigger: JSON schema gotcha

If the HTTP trigger has a **Request Body JSON Schema** defined, Power Automate validates `triggerBody()?['xxx']` references against it and rejects unknown properties at design time:

> "'tipoVehiculo' ya no está presente en el esquema de la operación"

**Two options**:
1. **Clear the schema** (leave the field empty). Simplest for evolving payloads. You lose dynamic content chips but `fx` expressions work fine.
2. **Keep schema in sync**: every time the SPA adds a field, update the trigger schema. Tedious.

In practice, clearing the schema is best — the SPA is the source of truth for the payload shape.

## ALWAYS use fx Expression

Never drag chips from the "Dynamic Content" panel into action fields. They embed schema references that break when the trigger changes. Always use the **`fx Expression`** tab and paste expressions like:
```
triggerBody()?['folio']
coalesce(triggerBody()?['fechaInspeccion'], utcNow())
```

## SharePoint column types + defensive wrappers

Plain `triggerBody()?['campo']` works for non-empty Text fields. For everything else, wrap defensively to avoid SharePoint rejecting the entire Create item:

| SP type | Defensive expression |
|---|---|
| **Text (Title or single line)** | `triggerBody()?['campo']` (empty string is acceptable) |
| **Multi-line text** | `triggerBody()?['campo']` |
| **DateTime (required)** | `coalesce(triggerBody()?['campo'], utcNow())` |
| **DateTime (optional)** | `if(empty(triggerBody()?['campo']), null, triggerBody()?['campo'])` |
| **Number / Float** | `if(equals(triggerBody()?['lat'], null), null, float(triggerBody()?['lat']))` — explicit `float()` cast handles int-vs-decimal and protects from `""` being coerced to 0 |
| **Choice (Value subfield, optional)** | `if(empty(triggerBody()?['campo']), null, triggerBody()?['campo'])` — `coalesce()` returns a string, not null, which the connector rejects for a required-empty choice |
| **Choice (Value subfield, with default)** | `coalesce(triggerBody()?['campo'], 'OK')` |
| **Yes/No (Bool)** | `if(equals(triggerBody()?['accept'], null), false, bool(triggerBody()?['accept']))` |
| **Person/Group** | ❌ Cannot fill from anonymous public flow. Either delete the column, or assign the flow owner manually. |

**On the SPA side**, always normalize to typed values before sending:
```ts
kilometraje: typeof draft.kilometraje === "number" ? draft.kilometraje : null,
```

These wrappers are cheap and catch dozens of null/type-cast bugs that only appear in production with sparse data.

## Apply to each: input is the array, not the body

When the SPA payload has nested arrays (`attachments`, `checklist`), the `Apply to each` action's input must be the array **property**, not the whole body:

```
✗ WRONG:   triggerBody()             → iterates over all top-level keys (folio, fecha, ...)
✓ RIGHT:   triggerBody()?['attachments']
```

Symptom of the wrong setup: the Add attachment / Create child item action runs once per top-level field of the payload, all failing because `items('Loop')?['name']` is undefined for non-array entries. In the Apply to each "input" field, **delete the auto-attached chip** and paste the expression in the `fx Expression` tab.

## Apply to each: attachments loop

```
Apply to each (input: triggerBody()?['attachments'])
└─ Add attachment
   ├─ Site Address: <fixed>
   ├─ List Name: Inspecciones
   ├─ Identifier: outputs('CreateInspeccion')?['body/ID']
   ├─ File Name (fx): items('Loop_attachments')?['name']
   └─ File Content (fx): base64ToBinary(items('Loop_attachments')?['contentBase64'])
```

The action name `Loop_attachments` reflects whatever the user named the Apply to each (spaces become underscores in `items('...')`).

## "Save Conflict" on parallel SP writes

Error from `Add_attachment`:

> "Error en la acción 'Add_attachment' Save Conflict. Your changes conflict with those made concurrently by another user."

Root cause: `Apply to each (attachments)` iterates in **parallel** (default concurrency). Each iteration writes to the **same SP item ID**. SP uses optimistic concurrency (ETag) and rejects the second writer.

Fix: open the loop → **Settings ⚙️** → **Concurrency Control = On**, **Degree of Parallelism = 1**. Mandatory for **any loop that mutates the same parent item**.

| Loop operation | Safe concurrency |
|---|---|
| Add attachment to same item | **1** |
| Update item (same row) | **1** |
| Create item (separate rows in child list) | 20 |
| Update item (different rows) | 20 |
| Send email (different recipients) | 10 |

## Add_attachment File Content trap — JSON object instead of binary

When you build `Add_attachment` in the visual editor, PA sometimes auto-inserts a **file-picker object** instead of raw binary in File Content. Code view shows:

```json
"body": {
  "contentBytes": "@{items('Loop_attachments')?['contentBase64']}",
  "name": "@{items('Loop_attachments')?['name']}"
}
```

OR in the UI you see a field with two sub-chips: `contentBytes` + `name` wrapped in `{}`.

That JSON object gets serialized and **sent to SP as the file content** — the file in SharePoint contains the literal text `{"contentBytes":"...","name":"..."}` instead of bytes. Symptom: clicking the attachment in SP shows a broken image (or the file opens as text-garbage).

**Fix**: the `body` field must be **only** the binary expression — no JSON wrapper:
```
@base64ToBinary(items('Loop_attachments')?['contentBase64'])
```

In Code view the action's `body` should be a plain string, not an object:
```json
"body": "@base64ToBinary(items('Loop_attachments')?['contentBase64'])"
```

If the UI keeps re-wrapping it, delete the Add_attachment action entirely and re-add it. Add each field via the `fx Expression` tab (never the file picker UI).

## Trailing `\r\n` in `body` corrupts binary attachments

Even after the body expression is correct, this **also** corrupts the upload:

```json
"body": "@base64ToBinary(items('Loop_attachments')?['contentBase64'])\r\n"
```

The trailing `\r\n` turns the value into a Logic Apps **string template** (any literal char outside `@<expr>` triggers string interpolation). Binary output of `base64ToBinary` gets coerced to string → bytes truncated/escaped → SP file corrupt.

Symptom: clicking the attached image in SharePoint shows the broken-image icon centered on a black preview pane. Downloading the file gives a non-zero size but it won't open as an image.

**Fix**: in Code view, ensure the `body` string ends **immediately** after the expression, no trailing whitespace, newlines, or characters:

```json
"body": "@base64ToBinary(items('Loop_attachments')?['contentBase64'])",   ✅
"body": "@base64ToBinary(items('Loop_attachments')?['contentBase64'])\r\n", ❌
"body": "@base64ToBinary(items('Loop_attachments')?['contentBase64']) "    ❌ (trailing space)
```

This is **really hard to spot** in the visual editor — the chip looks identical with or without trailing whitespace. **Always inspect via Peek code / Vista de código** when debugging attachment corruption.

## Diagnosing broken SP attachments — symptom decision tree

When clicking a SharePoint attachment shows the broken-image icon:

1. **Download the file** (right-click → Save link as)
2. Check size on disk:
   - **0 bytes** → upstream issue. Either `contentBase64` was empty (SPA didn't send), or expression in PA can't resolve (`?['contentBase64']` returns null on misnamed field).
   - **Non-zero, won't open** → bytes corrupted. Most common: trailing `\r\n` in body OR `dataUriToBinary` used when SPA strips the data URI prefix.
   - **Non-zero, opens fine in image viewer** → file is OK, the SP preview just can't render (rare; usually wrong extension or weird metadata).
3. Open the file in a hex editor or text editor:
   - First bytes `{"contentBytes":...` → File Content has the JSON-object trap.
   - First bytes `data:image/jpeg;base64,...` → `dataUriToBinary` vs `base64ToBinary` mismatch.
   - Looks like base64 text (`/9j/4AAQSkZJRg...`) → `base64ToBinary` was missing, body sent raw base64 string.
   - First bytes `\xFF\xD8\xFF` (JPEG) or `\x89PNG` (PNG), then text-mangled mid-file → trailing `\r\n` issue.

## Email duplicate trap + run-after

If you put a **Send an email V2** action **inside an Apply to each loop**, it sends one email per iteration. Always place email/notification actions at the **root** of the flow, after all loops:
```
Trigger
├─ Init variables
├─ CreateInspeccion
├─ Loop attachments
│   └─ Add attachment       ← only thing in the loop
├─ Loop checklist
│   └─ Create item ChildList
└─ Send an email V2          ← OUTSIDE loops
```

By default every action runs if the previous one is `succeeded`. For `Send email`, you usually want it to run **only** if the entire chain (Create item, both loops) succeeded — otherwise users get false-success notifications when the SP step actually failed.

**How to set**: click `⋯` on the action → **Configure run after** → uncheck `is failed`/`has timed out`/`is skipped`, leave only `is successful`. Set this for the prerequisites (CreateItem, Loop_attachments, Loop_checklist).

## Get the PDF from attachments (email)

The SPA convention: **PDF is always `attachments[0]`** (signature at [1], evidencias at [2..]). In `Send an email V2`, the **Attachments** field is hidden under "Show advanced options"; reveal it, click `+ Add new item` once, then fill **Name** and **Content** with `fx` expressions. One entry = one file:
```
Name:    triggerBody()?['attachments']?[0]?['name']
Content: base64ToBinary(triggerBody()?['attachments']?[0]?['contentBase64'])
```

Defensive Logic Apps form (if order ever changes):
```
first(filter(triggerBody()?['attachments'], endsWith(item()?['name'], '.pdf')))?['name']
base64ToBinary(first(filter(triggerBody()?['attachments'], endsWith(item()?['name'], '.pdf')))?['contentBase64'])
```

⚠️ **Logic Apps `filter` does NOT accept JS-style `&&` or `||`**. Use `and()`, `or()`, `equals()` for compound conditions.

Don't try to attach the whole `attachments` array — that's not how the action works.

## Conditional warning banner in email body (Logic Apps)

When the email should show a prominent warning **only** when something is wrong (e.g. expired documents), wrap the warning block in a single top-level `if(...)`:

```
@{if(
  or(or(
    less(ticks(coalesce(triggerBody()?['vtvVto'],'2099-01-01')),          ticks(addDays(utcNow(),30))),
    less(ticks(coalesce(triggerBody()?['soVto'],'2099-01-01')),           ticks(addDays(utcNow(),30)))),
    false
  ),
  concat(
    '<div style="background:#fef3c7;border-left:6px solid #d97706;padding:14px 16px;border-radius:6px">',
      '<div style="font-weight:700;color:#b45309">⚠️ ALERTAS</div>',
      if(less(ticks(coalesce(triggerBody()?['vtvVto'],'2099-01-01')), ticks(utcNow())),
        concat('<div style="color:#b91c1c;font-weight:700">🔴 VTV VENCIDA — ', triggerBody()?['vtvVto'], '</div>'),
        if(less(ticks(coalesce(triggerBody()?['vtvVto'],'2099-01-01')), ticks(addDays(utcNow(),30))),
          concat('<div style="color:#d97706">🟠 VTV vence pronto — ', triggerBody()?['vtvVto'], '</div>'),
          ''
        )
      ),
    '</div>'
  ),
  ''
)}
```

Key tricks:
- **`coalesce(triggerBody()?['x'], '2099-01-01')`** — fallback so `ticks(...)` doesn't fail on null/empty fields. The fallback must be FAR future so missing values count as "no warning".
- **`ticks(utcNow())`** — current time as comparable int
- **`ticks(addDays(utcNow(), 30))`** — threshold 30 days ahead
- **`less(...)`** — "is this date before threshold" (i.e. close to / past expiry)
- **Nested `if`** for vencido vs vence-pronto styling within the same item
- The outermost `if(condition, banner-html, '')` collapses to empty string when nothing to warn about — no banner appears at all

For the subject line, similar pattern flags the email with an emoji:
```
concat('🔔 Inspeccion ', variables('varFolio'), ' — ', triggerBody()?['patente'],
  if(or(
    less(ticks(coalesce(triggerBody()?['vtvVto'],'2099-01-01')), ticks(addDays(utcNow(),30))),
    less(ticks(coalesce(triggerBody()?['soVto'],'2099-01-01')), ticks(addDays(utcNow(),30)))),
    ' ⚠️ VENCIMIENTOS',
    ''
  )
)
```

## Response: don't hardcode SharePoint URLs

A common pattern is to return `{ id, folio, url }` from the flow's Response action with a hardcoded URL like:
```
https://<tenant>.sharepoint.com/sites/<site>/Lists/CheckListSemiRemolque/DispForm.aspx?ID=...
```

**Trap**: that URL path uses the list's URL-name, but the actual URL on the list might differ — especially after rename, or when SP auto-generates a path that doesn't match the Title (Title `Check-List-Semi-Remolque` → URL `/Lists/CheckListSemiRemolque/...` or `/Lists/Check-List-Semi-Remolque/...` depending on creation method). The "Ver en SharePoint" button on the success screen lands on 404.

**Options**:
1. **Don't show the link at all** until you have a reliable URL — easiest for the SPA's success screen. Just show folio + counts.
2. **Compose the URL in the flow** using the actual `body/__metadata/uri` of the created item. Parse out the host and item ID from that.
3. **Resolve the list at runtime** with a Get list metadata call and use `RootFolder.ServerRelativeUrl`.

Until #2 or #3 is wired, just hide the button. Better no link than a broken link.

## Connector authorization expires

Error: **"Missing Authorization header for a privileged call on connection"**

The SharePoint (or Outlook) connector token in the flow expired (password change, MFA flow, long inactivity). **Fix in the Power Automate UI**:
1. Open flow → look for yellow banner "Una o más conexiones no están autorizadas"
2. Click "Solucionar conexiones" / "Fix connections" → re-authorize
3. Or: left sidebar → Conexiones → click the warning ⚠️ → Reparar

This is **not a code issue**. Pushing commits won't fix it.

> Si el panel muestra **todo en «Conectado»** pero el flow marca **«Conexión no válida»**, el arreglo es *Cambiar conexión* en cada acción (§28.5).

## Clipboard: cross-loop paste fails

If you `⋯` → **Copy to my clipboard** an action that lives **inside** an Apply to each, then try to paste it **outside** the loop (or vice versa), Power Automate refuses:

> "La acción que está intentando copiar y pegar no coincide con el esquema de flujo actual. Agregue esta acción manualmente."

Reason: the copied action carries hidden references to its containing scope (`items('Loop_attachments')`, run-after settings tied to siblings). The paste target has different available scope.

**Fix**: don't try to copy. Delete the old action and add a fresh one in the new location. Re-enter the fields manually using `fx Expression`.

## Flow backup & environments

Power Automate has no source format in the repo (that's why `power-automate/Flow-*.md` exists — the flow design as docs). But the flow itself **can and should be backed up**:

- **Export as package**: flow detail page → **Export** → **Package (.zip)**. Commit that `.zip` into `power-automate/` alongside the `.md`. It's a real, importable backup — far better than only prose.
- **Re-import** via **My flows → Import → Import Package** to restore or to stand up a second environment.
- **Dev vs prod flows**: if you need a staging flow, import the package as a *separate* flow with its own trigger URL, and point a preview/staging build at it via a separate `VITE_POWER_AUTOMATE_URL`. Never test destructive changes against the prod flow that real users are hitting.
- After any meaningful flow change, re-export and re-commit the package, and update the `.md`. The `.md` is for humans; the `.zip` is for recovery.

## Flow build template — exact UI inputs (copy-paste per project)

Canonical end-to-end set of UI inputs to give a user when guiding them to assemble a flow in `make.powerautomate.com`. Every field maps to a literal label they will see. Always use the `fx Expression` tab (never drag chips). Replace **placeholders in `<…>`** per project.

**Placeholders to substitute up-front**:
- `<SITE_URL>` — full SP site URL, e.g. `https://tenant.sharepoint.com/sites/Foo`
- `<HEADER_LIST>` — display Title of parent list, e.g. `Check List Montacargas`
- `<CHILD_LIST>` — display Title of child list, e.g. `CheckListMontacargasItems`
- `<FOLIO_PREFIX>` — 2-3 letter prefix, e.g. `MC`, `SR`, `CR`, `INS`
- `<NOTIFY_EMAIL>` — destination address for the summary email
- `<HEADER_COLUMNS>` — list of `(InternalName, Type, JsonField)` tuples for header
- `<CHILD_COLUMNS>` — same for child list (typically: Title, Categoria, Estado, Comentarios, Orden, + lookup `Inspeccion`)
- `<EMAIL_SUBJECT_FIELD>` — the most identifying header field for the subject line (e.g. `identificacionEquipo`, `patente`)
- `<APP_KEY>` — expected value of the `x-app-key` header (light anti-bot check; not a real secret)

### 1) Trigger — `When a HTTP request is received`

| UI field | Value |
|---|---|
| Who can trigger the flow | Anyone |
| Method (Show advanced) | `POST` |
| Request Body JSON Schema | **EMPTY** — leave blank |

> **Server-side validation is mandatory.** An empty schema means the flow accepts any body, and callers can bypass the SPA. Before creating any item, add a Condition (or `Terminate`) that checks required fields, total and per-file size, attachment count and allowed file extensions, and answer a `400` `Response` when a check fails.

After Save, the URL appears under the trigger header — copy it then.

### 2) `Check_key` — Condition (optional anti-bot gate)

First action after the trigger. Compare `triggerOutputs()?['headers']?['x-app-key']` to `<APP_KEY>`. On the **If no** branch: a Response action with Status Code `401` and a short body, then **Terminate** (status `Failed`). On **If yes**: empty — flow continues below. Skip this step entirely if you've decided the endpoint doesn't need even a speed bump, but document that choice.

### 3) `Init_varFolio` — Initialize variable

| UI field | Value |
|---|---|
| Name | `varFolio` |
| Type | `String` |
| Value (`fx Expression` tab) | `if(empty(triggerBody()?['folio']), concat('<FOLIO_PREFIX>-', formatDateTime(utcNow(),'yyyyMMdd-HHmmss')), triggerBody()?['folio'])` |

### 4) `CreateHeaderItem` — SharePoint **Create item**

Rename the action to `CreateHeaderItem` (or short stable name) — every downstream `outputs(...)` reference must match.

| UI field | Value |
|---|---|
| Site Address | `<SITE_URL>` |
| List Name | `<HEADER_LIST>` |

For each `<HEADER_COLUMNS>` entry, fill the auto-rendered field using the `fx Expression` tab and the **defensive wrapper for its type** (see §9 *SharePoint column types + defensive wrappers*). Title field → `variables('varFolio')`.

### 5) `Respuesta` — Response action — **place it BEFORE the loops**

This returns 200 to the SPA in ~3s, sidestepping the 110s gateway timeout that triggers HTTP 502 on the client even when the flow eventually finishes OK.

| UI field | Value |
|---|---|
| Status Code | `200` |
| Headers | Key: `Content-Type` · Value: `application/json` |
| Body (`fx`) | `{ "id": @{outputs('CreateHeaderItem')?['body/ID']}, "folio": "@{variables('varFolio')}" }` |

### 6) `Loop_attachments` — Apply to each + Add attachment

| UI field (Apply to each) | Value |
|---|---|
| Select an output (`fx`) | `triggerBody()?['attachments']` |
| Settings ⚙️ → Concurrency Control | **ON, Degree of Parallelism = 1** |

⚠️ Concurrency=1 is mandatory. Parallel writes to the same SP item give intermittent `Save Conflict` failures.

Inside the loop — **Add attachment** (SharePoint):

| UI field | Value |
|---|---|
| Site Address | `<SITE_URL>` |
| List Name | `<HEADER_LIST>` |
| Id | `outputs('CreateHeaderItem')?['body/ID']` |
| File Name (`fx`) | `items('Loop_attachments')?['name']` |
| File Content (`fx`) | `base64ToBinary(items('Loop_attachments')?['contentBase64'])` |

### 7) `Loop_checklist` — Apply to each + Create child item

| UI field (Apply to each) | Value |
|---|---|
| Select an output (`fx`) | `triggerBody()?['checklist']` |
| Settings ⚙️ → Concurrency Control | ON, Degree=20 (independent rows, parallel safe) |

Inside the loop — **Create item** (SharePoint), List Name `<CHILD_LIST>`:

| UI field | Value |
|---|---|
| Title (`fx`) | `items('Loop_checklist')?['item']` |
| (per `<CHILD_COLUMNS>` entry) | use type wrapper from §9 with `items('Loop_checklist')?['<jsonField>']` |
| **Lookup column** Id (e.g. `Inspeccion Id`) | `outputs('CreateHeaderItem')?['body/ID']` |

### 8) `Send_email_V2` — Outlook, at flow root (NOT inside any loop)

Click `⋯` → **Configure run after** → uncheck `is failed`/`has timed out`/`is skipped`, leave only `is successful`. Set this for `CreateHeaderItem`, `Loop_attachments`, and `Loop_checklist` so a SP failure doesn't trigger a misleading success email.

| UI field | Value |
|---|---|
| To | `<NOTIFY_EMAIL>` |
| Subject (`fx`) | `concat('<emoji or label> ', variables('varFolio'), ' — ', triggerBody()?['<EMAIL_SUBJECT_FIELD>'])` |
| Body | HTML using `@{triggerBody()?['…']}` for each field; bold the most critical line (estado/severity) |
| Show advanced → **Attachments** → + Add new item |  |
| Name (`fx`) | `triggerBody()?['attachments']?[0]?['name']` (PDF is always index 0 by SPA convention) |
| Content (`fx`) | `base64ToBinary(triggerBody()?['attachments']?[0]?['contentBase64'])` |

> **Untrusted input.** Every field comes from a public caller. HTML-encode values before putting them in an HTML body (or send plain text). Do not forward raw public uploads to a mailbox: prefer a restricted SharePoint link, and add type, signature and size checks plus malware scanning or quarantine first.

### 9) Save and copy URL

Save the flow. Click on the trigger header card → **Copy URL** button at the right. Store as GitHub Actions secret `VITE_POWER_AUTOMATE_URL`. Then **Export → Package (.zip)** and commit it to `power-automate/`.

### Final visual tree

```
When a HTTP request is received
├─ Check_key              ← optional 401 gate
├─ Init_varFolio
├─ CreateHeaderItem
├─ Respuesta              ← 200 returned here, before loops
├─ Loop_attachments       (concurrency = 1)
│   └─ Add_attachment
├─ Loop_checklist         (concurrency = 20)
│   └─ Create_item_Child
└─ Send_email_V2          (run after = succeeded only)
```

### Pre-flight checklist (read out loud before saving the flow)

- [ ] Trigger schema **empty** (not synced — empty)
- [ ] varFolio uses `concat('<PREFIX>-', formatDateTime(utcNow(),'yyyyMMdd-HHmmss'))` fallback
- [ ] Action renamed to `CreateHeaderItem` (or whatever name your other expressions reference)
- [ ] Every header field used `fx Expression` tab (no orange chips from Dynamic Content panel)
- [ ] `Respuesta` action sits **between** CreateHeaderItem and Loop_attachments, not at the end
- [ ] Loop_attachments concurrency set to 1 in Settings ⚙️
- [ ] Lookup column in child list set to header `body/ID`, NOT to header `Title`
- [ ] Send_email_V2 is at flow root, not nested inside any Apply to each
- [ ] Email action's `Configure run after` = only `is successful` for the 3 prerequisites
- [ ] Triggered URL copied + saved as GitHub secret `VITE_POWER_AUTOMATE_URL`
- [ ] Flow exported as `.zip` package and committed to `power-automate/`
