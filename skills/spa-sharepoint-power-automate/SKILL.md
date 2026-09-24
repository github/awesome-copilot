---
name: spa-sharepoint-power-automate
description: >-
  Use when building or troubleshooting public no-login web apps (React/Vite SPA or static PWA on GitHub Pages)
  that send data to SharePoint through a Power Automate HTTP-trigger flow, and for Power Automate + SharePoint
  pipeline problems: trigger auth default (401/403), Premium licensing, 120 s / 100 MB limits (502/504), Get
  items 5,000 threshold and pagination, 429 throttling, try/catch/Terminate and silent failures after an early
  Response, idempotent retries, solutions/connection references/environment variables, PAC CLI and Dataverse,
  flows-as-code, SharePoint REST columns, list design, flows triggered by a file upload ('Route did not match'),
  PWA/service worker, GitHub Pages deploy and an error catalog. Also tenant governance (DLP, corporate network),
  Outlook limits, Power BI on lists, Sites.Selected and personal data. Includes a tested SPA starter kit. This
  file is an index: open the referenced file for the section you need.
license: MIT
metadata:
  version: 1.4.0
  updated: '2026-09-24'
---

# SPA → Power Automate → SharePoint pipeline

End-to-end reference for building **public, no-login** web apps that let visitors submit structured data + attachments to a SharePoint list. The owner's identity (and Microsoft 365 tenant) is provided by the Power Automate flow; visitors never authenticate.

## Architecture

```
[Public visitor]
   │  HTTPS POST (JSON)
   ▼
[GitHub Pages SPA]  ──VITE_POWER_AUTOMATE_URL──▶  [Power Automate HTTP trigger]
                                                          │
                                                          ├─▶ Create item (SharePoint Inspecciones)
                                                          ├─▶ Add attachment × N (SP Inspecciones)
                                                          ├─▶ Create item (SP ChecklistItems, lookup parent)
                                                          └─▶ Send email V2 (Outlook)
```

**Why this shape**: visitors can't be given SP credentials, but the flow runs as a real M365 user (the flow owner) and creates items on their behalf. The HTTP trigger is the only public surface.

## Project layout

```
repo/
├── web-app/                      # React + Vite SPA
│   ├── src/
│   │   ├── components/InspectionForm.tsx
│   │   ├── components/SignaturePad.tsx
│   │   ├── lib/pdfGenerator.ts
│   │   ├── lib/imageUtils.ts
│   │   ├── lib/draftStorage.ts
│   │   ├── lib/inspectorProfile.ts
│   │   ├── services/uploadInspeccion.ts
│   │   └── App.tsx
│   ├── public/
│   │   ├── app-logo.png
│   │   ├── manifest.json
│   │   └── sw.js
│   └── vite.config.ts            # base: VITE_BASE
├── sharepoint/
│   └── Setup-AllColumns-*.ps1    # Idempotent column creation (device code auth)
├── power-automate/
│   └── Flow-*.md                 # Flow design as docs (Power Automate has no source format)
└── .github/workflows/deploy-pages.yml
```

---

# Cómo usar esta skill

Esta skill se dividió (2026-09-24) en un índice liviano y `references/` con el detalle. **No leas todo:** buscá tu caso, abrí el archivo y andá a la sección. Los números `§N` de todo el texto siguen siendo válidos y se resuelven con la tabla de más abajo.

## Router: del problema al archivo

