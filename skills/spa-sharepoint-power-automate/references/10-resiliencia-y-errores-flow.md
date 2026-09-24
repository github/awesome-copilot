<!-- spa-sharepoint-power-automate · references/10-resiliencia-y-errores-flow.md · sección §22 -->
<!-- Nueva (2026-09-24). Complementa §9 (armado), §17 (catálogo) y §20.4 (trampas de runtime). Verificado contra Microsoft Learn; ver Fuentes. Índice: ../SKILL.md -->

# 22 · Resiliencia del flow: errores, reintentos, concurrencia y datos sensibles

El pipeline de §9 responde `200` **antes** de los loops (para no pasar los 120 s). Eso tiene un costo que hay que diseñar: **si algo falla después de `Respuesta`, el navegador ya recibió "OK"**. Sin este capítulo, esos fallos son silenciosos.

## 22.1 · Try / Catch / Finally con Scopes

```
Scope  Try        ← Create item, loops de adjuntos y checklist
Scope  Catch      ← Configure run after: has failed + has timed out (+ is skipped)
Scope  Finally    ← Configure run after: TODAS (succeeded, failed, skipped, timed out)
```

- **Configure run after** decide en qué estados corre cada acción. Por defecto solo `is successful`.
- `result('Try')` devuelve un arreglo con el resultado de las acciones **de primer nivel** del scope (estado, entradas, salidas, códigos). **No** incluye las anidadas dentro de un `Condition`/`Switch`/loop. Se filtra con **Filter array** sobre `@equals(item()?['status'], 'Failed')`.
- `workflow()` da metadatos de la corrida (entorno, flow, run). Con eso se arma el **link a la corrida** para el mail de error:
  `https://make.powerautomate.com/environments/<env>/flows/<flowName>/runs/<runName>`
  (los valores salen de `workflow()?['tags']?['environmentName']`, `workflow()?['tags']?['logicAppName']` y `workflow()?['run']?['name']`. **Verificalo con un `Compose` en una corrida real** antes de confiar en el link: el esquema de `workflow()` está en la doc de error handling).

**Qué hacer en `Catch`, dado que ya se respondió 200:**

1. **No** intentar un `Response` (ya se envió; sería un error de "response already sent").
2. Mandar un correo al buzón de soporte con: folio (`varFolio`), acción fallida (`Filter array` sobre `result('Try')`), y el link a la corrida.
3. Opcional y muy útil: escribir una fila en una lista `ErroresFlow` (folio, acción, mensaje, fecha `utcNow()`), para poder **reconciliar** contra la lista principal.
4. Terminar con **Terminate → Failed** (ver 22.2).

> ⚠️ **Un `Catch` que se ejecuta con éxito deja la corrida en `Succeeded`.** Para que Run history, las analíticas y el correo automático de fallas del dueño (§13) vean el error, el `Catch` tiene que terminar con `Terminate` en estado **Failed** (con código y mensaje). Si no, tapaste el error: la corrida se ve verde y nadie se entera.

## 22.2 · `Terminate` no es `Response`

| | `Response` | `Terminate` |
|---|---|---|
| Qué hace | Contesta la solicitud HTTP al cliente | Detiene la corrida con estado Succeeded / Failed / Cancelled |
| Se puede usar después de responder | No (una sola respuesta) | Sí |
| Uso en este pipeline | 200 temprano, 401 del `Check_key`, 409/4xx de guardas | Cerrar el `Catch` como Failed; cortar tras un `Response` de error |

Regla de §20.4 que sigue valiendo: **toda rama termina en `Response`**, o el cliente recibe un `202` silencioso.

## 22.3 · Concurrencia

