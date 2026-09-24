<!-- spa-sharepoint-power-automate · references/09-licencias-limites-trigger.md · sección §21 -->
<!-- Nueva (2026-09-24). Datos verificados contra Microsoft Learn ese día; las cifras de cuota cambian, revisar la fuente antes de citarlas. Índice: ../SKILL.md -->

# 21 · Trigger HTTP, licencias, límites y suspensión automática

Lo que hace que un flow que "estaba bien" deje de responder **sin que nadie haya tocado el código**: autenticación del trigger, licencia, límites de la plataforma y apagado automático.

## 21.1 · "Who can trigger the flow": el default nuevo rompe una SPA pública

El trigger `When an HTTP request is received` tiene **tres modos**:

| Modo | Qué exige al llamador | ¿Sirve para la SPA pública? |
|---|---|---|
| **Any user in my tenant** | Token OAuth de Microsoft Entra ID del mismo tenant | No: el navegador de un visitante anónimo no tiene token |
| **Specific users in my tenant** | Token Entra de usuarios o service principals concretos (campo *Allowed users*) | No |
| **Anyone** | Nada: la URL con su firma es la credencial (modo legacy) | **Sí, es el único** |

Microsoft documenta que **"Any user in my tenant" es el default para flows nuevos**. Consecuencia práctica: si armás un flow nuevo desde cero y no cambiás ese campo, la SPA recibe un rechazo de autenticación (401/403) y en general la solicitud se rechaza antes de generar una corrida, así que **Run history queda vacío** mientras el navegador muestra el error (esto último es lo esperable por cómo funciona la autenticación, pero **no lo comprobamos en el tenant propio**: confirmarlo la primera vez que ocurra). Es el primer lugar donde mirar cuando "el flow nuevo no recibe nada".

- Para la SPA pública: **Anyone**, siempre. Ya está en la plantilla de §9 (`Who can trigger the flow | Anyone`) y el paquete de §20.1 lo fija con `"triggerAuthenticationType": "All"`.
- Con Anyone, quien tenga la URL y conozca la forma del JSON puede dispararlo. Eso es lo que asume el modelo de §1: los mitigantes son la validación de `x-app-key`, la forma del payload, el tamaño y las guardas **del lado del flow** (§19.4). Nunca "la URL es secreta".
- Para llamadores **internos** (Power Apps, otro flow, un servicio propio) sí conviene el modo con Entra: cambia "obscuridad" por autenticación real. Guía: *Add OAuth authentication for HTTP request triggers* (ver Fuentes).
- Un flow con "Any user in my tenant" **no es** una alternativa para una SPA sin login; no hay forma de darle al visitante ese token sin autenticarlo.

## 21.2 · Licencia: el trigger HTTP es Premium

`When an HTTP request is received` y la acción `HTTP` son conectores **Premium**. Un flow que los usa sin la licencia adecuada falla con:

> `DirectApiAuthorizationRequired` — *The flow uses a premium connector but the caller doesn't have a premium license.*

y al importar / guardar / activar / editar aparece: *"The user does not have a service plan adequate for the non-Standard connection."*

Reglas de Microsoft que importan acá:

- **Automatizados y programados** corren con la licencia del **dueño** del flow. **Instantáneos** (botón, HTTP request, Power Apps) corren con la del **usuario que invoca**.
- Una licencia de Microsoft 365 "sembrada" **no alcanza** para un flow con conector Premium. Hace falta **Power Automate Premium** (por usuario) o una licencia **Process** (por flow) asignada al flow.
- Un flow hijo con conector Premium puede llevar su propia licencia Process; la del padre **no** cubre al hijo automáticamente. Un *flow group* comparte una entitlement Process entre hasta 25 flows de solución.
- Cuando el llamador es un visitante anónimo (SPA pública) no hay "usuario invocante" al que licenciar. **La salida limpia es una licencia Process asignada al flow** (o que el dueño tenga Premium): confirmarlo con quien administra las licencias antes del pase a producción. No asumir que "funciona porque a mí me anda en pruebas": la prueba corre con tu licencia.

> Si el flow funcionaba y de golpe devuelve `DirectApiAuthorizationRequired`: alguien perdió la licencia (dueño que la cambió, trial de 90 días vencido, licencia reasignada).

## 21.3 · Apagado automático: el flow poco usado se apaga solo

Reglas de retención de Microsoft (verificar vigencia en la fuente):