| Estoy… / me pasa… | Ir a |
|---|---|
| Arrancando un proyecto nuevo | `06` §16 (orden de construcción) → `03` §9 (plantilla del flow) → `04` §10 (columnas) |
| La SPA no llega al flow: **401/403**, Run history vacío, flow nuevo que no recibe nada | `09` §21.1 (quién puede disparar el trigger) |
| `DirectApiAuthorizationRequired` / "service plan adequate" / licencias | `09` §21.2 |
| El flow "dejó de andar" solo / aparece apagado | `09` §21.3 |
| **502/504**, "NoResponse", flow lento, límite de tamaño | `09` §21.4 y `03` §9 (`Respuesta` antes de los loops) |
| Se guardó el ítem pero faltan adjuntos/hijos/correo, o la corrida está verde y algo falló | `10` §22 (Try/Catch, `Terminate`, `Foreach`) |
| Duplicados de folio, reintentos, concurrencia | `10` §22.3–22.4 |
| Un error concreto (texto del mensaje) | `06` §17 (catálogo) y `10` §22.8 (filas nuevas) |
| Listas grandes, `Get items` trae 100, filtro que devuelve vacío, umbral 5.000 | `11` §23 |
| Scripts/REST a SharePoint: 429/503, `Retry-After`, escritura masiva | `11` §23.4–23.6 y `04` §18 |
| Crear listas/columnas por REST, lookups, codificación UTF-8 | `04` §10 |
| Flow como código: paquete `.zip`, API de administración, historial de corridas | `08` §20 |
| Entornos dev/prod, conexiones que se caen, variables de entorno, soluciones | `12` §24 |
| Documentar/auditar un flow ("qué lee y qué escribe", "qué se rompe si cambio la columna") | `12` §24.5 (skill `power-automate-documentation`) |
| Seguridad de un endpoint público sin login | `01` §1 y `07` §19.4 |
| Formularios, React, imágenes, GPS, firma, PDF, Service Worker | `02` §2–§7 |
| Contrato del payload SPA ↔ flow | `03` §8 |
| GitHub Pages: deploy, despliegue trabado, verificar que está en vivo | `05` §11 |
| PWA operativa en el celular (Wake Lock, push, máquina de estados) | `07` §19 |
| Flow que se dispara **al subir un archivo** a SharePoint (`Route did not match`, `{Name}` sin extensión, tarda en reaccionar, "Conexión no válida") | `16` §28 |
| Flows de **solución** por código: `pac solution`, tabla `workflow` de Dataverse, archivo de despliegue | `14` §26 |
| Diseñar una lista nueva (tipos de columna, índices, permisos, relaciones, archivado) | `15` §27 |
| El flow no dispara en la empresa: "disabled by your organization", DLP, firewall, proxy, acceso condicional; qué pedirle a IT | `17` §29 |
| Correo: límites, adjuntos, buzón compartido, un correo por elemento, `Item ID doesn't belong to current mailbox` | `18` §30 |
| Power BI / dashboards sobre listas: refresco, 12 uniones, UTC | `19` §31 |
| Acceso por API con el mínimo permiso: `Sites.Selected`, Graph app-only, qué pedirle a IT | `20` §32 |
| Datos personales (DNI, GPS, fotos, firmas), consentimiento, retención | `21` §33 |
| Arrancar una SPA nueva sin reescribir firma, fotos, borrador, service worker, envío con reintentos; probar un flow sin navegador | `22` §34 (código en `assets/spa-starter/`) |
| "¿Instalamos esta skill/herramienta/servicio de terceros?" | `13` §25 |

## English quick router

The skill body is mostly Spanish. These sections are **translated to English** (same file names under `references/en/`, same `§` numbers); the Spanish originals remain the source of truth.

| I am seeing… / I need… | Open |
|---|---|
| 401/403 from a new flow, `DirectApiAuthorizationRequired`, flow turned itself off, 502/504 and the 120 s / 100 MB limits | `references/en/09-licencias-limites-trigger.md` (§21) |
| Green run but missing attachments, duplicated records on retry, try/catch/`Terminate`, concurrency, secure inputs/outputs | `references/en/10-resiliencia-y-errores-flow.md` (§22) |
| `Get items` returns 100 rows or nothing past 5,000, 429/`Retry-After`, thresholds and indexes | `references/en/11-lecturas-sharepoint-a-escala.md` (§23) |
| Export / edit / import solution flows with PAC CLI, Dataverse `workflow` table, unsupported `api.flow.microsoft.com` | `references/en/14-soluciones-por-codigo-pac-dataverse.md` (§26) |
| "Disabled by your organization", DLP on the HTTP connectors, corporate network domains, what to ask IT | `references/en/17-gobernanza-del-tenant-dlp.md` (§29) |
| Email limits, attachment size, shared mailbox, one email per item | `references/en/18-correo-outlook.md` (§30) |
| `Sites.Selected`, Graph with least privilege, a request IT can approve | `references/en/20-permisos-graph-sites-selected.md` (§32) |

