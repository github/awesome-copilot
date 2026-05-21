# SPEC: RAG Agent Instrumentation

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|---|---|
| **Name** | rag-agent-instrumentation |
| **Purpose** | Metrics collection for Application Insights |
| **Type** | Observability Skill |
| **Tier** | 2 (Important — APM data) |
| **Input** | Metrics (latency, tokens, cost) |
| **Output** | Structured logs to App Insights |

---

## 2. Input/Output Contract

### Input
```json
{
  "agent": "rag-chat",
  "latency_ms": 2100,
  "tokens_in": 1050,
  "tokens_out": 380,
  "cost_usd": 0.0010
}
```

### Output
```
[AppInsights Custom Metric]
  agent_latency: 2100 ms
  tokens_in: 1050
  tokens_out: 380
  cost_usd: 0.0010
```

---

## 3. Success Criteria

- ✅ Metrics recorded in < 1 second
- ✅ App Insights receives data
- ✅ Custom dimensions captured
- ✅ No data loss on errors

---

## 4. Error Handling

| Error | Recovery |
|---|---|
| `APP_INSIGHTS_OFFLINE` | Queue locally |
| `AUTH_FAILED` | Check connection key |

---

## 5. Release Gates

- [ ] Metrics appear in App Insights
- [ ] No data loss
- [ ] Latency < 1s
- [ ] All fields recorded

---

**Status:** ENTERPRISE READY
**Last Updated:** 2026-05-15
