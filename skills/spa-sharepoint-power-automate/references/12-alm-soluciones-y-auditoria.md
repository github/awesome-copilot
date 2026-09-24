<!-- spa-sharepoint-power-automate · references/12-alm-soluciones-y-auditoria.md · sección §24 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn; lo no verificado está marcado "NO VERIFICADO". Índice: ../SKILL.md -->

# 24 · Soluciones, conexiones y variables de entorno (ALM) + auditoría de flows

Hoy el pipeline usa flows **sueltos** ("My flows"), respaldados con el paquete `.zip` de §9/§20.1. Funciona, pero tiene tres límites: no hay entornos dev/prod limpios, las conexiones están atadas a una persona, y las URLs de SharePoint están escritas dentro de cada acción. Las **soluciones** resuelven esos tres.

## 24.1 · Flow suelto vs flow de solución

| | Flow suelto (hoy) | Flow en una solución |
|---|---|---|
| Se mueve entre entornos con | Paquete `.zip` legacy (§20.1) | Exportar/importar la **solución** |
| Conexiones | Ligado a la conexión de una persona | **Connection reference**: un componente que apunta a una conexión; al importar se elige la conexión del entorno destino |
| Sitio / lista / URL / claves | Escritos en cada acción | **Environment variables**: se cambia el valor al importar, sin editar el flow |
| Versionado en repo | `.zip` binario + `Flow-*.md` | Solución **desempaquetable** (SolutionPackager) → JSON diffeable |
| Dónde vive | Servicio de flows | **Dataverse** (confirmar que el entorno lo tiene) |

Puntos verificados:

- Una **conexión** es una credencial guardada para un conector; una **connection reference** es un componente de la solución que apunta a una conexión. Los flows de solución se atan a la *reference*, no a la conexión. Al importar se le da una conexión a cada reference y los flows pueden **encenderse solos** al terminar la importación.
- Un **environment variable** guarda clave y valor como componente de la solución. Tipos: número decimal, texto, JSON, dos opciones, **origen de datos** (guarda p. ej. sitio y lista de SharePoint) y **secreto** (requiere Azure Key Vault). El mismo valor lo pueden usar flows y apps.
- **Solo se exportan soluciones no administradas (*unmanaged*)**; una *managed* no se exporta. Un flow que ya es de solución **no se exporta desde la página de detalle del flow**: se exporta la solución desde *Soluciones*.
- Cambiar el *valor actual* de un environment variable directamente en un entorno (sin import) **no lo toma un flow ya encendido**: hay que **apagarlo y volver a encenderlo**.
- Para importaciones automatizadas hay un **archivo de configuración de despliegue** (JSON) que pre-carga connection references y variables del entorno destino.
- Microsoft recomienda guardar las soluciones en control de código fuente y automatizar la exportación.

## 24.2 · Qué se gana en este pipeline

1. **Dev/prod sin tocar el flow**: `SharePointSiteUrl` y `ListaInspecciones` como *data source* variables; el flow de prueba apunta a una lista de prueba y el de producción a la real. Antes: editar acciones a mano y rezar.
2. **La SPA sigue teniendo una URL de trigger distinta por entorno** (cada flow tiene la suya): se resuelve con `VITE_POWER_AUTOMATE_URL` por build, como en §9 (Flow backup & environments).
3. **Conexión de servicio** en lugar de la de una persona: cuando esa persona se va o rota la contraseña, la conexión no se cae (§9, "Connector authorization expires").
4. **Diff real** de cambios de flow en el repo (solución desempaquetada) en lugar de un `.zip` opaco.

## 24.3 · Cuándo conviene migrar (y cuándo no)

- **Sí**: hay (o va a haber) entorno de pruebas separado, más de un flow que comparte conexiones, o hace falta trazabilidad de cambios (auditoría de SGI/ISO).
- **No todavía**: un solo flow chico, un solo entorno, un solo mantenedor. El paquete `.zip` + `Flow-*.md` de §9 alcanza, y §20 (generar y aplicar por API) seguirá siendo el camino rápido para iterar.
- **Verificado (2026-09-24, Microsoft Learn):** la vía **soportada** para escribir flows de solución es la tabla `workflow` de Dataverse y PAC CLI (**§26**). La API de §20.2 (`api.flow.microsoft.com`) **no está soportada** para nada, y los flows sueltos no se pueden administrar por código de forma soportada. Si la API de §20.2 acepta escribir sobre un flow *dentro* de una solución **no está documentado**: no lo asumas.

## 24.4 · Migrar un flow suelto a solución (procedimiento)

1. En un entorno **de desarrollo** (no producción): *Soluciones → Nueva solución*.
2. *Agregar existente → Flujo de nube* (flow suelto ⇒ queda solution-aware). Agregar también las **connection references** y crear los **environment variables** para sitio y listas.
3. Reemplazar en las acciones los valores fijos por las variables de entorno (en el diseñador o generando la definición, §20).
4. **Exportar la solución no administrada** y guardar el `.zip` en `power-automate/solutions/`.
5. Importar en el entorno destino eligiendo la conexión para cada reference y el valor de cada variable.
6. Probar de punta a punta (§20.7) y **recién ahí** dar de baja el flow suelto. Cuidado con el trigger: es otro flow, otra URL, otro `VITE_POWER_AUTOMATE_URL`.

## 24.5 · Auditar un flow: skill `power-automate-documentation`

Instalada el 2026-09-24 (repo `microsoft/cat-agent-skills`, envío `power-automate-documentation`; se dispara sola con frases como *"documentá este flow"*, *"qué lee/escribe/borra este flow"*, *"mapeá las connection references"*, *"qué flows llaman a cuáles"*).

- **Entrada: el `.zip` de una SOLUCIÓN** (`solution.xml`, `customizations.xml`, `Workflows/*.json`). **NO es el paquete legacy de §20.1** (`manifest.json` + `Microsoft.Flow/flows/<id>/definition.json`). Si solo tenés el paquete legacy, primero pasá el flow a una solución (24.4, pasos 1–2) y exportá la solución.
- Qué entrega: para cada flow, en lenguaje llano, **cada lugar donde lee, escribe o borra datos**, los flows hijos que invoca y las connection references que usa. Sirve para responder *"si cambio esta columna, ¿qué flows se rompen?"*.
- **Cuándo correrla**: (a) antes de renombrar o borrar una columna/lista (complementa el *Field-add checklist* de §16); (b) tras un cambio grande de flow; (c) para el anexo técnico de una auditoría de SGI; (d) al heredar un flow que nadie documentó.
- **Cómo verificar el resultado**: la skill está escrita para inventariar contra el JSON real; contrastá al menos una acción de escritura contra el flow (nombre de la acción y lista destino) antes de citarlo en un documento formal.
- Para análisis de Power Automate **Desktop** (RPA) existe `power-automate-desktop-assessment` (mismo repo): **no instalada**, solo hace falta si aparecen flows de escritorio.

## Fuentes (Microsoft Learn)

- *Use a connection reference in a solution with Microsoft Dataverse* — `learn.microsoft.com/power-apps/maker/data-platform/create-connection-reference`
- *Environment variables for Power Platform overview* — `learn.microsoft.com/power-apps/maker/data-platform/environmentvariables`
- *Export a solution* (solution cloud flows) — `learn.microsoft.com/power-automate/export-flow-solution`
- *Pre-populate connection references and environment variables for automated deployments* — `learn.microsoft.com/power-platform/alm/conn-ref-env-variables-build-tools`
- *Work with solution-aware cloud flows* (módulo) — `learn.microsoft.com/training/modules/solution-aware-flow/`
