<!-- spa-sharepoint-power-automate · references/13-decisiones-de-herramientas.md · sección §25 -->
<!-- Nueva (2026-09-24). Registro de skills/herramientas de terceros evaluadas, para no repetir la evaluación. Es un registro fechado: revalidar antes de reutilizar. Índice: ../SKILL.md -->

# 25 · Herramientas de terceros evaluadas (registro de decisiones)

Evaluación hecha el **2026-09-24** clonando cada repositorio y leyendo el contenido real (no solo la descripción). "Instalada" = se incorporó al entorno de trabajo del autor; "No instalada" = evaluada y descartada por ahora.

## 25.1 · Criterios (usar el mismo checklist para lo próximo)

1. **Qué se instala de verdad.** `npx skills add … --skill X` copia **solo la carpeta de la skill** (normalmente un `SKILL.md`). Si la skill llama herramientas `mcp__*`, esas viven en **otro componente** (un plugin/servidor) que la instalación suelta **no** trae: quedaría inservible.
2. **Quién recibe tus datos.** Un servicio de terceros ve definiciones de flows, entradas y salidas de corridas (con datos de inspecciones, personas, viajes).
3. **Herramientas de escritura sobre producción.** `update`, `delete`, `run`, `set state`: con la identidad o la key que les des.
4. **Costo y cuenta.** ¿Requiere suscripción, API key, admin consent en el tenant?
5. **Solapamiento** con lo que ya existe (esta skill y otras skills propias).
6. **Qué ejecuta.** Buscar `curl`, `eval`, `exec`, subprocess, hosts de red, instalaciones globales. Un bundle minificado grande no se audita línea por línea: al menos listar los hosts.
7. **Dónde probar primero.** Entorno de desarrollo de Power Platform, nunca el de producción.

## 25.2 · Resultados

| Herramienta | Qué es | Estado | Motivo |
|---|---|---|---|
| `sharepoint` (`apideck-libraries/api-skills`) | Documentación para acceder a SharePoint vía Apideck (API unificada de File Storage) | **Instalada** (se conserva) | Solo `SKILL.md` (Apache-2.0), scans limpios. Utilidad baja: exige cuenta Apideck, pasa datos por un tercero, **no cubre Listas de SharePoint** (solo por Proxy), y el OAuth corporativo pide admin consent. Graph directo o Power Automate cubren lo mismo sin intermediario |
| `power-automate-documentation` (`microsoft/cat-agent-skills`) | Documenta un `.zip` de solución: qué lee/escribe/borra cada flow | **Instalada** | Solo Markdown, útil para auditoría. Ver §24.5 |
| `power-automate-desktop-assessment` (`microsoft/cat-agent-skills`) | Evalúa proyectos de Power Automate Desktop (RPA) y soluciones | No instalada | Solo aplica a flows de escritorio. Sus 4 scripts Python son locales (extraen el zip, analizan, renderizan HTML; sin red ni subprocess) |
| `microsoft-sharepoint-webhooks` (`hookdeck/webhook-skills`) | Cómo **recibir** webhooks de listas de SharePoint en un servidor propio (handshake, `clientState`, GetChanges) | No instalada | Segura (MIT, docs + ejemplos), pero irrelevante para SPA→Power Automate: el trigger `When an item is created or modified` ya cubre reaccionar a cambios. Datos útiles ya volcados en §23.5. Solo volver a mirarla si hace falta notificar a un backend propio (p. ej. en Vercel) |
| `flowstudio-power-automate-mcp` (`github/awesome-copilot`) y `power-automate-build` / `-debug` (`ninihen1/power-automate-mcp-skills`) | Capa de conexión a **FlowStudio MCP** (`mcp.flowstudio.app`), servicio de terceros con suscripción | No instaladas | La skill es inocua (Markdown + helpers Python/Node) pero **el servicio es de terceros**: recibe definiciones y datos de corridas, y expone herramientas de escritura (`update_live_flow`, `set_live_flow_state`, `trigger_live_flow`, `resubmit_live_flow_run`, `cancel_live_flow_run`). Monitoring y governance son de pago |
| `power-automate` plugin (`microsoft/power-platform-skills`): `setup`, `build-flow`, `debug-flow`, `manage-desktop-flows` | Skills + **servidor MCP local FlowAgent** (`server/mcp.mjs`, ~2,7 MB) que usa tu `az login` | No instalado | Es de Microsoft (MIT) y corre local, sin servicio de terceros: **la mejor opción si se quiere leer el error exacto de una corrida por MCP**. Pero (a) las skills sueltas **no funcionan sin el servidor**: instalar como plugin (`/plugin marketplace add microsoft/power-platform-skills` + `/plugin install power-automate@power-platform-skills`), (b) trae `delete_flow`, `update_flow`, `run_flow`, `publish_flow`, `cancel_all_runs` con **tu identidad**, (c) se listaron los hosts del bundle (solo dominios de Microsoft y el endpoint de metadatos de Azure) pero **no se auditó línea por línea**. Probar primero en desarrollo. El diagnóstico manual de §20.2 hace lo mismo hoy |
| `powercat-overflow` (`microsoft/power-cat-skills`) | Revisa **todos los flows** de una solución `.zip` contra las guías de codificación de Microsoft y escribe un `.findings.json`; luego abre un visor alojado en GitHub Pages | **Instalada** | Solo Markdown (MIT), sin scripts. Baja la lista de fuentes y el esquema de `raw.githubusercontent.com`. Nombra herramientas de otro entorno (`m_ask_user`, Playwright): en Claude Code el análisis funciona y el paso del visor cae al plan B manual. Se le pasa el `.zip` de una **solución** (§24.5), no el paquete legacy. Complementa a `power-automate-documentation` |
| `automation-power-automate-designer` (`khalilbenaz/claude-skills-collection`) | Guía genérica de diseño de flows, en francés | No instalada | Autor individual, contenido genérico, se solapa con esta skill |
| `@membranehq/cli` (npm) | CLI de Membrane, plataforma de integraciones con SaaS | No instalado | Otro intermediario de terceros; sin necesidad para SharePoint (ya cubierto por Graph/Power Automate) |

