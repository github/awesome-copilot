<!-- spa-sharepoint-power-automate · references/07-pwa-operativa.md · secciones §19 -->
<!-- Contenido movido tal cual desde el SKILL.md monolítico (2026-09-24). Índice: ../SKILL.md -->

# 19 · PWA operativa: pantallas que se usan en la calle

Cuando la SPA deja de ser un formulario que alguien completa sentado y pasa a ser una
**herramienta de campo** —un chofer con una mano en el volante, un inspector bajo el sol, un
operario con guantes— cambian las reglas. Todo esto salió de construir el ciclo del chofer de
una app de traslados.

El patrón sigue siendo el de §1: HTML estático + token por URL + trigger HTTP. Lo que se
agrega es qué se rompe cuando la pantalla se usa en movimiento.

## 19.1 · Nunca leer globals en el top-level de un módulo ES

**El bug más caro de este tipo de página, y es invisible en desarrollo.**

Patrón roto — parece razonable y falla siempre:

```html
<script type="module">
const FLOW_URL = "https://...";
window.FLOW_URL = FLOW_URL;            // (2) esto corre DESPUES
import { llamar } from "./api.js";     // (1) esto se evalua PRIMERO
</script>
```

```js
// api.js
export const DEMO = typeof FLOW_URL !== "string";   // siempre true
```

Los `import` de un módulo ES se **hoistean**: el módulo importado se evalúa completo antes de
que corra la primera línea del cuerpo del `<script>`. Cuando `api.js` calcula `DEMO`, el
`window.FLOW_URL` todavía no existe.

Síntoma en producción: **la app queda en modo demo para siempre** aunque la URL esté bien
puesta. No hay error en consola. En una app de formulario eso significa que nada se envía y
nadie se entera hasta que falta un día de datos.

Fix — config explícita, nunca implícita:

```js
// api.js
let _url = "", _key = "", _init = false;
export function initFlow(url, key) { _url = url ?? ""; _key = key ?? ""; _init = true; }
export function isDemo() { return !_url || _url.indexOf("__URL_") === 0; }
export async function llamar() {
  if (!_init) throw new Error("Falta initFlow() antes de llamar()");
}
```

```html
<script type="module">
import { initFlow, llamar } from "./api.js";
initFlow("https://...", "app-key");     // el cuerpo corre despues de los imports: aca SI
</script>
```

- `DEMO` deja de ser una `const` de módulo y pasa a ser `isDemo()`, evaluada al usarse.
- Cualquier efecto de módulo que dependa de la config (un `setInterval` de demo, por ejemplo)
  se arranca **desde `initFlow()`**, no desde el cuerpo del módulo.
- El `if (!_init) throw` convierte un bug silencioso en un error ruidoso.

**Detección**: buscar `window.` seguido de un `import` más abajo en el mismo bloque. Y probar
el módulo bajo Node con un arnés (§19.6): ahí el global no existe nunca y el bug salta en la
primera llamada.

## 19.2 · `pintar()` vs `tick()`: el repintado por intervalo destruye la pantalla

Cualquier pantalla con un cronómetro tienta a esto:

```js
setInterval(pintar, 1000);              // y pintar() hace $app.innerHTML = ...
```

Reemplazar el `innerHTML` cada segundo:

1. **borra lo que el usuario está tipeando** — un PIN de 4 dígitos se borra a razón de un
   dígito por segundo, y la persona cree que la app está rota;
2. **reemplaza los botones justo cuando los tocan** — el click se pierde entre el `pointerdown`
   y el `pointerup`;
3. **resetea `scrollTop` a 0** — la pantalla "no deja bajar";
4. tira el foco y la selección de texto.

En escritorio pasa desapercibido. En un celular a pleno sol, con el usuario apurado, es
inoperable.

**Separar los dos ciclos:**

```js
function pintar() {          // SOLO en cambio de estado
  $app.innerHTML = plantilla(estado);
  cablearEventos();
}

function tick() {            // cada segundo: solo los nodos que cambian
  if (estado === "ESPERANDO") {
    const $t = document.getElementById("t-transcurrido");
    if ($t) $t.textContent = hhmm(ahora - t0);      // textContent, no innerHTML
    const $b = document.getElementById("b-accion");
    if ($b) { $b.disabled = !habilitado; $b.textContent = etiqueta; }
    return;
  }
  // Un bloque SIN inputs se puede reemplazar entero sin costo:
  const $slot = document.getElementById("crono-slot");
  if ($slot) $slot.innerHTML = bloqueCrono(estado);
}
```

