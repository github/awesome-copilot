<!-- spa-sharepoint-power-automate · references/18-correo-outlook.md · sección §30 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn (troubleshooting de correo en flows, Exchange Online limits, known issues de conectores). Cálculos derivados marcados. Índice: ../SKILL.md -->

# 30 · Correo desde el flow: conector, límites y trampas

El correo de resumen es el final de casi todos los flows de este pipeline (§9: `Send_email_V2` en la raíz, después de los loops). Es también donde se rompen cosas **en silencio** cuando crece el volumen o el tamaño de los adjuntos.

## 30.1 Qué conector usar

| Conector | Límite documentado |
|---|---|
| **Mail** (genérico) | **100 llamadas por 24 horas** |
| **Office 365 Outlook** | **300 llamadas por 60 segundos** |

Microsoft lo indica textualmente: si "la acción de enviar correo parece atascada", cambiá del conector *Mail* al de *Office 365 Outlook*. Para este pipeline, siempre **Office 365 Outlook** (`Send an email (V2)`).

## 30.2 Tamaño de mensaje y adjuntos

Datos verificados:

- El tamaño **por defecto** de mensaje en Exchange Online es **35 MB para enviar** y 36 MB para recibir. Un administrador puede fijar entre **1 MB y 150 MB**, pero el límite efectivo también depende del cliente.
- Los mensajes que **salen de los centros de datos de Microsoft** llevan un **+33% extra por la codificación**; el máximo pasa de 150 MB a **112 MB**.
- Adjuntos clásicos: hasta **112 MB**; los de OneDrive, hasta 2 GB. Máximo de **250 adjuntos** por mensaje (perfiles de Office 365).
- En los conectores, el contenido de archivo viaja en **base64**: el tamaño real puede ser **30-40% mayor** que el original y, si aplica una regla de tamaño, cuenta el tamaño codificado.
- La acción **Approval** adjunta archivos al correo **hasta 5 MB**; si se pasa, el correo remite al centro de aprobaciones. Un administrador de Dataverse puede subir ese límite (Configuración de correo).

**Cálculo derivado (no es un dato de la documentación):** con el límite por defecto de 35 MB, el total de adjuntos crudos ronda **26 MB** (35 / 1,33). Un flow que adjunta 12 fotos de 3 MB más un PDF puede pasar en pruebas y **fallar en producción** el día que las fotos pesen más. Pautas:

1. No adjuntes las fotos: guardalas en SharePoint (§9) y **enlazalas** en el correo.
2. Si adjuntás el PDF generado, controlá su tamaño (§5) y dejá el resto como enlace.
3. Probá con el **peor caso** (máximo de fotos al tamaño máximo), no con el promedio.

## 30.3 Buzón compartido y "enviar como"

- Para enviar **desde un buzón compartido o lista de distribución**: acción **`Send an email from a shared mailbox (V2)`** con la dirección del buzón. El administrador tiene que **darte permiso** antes. El mensaje queda en la carpeta *Enviados* de ese buzón.
- Error conocido con buzones compartidos: **`Item ID doesn't belong to current mailbox`**. Aparece cuando una acción de correo usa un id de otro buzón; revisá que la acción y el id correspondan al **mismo** buzón.
- Un flow envía **como el dueño de la conexión**. Si la conexión es de una persona, los correos salen con su nombre y se rompen cuando cambie su contraseña o se vaya (§9, §28.5). Usá **cuenta de servicio o buzón compartido** como remitente estable.

## 30.4 Trampas de armado

- **`Apply to each` alrededor de `Send an email`** = un correo por elemento. Para **un solo correo a varios destinatarios**, armá una **cadena de texto** (no un arreglo) con las direcciones separadas por **punto y coma**. *(Verificado en la guía de correo de Power Automate.)*
- El correo **dentro** de un loop se duplica (§9, "Email duplicate trap"): va en la **raíz**, con *run after* solo si tuvo éxito lo anterior.
- El trigger **"cuando llega un correo"** se dispara solo con correo **nuevo**; **mover** un correo de carpeta no lo dispara.
- Imágenes **incrustadas** en el cuerpo (inline): las de Send an email (V2) tienen un límite de tamaño (los foros citan **1 MB**; no está confirmado como límite oficial de adjuntos). Usá enlaces a imágenes o un adjunto real.
- Si el correo no llega: revisar reglas de Outlook que lo muevan, **bandeja Enfocado/Otros**, y que IT haya permitido los endpoints de Power Automate hacia sus servidores de correo (§29.4).
- El fallo de una **acción de correo intermitente** con error 500: configurá la **política de reintento** (§22.4). Reintentar puede **duplicar** el correo si el primer intento sí salió: si importa, registrá el folio enviado.

## 30.5 Correo de errores para el equipo (patrón)

El correo de **fallas** no es el mismo que el de negocio (§13, §22.1):

- **Destino**: un buzón monitoreado, no una persona.
- **Contenido**: folio, acción que falló, **enlace a la corrida** y hora. **Sin datos personales** del payload (§22.6, §33).
- **Frecuencia**: no un correo por cada reintento: agrupá o limitá, o el buzón se ahoga y se ignora.

## Fuentes (Microsoft Learn)

- *Troubleshoot common issues with email in flows* — `learn.microsoft.com/power-automate/email-troubleshooting`
- *Troubleshoot known issues with forms in flows* — `learn.microsoft.com/power-automate/forms/troubleshoot-issues`
- *Exchange Online limits* — `learn.microsoft.com/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits`
- *Create flows for popular email scenarios* (buzón compartido) — `learn.microsoft.com/power-automate/email-top-scenarios`
- *Known issues and limitations for connectors* (tamaño en base64) — `learn.microsoft.com/connectors/common/known-issues`
