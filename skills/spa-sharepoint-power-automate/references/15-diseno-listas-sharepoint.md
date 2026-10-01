<!-- spa-sharepoint-power-automate · references/15-diseno-listas-sharepoint.md · sección §27 -->
<!-- Nueva (2026-09-24). Combina límites verificados en Microsoft Learn con lo aprendido en §9, §10, §17 y §19. Lo que viene de documentación de SharePoint Server se marca. Índice: ../SKILL.md -->

# 27 · Diseño de listas de SharePoint como backend

Una lista de SharePoint **no es una base de datos relacional**: es una tabla con índices limitados, uniones caras y umbrales. Se puede usar como backend de una SPA o una app de campo si se diseña **antes** de que crezca; rediseñar con 20.000 filas es mucho más caro que hacerlo con 20.

## 27.1 Límites que condicionan el diseño

| Límite | Valor | Fuente / nota |
|---|---|---|
| Umbral de vista de lista | **5.000** ítems por operación de consulta | SharePoint Online. Ver §23 |
| Uniones por consulta (lookup, persona/grupo, estado de flujo de trabajo) | **12** | Falla la consulta al superarlo. Lo documenta el conector de Power BI para SharePoint Online (v2.0) y `Get items`/`Get files` de Power Automate |
| Ítems por lista / archivos y carpetas por biblioteca | 30 millones | Límites de servicio de SharePoint |
| Archivo adjunto a un ítem de lista | **250 MB** | Por eso se comprimen las fotos en el cliente (§5) |
| Permisos únicos por lista o biblioteca | **50.000** soportado, **5.000** recomendado | Cada ítem con permisos propios cuenta |
| Romper la herencia de permisos | **No se puede** en una lista, biblioteca o carpeta con más de **100.000** ítems | Sí se puede en ítems individuales |
| Listas y bibliotecas por colección de sitios | 2.000 combinadas | |
| Versiones de archivo | 50.000 mayores y 511 menores | |
| Tamaño de fila | 8.000 bytes | **Documentado para SharePoint Server**: en SPO rige el mismo modelo, pero verificá el valor vigente |

## 27.2 Elegir el tipo de columna

| Necesidad | Tipo | Cuidado |
|---|---|---|
| Texto corto (patente, folio, equipo) | Una línea de texto | Hasta 255 caracteres |
| Comentarios largos | Varias líneas de texto | No se puede filtrar bien; no lo uses como clave |
| Conjunto **chico y estable** de opciones | **Choice** | Con `FillInChoice = FALSE` un valor que no está en la lista llega **vacío** (§17). Dar de alta el valor nuevo antes de enviar |
| Relación con otra lista (ítems hijos → cabecera) | **Lookup** en la lista **hija** (§10) | Cuenta para el límite de 12 uniones |
| Persona | Persona o grupo | También cuenta como unión |
| Cantidades | Number | Los separadores de miles de es-AR rompen uniones y comparaciones (§17, §18.6); `null` ≠ `0` (§9) |
| Fechas | Fecha y hora | **SharePoint almacena en UTC**: el conector de Power BI lo muestra tal cual, sin convertir. Convertí con `convertTimeZone` en el flow y `toLocaleString("es-AR", {timeZone})` en cliente (§8) |
| Sí/No | Yes/No | Un `null` no equivale a "No" |
| Enlace | Hyperlink | Llega como objeto **o** como cadena (§20.4) |
| Valor derivado | Calculated | **Solo lectura**: no se puede escribir desde el flow. No lo uses para filtrar ni para reglas de negocio |
| Taxonomía corporativa | Managed metadata | Ocupa **varias columnas internas** (dato de SharePoint Server) y complica flows y REST: evitalo salvo que lo exijan |

Reglas propias de este pipeline:

- **`InternalName` ASCII y estable**, con el acento solo en el título visible. **No cambia nunca** después de creada la columna (§10).
- Distinto de los nombres de columnas ocultas por defecto (`Categoria`, etc.) (§10, "Hidden default columns conflict").
- La columna `Title` es obligatoria por defecto: usarla como identificador legible (folio) o hacerla no requerida.

## 27.3 Índices: crearlos antes de que la lista crezca

- Indexar toda columna que se use para **filtrar, ordenar o buscar por clave** (§23.2). Un filtro sobre una columna sin índice en una lista grande devuelve vacío o falla con `SPQueryThrottledException`.
- Con la lista chica, el índice es instantáneo. Con muchos ítems, **agregar o quitar un índice** tiene su propio umbral (20.000 por defecto, dato de SharePoint Server) y en la experiencia moderna se crea en segundo plano ("Indexing is in progress"). Hacerlo temprano evita esa espera.
- El **folio** (clave de negocio) va **indexado y con valores únicos** (*Enforce unique values*, que requiere índice): es la defensa contra duplicados por reintentos (§22.4).
- Hay un máximo de columnas indexadas por lista (el valor habitual es 20; comprobalo en *Configuración de la lista → Columnas indexadas*).

