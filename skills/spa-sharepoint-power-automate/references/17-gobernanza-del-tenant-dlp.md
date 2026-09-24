<!-- spa-sharepoint-power-automate · references/17-gobernanza-del-tenant-dlp.md · sección §29 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn (DLP, IP firewall, acceso condicional, dominios a permitir). Lo no verificado está marcado. Índice: ../SKILL.md -->

# 29 · Gobernanza del tenant: DLP, firewall de IP, acceso condicional y red corporativa

En una empresa, el pipeline SPA → trigger HTTP → SharePoint no depende solo de lo que armás vos: **IT puede bloquearlo con políticas del tenant**, y los síntomas se parecen a bugs de tu flow. Este capítulo sirve para reconocer cada caso y para saber **qué pedirle a IT**.

## 29.1 Políticas de datos (DLP): el trigger HTTP se puede bloquear

Las políticas de datos clasifican cada conector en **Business**, **Non-Business** o **Blocked**. Un conector de *Business* solo se combina con otros de *Business* dentro de un mismo flow.

Verificado en Microsoft Learn:

- Los conectores **`HTTP`**, **`HTTP Webhook`** y **`When an HTTP request is received`** se pueden clasificar (y bloquear) en una política, igual que cualquier otro.
- La guía de Microsoft recomienda **bloquear las operaciones de alto riesgo como HTTP** en entornos con muchos autores, y limitar los conectores no empresariales sobre todo en el **entorno predeterminado**.
- **Los flows hijos comparten una dependencia interna con el conector HTTP**: cómo se clasifique HTTP puede impedir que corran flows hijos en ese entorno.
- Recomendación de Microsoft para conciliar seguridad y uso: **entornos dedicados** donde los autores puedan usar HTTP, con lista de autores restringida.

### Síntomas

| Síntoma | Causa probable |
|---|---|
| Al crear o guardar el flow: *"Looks like this workflow is disabled by your organization"* | Una política de datos bloquea el conector (o una combinación) |
| El flow existía y **dejó de disparar**; al editarlo y guardarlo el verificador de flujos indica que viola una política | El flow quedó **suspendido** por una política nueva o modificada |
| El trigger HTTP funciona en tu entorno de prueba y no en el de la empresa | La política del tenant o del entorno destino es distinta |

### Cómo diagnosticarlo

1. Abrir el flow → **Editar** → **Guardar**: el **verificador de flujos** informa si viola una política.
2. Pedir a un administrador que revise en el **centro de administración de Power Platform** qué política (de tenant o de entorno) lo bloquea.
3. Comparar la clasificación de los tres conectores HTTP entre tu entorno y el de producción.

## 29.2 Firewall de IP: protege Dataverse, no necesariamente tu trigger

El **firewall de IP** de Power Platform limita **desde qué direcciones se accede a Dataverse** y evalúa cada solicitud en tiempo real. Datos verificados:

- Es una función de los **entornos administrados** (*managed environments*) y **no viene activada por defecto**.
- Cubre "cualquier entorno de Power Platform que incluya Dataverse".
- Tiene **modo solo auditoría**: identifica las IP pero permite todo. Microsoft recomienda mantenerlo **al menos una semana** antes de hacerlo cumplir.
- Los cambios tardan unos **5-10 minutos** en aplicarse; admite hasta **200 rangos** CIDR.
- Aviso oficial: si se desactivan *"Allow access for Microsoft trusted services"* y *"Allow access for all application users"*, **algunos servicios que usan Dataverse, como los flows de Power Automate, pueden dejar de funcionar**. Para que los flows sigan andando hay que permitir los *service tags* de las **IP de salida de los conectores administrados**.
- Requiere licencias específicas para los usuarios del entorno (familia Microsoft 365 E5/A5/G5 o equivalentes de Compliance/Information Protection): confirmalo con quien administra las licencias.

> **NO VERIFICADO:** una guía de Microsoft sobre prevención de exfiltración recomienda *"definir las direcciones IP permitidas que pueden acceder al trigger HTTP"*, pero el artículo documentado del firewall de IP habla de **Dataverse**. No hay evidencia en lo consultado de que ese firewall filtre las llamadas anónimas a la URL de un trigger HTTP. Probalo en una prueba antes de asumir cualquiera de las dos cosas, y preguntale a IT qué control tienen realmente configurado.

