# Starter: SPA pública → flow de Power Automate → SharePoint

Kit de arranque (Vite + React + TypeScript estricto) para el patrón **SPA pública sin login que envía datos a un flow de Power Automate con trigger HTTP, que los guarda en SharePoint**. Sin librerías de UI ni de estado. Los `§` remiten a las secciones de la skill `spa-sharepoint-power-automate`.

Incluye un formulario demo (2 textos, 1 número, fotos con compresión, firma) que funciona **sin flow** en modo demo.

## Uso

```bash
npm i
cp .env.example .env.local   # completar (opcional: sin URL = modo demo)
npm run dev                  # servidor de desarrollo
npm test                     # tests (vitest)
npm run build                # tsc --noEmit + vite build -> dist/
```

## Conectarlo al flow

1. Armar el flow según §9 (*Flow build template*): trigger **When a HTTP request is received** con **Who can trigger the flow = Anyone**, esquema del body **vacío**, `Check_key` opcional, `Respuesta` **antes** de los bucles y adjuntos con concurrencia 1. Manejo de fallos posteriores a la respuesta: §22.
2. Copiar la URL del trigger a `VITE_POWER_AUTOMATE_URL` y la clave a `VITE_APP_KEY` (misma que compara `Check_key` con la cabecera `x-app-key`).
3. Probar el flow sin la SPA: `FLOW_URL=... APP_KEY=... node scripts/test-flow.mjs --with-attachment`.
4. Ajustar el contrato (`Payload` en `src/lib/uploadClient.ts`) a tus columnas; ver §8 y los envoltorios por tipo de columna de §9.
5. Deploy: Settings → Pages → Source = *GitHub Actions*; cargar los secrets `VITE_POWER_AUTOMATE_URL` y `VITE_APP_KEY`.

## Advertencias de seguridad

- **Todo lo `VITE_*` es PÚBLICO**: Vite lo incrusta en el bundle y cualquiera lo lee. No pongas ahí nada realmente secreto.
- **La URL del trigger no es secreta.** Lleva una firma (`sig`) pero viaja en el JS: quien la vea puede llamar al flow. `x-app-key` es solo un freno anti-bot, no autenticación.
- Toda regla de negocio o de tiempo va **validada en el flow** (la hora la pone `utcNow()`), no en el botón deshabilitado (§19.4).
- `scripts/*` leen credenciales (`SP_TOKEN`, `FLOW_URL`, `APP_KEY`) **solo del entorno**; nunca las commitees.

## Mapa: archivo → qué resuelve → sección

| Archivo | Qué resuelve | Sección |
|---|---|---|
| `src/lib/draftStorage.ts` | Borrador con clave versionada, purga de claves legacy, try/catch; no se borra hasta confirmar éxito | §6 |
| `src/lib/imageUtils.ts` | Compresión canvas idempotente (2 capas), presupuesto de payload (límites 100 MB / 120 s), base64 sin prefijo | §5, §8, §9 |
| `src/components/SignaturePad.tsx` | Pointer Events, `setPointerCapture`, ResizeObserver que preserva el trazo, guard StrictMode, sin `<label>` | §5 |
| `src/lib/signature.ts` | Validación de firma no vacía (> 200 chars) | §5 |
| `src/lib/uploadClient.ts` | `buildPayload`/`submit`: JSON + `x-app-key`, folio del cliente, errores tipados, éxito solo con 200 + folio, reintento automático solo del 429 (500/503 solo con `serverIdempotent`), modo demo, timeout | §2, §8, §9, §22.4 |
| `src/lib/formatters.ts` | Números es-AR con miles, patente AAA123 / AA123AA con autoformato | §4 |
| `src/App.tsx` | Estado funcional, panel de *pendientes*, pantalla de éxito sin datos internos, sin `required` nativo | §3, §6 |
| `src/styles.css` | Reset que no quita `appearance` a checkbox/radio, `.full` en cualquier hijo del grid | §4 |
| `public/sw.js` + `src/lib/registerSW.ts` | Network-first (index) / cache-first (assets), cache versionado por build, filtra esquemas no http(s), no cachea el flow, precache de los assets del build, aviso de versión nueva (`controllerchange` → evento; recarga solo cuando el usuario toca *Actualizar*) | §7, §19.3 |
| `public/manifest.json`, `index.html` | Iconos 192/512 explícitos, `apple-touch-icon`, rutas relativas | §2, §7, §19.3 |
| `vite.config.ts`, `.env.example` | `base` desde `VITE_BASE` (default `./`), plugin que estampa el id de build en `sw.js` | §2 |
| `.github/workflows/deploy-pages.yml` | Deploy a Pages, secrets → variables de build, `404.html` de fallback | §2 |
| `scripts/spfetch.mjs` | fetch con reintento que respeta `Retry-After` (429/503); `SP_TOKEN` solo se adjunta a URLs https de SharePoint | §23.4 |
| `scripts/test-flow.mjs` | Smoke test del flow: status, latencia, cuerpo; exit ≠ 0 si no es 2xx | §8, §9 |
| `scripts/sp-upload-test-file.mjs` | Sube un PDF de prueba a una biblioteca (REST, bearer) para disparar flows por archivo | §28.7 |
| `scripts/make-icons.mjs` | Genera los PNG placeholder (reemplazalos por tu logo) | §7 |