Regla práctica: **si el bloque contiene un `input`, un `textarea` o un botón que el usuario
puede estar tocando, se actualiza por nodo. Si no, se puede reemplazar entero.** Envolver los
bloques puramente informativos en un `div` con id propio deja explícito cuál es cuál.

**Transiciones que cambian la barra de acciones** (un botón que aparece al cruzar un umbral)
necesitan un repintado completo, pero **una sola vez**: detectar el cruce comparando lo que
debería estar con lo que está en el DOM.

```js
const haria = mostrarBoton(estado);
if (haria !== !!document.getElementById("b-extra")) pintar();
```

### El polling repinta igual, y es más difícil de ver

Separar `pintar()` de `tick()` no alcanza si además hay un `setInterval` que consulta al
servidor y repinta con lo que vuelve:

```js
async function refrescar() {
  const r = await api("estado", { folio });
  viaje = r.data.viaje;
  pintar();                     // ← repinta SIEMPRE, aunque no haya cambiado nada
}
```

Con un intervalo de 30 s el usuario pierde lo que estaba tipeando cada medio minuto. Es peor
que el caso del cronómetro justamente porque es esporádico: no se reproduce a pedido, el
usuario reporta "se me borró solo" y no hay forma de creerle.

Guardar una firma del último estado pintado y repintar solo ante un cambio real:

```js
let firmaVista = "";
const firma = (v) => JSON.stringify(v ?? null);

async function refrescar() {
  const r = await api("estado", { folio });
  if (!r.ok) return;
  estado = r.data.item;
  if (firma(estado) === firmaVista) return;      // nada cambió: no tocar el DOM
  pintar();
}

function pintar() {
  firmaVista = firma(estado);
  // ...
}
```

Dos detalles que se pasan por alto:

- **Resetear la firma al entrar a la pantalla** (`firmaVista = ""`). Si no, volver a abrir el
  mismo ítem no repinta y la pantalla queda mostrando la anterior.
- El servidor tiene que devolver una fila **estable**. Si el mapeo incluye un `utcNow()` o un
  contador, la firma cambia siempre y la guarda no sirve para nada.

### En qué estados conviene consultar

El polling no es "cada N segundos siempre". El criterio es **qué tan rápido tiene que enterarse
el usuario de algo que no depende de él**:

| Situación | Ritmo |
| --- | --- |
| Espera una respuesta asincrónica que le bloquea el paso (una autorización, una aprobación) | rápido, ~30 s |
| Puede llegar una cancelación externa y todavía está a tiempo de reaccionar | lento, ~2-3 min |
| Ya no puede reaccionar: la novedad se muestra pero no cambia lo que tiene que hacer | no consultar |

Cada consulta es una ejecución de Power Automate. Preguntar cada 30 s en todos los estados,
por cada usuario activo, quema la cuota sin que nadie lo note hasta que el flow empieza a dar
429.

**La trampa**: si agregás una acción que deja al usuario esperando una respuesta (pedir una
autorización) y esa acción solo se puede hacer en un estado donde el polling está apagado, la
respuesta no le llega nunca. Cada vez que aparece un nuevo "pendiente de aprobación", revisar
que su estado esté en la lista de los que consultan.

## 19.3 · Instalable de verdad: manifest, iconos, push y Wake Lock

**El estado no vive en el celular.** El instante de referencia (llegada, inicio de espera) se
guarda en SharePoint y el cliente lo relee. Si el operario bloquea el teléfono, cambia de app
o se le reinicia, al volver el cronómetro muestra el tiempo correcto. `localStorage` guarda
solo credenciales y el último ítem abierto, para poder volver sin el link.

```js
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") refrescar();   // relee del servidor
});
```

**Wake Lock** — que la pantalla no se apague sola mientras espera. Cinco líneas, cero
dependencias, y resuelve el caso más común (el celular apoyado en el tablero):