## 29.3 Acceso condicional y dispositivos

El acceso condicional de Microsoft Entra afecta **cuando se crea o se usa una conexión** (los conectores autentican con una cuenta), **no** a un visitante anónimo que llama al trigger. Mensajes típicos verificados al reparar una conexión:

- *Access has been blocked by Conditional Access policies. The access policy does not allow token issuance.*
- *Device is not in required device state: domain_joined / compliant.*
- *Device object was not found in the tenant directory* / *Device used during the authentication is disabled.*

Esto no es un problema del flow: es de **la cuenta y el dispositivo con el que se autoriza la conexión**. Solución: contactar al administrador del tenant y **reautorizar** la conexión (§9, §28.5). Una **cuenta de servicio** cuyas condiciones de acceso estén definidas de antemano evita que se rompa cada vez que cambia el dispositivo de una persona.

## 29.4 Red corporativa: qué dominios tiene que permitir IT

Si quienes usan la SPA están **detrás de un proxy o firewall corporativo**, el navegador tiene que poder salir hacia el trigger. Microsoft documenta los dominios necesarios para el trigger `When an HTTP request is received`:

| Dominios de salida (HTTPS) | Uso |
|---|---|
| `*.api.powerplatform.com` y `*.logic.azure.com` | Nube comercial |
| `*.api.gov.powerplatform.microsoft.us` y `*.logic.azure.us` | GCC (gobierno EE. UU.) |
| `*.api.high.powerplatform.microsoft.us` y `*.logic.azure.us` | GCC High |
| `*.api.appsplatform.us` y `*.logic.azure.us` | DoD |
| `*.api.powerplatform.partner.microsoftonline.cn` y `*.logic.azure.cn` | 21Vianet (China) |

Síntoma típico cuando falta el permiso: la SPA muestra **"Failed to fetch"** / error de red **solo desde la red de la empresa**, mientras que desde datos móviles funciona. Verificalo antes de tocar el flow.

También aparece este error del propio flow cuando no puede registrar su disparador: *"There is a problem with the flow's trigger"*; Microsoft indica que una causa habitual es que los endpoints del servicio **no estén en la lista de permitidos** de la red.

## 29.5 Qué pedirle a IT (guion corto)

Un pedido concreto y acotado se aprueba más fácil que uno vago:

1. **Entorno dedicado** para las apps de campo (no el predeterminado), con **lista restringida de autores**.
2. En ese entorno, política de datos que permita los tres conectores **HTTP** junto con **SharePoint** y **Outlook** (todos en el mismo grupo), y **filtrado de endpoints** si quieren limitar a qué URL puede llamar HTTP.
3. **Permitir los dominios de §29.4** para la red donde están los usuarios.
4. **Una cuenta de servicio** dueña del flow y de las conexiones, con licencia que corresponda (§21.2).
5. Para acceso por API a SharePoint: `Sites.Selected` en un solo sitio (§32) en lugar de permisos sobre todo el tenant.

## 29.6 Modelo de amenazas: lo que IT ve

Tener una política y respetarla ayuda a las dos partes. Recordá que: las conexiones y el uso de conectores quedan en los **registros de auditoría** de Power Platform y Entra; un flow **fuera del entorno gobernado** o con conectores clasificados distinto puede ser **suspendido** en cualquier momento; y una excepción de IT **por escrito** protege a quien mantiene la app.

## Fuentes (Microsoft Learn)

- *Connector classification* (los 3 conectores HTTP, flows hijos, entornos dedicados) — `learn.microsoft.com/power-platform/admin/dlp-connector-classification`
- *Prevent unauthorized transfer of data* (buenas prácticas de DLP, firewall, acceso condicional) — `learn.microsoft.com/power-automate/guidance/coding-guidelines/prevent-data-exfiltration`
- *IP firewall in Power Platform environments* — `learn.microsoft.com/power-platform/admin/ip-firewall`
- *Troubleshoot Power Automate trigger problems and errors* / *Troubleshoot broken connections in Microsoft Power Platform* — `learn.microsoft.com/troubleshoot/power-platform/power-automate/`
- *IP address configuration for Power Automate* (dominios del trigger HTTP) — `learn.microsoft.com/power-automate/ip-address-configuration`
