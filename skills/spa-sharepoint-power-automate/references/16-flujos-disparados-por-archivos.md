<!-- spa-sharepoint-power-automate · references/16-flujos-disparados-por-archivos.md · sección §28 -->
<!-- Nueva (2026-09-24). Aporte del autor desde la práctica (caso "Maestro de documentos"). Numerado §28 porque §18 corresponde a la sincronización masiva Excel→SP. -->
<!-- Las mediciones y los comportamientos del diseñador son observaciones del caso de origen, no documentación de Microsoft; lo que se verificó contra Microsoft Learn lo dice la línea "Verificado". Índice: ../SKILL.md -->

# 28 · Flujos que se disparan al subir un archivo a SharePoint

Otro patrón del mismo ecosistema: **nadie llama al flow por HTTP**. Alguien sube un archivo a una biblioteca y el flow reacciona (disparador `Cuando se crea o se modifica un archivo (solo propiedades)`, o `Cuando se crea un archivo (solo propiedades)`). Caso de origen: el **Maestro de documentos**, donde la subida de un PDF tiene que reflejarse en el ítem de destino.

Diferencias con el flow HTTP de §9: no hay `Response`, no hay payload que vos controles, el disparador es de **sondeo** y los campos del archivo tienen nombres que engañan.

## 28.1 Campos del disparador: qué trae de verdad cada uno

| Campo | Qué es | Para qué usarlo |
|---|---|---|
| `{Name}` | Nombre **sin extensión** | Solo para mostrar. **No** sirve para buscar el archivo por nombre |
| `{FilenameWithExtension}` | Nombre **con** extensión (`informe.pdf`) | Filtros y comparaciones por nombre de archivo, y nombres de archivos nuevos |
| `{Identifier}` | Identificador del archivo | **Es el que va en las acciones de archivo** (§28.2) |

En una expresión (`fx`) se referencian con llaves dentro del corchete: `triggerBody()?['{FilenameWithExtension}']`, `triggerBody()?['{Identifier}']`. **No confíes en la etiqueta del chip**: abrí una corrida y leé los **Outputs del disparador**. Ahí está lo que llegó de verdad (mismo método que §15).

## 28.2 "Obtener contenido de archivo": el id tiene que ser `{Identifier}`

`Get file content` (**Obtener contenido de archivo**) recibe el **identificador**. Si en el campo *File Identifier* se arma una **ruta a mano** (`concat('/sites/…/', …)`) la acción falla con:

> `Route did not match`

y falla **aunque la ruta sea correcta, con o sin `.pdf`** al final. La causa no es el nombre: es que se le pasó una ruta a una acción que espera un id.

- **Arreglo:** poner `{Identifier}` del disparador en *File Identifier*.
- Si de verdad necesitás trabajar **por ruta**, usá la otra acción del conector: **`Get file content using path`** (Obtener contenido de archivo con la ruta). *Verificado*: el conector tiene las dos acciones, una por identificador y otra por ruta.
- Lo mismo aplica a `Get file metadata` y `Delete file`: piden el identificador del archivo.

## 28.3 Rendimiento: buscar el ítem de destino por nombre

Para encontrar en una lista el ítem que corresponde al archivo subido, el enfoque lento es traer muchos ítems y filtrar dentro del flow. El enfoque rápido es filtrar **en el servidor**:

- Acción `Get items`, **Filter Query**:
  `FileLeafRef eq '<nombre con extensión>'`
- **Top Count = 1**.

Medido en el caso del Maestro de documentos: la corrida pasó de **~11 minutos a menos de 30 segundos**.

Detalles del mismo caso:

- **No hizo falta indexar `FileLeafRef`.** Es una columna de sistema (el nombre del archivo). Esto parece contradecir la regla general de indexar las columnas de filtro (§23.2, §27.3); en bibliotecas muy grandes comprobalo antes de asumirlo.
- **El diseñador no deja cargar `$select`** en esta acción. No pierdas tiempo intentándolo: usá el ítem completo, o consultá por REST si necesitás reducir columnas (§18).
- **Comillas simples en el nombre**: en OData se duplican (`O''Brien.pdf`). En la expresión: `replace(triggerBody()?['{FilenameWithExtension}'], '''', '''''')`.
- Un nombre con acentos, espacios o `#` `&` `%` merece una prueba propia (§28.7).

## 28.4 Diseñador nuevo: dos comportamientos que confunden

- **La vista de código es solo lectura.** No se edita el JSON ahí. Si necesitás cambiar algo que el diseñador no deja (una expresión larga, una acción repetida), el camino es el de **flows como código** (§20 para flows sueltos, §26 para flows de solución), o rehacer el cambio en el panel de la acción.
- **La fila vacía que aparece en una condición no se guarda.** Es una fila de ayuda del diseñador; no cuenta como condición. Borrala para no confundirte al comparar el flow con lo esperado.

## 28.5 "Conexión no válida" con todas las conexiones en "Conectado"

Síntoma: el flow marca **"Conexión no válida"** (o *"Hay una conexión interrumpida para «Cuando se crea o se modifica un archivo (solo propiedades)»"*) mientras el panel de conexiones muestra **todo en Conectado**.

- **Arreglo del caso de origen:** en **cada acción** (y en el disparador), abrir **Cambiar conexión** y elegir la que tiene el **tilde verde**. Guardar. No alcanza con que exista una conexión "Conectada": cada acción guarda su propia referencia.
- Antes de eso, la vía general: **Datos → Conexiones**, buscar la conexión con el aviso y usar el enlace *Reparar* junto a *Estado* (§9, "Connector authorization expires"). *Verificado*: las conexiones se rompen cuando vence la contraseña o cuando una política de la organización hace expirar el token del conector.
- Si el disparador no se reactiva: **guardar el flow, editarlo, guardarlo de nuevo** para que se vuelva a registrar el disparador. *Verificado* (guía de solución de problemas de disparadores).
- Un disparador con error 4xx suele ser algo que corregís vos (conexión cambiada, contraseña vencida, entrada inválida); un 5xx suele ser transitorio.

