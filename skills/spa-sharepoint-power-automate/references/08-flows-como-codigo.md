<!-- spa-sharepoint-power-automate · references/08-flows-como-codigo.md · secciones §20 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 20 · Flows como código: generar, aplicar y depurar sin el diseñador

> **Aviso de soporte (2026-09-24).** La API `api.flow.microsoft.com` que usa §20.2 **no está soportada por Microsoft**: se usa bajo tu propio riesgo y puede cambiar sin aviso. Microsoft tampoco soporta administrar por código los flows sueltos (*Mis flujos*). Sirve para **iterar rápido en desarrollo**; para producción, pasá el flow a una solución y usá el camino soportado de **§26** (PAC CLI y tabla `workflow` de Dataverse).

Power Automate no tiene API pública de creación, y de ahí sale la conclusión equivocada de que
hay que armar todo a clics. **Sí hay dos caminos programáticos**, y para un flow de más de ~20
acciones los dos son mejores que el diseñador:

1. **Paquete `.zip` de importación** — se arma el `definition.json` y se importa desde la UI.
2. **API de administración** — `PATCH` de la definición directo sobre el flow. Sin navegador.

El diseñador es el peor lugar para un flow grande: las expresiones van en un editor Monaco
embebido en un panel que se re-monta, el selector de contenido dinámico tapa el campo, y los
combos de columna de SharePoint aceptan clics antes de terminar de cargar. Un flow de 200
acciones son horas, y cada expresión es una oportunidad de que quede como texto plano.

Con un generador, el patrón se escribe una vez y se instancia. Un flow HTTP con un conmutador
de 17 casos es ~90% repetición: leer la fila, validar el estado de origen, escribir, responder.

## 20.1 · Estructura del paquete de importación

Calcada de un export real. **El export real NO trae `[Content_Types].xml`.**

```
manifest.json                                  <- manifiesto del paquete
Microsoft.Flow/flows/manifest.json             <- índice de assets (OJO: adentro de flows/)
Microsoft.Flow/flows/<RESOURCE_ID>/definition.json
Microsoft.Flow/flows/<RESOURCE_ID>/apisMap.json
Microsoft.Flow/flows/<RESOURCE_ID>/connectionsMap.json
```

`definition.json`:

```jsonc
{
  "name": "<FLOW_GUID>",
  "id": "/providers/Microsoft.Flow/flows/<FLOW_GUID>",
  "type": "Microsoft.Flow/flows",
  "properties": {
    "apiId": "/providers/Microsoft.PowerApps/apis/shared_logicflows",
    "displayName": "MI-FLOW",
    "definition": {
      "$schema": "https://schema.management.azure.com/providers/Microsoft.Logic/schemas/2016-06-01/workflowdefinition.json#",
      "contentVersion": "1.0.0.0",
      "parameters": {
        "$connections":    { "defaultValue": {}, "type": "Object" },
        "$authentication": { "defaultValue": {}, "type": "SecureObject" }
      },
      "triggers": { "manual": { "type": "Request", "kind": "Http",
                    "inputs": { "method": "POST", "triggerAuthenticationType": "All" } } },
      "actions": { },
      "outputs": {}
    },
    "connectionReferences": {
      "shared_sharepointonline": {
        "connectionName": "shared-sharepointonl-<GUID DE LA INSTANCIA>",
        "source": "Embedded",
        "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
        "tier": "NotSpecified",
        "apiName": "sharepointonline",
        "isProcessSimpleApiReferenceConversionAlreadyDone": false
      }
    },
    "flowFailureAlertSubscribed": false,
    "isManaged": false
  }
}
```

`connectionName` tiene que ser el nombre de la **instancia de conexión del entorno**, no el del
conector. Sale de un export real (`properties.connectionReferences[].connectionName`). Con un
placeholder el flow importa pero no se deja activar: *"Algunas de las conexiones todavía no
están autorizadas"*.

**Un paquete no puede autorizar una conexión.** La conexión es un objeto del entorno con su
propio token OAuth; el paquete solo la referencia por nombre. Si el conector de Outlook no
autoriza para esa cuenta, ningún `.zip` lo arregla — conviene generar una variante `--sin-mail`
que saque las acciones de correo y **toda** la dependencia (`definition`, `manifest`,
`apisMap`, `connectionsMap`), para poder probar el resto.

Zipear con .NET, no con `Compress-Archive`: los corchetes de nombres tipo `[Content_Types].xml`
se interpretan como comodines y el archivo queda afuera.

