<!-- spa-sharepoint-power-automate · references/22-kit-de-arranque.md · sección §34 -->
<!-- Nueva (2026-09-24). Describe el kit en assets/spa-starter/. Estado de verificación al final: qué se probó y qué NO. Índice: ../SKILL.md -->

# 34 · Kit de arranque: una SPA lista para conectar a un flow

Las secciones §2–§9 explican **cómo** se resuelve cada pieza de una SPA pública que envía datos a SharePoint mediante Power Automate. Este kit es esas mismas piezas **ya escritas, tipadas y probadas**, para no reescribirlas en cada proyecto.

Ubicación: `assets/spa-starter/` (junto a este directorio `references/`). Es un proyecto **Vite + React + TypeScript** sin librerías de UI ni de estado.

## 34.1 Cómo usarlo

```bash
cp -r assets/spa-starter mi-app && cd mi-app
npm install
npm run dev            # sin VITE_POWER_AUTOMATE_URL corre en MODO DEMO (no envía nada)
npm test               # 108 tests: funciones puras, cliente de envío, firma, App
npm run build
```

Conectarlo a un flow real:

1. Copiar `.env.example` a `.env` y completar `VITE_POWER_AUTOMATE_URL` y `VITE_APP_KEY`. **Todo `VITE_*` es público en el bundle** (§1).
2. Crear el flow con el trigger en **Anyone** (§21.1), schema vacío (§9) y `Check_key` sobre `x-app-key` (§1).
3. Probar el flow **sin navegador**: `node scripts/test-flow.mjs --help` (§34.3).
4. Publicar: `.github/workflows/deploy-pages.yml` (Settings → Pages → Source = *GitHub Actions*).

## 34.2 Qué resuelve cada archivo

| Archivo | Qué resuelve | Sección |
|---|---|---|
| `src/lib/uploadClient.ts` | `buildPayload()` y `submit()`: JSON con `application/json` y cabecera `x-app-key`; **folio generado en el cliente** (idempotencia); errores tipados; 401/403 con mensaje accionable; reintento automático solo para 429/500/503 respetando `Retry-After`; 502/504 = probable límite de 120 s; timeout con `AbortController`; modo demo | §8, §9, §21, §22.4, §23.4 |
| `src/lib/draftStorage.ts` | Borrador en `localStorage` con **clave versionada**, purga de claves viejas, `try/catch` (el almacenamiento puede fallar); no se borra hasta confirmar el envío | §6 |
| `src/lib/imageUtils.ts` | Compresión de fotos en el cliente con `canvas` (idempotente, lado máximo, calidad), límite total de payload, base64 sin prefijo | §5, §21.4 |
| `src/components/SignaturePad.tsx` | Firma con **Pointer Events** + `setPointerCapture`, `ResizeObserver` que conserva el dibujo, guardia de StrictMode, validación de firma vacía, canvas fuera de `<label>` | §5 |
| `src/lib/formatters.ts` | Patente argentina (dos formatos, autoformato progresivo) y números con separador de miles es-AR (`parseKms`/`formatKms` que quitan todo lo no numérico) | §4 |
| `src/App.tsx` | Formulario demo: checklist visible de **pendientes** que habilita el botón, fotos con contador, firma, pantalla de éxito **sin datos internos**, `setState` funcional | §3, §4, §1 |
| `public/sw.js` + `src/lib/registerSW.ts` | Service worker con rutas **relativas**, *network-first* para el `index` y *cache-first* para `/assets/`, **id de build** en el nombre del cache (cambia solo en cada deploy), filtra esquemas no http(s), **nunca** cachea el POST al flow, auto-actualización | §7 |
| `public/manifest.json` + `index.html` | Iconos 192 y 512 explícitos y `apple-touch-icon` (iOS ignora los del manifest) | §7, §19.3 |
| `vite.config.ts` | `base` desde `VITE_BASE` (relativa por defecto) y plugin que estampa el id de build en `sw.js` | §2 |
| `.github/workflows/deploy-pages.yml` | Deploy a Pages con las actions oficiales; typecheck y tests antes del build; secrets → variables de build | §11 |

## 34.3 Scripts de línea de comandos (sin dependencias)

