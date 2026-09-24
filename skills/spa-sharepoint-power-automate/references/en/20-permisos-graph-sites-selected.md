<!-- spa-sharepoint-power-automate · references/20-permisos-graph-sites-selected.md · section §32 · English translation of the Spanish original -->
<!-- New (2026-09-24). Verified against Microsoft Learn (Resource Specific Consent for Graph and SharePoint Online; application permissions strategy). Anything that comes from Q&A forums is marked. Index: ../SKILL.md -->

# 32 · API access to SharePoint with the minimum permission: `Sites.Selected` and Graph

This is the **right path** to automate SharePoint from code when you need more than a flow. It is also the recommended alternative to the shortcut in §18.1 (delegated token with a Microsoft client): slower to obtain, but **approvable, auditable and stable**.

## 32.1 The idea: access to a single site, not the whole tenant

| Application permission (Microsoft Graph) | Scope |
|---|---|
| `Sites.ReadWrite.All` / `Sites.Read.All` | **All** sites in the tenant |
| `Sites.FullControl.All` | All sites, full control |
| **`Sites.Selected`** | **No site** until one is granted individually |

Verified: when you assign `Sites.Selected` and give admin consent, **the application still cannot access any site**. An explicit second step is needed for each site. Microsoft recommends it as a way to limit an application to **less than global access** and describes it as "resource-specific consent".

## 32.2 Steps

1. **Register the application in Microsoft Entra** (one per app or per family of apps).
2. **Add the `Sites.Selected` application permission** from Microsoft Graph and **request admin consent**. This is the only thing the administrator needs for the Entra part.
   > Do **not** add `Sites.ReadWrite.All` or similar "just in case": according to the official Microsoft Q&A forum, with those permissions **the per-site restriction is not applied**.
3. **Grant the site**, with a Graph call made by a **global administrator** or by an application with `Sites.FullControl.All`:

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

- `{siteId}` is the Graph id of the site, in the format `contoso.sharepoint.com,<guid-de-la-colección>,<guid-del-sitio>`.
- Valid **roles**: `read` (read metadata and content), `write` (read and modify), `manage` (also administer the site) and `fullcontrol`.
- The response returns a **permission id**: with it you can query, change (`PATCH`) or **revoke (`DELETE`)** at `…/sites/{siteId}/permissions/{permission-id}`.

With **PnP PowerShell** there are equivalent cmdlets (name depends on the module version): `Grant-PnPAzureADAppSitePermission` / `Grant-PnPEntraIDAppSitePermission`, `Get-…`, `Set-…` and `Revoke-…`, with the parameter `-Permissions Read|Write|Manage|FullControl`.

4. **Authenticate the application**, preferably with a **certificate** (not with a shared secret in the repo), and request an application token for Graph.

## 32.3 Minimal example with Graph (Node, no dependencies)

After obtaining an application token (`GRAPH_TOKEN`), read the lists of the authorized site:

```js
const r = await fetch(`https://graph.microsoft.com/v1.0/sites/${process.env.SITE_ID}/lists?$select=id,displayName`, {
  headers: { Authorization: `Bearer ${process.env.GRAPH_TOKEN}` },
});
console.log(r.status, (await r.json()).value?.map(l => l.displayName));
```

- If it returns **403** even though the token has `Sites.Selected`, almost always **step 3** is missing (the site was not granted to that app).
- To write items: `POST /sites/{siteId}/lists/{listId}/items` with `{"fields": {...}}`. With Graph, columns are referenced by **internal name** (§10).
- Compared with REST/CSOM, **Graph consumes fewer resources and suffers less throttling** (§23.4). Still handle 429/503 with `Retry-After`.

## 32.4 What `Sites.Selected` does NOT cover (forum information, not official)

In Microsoft Q&A answers, it is observed that **certain security REST routes** (reading role assignments, permission inheritance) and **tenant administration** routes may require `FullControl`, and that `Sites.Selected` with a `read` grant does not cover them. Take this as a **warning to test**: if your app only reads and writes **content** (lists, items, files), `read`/`write` per site is enough. If it needs to manage permissions, ask for `manage`/`fullcontrol` **only for that site**, which is still narrower than `Sites.FullControl.All` across the whole tenant.

## 32.5 What to ask IT for (short, approvable version)

> *We need an Entra application that accesses **only the SharePoint site "X"**, with the **write** role. We are requesting: (1) the **Sites.Selected** application permission from Microsoft Graph with admin consent, and (2) that an administrator grant the app the **write role on that site** through `POST /sites/{siteId}/permissions`. We are not requesting access to any other site. The app authenticates with a **certificate**. It can be revoked at any time with `DELETE` on the permission.*

Arguments that usually unblock approval: scope of **a single site**, **revocable**, **auditable** (an identifiable permission remains), no shared secrets, and aligned with Microsoft's recommendation to limit application permissions.

## 32.6 When to use this and when not to

- **Yes**: scheduled scripts, syncs (§18), reports, your own backend (Vercel/Azure Functions) that reads or writes a list without depending on Power Automate.
- **Not needed** if everything goes through the flow with a service connection (§9): there, SharePoint access is provided by the connection and not by an app of your own.
- **Does not replace** per-app consent when IT explicitly rejects it: if the answer is "no", negotiate with IT (§29.5), do not work around it.

## Sources (Microsoft Learn)

- *Understanding Resource Specific Consent for Microsoft Graph and SharePoint Online* (`Sites.Selected`, `POST /sites/{siteId}/permissions`, roles, PnP cmdlets) — `learn.microsoft.com/sharepoint/dev/sp-add-ins-modernize/understanding-rsc-for-msgraph-and-sharepoint-online`
- *Develop application permissions strategy* — `learn.microsoft.com/security/zero-trust/develop/developer-strategy-application-permissions`
- *Index content from SharePoint in Microsoft 365* (step-by-step for `Sites.Selected` and consent) — `learn.microsoft.com/azure/search/search-how-to-index-sharepoint-online`
- Microsoft Q&A: *Unable to Grant App Permissions to SharePoint Site via Microsoft Graph API* and *Sharepoint Rest APIs does not work without FullControl permissions* (unofficial warnings in §32.2 and §32.4).