```powershell
Add-Type -AssemblyName System.IO.Compression.FileSystem
$a = [System.IO.Compression.ZipFile]::Open($zip, 'Create')
foreach ($f in (Get-ChildItem -LiteralPath $src -Recurse -File)) {
    $rel = $f.FullName.Substring($src.Length + 1).Replace([char]92, [char]47)
    $e = $a.CreateEntry($rel, [System.IO.Compression.CompressionLevel]::Optimal)
    $o = $e.Open(); $b = [System.IO.File]::ReadAllBytes($f.FullName)
    $o.Write($b, 0, $b.Length); $o.Dispose()
}
$a.Dispose()
```

## 20.2 · La API de administración: leer historial y escribir la definición

> **Alcance y uso responsable.** Es el mismo token delegado de §18.1: solo puede hacer lo que tu usuario ya puede hacer sobre **tus** flows. Es visible en los logs de Entra, puede estar bloqueado por la política de tu organización, y el refresh token se trata como una credencial. Confirmá que tu organización lo permite antes de usarlo, y para producción preferí una app registrada con permisos aprobados.

Es el multiplicador. Con esto se puede iterar sin navegador: aplicar, ejecutar, leer el error
exacto, corregir, repetir — todo desde la terminal.

**El token sale del mismo refresh token de SharePoint.** El endpoint v1 de Azure AD emite
tokens multi-recurso: se canjea el mismo refresh token cambiando `resource`.

```powershell
$tok = (Invoke-RestMethod -Method POST `
  -Uri "https://login.microsoftonline.com/common/oauth2/token" `
  -Body "grant_type=refresh_token&client_id=$ClientId&refresh_token=$rt&resource=https://service.flow.microsoft.com/"
).access_token
```

El **id de entorno** sale del hostname del trigger. `defaultc38fb93524344848b2fd87b45ff425.90…`
→ `Default-c38fb935-2434-4848-b2fd-87b45ff42590` (sacar el punto y formatear como GUID).

```powershell
$base = "https://api.flow.microsoft.com/providers/Microsoft.ProcessSimple/environments/$envId/flows"

# Listar (el id de la API NO es el workflow-id de la URL del trigger)
Invoke-RestMethod -Uri "$base?api-version=2016-11-01" -Headers $h

# Definición viva
Invoke-RestMethod -Uri "$base/$flowId`?api-version=2016-11-01&`$expand=properties.definition" -Headers $h

# Historial + error por acción  ← lo más valioso
$runs = Invoke-RestMethod -Uri "$base/$flowId/runs?api-version=2016-11-01" -Headers $h
$det  = Invoke-RestMethod -Uri "$base/$flowId/runs/$($runs.value[0].name)?api-version=2016-11-01&`$expand=properties/actions" -Headers $h
$det.properties.actions.PSObject.Properties |
  Where-Object { $_.Value.status -eq 'Failed' } |
  ForEach-Object { "{0}: {1}" -f $_.Name, $_.Value.error.message }

# Escribir definición
$payload = @{ properties = @{ definition = $def; connectionReferences = $conns } } | ConvertTo-Json -Depth 60
Invoke-RestMethod -Method PATCH -Uri "$base/$flowId`?api-version=2016-11-01" `
  -Headers ($h + @{ 'Content-Type' = 'application/json' }) `
  -Body ([Text.Encoding]::UTF8.GetBytes($payload))