Todos aceptan `--help`. Los secretos van **solo por variables de entorno**, nunca en el código.

| Script | Para qué | Variables |
|---|---|---|
| `scripts/spfetch.mjs` | `fetch` con reintento que respeta `Retry-After` ante 429/503 (importable o por CLI) | — |
| `scripts/test-flow.mjs` | Envía un payload de ejemplo al flow (con o sin adjunto), imprime estado, latencia y cuerpo, y **sale con código ≠ 0 si no es 2xx**. Es la prueba de humo de §20.7 | `FLOW_URL` (obligatoria), `APP_KEY` (opcional) |
| `scripts/sp-upload-test-file.mjs` | Sube un PDF mínimo de prueba a una biblioteca de SharePoint por REST para disparar flows por archivo (§28.7) | `SP_TOKEN`, `SITE_URL`, `FOLDER` |
| `scripts/make-icons.mjs` | Genera los dos PNG de iconos placeholder | — |

> En **Git Bash de Windows**, un valor como `FOLDER=/sites/...` se convierte en una ruta de disco: anteponé `MSYS_NO_PATHCONV=1`.

## 34.4 Decisiones de diseño (para adaptarlo sin romperlo)

- `submit()` **no lanza excepciones**: devuelve `{ ok: true | false }`. El borrador solo se borra si `shouldClearDraft(result)`, y en modo demo tampoco se borra.
- Solo **429, 500 y 503** se reintentan solos (2 reintentos, con tope de espera de 30 s). **502/504 y timeouts no**: repetir un envío que ya pasó los 120 s puede **duplicar** datos. La app ofrece "Reintentar" con el **mismo folio** para poder detectar el duplicado (§22.4).
- La patente se **muestra** como `ABC-123` o `AB-123-CD` y se **envía compacta** (`ABC123`).
- `formatKms` está escrito a mano para no depender del ICU del entorno.
- `SignaturePad` exige haber dibujado: un canvas vacío grande puede superar los 200 caracteres.

## 34.5 Cómo adaptarlo a tu formulario

1. Cambiá el nombre de la app y el **prefijo de las claves** de almacenamiento y de caché (`app-…`), para que dos apps en el mismo origen no compartan borradores.
2. Definí tus campos en `App.tsx` y en el tipo del payload de `uploadClient.ts`; mantené el orden del *Field-add checklist* (§16): columna en SharePoint → tipo → formulario → `buildPayload` → flow.
3. Ajustá el **límite total de payload** de `imageUtils.ts` a lo que tolera tu flow (§21.4).
4. Corré `npm test` después de cada cambio: los tests documentan el comportamiento esperado.

## 34.6 Lo que NO incluye

- **PDF en el cliente** (jsPDF): por la trampa de las tildes y el tamaño, está como receta en §5, no como código.
- Web Push, mapas y GPS de campo, cola sin conexión: ver §19, §5 y la lista de pendientes del `CHANGELOG`.
- El **flow** en sí: se arma con §9 (plantilla) o se genera por código con §20 / §26.

## 34.7 Estado de verificación (2026-09-24)

**Probado** (comandos ejecutados, salida real): `npx tsc --noEmit` sin errores; `npm test` → **8 archivos, 108 tests verdes**; `npm run build` correcto (≈162 kB de JS, ≈53 kB comprimido); los cuatro scripts responden a `--help`; búsqueda de datos de empresa sin resultados. Los tests de `spfetch` corren contra un servidor HTTP local.

**NO probado**:
- En un **navegador real**: compresión con `canvas`, firma táctil, service worker instalado y su auto-actualización, instalación de la PWA.
- **Despliegue real** a GitHub Pages con el workflow. El paso de verificación del bundle publicado (§11) no está incluido en el workflow del kit.
- `test-flow.mjs` y `sp-upload-test-file.mjs` **contra un flow o un SharePoint reales**: `test-flow.mjs` solo se ejecutó contra un servidor local y `sp-upload-test-file.mjs` solo con `--dry-run`.
- `npm audit` informa 2 avisos moderados que vienen de una dependencia de desarrollo (`@vitest/mocker`, solo del servidor de tests, no llega al bundle).

**Probalo en un teléfono real antes de confiar en él** (regla 15 del índice).