| Situación | Qué pasa |
|---|---|
| Trigger o acciones que fallan de forma continua | El flow se apaga a los **14 días** |
| Sin actividad de trigger | Puede apagarse a los **90 días**. **No aplica** si el dueño tiene licencia Premium o el flow tiene licencia Process. Avisan al dueño 30 días antes |
| Throttling consistente | Se apaga a los **14 días**; la licencia Process le da capacidad dedicada |

Aplicado al pipeline: una SPA de inspecciones que se usa poco (o un flow de contingencia) puede quedar apagado justo cuando hace falta. Mitigación: dueño con licencia que exente la regla de 90 días, o un chequeo mensual del estado del flow (§13, §20.2), y **el mail de fallas del dueño a un buzón que se lea** (§13).

Después de cualquier apagado: reactivar y **probar de punta a punta** (§20.7). Reactivar no reautoriza conexiones vencidas (§9, "Connector authorization expires").

## 21.4 · Límites de solicitud y respuesta

| Límite | Valor | Qué implica |
|---|---|---|
| Solicitud entrante (trigger HTTP) | **120 s** | Si el flow tarda más en llegar a la acción `Response`, el cliente recibe error de gateway (502/504) aunque el flow siga corriendo y termine bien |
| Acciones **después** de `Response` | Siguen ejecutándose | Por eso `Respuesta` va **antes** de los loops (§9). El límite de duración de una corrida es 30 días |
| Tamaño de mensaje | **100 MB** total, no solo el archivo | El payload es JSON con las fotos en base64, que pesa ~33% más que el binario. Comprimir en cliente (§5) y limitar cantidad (§8) |
| Con *chunking* activado | Hasta 1 GB | Solo en acciones que lo soportan; no aplica al trigger HTTP |
| Apply to each: ítems | 5.000 (perfil Low) / 100.000 | Filtrar antes de iterar, no después (§23) |
| Apply to each: concurrencia | 1 (por defecto) a 50 | Un loop anidado interno siempre corre en secuencia |

El "502 NoResponse" del catálogo de errores (§17) es exactamente el límite de 120 s: la solución es la misma, responder temprano y reducir lo que pesa.

## 21.5 · Throttling: el conector de SharePoint tiene su propio techo

- El conector de SharePoint tiene un límite por **conexión**: ~**600 acciones por minuto**, compartido entre todos los flows que usen esa conexión. Es independiente de la cuota diaria de acciones.
- Al excederlo, la acción falla con **HTTP 429**: *"Rate limit is exceeded. Try again in N seconds."*
- Hay además un techo de **100.000 acciones en 5 minutos** por flow, independiente de la licencia.
- Bajar la concurrencia del loop (§22.3) es el remedio inmediato. Para volumen sostenido: licencia Process (capacidad dedicada) y repartir el trabajo entre conexiones/flows.
- Fuera del diseñador (scripts de §18/§20) el manejo de 429/503 y `Retry-After` está en §23.4.

## 21.6 · Checklist de salud antes de decir "el flow está listo"

1. Trigger en **Anyone** (nuevo flow ≠ default viejo).
2. Dueño del flow con **Premium** o flow con **Process** asignada (§21.2).
3. `Respuesta` antes de los loops y todas las ramas terminan en `Response` (§9, §20.4).
4. Payload real más grande que espera producción probado contra el límite de 120 s y 100 MB.
5. Conexiones autorizadas por la cuenta correcta (no una personal que se va a rotar).
6. Correo de fallas del dueño → buzón monitoreado (§13).
7. Paquete `.zip` re-exportado y commiteado (§9, "Flow backup").
8. Anotado en el repo **quién es el dueño y qué licencia lo cubre**.

## Fuentes (Microsoft Learn)

- *Add OAuth authentication for HTTP request triggers* — `learn.microsoft.com/power-automate/oauth-authentication`
- *Limits of automated, scheduled, and instant flows* — `learn.microsoft.com/power-automate/limits-and-config`
- *Cloud flow error code reference* (`DirectApiAuthorizationRequired`) — `learn.microsoft.com/power-automate/error-reference`
- *Power Automate licensing FAQ* — `learn.microsoft.com/power-platform/admin/power-automate-licensing/faqs`
- *Understand platform limits and avoid throttling* — `learn.microsoft.com/power-automate/guidance/coding-guidelines/understand-limits`