- **Apply to each** corre **en secuencia por defecto**; se puede subir de 1 a 50. Anidados: solo el de más afuera admite paralelismo.
- **Adjuntos → siempre 1** (varios `Add attachment` en el mismo ítem dan `Save Conflict`, §9). **Checklist hijo → subir**, es independiente por fila (el template usa 20; más de eso rara vez acelera y sí dispara 429 en SharePoint, §21.5).
- **Concurrencia en el trigger**: viene apagada. Encenderla es **irreversible sin recrear el trigger** (o el flow). Además, con concurrencia encendida hay una cola de espera acotada; si se llena, los disparos extra **pueden perderse o reintentarse sin garantía**. Para un endpoint público con ráfagas (varios inspectores enviando a la vez) **dejarla apagada**, que es lo que documenta Microsoft para que "todos los triggers generen una corrida".
- Si necesitás serializar una escritura crítica (por ejemplo generar un folio correlativo), no lo resuelvas con concurrencia del trigger: hacelo con una fila contador con ETag/`If-Match` o con un identificador único generado en cliente (ver 22.4).

## 22.4 · Reintentos e idempotencia

- Por defecto, las acciones que soportan política de reintento usan una **exponencial de hasta 4 reintentos**, con intervalos acotados (del orden de 5 a 45 s). Reintenta ante **408, 429 y 5xx**; un **400** no se reintenta nunca.
- Se configura por acción: Settings → **Retry policy** (Default / None / Fixed / Exponential). Para llamadas a SharePoint por `Send an HTTP request` o a servicios externos, **fijar una política explícita** en lugar de depender del default.
- **El riesgo real es duplicar.** Si `Create item` se reintenta después de un timeout donde SharePoint sí había creado el ítem, aparece el **mismo folio dos veces**. Contramedidas, de menos a más costosa:
  1. El folio lo genera la **SPA** (UUID/timestamp+aleatorio) y se incluye en el payload; el flow lo usa como clave.
  2. Antes de crear: `Get items` con `$filter=Folio eq '<folio>'` y `Top Count = 1`. Si existe, **no crear** y devolver el existente.
  3. Columna `Folio` **indexada y con valores únicos** (Enforce unique values) en la lista: SharePoint rechaza el duplicado.
- Ponerle `None` a las acciones no idempotentes es una decisión válida si preferís fallar fuerte antes que duplicar; documentarlo.

## 22.5 · Un `Foreach` con una falla manejada igual queda `Failed`

Si dentro del loop una acción falla y la manejás con su propio `run after`, **el contenedor del loop igual queda marcado como Failed**. Lo que viene después con `run after = Succeeded` **se saltea** (`ActionSkipped`), por ejemplo el `Send_email`.

- Si el éxito parcial es aceptable: el paso siguiente corre después de `Succeeded` **y** `Failed`, e incluye un resumen de errores.
- Si el loop es todo-o-nada: envolver el trabajo riesgoso en un **Scope** y resolver éxito/fallo en el borde del Scope.
- Diagnóstico: mirar el estado de la acción padre (loop) **y** de las hijas de la iteración que falló.

## 22.6 · Datos sensibles: entradas y salidas seguras

Activar **Secure inputs** y **Secure outputs** (Settings → Security) hace que el contenido no aparezca en Run history ni en los logs de auditoría. Usarlo en:

- Acciones que tocan el **PIN** o tokens (§19.4) y en el propio trigger si el payload los trae.
- Compose / Set variable que arman credenciales o cabeceras `Authorization`.
- Datos personales (documento, domicilio) que no deban quedar en el historial.

Costo: **depurar se vuelve más difícil**, porque justo lo que tapaste es lo que hubieras mirado. Aplicarlo solo donde corresponde, y anotar en `Flow-*.md` cuáles acciones lo tienen.

## 22.7 · Trampas de expresiones que causan fallas de datos (no de sintaxis)

