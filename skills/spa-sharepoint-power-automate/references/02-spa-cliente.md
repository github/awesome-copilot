<!-- spa-sharepoint-power-automate · references/02-spa-cliente.md · secciones §2, §3, §4, §5, §6, §7 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 2 · SPA — Vite & GitHub Pages

## Base path

GitHub Pages serves under `/<repo>/`, not `/`. Every asset reference must respect this.

**vite.config.ts**:
```ts
export default defineConfig({
  base: process.env.VITE_BASE ?? "/",
});
```

**Workflow env**:
```yaml
env:
  VITE_BASE: /POSGI001-A1-2-Inspeccion-de-Vehiculos/
```

**In code — never hardcode `/asset.png`**:
```ts
const BASE = import.meta.env.BASE_URL ?? "/";
<img src={`${BASE}app-logo.png`} />
navigator.serviceWorker.register(`${BASE}sw.js`);
const res = await fetch(`${base}app-logo.png`);
```

**In static files (index.html, manifest.json, sw.js)** — use **relative paths** (`./asset.png`), never absolute (`/asset.png`):
```html
<link rel="icon" href="./app-logo.png" />
<link rel="manifest" href="./manifest.json" />
```

```js
// sw.js
const PRECACHE = ["./", "./index.html", "./app-logo.png", "./manifest.json"];
e.respondWith(fetch(request).catch(() => caches.match("./index.html")));
```

## Router choice + SPA fallback

`HashRouter` works on GitHub Pages with zero config (paths live after `#`, the server only ever serves `index.html`). `BrowserRouter` gives clean URLs but needs the 404 fallback below so deep links survive a hard refresh. For a single-screen checklist SPA, **HashRouter is the lower-risk default**; use BrowserRouter only if clean URLs matter.

**SPA fallback for client-side routing** (required for BrowserRouter, harmless for HashRouter):
```yaml
- name: SPA fallback (404.html = index.html)
  run: cp dist/index.html dist/404.html
```
GitHub Pages serves `404.html` for any unknown path — this lets HashRouter/BrowserRouter handle deep links.

## Demo mode (no flow URL configured)

When `VITE_POWER_AUTOMATE_URL` is empty (local dev, or a fork without the secret), the app should enter **demo mode**: render the full form, run all validation, build the PDF — but stop short of the network POST and show a clear "modo demo, no se envió" banner instead of a success screen.

```ts
const POWER_AUTOMATE_URL = import.meta.env.VITE_POWER_AUTOMATE_URL ?? "";
export const isDemoMode = POWER_AUTOMATE_URL.trim() === "";

export async function uploadInspeccion(payload: Payload): Promise<UploadResult> {
  if (isDemoMode) {
    console.warn("[demo] VITE_POWER_AUTOMATE_URL not set — skipping POST");
    return { ok: true, demo: true, folio: payload.folio };
  }
  // ... real POST
}
```

This keeps local dev productive without a flow, and a fork doesn't silently 404 every submission. Surface the demo banner prominently so nobody mistakes a demo run for a real submission.

---

# 3 · SPA — React patterns

## Stale closures in onChange

**The single most common bug in this project.** When two callbacks both update the same state object via spread, the second can overwrite the first if it captured an old `state`.

❌ **Broken — receptor signature wipes inspector signature**:
```tsx
<SignaturePad onChange={(d) => setDraft({ ...draft, firmaDataUrl: d })} />
<SignaturePad onChange={(d) => setDraft({ ...draft, firmaReceptorDataUrl: d })} />
```
When draft re-renders after the first onChange, the second onChange's closure still holds the OLD draft (with `firmaDataUrl: undefined`). Spreading it overwrites the saved value.

✅ **Always use functional updates for any handler that mutates a shared object**:
```tsx
<SignaturePad onChange={(d) => setDraft((prev) => ({ ...prev, firmaDataUrl: d }))} />
```

**Rule of thumb**: if the same `setX` is called from multiple handlers/effects, use functional form `setX(prev => …)`. Always.

## HTML5 `required` vs preventDefault

Native `required` on inputs fires the browser's *"Please fill out this field"* popup **before** React's `onSubmit` runs. Even if you call `e.preventDefault()`, the popup blocks. If your validation is fully in JS, **don't use `required`** on inputs — do it all in the submit handler with custom error messages.

## Form state: pendientes pattern