```js
let lock = null;
async function pantallaOn() {
  try { lock = await navigator.wakeLock.request("screen"); } catch {}
}
document.addEventListener("visibilitychange", () => {
  // El navegador suelta el lock al ocultar la pagina: hay que re-pedirlo.
  if (document.visibilityState === "visible" && !lock && deseado) pantallaOn();
});
```

**Web Push: Power Automate NO puede.** El protocolo exige firmar un JWT **VAPID con ES256**, y
no hay acción de Power Automate que firme ES256. Las salidas reales:

- **OneSignal** (plan gratuito, suscriptores web ilimitados): se dispara desde el flow con una
  acción HTTP común. Targeting por `external_user_id` = el token que ya usás.
- **FCM**: igual de válido, más setup.

> **iOS**: el push **solo funciona si el usuario agregó la PWA a la pantalla de inicio**. Es un
> requisito de Safari, no del diseño. En Android funciona sin instalar. Esto va en la
> capacitación, no es un detalle. Y siempre dejar un canal de respaldo que no dependa del push
> (un mail a quien coordina, que después llama por teléfono).

**iOS ignora los iconos del manifest** para "Agregar a inicio". Sin esto el ícono es una
captura de pantalla:

```html
<link rel="apple-touch-icon" href="./assets/icono-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Nombre corto">
```

**Service worker**: bumpear `CACHE` en cada cambio (§7) y **nunca cachear las llamadas al
flow** — un estado cacheado es peor que un error de red:

```js
if (req.method !== "GET") return;
if (url.hostname.includes("powerplatform.com")) return;
```

**Linters de compatibilidad**: `theme-color`, Wake Lock y Web Push se marcan por Firefox y
Opera. Un `.browserslistrc` con los targets reales (`last 2 and_chr versions`,
`last 2 ios_saf versions`, …) hace que la herramienta evalúe contra lo que se usa. Para
`theme-color` puntualmente, inyectarlo por JS lo saca del HTML estático sin perder el efecto:
el navegador lo lee igual del DOM.

## 19.4 · Seguridad de una superficie operativa pública

El endpoint es público y sin login (§1). Lo que cambia respecto de un formulario de alta es
que acá se registran **hechos con consecuencia económica**: tiempos facturables, entregas,
horas extra. Cuatro reglas, ninguna opcional:

**1 · La hora la pone el servidor, siempre.** Todo sello con `utcNow()` dentro del flow, jamás
un timestamp del payload. Si el cliente manda la hora, el tiempo facturable se infla con el
reloj del teléfono.

**2 · Las guardas de negocio se validan en el flow.** Un botón deshabilitado en el HTML se
saltea con DevTools en diez segundos. Si la regla es "no se puede declarar ausente antes de 15
minutos", el flow compara `HoraLlegada + 15 min` contra `utcNow()` y devuelve `409`. El botón
deshabilitado es comodidad para el usuario, no control.

**3 · Un PIN corto sin bloqueo es decorativo.** Cuatro dígitos son 10.000 combinaciones. El
control es el contador:

| Columna | Tipo | Para qué |
| --- | --- | --- |
| `PinXxx` | Text | el PIN |
| `PinFallidos` | Number | intentos errados consecutivos; se resetea a 0 al acertar |
| `BloqueadoHasta` | DateTime | a los N fallidos = `addMinutes(utcNow(),15)` |

Guarda al principio del flow, **antes** del conmutador de acciones:

```text
less(ticks(utcNow()), ticks(coalesce(<BloqueadoHasta>,'2000-01-01')))  → 429 + Terminar
```

**4 · Transiciones estrictas + `409`.** Cada acción declara su estado de origen esperado; si no
coincide, `409`. Esto hace la API idempotente frente al doble tap (constante con guantes o con
la pantalla mojada) y frente a dos personas operando el mismo ítem. El cliente, al recibir
`409`, **relee el estado y repinta**: manda el servidor, no la pantalla.

**Reparto de credenciales**: si el acceso es *link + PIN*, tienen que viajar por **canales
distintos**. El link en el mail que ya recibe la empresa; el PIN por teléfono. Juntos en el
mismo mail, el PIN no agrega nada: quien intercepte o reenvíe el mail tiene los dos. La
planilla de reparto con los PIN en claro va al `.gitignore`.