```

> **Bajar la definición viva a un archivo antes de cada PATCH.** Es el único rollback.

**El workflow-id de la URL del trigger no es el id del flow en la API.** Buscar por
`displayName` en el listado.

Regla de trabajo: **ante cualquier fallo, leer el historial antes de tocar nada.** Adivinar la
causa cuesta una vuelta completa de generar → empaquetar → importar → probar. Leer el error
cuesta una llamada y dice el nombre exacto de la acción y el mensaje del motor.

## 20.3 · Nombres duplicados: la importación aterriza en el flow equivocado

Al importar con **Actualizar**, el selector lista los flows **por nombre**. Con dos flows del
mismo nombre no hay forma de distinguirlos, y la importación puede caer en el otro. Reporta
*"El flujo se actualizó correctamente"* y el que se ejecuta queda intacto.

El síntoma es desconcertante: se arregla un bug, se importa, y el historial sigue mostrando la
expresión vieja. Se pierden vueltas arreglando algo que ya estaba bien.

- Antes de importar con Actualizar, listar los flows por API y confirmar que hay **uno solo**
  con ese nombre.
- Si quedó un duplicado de una prueba anterior, renombrarlo (`PATCH` de `displayName`) antes de
  seguir.
- Verificar siempre **después** de aplicar: bajar la definición viva y buscar una marca del
  cambio. No confiar en el mensaje de éxito.

## 20.4 · Trampas del lenguaje de expresiones y del conector

### `?['Value']` sobre una cadena revienta el `Select` entero

**La más cara.** El conector de SharePoint devuelve la misma columna como objeto
(`{"Value":"FKT"}`, `{"Url":"https://…"}`) **o como cadena pelada**, según cómo se haya escrito
la fila. Escribir `item/LinkUbicacion` en vez de `item/LinkUbicacion/Url` la guarda como texto y
vuelve como texto.

```
The template language expression 'item()?['LinkUbicacion']?['Url']' cannot be evaluated
because property 'Url' cannot be selected. Property selection is not supported on values
of type 'String'.
```

Adentro de un `Select` eso tumba la acción entera → el flow termina sin llegar a ninguna
`Respuesta` → el navegador ve **502 NoResponse**. Y el síntoma engaña: **anda con cero filas y
falla apenas hay una**.

No alcanza con preguntar si está vacío — hay que distinguir **objeto de cadena**. `string()`
serializa el objeto a JSON, así que un `{` inicial es la única señal confiable:

```
if(startsWith(string(X), '{'), json(string(X))?['Value'], string(X))
```

| Valor real | Camino | Resultado |
| --- | --- | --- |
| `{"Value":"FKT"}` | empieza con `{` | `FKT` |
| `"https://…"` | no empieza con `{` | la cadena tal cual |
| `null` / vacío | `string()` → `''` | `''` |

Con default, **no usar `coalesce`**: solo salta `null`, y SharePoint devuelve `''` en las
columnas vacías. `if(empty(X), 'DEFECTO', X)`.

### `PatchItem` y `PostItem` exigen TODAS las columnas obligatorias

Incluida `Title`, que es obligatoria de fábrica en SharePoint. El swagger de la operación las
marca requeridas aunque el patch no las cambie:

```
OpenApiOperationParameterValidationFailed
Input parameter 'item' validation failed: 'PatchItem' is missing required property 'item/Title'.
```

Falla **en la importación**, antes de ejecutarse. Reenviar el valor actual de la fila —
mandar `''` la borraría:

```js
'item/Title': "@first(body('Obtener_x')?['value'])?['Title']",
```

**El importador reporta un error por intento.** Si la lista tiene cuatro columnas obligatorias,
son cuatro vueltas. Mandarlas todas de una: consultar el contrato de la lista y agregar cada
`required` al patch.

### `Inicializar variable` solo en la raíz

No se puede adentro de un `Conmutador`, una `Condición` ni un `Aplicar a cada uno`. Todas las
variables se declaran arriba y adentro se usa `Establecer la variable`. Condiciona el diseño de
cualquier generador: hay que juntar el set completo de variables de todos los casos.

### Toda rama termina en `Respuesta`

Un camino sin `Respuesta` devuelve **202 Accepted sin cuerpo**. El cliente lo lee como éxito con
datos vacíos: `r.ok` es `true`, `r.data.items` es `undefined`, y la pantalla muestra "no hay
nada" en vez de un error. Es el modo de falla más caro de diagnosticar porque **no parece una
falla**. Incluye el caso `default` del conmutador.

### Nombres de acción únicos en TODO el flow

No por ámbito. Dos acciones con el mismo nombre importan igual, el diseñador las muestra, y
`body('X')` resuelve a cualquiera de las dos. En un generador, sufijar por caso
(`Obtener_traslado_tomar`).

### `if()` cortocircuita: la rama sin datos no valida la rama con datos

`if(equals(length(X), 0), 's/d', concat(string(div(...)), '%'))` — la rama falsa **no se
evalúa** cuando la condición da verdadero. Un error de sintaxis ahí adentro (paréntesis mal
cerrado, función con parámetros de más) **no aparece** mientras el conjunto venga vacío.

El caso concreto: un `'%'` que quedó dentro de `string()` en vez del `concat()` de afuera.
Contra un mes sin filas el flow corría `Succeeded`; contra un mes con filas moría con
*"The template language function 'string' expects one parameter... invoked with '2'"*.

> **Un reporte probado contra un período vacío no está probado.** Hay que correrlo también
> contra un período con datos — y si el flow es mensual/periódico, la forma barata es
> parchear temporalmente las variables de rango, correrlo, y volver a aplicar la definición
> generada. Tres `PATCH` y queda probado de los dos lados.

Vale para todo lo perezoso: `if`, `coalesce`, y las ramas de `Conmutador` que nunca se
tocaron. La sintaxis de una expresión **no se valida al guardar el flow**, solo al ejecutarla.

### Adjuntos de Outlook: el nombre con `/` y el cuerpo vacío tiran el correo entero

Dos fallas distintas, mismo síntoma — el correo no sale y el error **no menciona el adjunto
como causa aunque lo nombre**:

| Qué pasó | Error | Fix |
|---|---|---|
| `concat('traslados-', 'MM/yyyy', '.csv')` | *Bad Request - Attachment name and content bytes cannot be null or empty* | Formato aparte para el archivo: `yyyy-MM`, sin barra. La barra invalida el nombre y el conector lo reporta como "null or empty" |
| `Table` sobre 0 filas devuelve `''` | mismo mensaje | `if(empty(body('Crear_csv')), 'Sin datos en el periodo.', body('Crear_csv'))` |

En los dos casos el `Body` del correo ya estaba perfectamente armado — se puede leer entero
en los `inputs` de la corrida fallida. Eso engaña: parece que el problema está en el envío o
en la casilla, y está en dos caracteres del nombre del archivo.

Corolario del anterior: el mes vacío detecta el segundo y **esconde** el primero; el mes con
datos, al revés. Hay que correr los dos.

### Validar antes de empaquetar

Un generador puede chequear en segundos lo que el importador tarda una vuelta en decir. Vale la
pena que **salga con código ≠ 0**:

- nombres de acción duplicados
- casos del conmutador sin `Respuesta`
- `PatchItem`/`PostItem` sin las columnas obligatorias de esa lista
- `?['Value']` / `?['Url']` sin la guarda de tipo
- `runAfter` que apunta a una acción que no existe en el mismo ámbito
- `variables('x')` sin su `InitializeVariable`
- `InitializeVariable` anidado
- la cadena `undefined` en el JSON (bug del generador, no del flow)
- nombres de adjunto armados con un formato de fecha que lleva `/`
- paréntesis desbalanceados dentro de `@{...}` (barato de chequear contando, y es
  exactamente lo que el cortocircuito de `if` esconde hasta que hay datos)

## 20.4b · El chequeo de deriva necesita DOS afirmaciones, no una

Con los flows como código aparecen dos derivas distintas, y cada una necesita su chequeo:

| Deriva | Cómo se ve | Qué la detecta |
|---|---|---|
| El generador ya no produce lo commiteado | alguien tocó el generador y no regeneró | regenerar y comparar contra `HEAD` |
| Alguien editó un `definition.json` a mano | "lo arreglé rápido en el diseñador y bajé el JSON" | comparar el **árbol de trabajo** contra `HEAD` |
| Producción no coincide con el repo | alguien arregló algo en el diseñador, sin bajar nada | bajar las definiciones vivas y comparar |

La trampa está en la segunda. El chequeo obvio —regenerar y comparar la salida contra `HEAD`—
**no la detecta**: el generador pisa la edición a mano antes de comparar, la comparación da
verde, y el chequeo pasa justo después de haber tapado el cambio que tenía que denunciar.

> Un chequeo que destruye la evidencia antes de mirarla es peor que no tenerlo: da la
> confianza sin dar la garantía.

Las dos afirmaciones juntas:

```js
// A · lo que producen los generadores == HEAD
//     sobre una COPIA, para no pisar el arbol mientras B lo mira
cpSync(PAQ, COPIA, { recursive: true });
for (const g of generadores) execFileSync(process.execPath, [g], { cwd: COPIA });
// ...comparar cada .json de la copia contra `git show HEAD:<ruta>`

// B · el arbol de trabajo == HEAD   <- esta es la que ve la edicion a mano
const sucios = git('status', '--porcelain', '--', 'paquetes/TR-*');
```

Comparar contra `HEAD` y no contra el disco: si el árbol viene sucio, comparar contra el
disco compara el cambio consigo mismo y no dice nada.

**Probar que el chequeo falla cuando tiene que fallar.** Meter una acción a mano en un
`definition.json` y confirmar que sale con código ≠ 0. Un chequeo verde que nunca se vio en
rojo no prueba nada — es exactamente el caso de los dos bugs que se cancelaban.

### Comparar contra producción: sacar el ruido del servidor

Power Automate agrega campos propios al guardar. Sin filtrarlos, **los diez flows figuran
distintos** y la comparación deja de servir:

```js
const RUIDO = new Set(['metadata', 'evaluatedRecurrence', 'operationOptions', 'runtimeConfiguration']);
```

Y comparar la definición **entera**, no las acciones de la raíz: un flow con 20 acciones en
la raíz puede tener 203 contando las anidadas. Ordenar las claves antes de serializar — dos
JSON equivalentes con las claves en otro orden no son un cambio.

Los paquetes viejos sin flow vivo hay que borrarlos, no tolerarlos: dejan el chequeo en rojo
para siempre y **un chequeo siempre rojo no lo mira nadie**.

## 20.5 · Trampas del cliente PowerShell

### `-UseBasicParsing` o `NullReferenceException` en cada 200 con cuerpo

Windows PowerShell 5.1 pasa la respuesta por el motor de Internet Explorer para armar
`ParsedHtml`. Con un cuerpo JSON grande explota con *"Referencia a objeto no establecida"* —
que no se parece en nada a un problema de parseo:

```
FALLA listar (token y PIN correctos)   HTTP 0
      Referencia a objeto no establecida como instancia de un objeto.
```

Y engaña doble: los `4xx` pasan porque traen cuerpos chicos, así que **parece que fallan justo
los casos que funcionan**. En PS 7 el flag se acepta y se ignora, así que va siempre.

### `$h` y `$H` son la MISMA variable

PowerShell no distingue mayúsculas en nombres de variable. En un script que habla con dos
APIs es fácil terminar con `$H` para los headers de la app y `$h` para el token de Flow: el
segundo pisa al primero y el POST sale con **dos esquemas de autorización**:

```text
DirectApiRequestHasMoreThanOneAuthorization
The request has SAS authentication scheme, 'Bearer' authorization scheme or
internal token scheme. Only one scheme should be used.
```

El error no menciona variables ni el script: parece un problema de la URL del trigger. Mismo
mecanismo que el clásico `$f` / `$F`. **Nombres largos y distintos** (`$hApp`, `$hFlow`), no
la misma letra en otra caja.

### `ConvertFrom-Json -AsHashtable` con listas de SharePoint

Una lista puede devolver `Id` e `ID` a la vez. `ConvertFrom-Json` de PS 7 es
case-insensitive y aborta:

```
Cannot convert the JSON string because it contains keys with different casing.
The key that was attempted to be added to the existing key 'Id' was 'ID'.
```

Peor: `Invoke-RestMethod` se come el error y **devuelve el JSON como String**, así que
`$r.value` es `$null` y parece que la lista está vacía. Usar `Invoke-WebRequest` +
`ConvertFrom-Json -AsHashtable`.

### `$filter` con espacios

`Title eq 'X'` sin codificar puede devolver vacío en vez de error. Codificar, o traer las filas
y filtrar en el cliente cuando son pocas.

## 20.6 · Orden de diagnóstico

Ante un flow HTTP que no responde bien:

| Síntoma | Qué es casi siempre |
| --- | --- |
| `502 NoResponse` | una acción falló → el run terminó sin `Respuesta`. **Leer el historial.** |
| `202` sin cuerpo | hay un camino sin acción `Respuesta` |
| `400 OpenApiOperationParameterValidationFailed` al importar | falta una columna obligatoria en un `PatchItem`/`PostItem` |
| Anda con 0 filas, falla con 1 | selección de propiedad sobre un valor que no es objeto |
| Se importa "correctamente" pero nada cambia | la importación fue a otro flow con el mismo nombre |
| Un 4xx esperado aparece como `HTTP 0` | falta `-UseBasicParsing` en el cliente |

Y la regla que las cubre a todas: **el historial de ejecuciones dice el nombre de la acción y el
mensaje del motor.** Leerlo primero cuesta una llamada; adivinar cuesta una vuelta entera.

## 20.7 · Probar un flow HTTP de punta a punta sin navegador

Un flow con máquina de estados se prueba con una secuencia, no con llamadas sueltas. Conviene
**snapshot → ciclo → verificar → restaurar**, para que la prueba no ensucie los datos:

1. Bajar la fila de prueba por REST y guardarla en un JSON.
2. Prepararla (los campos que el flow espera y que quizá nunca se cargaron).
3. Correr la secuencia completa afirmando el **código HTTP esperado** en cada paso — incluidos
   los `409` de doble tap y los `403` de rol, que son la parte que de verdad hay que probar.
4. Verificar en SharePoint lo que el flow calculó del lado servidor (no lo que devolvió).
5. Restaurar la fila desde el snapshot y borrar las filas hijas creadas.

Lo que **no** se puede probar así: guardas con piso de tiempo real (un "mínimo 15 minutos"
solo devuelve su `409`), y que los mails lleguen de verdad.