Don't silently disable the submit button. List exactly what's missing:
```tsx
const pendientes = useMemo(() => {
  const p: string[] = [];
  if (!draft.inspectorDNI?.trim()) p.push("DNI del inspector");
  if (conteo.sinResponder > 0) p.push(`Responder ${conteo.sinResponder} ítem(s)`);
  if (!draft.firmaDataUrl) p.push("Firma del Inspector");
  return p;
}, [draft, conteo]);
const puedeEnviar = pendientes.length === 0;
```
Render the list in an orange panel above the disabled button. Add a "Mark all as N/A" shortcut button when applicable. Users immediately know what to do.

## URL.createObjectURL leaks: useMemo + revokeObjectURL

Creating object URLs in JSX renders leaks memory — every re-render allocates a new URL, the old ones are never released:

❌ **Leaks**:
```tsx
{f && <img src={URL.createObjectURL(f)} />}
```

✅ **Cleaned up**:
```tsx
const previews = useMemo(() => {
  const o: Record<Key, string | null> = { /* keys */ };
  for (const k of KEYS) {
    const f = state[k];
    if (f) o[k] = URL.createObjectURL(f);
  }
  return o;
}, [state]);

useEffect(() => {
  return () => {
    for (const k of KEYS) {
      const u = previews[k];
      if (u) URL.revokeObjectURL(u);
    }
  };
}, [previews]);
```

When the source File changes, the cleanup function runs against the OLD `previews` (closure), revoking the now-stale URLs. Then the new memo recomputes with fresh URLs.

## Success screen pattern

After a successful submission, **replace the form** with a confirmation card. Don't just show a success banner above the still-rendered form.

```tsx
if (successInfo) {
  return (
    <div className="success-screen">
      <div className="success-card">
        <div className="success-check">✓</div>
        <h2>¡Tu informe fue enviado con éxito!</h2>
        <p>Folio: <strong>{successInfo.folio}</strong></p>
        <button onClick={() => setSuccessInfo(null)}>Cargar otra inspección</button>
      </div>
    </div>
  );
}
return <form>...</form>;
```

State: `useState<{ folio, items, adjuntos, url? } | null>(null)` — set on success, clear when user clicks "new inspection". Keep internal recipient info OUT of this screen (see Security model).

---

# 4 · SPA — form field patterns

## CSS reset: never strip `appearance` on checkboxes / radios

Common form-control resets do this:
```css
input, select, textarea { appearance: none; ... }
```

This **invisibilizes** checkbox and radio when checked — the tick mark relies on the native `appearance`. Users see "the checkbox doesn't work" because it never visibly toggles, even though state changes in React. Always exclude these types:

```css
/* WRONG: */
input, select, textarea { appearance: none; ... }

/* RIGHT: */
input:not([type="checkbox"]):not([type="radio"]),
select, textarea { appearance: none; ... }

input[type="checkbox"], input[type="radio"] {
  accent-color: var(--color-primary);  /* tints the native control */
}
```

Catches: any form with a "declaración de responsabilidad" or similar consent checkbox where the user clicks but no checkmark appears, blocking submit.

## Grid layout: `.full` works on any direct child

If your form has a CSS grid like `.grid-cabecera { grid-template-columns: repeat(2, 1fr) }` and `.full { grid-column: 1 / -1 }`, **the `.full` class works on any direct child of the grid**, not just `<label>`. Use `<div className="full">` for the signature block:

```tsx
<div className="grid-cabecera">
  <label>Field 1<input /></label>
  <label>Field 2<input /></label>
  <div className="full firma-section">
    <div className="firma-title">Firma</div>
    <SignaturePad ... />
  </div>
</div>
```

Forgetting this and trying to wrap the SignaturePad in a `<label className="full">` causes both the layout-row issue and the SignaturePad touch event bug.

## Argentina patente: two formats + progressive autoformat

Argentine vehicle plates have two formats:
- **Old:** `ABC-123` (3 letters + 3 digits)
- **Mercosur:** `AB-123-CD` (2 letters + 3 digits + 2 letters)

The format is uniquely determined by the **3rd character**: letter → old, digit → Mercosur. Use this for live formatting:

```ts
function formatPatente(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length === 0) return "";
  if (clean.length <= 2) return clean;
  if (/^[A-Z]{3}/.test(clean)) {                 // old: 3rd char is letter
    if (clean.length <= 3) return clean;
    return clean.slice(0, 3) + "-" + clean.slice(3, 6);
  }
  // Mercosur: 3rd char is digit
  if (clean.length <= 5) return clean.slice(0, 2) + "-" + clean.slice(2);
  return clean.slice(0, 2) + "-" + clean.slice(2, 5) + "-" + clean.slice(5, 7);
}

function isValidPatente(p: string): boolean {
  return /^[A-Z]{3}-\d{3}$/.test(p) || /^[A-Z]{2}-\d{3}-[A-Z]{2}$/.test(p);
}
```

**Input UX**:
```tsx
<label className={draft.patente && !isValidPatente(draft.patente) ? "label-error" : ""}>
  Patente *
  <input
    value={draft.patente ?? ""}
    onChange={(e) => setDraft((d) => ({ ...d, patente: formatPatente(e.target.value) }))}
    placeholder="ABC-123 ó AB-123-CD"
    maxLength={9}
    autoComplete="off"
    autoCapitalize="characters"
    spellCheck={false}
  />
  {draft.patente && !isValidPatente(draft.patente) && (
    <span className="field-error">Formato inválido. Usá ABC-123 o AB-123-CD.</span>
  )}
</label>
```

Validate at submit too — the button-disabled flow won't catch a half-typed plate.

## Number input with thousand separators (es-AR)

`<input type="number">` doesn't let you display formatted strings like `123.456`, and it parses up to the first non-digit (so `123.456` becomes `123`). Use `type="text"` + `inputMode="numeric"` + parse/format helpers:

```ts
/** strip everything non-digit (dots, commas, spaces) → Number */
function parseKms(raw: string): number | undefined {
  const clean = raw.replace(/\D/g, "");
  if (!clean) return undefined;
  return Number(clean);
}

/** Number → '123.456' (es-AR thousands separator) */
function formatKms(n: number | undefined): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR", { maximumFractionDigits: 0 });
}
```

```tsx
<input
  type="text"
  inputMode="numeric"
  value={formatKms(draft.kilometraje)}
  onChange={(e) => {
    const n = parseKms(e.target.value);
    setDraft((d) => ({ ...d, kilometraje: n }));
  }}
  placeholder="ej: 123.456"
/>
```