## 25.3 · Cómo decidir la próxima vez (regla corta)

- ¿Es solo `SKILL.md` de una fuente confiable (Microsoft, GitHub oficial) y aporta algo que esta skill no tiene? → instalar.
- ¿Pide una cuenta/key de un tercero, o llama a `mcp__*` que no vienen incluidos? → **no** hasta responder los puntos 1–3 de 25.1.
- ¿Escribe sobre producción? → primero en desarrollo, con confirmación explícita antes de cada escritura.

Cuando se agregue algo nuevo al entorno de trabajo, **sumar una fila** acá con fecha y motivo.

## 25.4 · Relevamiento del ecosistema público (2026-09-24)

Búsqueda con `npx skills find` y búsqueda de código en GitHub; ~40 candidatas, 38 evaluadas con un script que mide cuántos de 12 temas cubre cada una (medición por indicadores, **no** lectura completa). Resultado: **ninguna cubre la combinación de esta skill**.

| Tema de esta skill | ¿Lo cubre alguien? |
|---|---|
| SPA pública sin login → trigger HTTP → SharePoint (Vite, Pages, payload, seguridad del endpoint) | **Nadie** (0 hits) |
| PWA de campo (Wake Lock, Web Push, iOS) | **Nadie** |
| REST de SharePoint (columnas, quirks de `/items`, `RenderListDataAsStream`) | Solo un *cheat sheet* suelto (`samyost/ctrlx-sharepoint`) |
| Flows como código (paquete legacy + API de administración) | Parcial: `mbadali25/useful-claude-add-ons`, `ericrisco/rsc-harness` |
| Flows de solución por PAC CLI / Dataverse | `alvinwills/power-automate-claude-skills` (`power-automate-pac`), `tomdam/flowforger`, `excelano/paxc`. Cubierto aquí en §26 |
| Límites, licencias, throttling, umbrales | Superficial: `DevHexLab/power-platform-skills` (7 de 12 temas en ~100 líneas) |
| Try/Catch y expresiones en general | `korchard333/claude-power-platform-community`, `DevHexLab/power-platform-skills`, `satriotsubasa/PowerPlatform-Core` |
| Diseño de listas de SharePoint | `RorySullivan1/powerapp_taskmaster`, `OKHP3/skillz`. Cubierto aquí en §27 |
| Catálogo de errores con síntomas reales | Solo con el servicio pago FlowStudio |

Referencia de tamaño: esta skill cubre los 12 temas (≈3.100 líneas antes de §26–§28); la mejor competidora (`alvinwills/power-automate-claude-skills`) cubre 8 con ≈1.300.