## 28.6 El disparador tarda en reaccionar

Los disparadores de archivos de SharePoint **no son instantáneos**: Power Automate **consulta periódicamente** si hubo cambios. *Verificado*: en general la corrida ocurre **a los pocos minutos** del cambio, y puede **agrupar varios cambios** en corridas siguientes por el intervalo entre consultas o por ediciones posteriores del mismo archivo.

- Un flow que "no respondió" a los 30 segundos **no está roto**. Esperá algunos minutos y mirá **Historial de ejecución → Todas las ejecuciones** (una *verificación omitida* indica que no se cumplió una condición del disparador).
- **Mover** un archivo entre bibliotecas, o **sincronizarlo** desde el cliente de OneDrive, **no dispara** el flow (no cambia sus metadatos de creación/modificación). *Verificado.* Para probar, subí un archivo **nuevo**.
- Para acelerar la iteración, **no esperes al disparador**: ver §28.7.

## 28.7 Prueba rápida

### Reenviar en vez de esperar

Sobre la **corrida fallida** del historial, usar **Reenviar** (*Resubmit*). Vuelve a ejecutar el flow con las **mismas entradas del disparador**, sin esperar el ciclo de sondeo ni volver a subir el archivo.

Precauciones (Microsoft las señala):

- Reenviar puede **duplicar datos o efectos** (ítems creados, correos enviados). Si el flow ya escribió algo en la corrida original, verificá qué quedó.
- Las entradas siguen siendo las de la corrida original: si el archivo o el ítem **ya no existe o cambió**, el reenvío fallará por otra causa.
- Si cambiaste el flow **después** de la corrida original, considerá cómo afectan esos cambios al reenvío. **Confirmá en la corrida nueva** qué versión corrió (ver §15: comparar hora de la corrida con fecha de modificación del flow).

### Subir un PDF de prueba por REST

Para disparar el flow con un archivo **nuevo** y controlado, sin abrir el navegador (autenticación como en §18.1, sin digest con token *bearer*, §18.5):

```js
// PDF mínimo de prueba (lo abren visores tolerantes; suficiente para disparar el flow)
const pdf = Buffer.from(
  "%PDF-1.1\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\n" +
  "trailer<</Root 1 0 R>>\n%%EOF");

const site   = "https://<tenant>.sharepoint.com/sites/<sitio>";
const folder = "/sites/<sitio>/Shared Documents/<carpeta>";           // ruta relativa al servidor
const name   = `prueba-${Date.now()}.pdf`;                            // nombre único: es un archivo NUEVO cada vez
const url = `${site}/_api/web/GetFolderByServerRelativeUrl('${folder.replace(/'/g, "''")}')` +
            `/Files/add(url='${name}',overwrite=true)`;

const r = await fetch(url, { method: "POST", body: pdf,
  headers: { Authorization: `Bearer ${token}`, Accept: "application/json;odata=nometadata" } });
console.log(r.status, (await r.text()).slice(0, 200));
```

> *Snippet basado en el endpoint estándar `Files/add` de SharePoint REST; no se ejecutó contra un tenant en esta sesión. Probalo en una biblioteca de prueba.* Después de subir, esperá el sondeo (§28.6) o, si ya hay una corrida fallida del mismo tipo, reenviala.

## 28.8 Verificación: un "Correcto" no alcanza

Una corrida en verde solo dice que **ninguna acción falló**. No dice que el resultado sea el correcto (una condición puede haber tomado la rama equivocada, o un `Update item` puede haber escrito otro ítem).

**Consultá siempre el ítem de destino** (con `Get items`/REST, no con lo que devolvió el flow) y comprobá los valores que el flow tenía que escribir (§20.7).

### Checklist de cierre

1. **Historial**: la corrida más reciente es **posterior** a la fecha de modificación del flow (§15) y terminó en *Correcto*.
2. **Ítem de destino leído por separado**: los campos esperados tienen el valor esperado.
3. **Todas las conexiones** (disparador y acciones) con el **tilde verde** (§28.5).
4. **Un archivo nuevo, no reenviado**: subido después del último cambio, dispara solo y termina bien (§28.6, §28.7).
5. **Casos raros del nombre**: acentos, espacios, apóstrofe, sin extensión esperada (§28.3).
6. **Nada duplicado**: si se reenvió o se subió dos veces, no quedaron dos ítems ni dos correos (§22.4).
7. **Paquete del flow exportado y commiteado**, y anotado quién es el dueño de las conexiones (§9, §21.6).

## Fuentes

- *Microsoft SharePoint Connector in Power Automate* (acciones por identificador y por ruta; sondeo del disparador; mover/sincronizar no dispara) — `learn.microsoft.com/sharepoint/dev/business-apps/power-automate/sharepoint-connector-actions-triggers`
- *Troubleshoot Power Automate trigger problems and errors* (conexiones rotas, volver a registrar el disparador) — `learn.microsoft.com/troubleshoot/power-platform/power-automate/flow-run-issues/triggers-troubleshoot`
- *Test cloud flows* (Reenviar y sus precauciones) — `learn.microsoft.com/power-automate/guidance/coding-guidelines/test-cloud-flows`
- Comportamiento del diseñador, mediciones de rendimiento y `Route did not match`: **observación del autor** en el caso Maestro de documentos.