**Invariant**: state is always `number` (not string), display is always formatted, parsing always strips non-digits. User can type `123,456` or `123.456` or `123 456` — same result. Payload to Power Automate stays numeric (don't ship the formatted string, the SP Number column would reject or coerce weirdly).

## Datalist autocomplete for free-text fields with known suggestions

When a field is **conceptually** free-text (e.g. vehicle description) but you have a known set of common values (the fleet), use `<datalist>` instead of `<select>`:

```tsx
<input
  list="vehiculos-flota-list"
  placeholder="Seleccionar o escribir"
  value={draft.vehiculo ?? ""}
  autoComplete="off"
  onChange={(e) => setDraft((d) => ({ ...d, vehiculo: e.target.value }))}
/>
<datalist id="vehiculos-flota-list">
  {VEHICULOS_FLOTA.map((v) => <option key={v} value={v} />)}
</datalist>
```

Why datalist beats a select:
- **Select** is enum-strict — user can't add a vehicle that's not in the list. Bad when the fleet grows.
- **Datalist** is a "type-or-pick" combo box — desktop shows dropdown, mobile shows suggestion chips. Free text still works.
- Native, no extra dependencies, accessible by default.
- Sorts via JS — `.sort((a,b) => a.localeCompare(b, "es"))` for correct Spanish ordering (handles `ñ`, accented chars).

Keep the suggestions list as a const in `types.ts` so any contributor can grep-find and edit.

## Mandatory photos UX (per-slot, not per-count)

When you need N specific photos (front/side/rear/top, or whatever schema), don't ask "upload at least 4 photos" — you can't enforce **which** 4. Use fixed slots with named labels:

```ts
export type VistaUnidad = "frontal" | "lateral" | "trasera" | "superior";
export const VISTAS_UNIDAD: { key: VistaUnidad; label: string }[] = [
  { key: "frontal",  label: "Frontal" },
  { key: "lateral",  label: "Lateral" },
  { key: "trasera",  label: "Trasera" },
  { key: "superior", label: "Superior" },
];

type FotosUnidad = Record<VistaUnidad, File | null>;
const EMPTY_FOTOS: FotosUnidad = { frontal: null, lateral: null, trasera: null, superior: null };
```

UI: render 4 slots. Empty = dashed border + prompt. Filled = thumbnail + "Remove" button. Each slot has its own `<input type="file" accept="image/*" capture="environment">` so mobile opens the camera directly.

Validation lists by **name** in the pendientes panel:
```tsx
const faltan = VISTAS_UNIDAD.filter(v => !fotosUnidad[v.key]).map(v => v.label);
if (faltan.length > 0) p.push(`Fotos de la unidad: ${faltan.join(", ")}`);
```

On submit, append to extraFiles with naming convention that survives in SharePoint:
```ts
new File([f], `unidad-${v.key}_${folio}.${ext}`, { type: f.type });
```

This lets backend/reports distinguish unit photos from evidence photos and free attachments by filename pattern.

---

# 5 · SPA — images, GPS, signatures, PDF

## Image compression — defense in depth at TWO layers

Phone photos arrive at 3–5 MB; base64 inflates them ~33%. With several photos you blow past the **Power Automate gateway timeout (~110s)** even on small payloads because of upstream processing. **Always compress in the client**, at two points:

```ts
async function compressImage(file: Blob, maxSide = 1280, quality = 0.72): Promise<Blob> {
  const type = file.type ?? "";
  if (!type.startsWith("image/") || type === "image/svg+xml") return file;
  try {
    const bmp = await createImageBitmap(file);
    const ratio = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * ratio);
    const h = Math.round(bmp.height * ratio);
    const canvas = (typeof OffscreenCanvas !== "undefined")
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement("canvas"), { width: w, height: h });
    const ctx = (canvas as any).getContext("2d");
    ctx.drawImage(bmp, 0, 0, w, h);
    bmp.close?.();
    if ((canvas as any).convertToBlob) {
      return await (canvas as OffscreenCanvas).convertToBlob({ type: "image/jpeg", quality });
    }
    return await new Promise<Blob>((resolve) => {
      (canvas as HTMLCanvasElement).toBlob((b) => resolve(b ?? file), "image/jpeg", quality);
    });
  } catch {
    return file;
  }
}
```

**Always re-encode to JPEG**, even when dims are below the threshold. A 800×600 PNG can be 2 MB → JPEG q=0.75 brings it to ~120 KB.

**Layer 1 — at the file picker** (UI level): keeps the in-memory File small from the moment it enters state. Preview thumbnails, draft saves, and any other consumers benefit.
```ts
async function handleFile(file: File | null) {
  if (!file) return;
  const compressed = await compressImage(file);   // imageUtils.compressImage
  onChangeEvidencia(compressed);                  // store compressed File in state
}
```

**Layer 2 — at upload buildAttachments** (network level): a safety net. Some path might bypass Layer 1 (legacy data, restored draft, clipboard paste) and dump a raw image into state.
```ts
const compressed = await compressImage(it.evidencia);   // again, just in case
out.push({
  name: ...,
  contentBase64: await blobToBase64(compressed),
});
```

The duplication is intentional — `compressImage` is idempotent (if the input is already JPEG q=0.72 and ≤1280px, it returns approximately the same file). Belt and suspenders.

## GPS / Geolocation on mobile

Default `getCurrentPosition()` calls quietly fail or hang on mobile. Use:
```ts
if (!navigator.geolocation) { setError("No soportado"); return; }
if (!window.isSecureContext) { setError("Requiere HTTPS"); return; }
navigator.geolocation.getCurrentPosition(
  (p) => setDraft(d => ({ ...d, latitud: p.coords.latitude, longitud: p.coords.longitude })),
  (e) => {
    const msg = e.code === 1 ? "Permiso denegado"
              : e.code === 2 ? "Posición no disponible"
              : e.code === 3 ? "Timeout" : e.message;
    setError(`GPS: ${msg}`);
  },
  { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
);
```
Show a "Buscando..." state while waiting. If user denied permission once, the browser remembers — they have to clear it from site settings.

## SignaturePad: Pointer Events + setPointerCapture

The mouse-event-only / touch-event-only signature pad code is fragile on mobile. **Always use Pointer Events** (`onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`) — they unify mouse, touch, and pen, and `setPointerCapture` keeps drawing alive even when the cursor leaves the canvas (critical on mobile when the finger drifts off the edge).

```tsx
function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
  e.preventDefault();
  const c = canvasRef.current; if (!c) return;
  try { c.setPointerCapture(e.pointerId); } catch {}
  drawingRef.current = true;
  const ctx = c.getContext("2d")!;
  const { x, y } = getXY(e);
  // Visible initial dot — confirms pointerdown fired even without movement
  ctx.beginPath(); ctx.arc(x, y, 1.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(x, y);
}
```

**Set `style={{ touchAction: "none" }}`** on the canvas so the browser doesn't intercept touch as scroll/pan. Without this, the canvas eats the touch event handler but the browser scrolls anyway.

## SignaturePad: never wrap the canvas in `<label>`

A subtle but devastating bug: putting `<canvas>` inside `<label>` works on desktop but on touch devices, the label can absorb the first touch and dispatch a synthetic click at the end, breaking the drawing.

```tsx
✗ WRONG:
<label className="full">
  Firma digital
  <SignaturePad ... />        {/* canvas inside label = dead on mobile */}
</label>

✓ RIGHT:
<div className="firma-section">
  <div className="firma-title">Firma digital</div>
  <SignaturePad ... />        {/* canvas as sibling */}
</div>
```

Style the title div to look like a label using CSS, but keep it semantically separate from the canvas.

## SignaturePad: ResizeObserver to preserve drawing

When the canvas's CSS dimensions change (rotation, sidebar collapse, dynamic layout), naive code resets `canvas.width` which **clears the bitmap**. The signature disappears. Use `ResizeObserver` to detect resize and reapply the snapshot:

```tsx
useEffect(() => {
  const c = canvasRef.current; if (!c) return;
  const ro = new ResizeObserver(() => {
    if (drawingRef.current) return;        // never touch mid-stroke
    resyncCanvas();                         // captures snapshot, resizes, restores
  });
  ro.observe(c);
  return () => ro.disconnect();
}, []);

function resyncCanvas() {
  const rect = c.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (c.width === targetW && c.height === targetH) return;
  const snapshot = c.toDataURL("image/png");  // capture BEFORE resize
  c.width = targetW; c.height = targetH;
  // re-scale + re-draw snapshot
}
```

## SignaturePad: StrictMode init guard

In React 18 dev with `<StrictMode>`, `useEffect` with `[]` deps runs **twice** on mount. If your init callback resets `canvas.width`, the second run wipes any restored draft signature. Use an init ref:

```tsx
const initRef = useRef(false);
useEffect(() => {
  if (initRef.current) return;
  if (!resyncCanvas()) return;
  initRef.current = true;
  // restore from value if present
}, []);
```

## SignaturePad: validate non-empty on save

`canvas.toDataURL("image/png")` returns `"data:,"` (5 chars) or a fully transparent PNG when nothing was drawn. Filter out invalid signatures:

```tsx
const dataUrl = c.toDataURL("image/png");
if (!dataUrl || dataUrl.length < 200 || dataUrl === "data:,") return;
onChange(dataUrl);
```

## PDF generation (jsPDF + autoTable)

Patterns from this project:

- **Embed all photos, not just critical items.** Filter by `evidenciaDataUrls.has(it.id)`, not by item state.
- **Try JPEG first, fallback to PNG**: `try { doc.addImage(url, "JPEG", ...); } catch { doc.addImage(url, "PNG", ...); }`. Phone photos are JPEG; signatures from canvas are PNG.
- **Logo loading**: fetch as Blob, draw into a canvas, export as PNG dataURL. PNG/SVG both work for the source.
- **Dynamic Y position**: `(doc as any).lastAutoTable.finalY` after autoTable; check if next block fits, else `addPage()`.
- **Don't split content blocks across pages** if avoidable — pre-check `y + neededHeight > pageHeight - margin` before drawing.

### jsPDF + Spanish accents — font trap

jsPDF's **built-in standard fonts (helvetica/times/courier) only support Latin-1**, and even then accented characters (`ó á é í ú ñ ¿ ¡`) frequently render as garbage (`Ã³`, blank boxes) because the default text encoding is not UTF-8. This bites every all-Spanish report.

Two reliable fixes:

1. **Embed a UTF-8 TTF font** (recommended for any accented content). Convert a TTF to a jsPDF VFS module once, then:
   ```ts
   import { jsPDF } from "jspdf";
   import { robotoNormalBase64 } from "./fonts/roboto";  // generated VFS string
   const doc = new jsPDF();
   doc.addFileToVFS("Roboto-Regular.ttf", robotoNormalBase64);
   doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
   doc.setFont("Roboto");
   ```
   `autoTable` picks up the registered font via `styles: { font: "Roboto" }`.
2. **If you must stay on the built-in font**, restrict report text to ASCII (strip/transliterate accents on the strings you pass into the PDF only — never in the SP payload). This is a last resort; it produces `Inspeccion` instead of `Inspección` in the document.

Symptom to recognize: PDF text shows `Ã³`/`Ã±`/empty rectangles exactly where accents should be → font/encoding issue, not a data issue. The SP item and email will show the accents fine (they're UTF-8 end to end); only the jsPDF document is wrong.

### PDF preview: always use the async builder

The sync `buildInspeccionPdf` (no images) was a quick fallback. The async `buildInspeccionPdfAsync` includes the logo, QR code, foto del equipo, and all evidence photos — that's what the user expects in a "preview". Don't expose the sync version as a button:

```tsx
async function descargarPdfPreview() {
  setPreviewing(true);
  try {
    const blob = await buildInspeccionPdfAsync({ draft, realizoNombre });
    // ... download
  } finally { setPreviewing(false); }
}
```

The async version is ~1-2s slower (image fetches + canvas rendering) but produces the real document. Show a "Generando..." state while it runs.

### QR code in the PDF

The `qrcode` dependency generates a QR embedded in the report header. Convention: the QR encodes the **folio** (or a folio + short URL), so a printed PDF can be scanned back to identify the inspection. Generate as a data URL and `addImage` it:
```ts
import QRCode from "qrcode";
const qrDataUrl = await QRCode.toDataURL(folio, { margin: 1, width: 240 });
doc.addImage(qrDataUrl, "PNG", x, y, 28, 28);
```
Keep what the QR encodes stable — if reports get scanned by an external system, changing the payload shape breaks it silently.

### Extra files in PDF — separate images from docs

When a form accepts mixed "extra files" (photos + PDFs + other docs) and you want them visible in the generated report PDF, **don't try to embed everything**:

```ts
const extraPhotos: { name: string; dataUrl: string }[] = [];
const extraDocs:   { name: string }[] = [];

for (const f of extraFiles) {
  const type = (f.type ?? "").toLowerCase();
  const isImage = type.startsWith("image/") && type !== "image/svg+xml";
  if (isImage) {
    const dataUrl = await blobToDataUrl(f);
    if (dataUrl?.length > 100) extraPhotos.push({ name: f.name, dataUrl });
  } else {
    extraDocs.push({ name: f.name });   // can't embed PDF-in-PDF with jsPDF
  }
}
```

Render them as two sub-sections:
- **Imágenes** → grid of thumbnails, same layout as evidence photos (use shared `addImage` helper with format detection + fallback)
- **Documentos** → bulleted list of file names

jsPDF can't embed PDF-in-PDF without `pdf-lib`. Listing the filename at least documents that the inspection had attached docs (they exist as SP attachments, just aren't visually embedded in the inspection PDF). If embedding PDFs is critical, switch the PDF generator to `pdf-lib` (supports merge).

---

# 6 · SPA — persistence & failure handling

## localStorage draft versioning + legacy purge

When the checklist template (or any persistent shape) changes, old drafts in `localStorage` will silently restore the **old** shape and the user won't see the new items.

Bump the storage key version AND purge legacy keys on load:

```ts
const STORAGE_KEY    = "app-inspeccion-draft-v2";
const STORAGE_TS_KEY = "app-inspeccion-draft-ts-v2";
const LEGACY_KEYS = [
  "app-inspeccion-draft-v1",
  "app-inspeccion-draft-ts-v1",
];

function purgeLegacy(): void {
  for (const k of LEGACY_KEYS) {
    try { localStorage.removeItem(k); } catch {}
  }
}

export function loadDraft() {
  purgeLegacy();  // always purge before reading new key
  ...
}

export function clearDraft() {
  purgeLegacy();
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(STORAGE_TS_KEY);
}
```

Bump version on **any breaking change**: removed/renamed items, removed fields, type changes. Don't try to migrate complex shapes — invalidating is safer than half-working state.

## inspectorProfile: persist identity across sessions

`draftStorage` holds the *current in-progress inspection* and is cleared on success. The **inspector's identity** (name, DNI, sector) should outlive that — the same person fills many inspections from the same device. Keep it in a **separate** localStorage key with its own version:

```ts
const PROFILE_KEY = "app-inspector-profile-v1";

export function loadInspectorProfile(): InspectorProfile | null {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null"); }
  catch { return null; }
}
export function saveInspectorProfile(p: InspectorProfile): void {
  try { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); } catch {}
}
```

On mount, pre-fill the inspector fields from the profile. On successful submit, update the profile but **do not** clear it (unlike the draft). Keep its version independent — changing the checklist shape shouldn't wipe the inspector's saved identity.

## Submission failure handling

`uploadInspeccion` will fail sometimes — flaky mobile network, gateway timeout, connector auth expired. The form must not lose the user's work.

- **Never `clearDraft()` before a confirmed success.** Clear only after `uploadInspeccion` resolves `ok`. On failure the draft (with photos, signature, all answers) stays in localStorage so the user can retry.
- **Show an actionable error, keep a Retry button.** Distinguish "network/timeout — retry" from "validation rejected by flow — fix and resend".
- **Retry should be idempotent on the user side**: reuse the **same `folio`** on retry so a partial double-submit is recognizable in SP rather than producing two different folios. (Note the flow itself does not dedupe — see the flow build template.)
- **Single-flight guard**: disable the submit button while a POST is in flight (`useRef` boolean, not just state) so a double-tap doesn't fire two POSTs.
- **Offline**: a full offline queue is usually overkill for an internal checklist. The localStorage draft already survives a closed tab; document that "submit when you have signal" is the expected workflow. Only build a real Background Sync queue if field users are routinely offline — and if you do, it belongs in a `references/` doc, not here.

---

# 7 · SPA — Service Worker / PWA

## Cache invalidation

**Always bump the cache version when you change the SW or precache list**, otherwise users see stale content for days:
```js
const CACHE = "app-v2";  // bump on every change
```

The SW takes scope from its registration URL. With `BASE = /repo/`, registering `${BASE}sw.js` gives scope `/repo/`. Use relative paths inside the SW so URLs resolve under that scope.

## Filter non-http schemes

The Cache API only accepts `http:` and `https:` schemes. If your fetch listener tries to cache a `chrome-extension://`, `blob:`, `data:`, or `ws:` URL, `cache.put()` throws `TypeError`. Add an early return:

```js
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  // ... rest of logic
});
```

Most visible in dev when extensions inject content scripts; in prod it's rare but the console error is noisy.

## Auto-update pattern (installed PWA)

Bumping `CACHE` in `sw.js` is **not enough** if the page is already loaded — the old SW keeps controlling the tab until the user manually reloads. Symptom: you pushed fixes hours ago, deploy is green, `curl` on the hashed asset shows the new strings, but the user sees old behavior.

Add an auto-reload nudge in the SW registration:

```ts
function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  // Reload exactly once when a new SW takes over (after we bumped CACHE)
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register(`${BASE}sw.js`).then((reg) => {
      if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            nw.postMessage("SKIP_WAITING");
          }
        });
      });
      reg.update().catch(() => {});       // force check (browsers default to 24h)
    }).catch(() => {});
  });
}
```

Combined with the SW already calling `self.skipWaiting()` on install and `self.clients.claim()` on activate:
1. Browser fetches new `sw.js` (changed because CACHE bumped) → installs as waiting
2. `updatefound` → `statechange("installed")` → SPA posts `SKIP_WAITING` → new SW activates
3. `clients.claim()` → controllerchange fires → SPA reloads exactly once
4. Reloaded page now serves new JS bundle

Without this, you'll keep telling users "Ctrl+Shift+R" or "Clear site data" — and on installed PWAs they can't even do that easily.

## Manifest icons: concrete sizes, not "any"

Chrome's Lighthouse and PWA installers warn when manifest icons use `"sizes": "any"`. Provide explicit sizes for the same source PNG:

```json
"icons": [
  { "src": "app-logo.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "app-logo.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
]
```

The browser will downscale automatically. The file doesn't have to match the declared dimensions exactly — just listing both sizes silences the warning and makes Chrome treat the app as installable.
