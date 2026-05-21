# SPEC: RAG Query CLI

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|---|---|
| **Name** | rag-query-cli |
| **Purpose** | Interactive CLI for searching indexed documents |
| **Type** | User Interface Skill |
| **Tier** | 2 (Important — primary query interface) |
| **Input** | Query string, optional filters |
| **Output** | JSON with search results, citations, relevance scores |

---

## 2. Input/Output Contract

### Input
```json
{
  "query": "What is the damage of move X?",
  "top_k": 5,
  "min_score": 0.6,
  "search_mode": "hybrid"
}
```

### Output
```json
{
  "timestamp": "2026-05-15T15:00:00Z",
  "query": "What is the damage of move X?",
  "status": "success",
  "duration_seconds": 2.1,
  "results": [
    {
      "rank": 1,
      "score": 0.95,
      "document": "user-manual-vol1.pdf",
      "content": "Move X deals 100 damage...",
      "source_page": 42
    }
  ],
  "error": null
}
```

---

## 3. Success Criteria

- ✅ Query execution < 3 seconds
- ✅ Hybrid search (keyword + semantic) works
- ✅ Results ranked by relevance
- ✅ Top K filtering accurate
- ✅ JSON output valid

---

## 4. Error Handling

| Error | Recovery |
|---|---|
| `SEARCH_TIMEOUT` | Retry with reduced top_k |
| `INVALID_QUERY` | Suggest reformulation |
| `CONNECTION_FAILED` | Check Search endpoint |

---

## 5. Release Gates

- [ ] Query latency < 3 seconds
- [ ] Hybrid search returns results
- [ ] JSON schema valid
- [ ] Error messages helpful

---

**Status:** ENTERPRISE READY
**Last Updated:** 2026-05-15