## Índice: número de sección → archivo

| § | Tema | Archivo (en `references/`) |
|---|---|---|
| 1 | Modelo de seguridad | `01-seguridad.md` |
| 2–7 | SPA: Vite/Pages, React, formularios, imágenes/GPS/firma/PDF, persistencia, Service Worker | `02-spa-cliente.md` |
| 8–9 | Contrato SPA↔flow · Power Automate (plantilla del flow, trampas del diseñador) | `03-contrato-y-flow.md` |
| 10, 18 | SharePoint: listas y columnas por REST · sincronización masiva Excel→SP | `04-sharepoint.md` |
| 11–12 | GitHub Pages · credenciales / device code | `05-deploy-y-credenciales.md` |
| 13–17 | Monitoreo, testing, diagnóstico, orden de construcción, **catálogo de errores** | `06-operacion-y-errores.md` |
| 19 | PWA operativa | `07-pwa-operativa.md` |
| 20 | Flows como código | `08-flows-como-codigo.md` |
| **21** | **Trigger HTTP, licencias, límites, apagado automático** *(nuevo)* | `09-licencias-limites-trigger.md` |
| **22** | **Resiliencia: Try/Catch, reintentos, concurrencia, datos sensibles** *(nuevo)* | `10-resiliencia-y-errores-flow.md` |
| **23** | **SharePoint a escala: umbrales, paginación, throttling** *(nuevo)* | `11-lecturas-sharepoint-a-escala.md` |
| **24** | **Soluciones, connection references, variables de entorno, auditoría** *(nuevo)* | `12-alm-soluciones-y-auditoria.md` |
| **25** | **Herramientas de terceros evaluadas** *(nuevo)* | `13-decisiones-de-herramientas.md` |
| **26** | **Flows de soluciones por código: PAC CLI y Dataverse** *(nuevo)* | `14-soluciones-por-codigo-pac-dataverse.md` |
| **27** | **Diseño de listas de SharePoint como backend** *(nuevo)* | `15-diseno-listas-sharepoint.md` |
| **28** | **Flujos que se disparan al subir un archivo** *(nuevo)* | `16-flujos-disparados-por-archivos.md` |
| **29** | **Gobernanza del tenant: DLP, firewall, acceso condicional, red** *(nuevo)* | `17-gobernanza-del-tenant-dlp.md` |
| **30** | **Correo desde el flow: límites y trampas** *(nuevo)* | `18-correo-outlook.md` |
| **31** | **Reportes y Power BI sobre listas** *(nuevo)* | `19-reportes-power-bi-listas.md` |
| **32** | **`Sites.Selected` y Graph con el mínimo permiso** *(nuevo)* | `20-permisos-graph-sites-selected.md` |
| **33** | **Datos personales en apps de campo** *(nuevo)* | `21-datos-personales.md` |
| **34** | **Kit de arranque: SPA probada + scripts** *(nuevo)* | `22-kit-de-arranque.md` |

## Reglas que no se negocian

Las que más cuestan cuando se olvidan. Cada una remite a la sección con el porqué.