**Ser explícito sobre el límite**: quien tenga token y PIN opera. No hay identidad por persona
si el nombre se tipea. La contención es la trazabilidad (qué se tocó, cuándo, desde qué IP) y
el contrato, no un control de acceso. Escribirlo en el spec para que sea una decisión tomada y
no una sorpresa en la primera auditoría.

## 19.5 · Un botón por vez

El error de diseño típico es portar el formulario de escritorio al celular. En campo, la
pantalla muestra **el paso actual y la única acción que corresponde**, en un botón fijo abajo
de 64 px de alto mínimo. Al completarlo, el botón se transforma en el siguiente.

- Contraste alto, nada de grises finos: se usa a pleno sol.
- Área táctil grande y separada: se opera con una mano, a veces con guantes.
- Los datos que definen la operación (silla de ruedas, oxígeno, carga peligrosa) van como
  **banderas visuales arriba**, no en un campo de texto libre que nadie lee.
- `padding-bottom: env(safe-area-inset-bottom)` y `padding-top: env(safe-area-inset-top)`, o el
  notch del iPhone se come el botón.
- `viewport-fit=cover` en el `meta viewport` para que esas variables existan.

## 19.6 · Probar la máquina de estados sin navegador

Un modo demo con el estado en memoria (§2) permite probar el flujo completo antes de que exista
el flow — y además se puede manejar desde Node con un arnés mínimo, que es lo único que
encontró el bug de §19.1:

```js
globalThis.localStorage = { getItem:()=>null, setItem(){}, removeItem(){} };
globalThis.document = { addEventListener(){}, visibilityState:"visible" };
globalThis.navigator = {}; globalThis.window = globalThis;
// el archivo es .js y el repo no tiene type:module -> copiarlo a .mjs temporal
const mod = await import(pathToFileURL(copiaMjs).href);
```

Verificar: cada transición válida, cada transición **inválida** (que devuelva 409), el contador
de intentos del PIN, el piso de tiempo de las guardas, y que un doble tap no duplique sellos.
Son las funciones deterministas y propensas a error de borde; el flow y SharePoint quedan para
el smoke test manual en un teléfono real (§14).

> **Probar en un teléfono de verdad, no en el emulador del navegador.** Wake Lock, push en iOS,
> cámara, y el comportamiento al bloquear la pantalla **no se reproducen en DevTools**.

## 19.7 · Datos maestros para una página anónima

Una página estática pública no puede consultar SharePoint: no tiene sesión. Si el formulario
necesita catálogos (feriados, prestadores, sucursales), va un **flow HTTP GET** que los
devuelve como JSON, cacheado en `localStorage` por 24 h.

Lo importante no es el flow, es la **degradación**: si el endpoint se cae, el formulario tiene
que seguir funcionando con una validación reducida. Un operador que no puede cargar nada porque
se cayó un endpoint de datos maestros es mucho peor que un aviso que no aparece. **Nunca hacer
bloqueante una validación que depende de un maestro remoto.**

**Feriados (Argentina)**: no se calculan, se cargan — se fijan por decreto. Lo que sí es
determinista es la Ley 27.399: los feriados trasladables que caen martes o miércoles pasan al
lunes anterior, y los que caen jueves o viernes al lunes siguiente. Los "puentes" turísticos
salen de otro decreto cada año y hay que cargarlos a mano. Y la columna se escribe a **mediodía
UTC** (§18.5): a medianoche UTC, Argentina los muestra un día antes.

**Consolidar catálogos sucios**: cuando el maestro se extrae de un histórico tipeado a mano, el
mismo ítem aparece escrito de varias formas. Sirve pegar los valores contra un catálogo limpio
que ya exista en el repo, por similitud:

```python
match = difflib.get_close_matches(valor, catalogo_limpio, n=1, cutoff=0.86)
```

Con `0.86` se mergean `CIPOLETTI`/`CIPOLLETI` → `CIPOLLETTI` sin pisar localidades realmente
distintas. **Y emitir un segundo CSV con lo que necesita ojo humano**: cuando el valor más
frecuente no llega a la mitad de las apariciones, elegirlo automáticamente no es un ganador, es
un desempate — que alguien lo confirme antes de importar.
