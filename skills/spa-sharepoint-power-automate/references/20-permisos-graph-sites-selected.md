<!-- spa-sharepoint-power-automate · references/20-permisos-graph-sites-selected.md · sección §32 -->
<!-- Nueva (2026-09-24). Verificado contra Microsoft Learn (Resource Specific Consent para Graph y SharePoint Online; estrategia de permisos de aplicación). Lo que sale de foros de Q&A está marcado. Índice: ../SKILL.md -->

# 32 · Acceso por API a SharePoint con el mínimo permiso: `Sites.Selected` y Graph

Esta es la **vía correcta** para automatizar SharePoint desde código cuando hace falta algo más que un flow. Es también la alternativa recomendada frente al atajo de §18.1 (token delegado con un cliente de Microsoft): más lenta de conseguir, pero **aprobable, auditable y estable**.

## 32.1 La idea: acceso a un solo sitio, no a todo el tenant

| Permiso de aplicación (Microsoft Graph) | Alcance |
|---|---|
| `Sites.ReadWrite.All` / `Sites.Read.All` | **Todos** los sitios del tenant |
| `Sites.FullControl.All` | Todos los sitios, control total |
| **`Sites.Selected`** | **Ningún sitio** hasta que se otorgue uno por uno |

Verificado: al asignar `Sites.Selected` y dar consentimiento de administrador, **la aplicación todavía no puede acceder a ningún sitio**. Falta un segundo paso explícito por cada sitio. Microsoft lo recomienda como forma de limitar una aplicación a **menos que acceso global** y lo describe como "consentimiento específico del recurso".

## 32.2 Pasos

1. **Registrar la aplicación en Microsoft Entra** (una por app o por familia de apps).
2. **Agregar el permiso de aplicación `Sites.Selected`** de Microsoft Graph y **pedir consentimiento de administrador**. Es lo único que necesita el administrador para la parte de Entra.
   > **No** le agregues `Sites.ReadWrite.All` ni similares "por las dudas": según el foro oficial de Microsoft Q&A, con esos permisos **la restricción por sitio no se aplica**.
3. **Otorgar el sitio**, con una llamada a Graph hecha por un **administrador global** o por una aplicación con `Sites.FullControl.All`:

```http
POST https://graph.microsoft.com/v1.0/sites/{siteId}/permissions
Content-Type: application/json

{
  "roles": ["write"],
  "grantedToIdentities": [
    { "application": { "id": "<client-id de la app>", "displayName": "<nombre de la app>" } }
  ]
}
```

- `{siteId}` es el id de Graph del sitio, con formato `contoso.sharepoint.com,<guid-de-la-colección>,<guid-del-sitio>`.
- **Roles** válidos: `read` (leer metadatos y contenido), `write` (leer y modificar), `manage` (además administrar el sitio) y `fullcontrol`.
- La respuesta trae un **id de permiso**: con él se consulta, se cambia (`PATCH`) o se **revoca (`DELETE`)** en `…/sites/{siteId}/permissions/{permission-id}`.

Con **PnP PowerShell** hay cmdlets equivalentes (nombre según la versión del módulo): `Grant-PnPAzureADAppSitePermission` / `Grant-PnPEntraIDAppSitePermission`, `Get-…`, `Set-…` y `Revoke-…`, con el parámetro `-Permissions Read|Write|Manage|FullControl`.

4. **Autenticar la aplicación** preferentemente con **certificado** (no con secreto compartido en el repo) y pedir un token de aplicación para Graph.

## 32.3 Ejemplo mínimo con Graph (Node, sin dependencias)

Tras obtener un token de aplicación (`GRAPH_TOKEN`), leer las listas del sitio autorizado:

```js
const r = await fetch(`https://graph.microsoft.com/v1.0/sites/${process.env.SITE_ID}/lists?$select=id,displayName`, {
  headers: { Authorization: `Bearer ${process.env.GRAPH_TOKEN}` },
});
console.log(r.status, (await r.json()).value?.map(l => l.displayName));
```

- Si devuelve **403** aunque el token tenga `Sites.Selected`, casi siempre falta el **paso 3** (el sitio no fue otorgado a esa app).
- Para escribir ítems: `POST /sites/{siteId}/lists/{listId}/items` con `{"fields": {...}}`. Con Graph, las columnas se referencian por **nombre interno** (§10).
- Frente a REST/CSOM, **Graph consume menos recursos y sufre menos throttling** (§23.4). Manejá igual 429/503 con `Retry-After`.

## 32.4 Qué NO alcanza con `Sites.Selected` (dato de foros, no oficial)

En las respuestas de Microsoft Q&A se observa que **ciertas rutas REST de seguridad** (lectura de asignaciones de roles, herencia de permisos) y de **administración del tenant** pueden exigir `FullControl`, y que `Sites.Selected` con un otorgamiento `read` no las cubre. Tomalo como **advertencia a probar**: si tu app solo lee y escribe **contenido** (listas, ítems, archivos), `read`/`write` por sitio es suficiente. Si necesita administrar permisos, pedí `manage`/`fullcontrol` **solo para ese sitio**, que sigue siendo más acotado que `Sites.FullControl.All` en todo el tenant.

## 32.5 Qué pedirle a IT (versión corta y aprobable)

> *Necesitamos una aplicación de Entra que acceda **solo al sitio «X»** de SharePoint, con rol **write**. Pedimos: (1) el permiso de aplicación **Sites.Selected** de Microsoft Graph con consentimiento de administrador y (2) que un administrador otorgue **rol write sobre ese sitio** a la app mediante `POST /sites/{siteId}/permissions`. No pedimos acceso a otros sitios. La app se autentica con **certificado**. Se puede revocar en cualquier momento con `DELETE` sobre el permiso.*

Argumentos que suelen destrabar la aprobación: alcance de **un solo sitio**, **revocable**, **auditable** (queda un permiso identificable), sin secretos compartidos, y alineado con la recomendación de Microsoft de limitar los permisos de aplicación.

## 32.6 Cuándo usar esto y cuándo no

- **Sí**: scripts programados, sincronizaciones (§18), reportes, un backend propio (Vercel/Azure Functions) que lee o escribe una lista sin depender de Power Automate.
- **No hace falta** si todo pasa por el flow con una conexión de servicio (§9): ahí el acceso a SharePoint lo da la conexión y no una app propia.
- **No reemplaza** al consentimiento por app cuando IT lo rechaza explícitamente: si la respuesta es "no", se negocia con IT (§29.5), no se rodea.

## Fuentes (Microsoft Learn)

- *Understanding Resource Specific Consent for Microsoft Graph and SharePoint Online* (`Sites.Selected`, `POST /sites/{siteId}/permissions`, roles, cmdlets de PnP) — `learn.microsoft.com/sharepoint/dev/sp-add-ins-modernize/understanding-rsc-for-msgraph-and-sharepoint-online`
- *Develop application permissions strategy* — `learn.microsoft.com/security/zero-trust/develop/developer-strategy-application-permissions`
- *Index content from SharePoint in Microsoft 365* (paso a paso de `Sites.Selected` y consentimiento) — `learn.microsoft.com/azure/search/search-how-to-index-sharepoint-online`
- Microsoft Q&A: *Unable to Grant App Permissions to SharePoint Site via Microsoft Graph API* y *Sharepoint Rest APIs does not work without FullControl permissions* (advertencias no oficiales de §32.2 y §32.4).