## Notas

- Las **fotos no se guardan en el borrador** (cuota de `localStorage`); solo texto y firma. El folio sí, para reintentar con el mismo.
- **502/504 y timeouts no se reintentan solos**: probable límite de 120 s; repetir a ciegas puede duplicar. Se ofrece *Reintentar* con el mismo folio. Solo el **429** se reintenta solo (acotado, respetando `Retry-After`); **500/503 solo con `serverIdempotent: true`**, que hay que activar únicamente si el flow deduplica por folio. El éxito exige **200 con el folio de vuelta**: un 202 vacío o un 200 sin folio se trata como *no confirmado* y el borrador se conserva.
- El **borrador caduca a los 7 días** (`DRAFT_MAX_AGE_MS`) y hay un botón *Borrar mis datos de este dispositivo* (§33.3).
- Las **fotos se re-codifican siempre por canvas**, aunque ya sean chicas: así se descarta el EXIF (GPS, modelo del equipo). El canvas no copia los metadatos.
- El service worker **no recarga solo**: avisa con un banner *Hay una versión nueva* para no perder las fotos elegidas (no se guardan).
- La firma tiene una **alternativa sin puntero**: escribir el nombre, que se convierte en la imagen de firma (teclado y lectores de pantalla).
- `application/json` y `x-app-key` provocan un **preflight `OPTIONS`** en el navegador; Microsoft no lo documenta, pero el 2026-09-24 la pasarela respondió el preflight con `204` y `Access-Control-Allow-Origin: *` (observado en una URL `*.environment.api.powerplatform.com`, §9): probalo desde un navegador contra tu propio trigger. Como el trigger acepta cualquier origen, **para producción** poné delante un proxy (Cloudflare Worker, Azure Functions o API Management) que limite la tasa de pedidos y verifique bots (§1).
- Una foto que **no se pueda re-codificar** (formato no admitido o fallo del navegador) se **omite con aviso**: nunca se sube el original, porque conservaría el EXIF.
- Las claves del borrador incluyen la ruta de la app (`/<repo>/`), así que dos proyectos de GitHub Pages bajo el mismo origen no se pisan.
- Los reintentos manuales tras un timeout, un error de red, un 502/504 o una respuesta *no confirmada* **solo evitan duplicados si el flow deduplica por folio**: eso es obligatorio en la plantilla del flow (§9, pasos 3b y 3c).
- `sp-upload-test-file.mjs` **no se probó contra un tenant real**: probalo en una biblioteca de prueba. En Git Bash de Windows anteponé `MSYS_NO_PATHCONV=1` para que `FOLDER` no se convierta en ruta de disco.
- Falta verificar en un teléfono real: cámara, firma táctil, service worker instalado y actualización (§19.6).