1. **El trigger va en `Anyone`** para una SPA sin login. El default de un flow nuevo es "Any user in my tenant" y devuelve 401 al navegador (§21.1).
2. **`Content-Type: application/json`** en el POST, **schema del trigger vacío**, y **siempre pestaña `fx Expression`**, nunca chips (§9).
3. **`Respuesta` (200) antes de los loops**, y **toda rama termina en `Response`**; si no, 502 por los 120 s o un `202` silencioso (§9, §20.4, §21.4).
4. **Lo que falla después de responder no se entera el usuario:** `Catch` con aviso + `Terminate → Failed`, o la corrida queda verde (§22.1).
5. **El correo va en la raíz del flow**, no dentro del loop (§9). **Adjuntos con concurrencia 1** (§9, §22.3).
6. **Nada sensible en `VITE_*`:** todo lo que va en el bundle es público (§1). La URL del trigger y `x-app-key` **no son secretos**.
7. **Toda regla con consecuencia legal o económica se valida en el flow**, con `utcNow()` del servidor; el botón deshabilitado del HTML es comodidad, no control (§19.4).
8. **Los reintentos duplican:** folio único (idempotencia) antes de reintentar un `Create item` (§22.4).
9. **Listas que van a crecer:** columnas de filtro **indexadas**, `Pagination` activa, filtro en el servidor (§23.2).
10. **En scripts, respetar `Retry-After`** ante 429/503; nunca reintentar en caliente (§23.4).
11. **Cuerpos hacia SharePoint en UTF-8 (bytes)**, `InternalName` ASCII distinto de los nombres ocultos por defecto (§10, §17).
12. **`clearDraft()` solo después de una respuesta OK** (§6). El usuario no pierde lo que cargó.
13. **Verificar que el deploy está en vivo** (bundle con la cadena nueva) antes de decir "ya está" (§11, §15).
14. **Exportar y commitear el paquete del flow** tras cada cambio relevante (§9). Anotar dueño y licencia que lo cubre (§21.6).
15. **No decir "probado" sin decir qué se probó:** `tsc` verde no es prueba de que el formulario funcione (§14).
16. **Si un error sigue igual tras dos correcciones, cambiá de enfoque** y, antes de dar una corrección por fallada, **compará la hora de la corrida con la fecha de modificación del flow** (§15). Y un "Correcto" no prueba nada: **consultá el ítem de destino** (§28.8).

## Mantener esta skill

- Un aprendizaje nuevo va **en el archivo de su tema**, con su fila en el catálogo de errores (§17 o §22.8) y, si cambia una regla, en la lista de arriba. Este archivo se mantiene **corto** (índice + reglas + router).
- Los datos de plataforma que cambian (cuotas, defaults del diseñador) llevan **fuente** y fecha. Revalidar contra Microsoft Learn antes de citarlos en un documento formal.
- La versión anterior era un único archivo de 144 KB; la división en `references/` se verificó por reconstrucción exacta (sin pérdida de contenido).

## Historial

- **2026-09-24 (5)** — Traducción al inglés de §21, §22, §23, §26, §29, §30 y §32 (`references/en/`, misma numeración; el original en español es la fuente). Nuevo router en inglés. Versión 1.4.0.
- **2026-09-24 (4)** — Nuevo: §34 kit de arranque (`assets/spa-starter/`: SPA Vite + React + TypeScript con firma, fotos, borrador versionado, service worker y cliente de envío con reintentos; 108 tests; 4 scripts sin dependencias). Versión 1.3.0.
- **2026-09-24 (3)** — Nuevos: §29 gobernanza del tenant (DLP, firewall de IP, acceso condicional, dominios de red), §30 correo, §31 reportes y Power BI, §32 `Sites.Selected` y Graph, §33 datos personales. §14 actualizado con la pirámide de pruebas. Versión 1.2.0.
- **2026-09-24 (2)** — Nuevos: §26 flows de solución por código (PAC CLI, Dataverse `workflow`), §27 diseño de listas, §28 flujos disparados por archivos (en una versión anterior figuraba como §18). §17 +4 filas, §15 guía "si una corrección no funciona", §9 nota a §28.5, §20 aviso de soporte de `api.flow.microsoft.com`, §24.3 verificado, §25.4 relevamiento del ecosistema.
- **2026-09-24** — Se divide el monolito de 2.654 líneas en índice + 8 archivos de referencia (contenido idéntico; `§1–§20` intactos). Descripción acortada (de ~2.000 a ~1.000 caracteres). Nuevos: §21 trigger/licencias/límites, §22 resiliencia, §23 SharePoint a escala, §24 ALM y auditoría, §25 registro de herramientas evaluadas. Datos verificados contra Microsoft Learn el mismo día.
