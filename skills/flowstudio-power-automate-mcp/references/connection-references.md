# FlowStudio MCP — Connection References

Connection references wire a flow's connector actions to real authenticated
connections in the Power Platform. They are required whenever you call
`update_live_flow` with a definition that uses connector actions.

---

## Structure in a Flow Definition

```json
{
  "properties": {
    "definition": { ... },
    "connectionReferences": {
      "shared_sharepointonline": {
        "connectionName": "shared-sharepointonl-eeeeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
        "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline",
        "displayName": "SharePoint"
      },
      "shared_office365": {
        "connectionName": "shared-office365-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
        "displayName": "Office 365 Outlook"
      }
    }
  }
}
```

Keys are **reference names** — a readable one such as `shared_sharepointonline`,
or the connection id when copied from `list_live_connections` templates. Each key
must match the `connectionName` field inside the `host` block of every action
that uses it.

---

## Finding Connection References

Preferred method: call `list_live_connections` in the target environment. Use
`search` to narrow results to the connector you need; newer MCP server versions
return paste-ready templates.

```python
matches = mcp("list_live_connections", {
    "environmentName": ENV,
    "search": "shared_sharepointonline",
    "top": 10,
})

conn = next(c for c in matches["connections"]
            if (c.get("statuses") or [{}])[0].get("status") == "Connected")

# connectionReferenceTemplate is already a map keyed by the connection id —
# merge it as-is. hostTemplate.connectionName is that same id.
conn_refs = dict(conn["connectionReferenceTemplate"])
host = conn["hostTemplate"]
# host == {"connectionName": "<connection id>",
#          "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"}
```

Use `host` as the action-side `inputs.host` (add `operationId`). Pass
`conn_refs` as `update_live_flow`'s `connectionReferences`. The map key and every
action's `inputs.host.connectionName` must match — here both are the connection
id. To use a readable key such as `shared_sharepointonline` instead, re-key the
entry and set every matching action's `inputs.host.connectionName` to that key.
Do not add `"source": "Invoker"`: it saves the connection as "provided by
run-only user".

Fallback method: copy from an existing flow.

Call `get_live_flow` on **any existing flow** that uses the same connection
and copy the `connectionReferences` block. The GUID after the connector prefix is
the connection instance owned by the authenticating user.

```python
flow = mcp("get_live_flow", {"environmentName": ENV, "flowName": EXISTING_FLOW_ID})
conn_refs = flow["properties"]["connectionReferences"]
# conn_refs["shared_sharepointonline"]["connectionName"]
# → "shared-sharepointonl-eeeeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee"
```

> ⚠️ Connection references are **user-scoped**. If a connection is owned
> by another account, `update_live_flow` will return 403
> `ConnectionAuthorizationFailed`. You must use a connection belonging to
> the account whose token is in the `x-api-key` header.

---

## Passing `connectionReferences` to `update_live_flow`

```python
result = mcp("update_live_flow", {
    "environmentName": ENV,
    "flowName": FLOW_ID,
    "definition": modified_definition,
    "connectionReferences": {
        "shared_sharepointonline": {
            "connectionName": "shared-sharepointonl-eeeeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
            "id": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
        }
    }
})
```

Only include connections that the definition actually uses.

**Adding the first action for a new connector with `operations`:** pass the new
entry in `connectionReferences` in the same call. It is merged over the stored map
and saved with the edit. A reference saved on its own does not stick — Power
Automate drops an entry no action uses.

---

## Solution Flows

Entries in a solution flow carry two more fields — keep them exactly as
`get_live_flow` returns them:

```json
"shared_office365": {
  "connectionName": "shared-office365-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "id": "/providers/Microsoft.PowerApps/apis/shared_office365",
  "connectionReferenceLogicalName": "<logical name from the solution>",
  "source": "<as stored>"
}
```

- Never invent a logical name.
- An `operations` save keeps the stored `connectionReferenceLogicalName` and
  `source` when your entry leaves them out; pass `null` for a field to remove it.
- Saving a solution flow with a direct connection (no logical name) makes the
  connection run-only outside the solution. Every save and dry run warns in
  `hints`. When it can read the environment's Dataverse, it names the
  connection-reference components it found: one means bind it, several means ask
  the user, none means create one in the solution designer. When it cannot, the
  hint says how to look them up.
- Adding a logical name to an entry that lacks one does not always take: the save
  can succeed without storing it. Re-read with `get_live_flow` to confirm.
- For the full diagnosis, load the server bundle: `tool_search`
  `skill:diagnose-connection-references`.

---

## Common Connector API IDs

| Service | API ID |
|---|---|
| SharePoint Online | `/providers/Microsoft.PowerApps/apis/shared_sharepointonline` |
| Office 365 Outlook | `/providers/Microsoft.PowerApps/apis/shared_office365` |
| Microsoft Teams | `/providers/Microsoft.PowerApps/apis/shared_teams` |
| OneDrive for Business | `/providers/Microsoft.PowerApps/apis/shared_onedriveforbusiness` |
| Azure AD | `/providers/Microsoft.PowerApps/apis/shared_azuread` |
| HTTP with Azure AD | `/providers/Microsoft.PowerApps/apis/shared_webcontents` |
| SQL Server | `/providers/Microsoft.PowerApps/apis/shared_sql` |
| Dataverse | `/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps` |
| Azure Blob Storage | `/providers/Microsoft.PowerApps/apis/shared_azureblob` |
| Approvals | `/providers/Microsoft.PowerApps/apis/shared_approvals` |
| Office 365 Users | `/providers/Microsoft.PowerApps/apis/shared_office365users` |
| Flow Management | `/providers/Microsoft.PowerApps/apis/shared_flowmanagement` |

---

## Teams Adaptive Card Dual-Connection Requirement

Flows that send adaptive cards **and** post follow-up messages require two
separate Teams connections:

```json
"connectionReferences": {
  "shared_teams": {
    "connectionName": "shared-teams-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "id": "/providers/Microsoft.PowerApps/apis/shared_teams"
  },
  "shared_teams_1": {
    "connectionName": "shared-teams-yyyyyyyy-yyyy-yyyy-yyyy-yyyyyyyyyyyy",
    "id": "/providers/Microsoft.PowerApps/apis/shared_teams"
  }
}
```

Both can point to the **same underlying Teams account** but must be registered
as two distinct connection references. The webhook (`OpenApiConnectionWebhook`)
uses `shared_teams` and subsequent message actions use `shared_teams_1`.