## 27.4 Relaciones: cabecera + hijos

El patrón que ya usa el pipeline (§9, §10):

```
Lista cabecera (Inspecciones)        Lista hija (ChecklistItems)
  ID, Folio (único, indexado)          ID, Title, Estado, Orden
  campos de la inspección              Inspeccion  ← Lookup a la cabecera (en la HIJA)
```

- El **Lookup vive en la hija** (§10, "Lookup column belongs on the CHILD list").
- Se relaciona por **`ID`** (numérico, autogenerado). El **Folio** es la clave que ve el usuario.
- Para reportes (Power BI) **desnormalizar** lo que se muestra: copiar a la hija el folio y los campos que se filtran, en lugar de depender de uniones. El conector v2 de Power BI falla si una consulta toca más de 12 uniones; el arreglo documentado es una **vista por defecto con menos de 12 columnas lookup**.
- En la configuración de una columna Lookup existe *Enforce relationship behavior* (restringir o encadenar el borrado); requiere que la columna esté indexada. **NO VERIFICADO** en un tenant propio: probalo en una lista de prueba antes de depender de eso.
- **Datos maestros** (catálogo de equipos, choferes): lista aparte, con degradación elegante si no carga (§19.7). No los metas como Choice si cambian seguido.

## 27.5 Permisos

- Mantené la **herencia** del sitio siempre que puedas. Los permisos únicos por ítem cuentan para el límite (5.000 recomendado) y encarecen cada vista.
- Si necesitás separar por sector: **una lista o carpeta por sector**, con permisos a nivel de lista, no ítem por ítem.
- **Decidí los permisos antes de superar 100.000 ítems**: después no se puede romper la herencia en esa lista.

## 27.6 Crecimiento y archivado

- Si la lista crece sin freno (histórico de inspecciones), **archivá por período**: una lista por año, o un flow programado que mueva lo viejo. Es más simple que pelear con los umbrales (§23.2).
- Mirá el crecimiento en el mismo monitoreo que el estado del flow (§13, §21.3): cuando la lista pasa el 50% del umbral, es hora de indexar o archivar.

## 27.7 Lista, biblioteca o Dataverse

| Usá | Cuándo |
|---|---|
| **Lista de SharePoint** | Datos tabulares moderados, sin relaciones complejas, con el equipo ya en Microsoft 365 |
| **Biblioteca** | El dato principal es un **archivo** (PDF, foto) con metadatos alrededor |
| **Dataverse** | Relaciones reales, muchas filas, seguridad por fila o lógica de negocio. Tiene costo de licencia y de administración; es también lo que habilita las soluciones con conexiones y variables (§24, §26) |

## 27.8 Checklist de diseño antes de crear la lista

1. ¿Qué **columnas se van a filtrar u ordenar**? → índice desde el día 1.
2. ¿Hay **clave de negocio única** (folio)? → indexada y con valores únicos.
3. ¿Cuántas **uniones** (lookup + persona) tiene una consulta típica? → menos de 12.
4. ¿Cuántos ítems en 12 meses? Si se acerca a miles → plan de archivado.
5. ¿**Permisos** por sector? → a nivel de lista o carpeta, no por ítem.
6. ¿Los `InternalName` son ASCII y definitivos?
7. ¿Las fechas se guardan en UTC y se convierten al mostrar?
8. ¿Quién lee esto (Power BI, otro flow, una SPA)? → diseñar la vista pensando en ese lector.

## Fuentes (Microsoft Learn)

- *SharePoint limits* (límites de servicio de SharePoint Online) — `learn.microsoft.com/office365/servicedescriptions/sharepoint-online-service-description/sharepoint-online-limits`
- *SharePoint Online list* (conector de Power BI: límite de 12 uniones, UTC) — `learn.microsoft.com/power-query/connectors/sharepoint-online-list`
- *Microsoft SharePoint Connector in Power Automate* (límite de 12 columnas lookup) — `learn.microsoft.com/sharepoint/dev/business-apps/power-automate/sharepoint-connector-actions-triggers`
- *Software boundaries and limits for SharePoint Servers 2016 and 2019* (datos marcados "SharePoint Server") — `learn.microsoft.com/sharepoint/install/software-boundaries-limits-2019`
