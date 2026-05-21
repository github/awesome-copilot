# SPEC: RAG SharePoint Connector

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|---|---|
| **Name** | rag-sharepoint-connector |
| **Purpose** | Sync SharePoint documents to RAG (professional or local mode) |
| **Type** | Data Integration Skill |
| **Tier** | 2 (Important — enterprise integration) |
| **Input** | SharePoint site URL, folder path |
| **Output** | JSON with synced doc count, status |

---

## 2. Input/Output Contract

### Input
```json
{
  "mode": "professional|local",
  "sharepoint_site": "https://company.sharepoint.com/sites/rag",
  "folder_path": "/Shared Documents/Policies"
}
```

### Output
```json
{
  "timestamp": "2026-05-15T15:00:00Z",
  "status": "success",
  "documents_synced": 145,
  "bytes_synced": 125000000,
  "mode": "professional",
  "indexer_status": "ready"
}
```

---

## 3. Success Criteria

- ✅ OAuth setup working
- ✅ Documents downloaded/indexed
- ✅ Zero duplication
- ✅ Sync can run continuously

---

## 4. Error Handling

| Error | Recovery |
|---|---|
| `OAUTH_FAILED` | Re-authenticate |
| `PERMISSION_DENIED` | Check SharePoint permissions |
| `SYNC_TIMEOUT` | Resume from checkpoint |

---

## 5. Release Gates

- [ ] OAuth flow works
- [ ] Docs sync successfully
- [ ] No duplicates
- [ ] JSON valid

---

**Status:** ENTERPRISE READY
**Last Updated:** 2026-05-15