| Síntoma | Causa | Arreglo |
|---|---|---|
| `InvalidTemplate` … *function 'split' expects its first argument 'text' to be of type string* | Llegó `null` a una función de texto | `coalesce(item()?['Nombre'], '')` o guarda `not(empty(...))` |
| `InvalidTemplate` … *is of type 'Null'* | Nombre de propiedad distinto (mayúsculas/minúsculas) al del payload | Copiar el nombre desde el **Inputs del trigger** en Run history. Las claves distinguen mayúsculas |
| `… expected type 'Array' but got type 'Object'` | Objeto donde va una lista (respuesta única vs lista OData) | `body('X')?['value']` para listas OData; `createArray(...)` para envolver un objeto |
| Registros con campos `null` tras unir dos arreglos | `union(a, b)` conserva el **primero** en las coincidencias | `union(nuevos, viejos)`, nunca al revés |
| Un `Filter array` devuelve el registro equivocado o vacío | La clave de búsqueda es `null`/vacía y coincide con filas que también tienen `null` | Guarda de no-vacío antes del filtro, normalizar con `trim()`/`toLower()`, rama explícita para "sin coincidencias" |
| Solo la primera fila del arreglo se usa | Se tomó `first()` sin verificar la longitud | `length(body('Filter'))` primero |

(Para `Choice`/`Hyperlink` que llegan como objeto **o** como cadena y para `PatchItem`, ver §20.4.)

## 22.8 · Filas nuevas para el catálogo de errores (§17)

| Síntoma | Causa | Fix |
|---|---|---|
| La SPA recibe 401/403 y Run history está vacío (flow recién creado) | Trigger en "Any user in my tenant" (default nuevo) | Cambiar a **Anyone** (§21.1) |
| `DirectApiAuthorizationRequired` | Conector Premium sin licencia adecuada en dueño/flow | Premium al dueño o Process al flow (§21.2) |
| 429 *Rate limit is exceeded* en acciones de SharePoint | Límite del conector (~600/min por conexión) | Bajar concurrencia; repartir carga; Process (§21.5, §22.3) |
| El flow "dejó de andar" sin cambios; aparece apagado | Fallas continuas 14 días o sin uso 90 días (§21.3) | Reactivar y probar; licencia que exente; monitoreo |
| 502/504 `ResponseTimeout` en la SPA | La respuesta tardó más de 120 s | `Respuesta` antes de los loops; reducir peso (§21.4) |
| La corrida figura `Succeeded` pero faltan adjuntos/ítems hijos | `Catch` manejó el error y no terminó en `Failed` | `Terminate → Failed` al final del Catch (§22.1) |
| No salió el correo final aunque los ítems se crearon | Un `Foreach` con falla manejada quedó `Failed` y el correo exige `Succeeded` | §22.5 |
| Mismo folio duplicado en la lista | Reintento de `Create item` tras timeout | Folio del cliente + chequeo previo + columna única (§22.4) |
| `Get items` devuelve solo 100 filas | Default de 100 con `Top Count` sin subir / sin paginación | §23.1 |
| `Get items` con filtro devuelve vacío en lista grande | Umbral de 5.000: el filtro solo mira las primeras 5.000 | Indexar la columna y activar Pagination (§23.2) |
| `ConnectionAuthorizationFailed` / `InvalidConnectionCredentials` | Conexión de otro usuario, o token vencido | Reparar/reautorizar la conexión en el entorno; usar conexiones de una cuenta de servicio estable (§9 "Connector authorization expires") |

## Fuentes (Microsoft Learn)

- *Employ robust error handling* (Scopes, run after, `result()`, `workflow()`, retry policy) — `learn.microsoft.com/power-automate/guidance/coding-guidelines/error-handling`
- *Handle workflow errors and exceptions in Azure Logic Apps* (política de reintento por defecto) — `learn.microsoft.com/azure/logic-apps/error-exception-handling`
- *Optimize flows with parallel execution and concurrency* — `learn.microsoft.com/power-automate/guidance/coding-guidelines/implement-parallel-execution`
- *Optimize Power Automate triggers* (concurrencia del trigger) — `learn.microsoft.com/power-automate/guidance/coding-guidelines/optimize-power-automate-triggers`
- *Secure data used in cloud flows* — `learn.microsoft.com/power-automate/guidance/coding-guidelines/use-secure-inputs-outputs-triggers`
