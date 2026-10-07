<!-- spa-sharepoint-power-automate · references/11-lecturas-sharepoint-a-escala.md · sección §23 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn; el snippet de reintento se probó contra un servidor local que devuelve 429 con Retry-After. Índice: ../SKILL.md -->

# 23 · Leer y escribir SharePoint a escala: umbrales, paginación y throttling

Una lista que hoy tiene 300 filas y en un año 12.000 **rompe flows y scripts que nunca cambiaron**. Este capítulo es lo que hay que saber antes de que pase.

## 23.1 · `Get items` en Power Automate: los tres números

| Concepto | Valor | Detalle |
|---|---|---|
| Ítems por defecto | **100** | Si solo indicás sitio y lista, devuelve **100**. Microsoft Learn dice que los ítems se «paginan por defecto», pero eso no trae más: para pasar de **Top Count** hay que **activar Pagination** en los ajustes de la acción y fijar un umbral |
| **Top Count** (Advanced options) | hasta **5.000** | Es el umbral de vista de lista. Pasarse falla la acción |
| **Pagination** + *Threshold* (Settings → Networking) | hasta **100.000** (5.000 en perfil Low) | Trae por lotes hasta alcanzar el umbral configurado |

- Para "traer todo lo que cumple un filtro" en una lista grande: **Top Count alto + Pagination ON + Threshold mayor que lo esperado**. Ojo: el umbral se redondea por lotes de la página (con lotes de 5.000, pedir 7.000 devuelve hasta 10.000).
- **Get items** solo trabaja con **listas**; para **bibliotecas** se usa `Get files`. Por defecto recorre **todas las carpetas** de forma recursiva: limitarlo con *Limit Entries to Folder* / *Include Nested Items*.
- Los espacios en el nombre de columna van como `_x0020_` en OData (`Start_x0020_Date desc`). Y se filtra por el **nombre interno**, no el de pantalla (§10, "Hidden default columns conflict").

## 23.2 · El umbral de vista (5.000) y el filtro que "no encuentra nada"

Limitación conocida de Microsoft: en listas de **más de 5.000** ítems, un `Filter Query` puede devolver **cero registros si no hay coincidencias entre los primeros 5.000**, aunque sí existan más adelante.

Cómo se evita, en este orden:

1. **Indexar** las columnas que se usan para filtrar u ordenar (Configuración de lista → Índices). Es lo que permite que la consulta no dependa de recorrer toda la lista.
2. Activar **Pagination** en el `Get items`.
3. Filtrar **en el servidor** (`Filter Query`, OData) y no con `Filter array` después: el `Filter array` opera sobre lo que ya se trajo y no evita el umbral.
4. Filtros compuestos: la primera condición debe ser selectiva y sobre columna indexada.
5. Si la lista crece sin freno (histórico de inspecciones): **archivar por período** (lista o biblioteca por año) en lugar de pelear con el umbral.

Mismo comportamiento por REST: una consulta que necesita recorrer más de 5.000 ítems para resolver el filtro falla con `SPQueryThrottledException` aunque devuelva 200 filas. Se arregla con índices, no con `$top`.

## 23.3 · Iterar: filtrar ANTES del `Apply to each`

- Límite de ítems por loop: 5.000 (Low) / 100.000. Filtrar con la consulta o con `Filter array` **antes** de entrar al loop, y usar `Select` para quedarse solo con las columnas que se necesitan.
- Un `Apply to each` sobre miles de ítems con una acción de SharePoint adentro son miles de llamadas: choca con el límite de ~600/min del conector (§21.5). Alternativas: lotes vía Graph `$batch`, o un script (§18) fuera del flow.
- En `Get items`, si la opción está disponible, **limitar columnas por vista** reduce el peso de cada respuesta.

## 23.4 · Fuera del diseñador (scripts §18/§20): 429, 503 y `Retry-After`

Cuando SharePoint limita, responde **429** (demasiadas solicitudes) o **503** (servidor ocupado) con un encabezado `Retry-After` en segundos. Reglas de Microsoft:

- **Respetar `Retry-After`**. Las solicitudes limitadas también cuentan contra el límite: reintentar de inmediato **empeora** el bloqueo.
- Bajar la concurrencia, evitar picos, y en cargas masivas trabajar **fuera del horario pico** y en tandas chicas.
- Si el abuso continúa, SharePoint puede **bloquear** la aplicación (503 sostenido) y avisa al tenant.
- No depender de encabezados `RateLimit`: SharePoint Online **no** los soporta; solo `Retry-After`.
- **Microsoft Graph gasta menos recursos que REST/CSOM** para lo mismo y es lo recomendado cuando hay opción.

Helper mínimo (Node ≥ 18, sin dependencias) que respeta `Retry-After` y se rinde de forma explícita:

```js
async function spFetch(url, opts = {}, tries = 5) {
  for (let i = 0; i < tries; i++) {
    const r = await fetch(url, opts);
    if (r.status !== 429 && r.status !== 503) return r;
    const wait = Number(r.headers.get('retry-after')) || 5 * (i + 1); // seg.
    await new Promise(res => setTimeout(res, wait * 1000));
  }
  throw new Error(`SharePoint throttled tras ${tries} intentos: ${url}`);
}
```

Probado: con dos 429 seguidos con `Retry-After: 1` devuelve 200 al tercer intento (~2 s), y con throttling permanente lanza el error tras agotar los intentos.

Combinarlo con el **reintento por 401 transitorio** de §18.4 (re-tokenizar): son casos distintos, un 401 pide token nuevo y un 429 pide **esperar**.

## 23.5 · Detectar cambios sin releer todo

- Releer la lista completa cada vez es el patrón que termina en throttling. Lo eficiente es **delta**: en Microsoft Graph, la consulta *delta con token* cuesta **1 unidad de recurso** aunque sea multi-ítem; sin token cuesta 2.
- El conector de SharePoint de Power Automate no expone delta; para eso hay que llamar a Graph (`/drives/{id}/root/delta`) con una acción HTTP o un script.
- Para reaccionar a cambios en una lista **dentro** de Power Automate, alcanza con el trigger `When an item is created or modified` (usa webhooks de SharePoint por debajo; no necesitás montar los tuyos).
- **Webhooks de SharePoint propios** solo si necesitás avisar a un servicio externo: la suscripción **dura como máximo 6 meses (180 días)** y hay que **renovarla** con `PATCH …/subscriptions('<id>')`; si no hay cambios en 6 meses y nadie renueva, se elimina. El endpoint debe devolver el `validationtoken` en **≤ 5 s**, no hay firma (solo `clientState`) y la notificación viene sin detalle del cambio. Evaluación de la skill `microsoft-sharepoint-webhooks`: ver §25.

## 23.6 · Escritura masiva

- Lotes chicos (decenas, no cientos): un lote grande puede superar el tamaño máximo del request (del orden de 2 MB, según respuestas de Microsoft Q&A; no es un valor de la documentación oficial) o disparar throttling. **No son transaccionales**: una tanda puede fallar a medias, así que registrá qué IDs se aplicaron.
- Upsert por **clave canónica** (sin separadores de miles), como en §18.6.
- Escribí con `GetItemById(n)` cuando el `/items(n)` de la lista devuelve el quirk de "200 sin persistir" (§17, §18).
- Al terminar, **verificar leyendo de vuelta** (§20.7), no confiar en el contador de "actualizadas".

## Fuentes (Microsoft Learn)

- *In-depth analysis into Get items and Get files SharePoint actions* — `learn.microsoft.com/sharepoint/dev/business-apps/power-automate/guidance/working-with-get-items-and-get-files`
- *Limits of automated, scheduled, and instant flows* (ítems paginados, ítems por loop) — `learn.microsoft.com/power-automate/limits-and-config`
- *Avoid getting throttled or blocked in SharePoint Online* — `learn.microsoft.com/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online`
- *Overview of SharePoint webhooks* y *SharePoint webhooks sample reference implementation* (vigencia y renovación) — `learn.microsoft.com/sharepoint/dev/apis/webhooks/`
