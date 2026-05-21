# SPEC: RAG Diagnostics

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|---|---|
| **Name** | rag-diagnostics |
| **Purpose** | Monitor system health and performance |
| **Type** | Observability Skill |
| **Tier** | 2 (Important — production monitoring) |
| **Input** | Component to check (openai, search, appinsights) |
| **Output** | JSON with health status, latency, throughput |

---

## 2. Input/Output Contract

### Input
```json
{"action": "health|metrics|errors"}
```

### Output
```json
{
  "timestamp": "2026-05-15T15:00:00Z",
  "status": "healthy|degraded|error",
  "components": {
    "openai": {"status": "healthy", "latency_ms": 245},
    "search": {"status": "healthy", "latency_ms": 180},
    "appinsights": {"status": "healthy"}
  }
}
```

---

## 3. Success Criteria

- ✅ Detects OpenAI issues < 10 seconds
- ✅ Reports Search health accurately
- ✅ AppInsights data freshness < 5 min
- ✅ JSON schema valid

---

## 4. Error Handling

| Error | Recovery |
|---|---|
| `SERVICE_UNREACHABLE` | Check credentials |
| `TIMEOUT` | Retry with 30s timeout |
| `QUOTA_EXCEEDED` | Alert user |

---

## 5. Release Gates

- [ ] All 3 components checked
- [ ] Latency measurements accurate
- [ ] Degraded state detected
- [ ] JSON valid

---

**Status:** ENTERPRISE READY
**Last Updated:** 2026-05-15
