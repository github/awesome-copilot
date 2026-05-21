# SPEC: RAG Validator

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|---|---|
| **Name** | rag-validator |
| **Purpose** | Validate RAG compliance with Microsoft guidelines |
| **Type** | Compliance Skill |
| **Tier** | 2 (Important — compliance checking) |
| **Input** | Deployment configuration |
| **Output** | JSON with compliance report |

---

## 2. Input/Output Contract

### Input
```json
{
  "deployment": "rag-pokemon",
  "check_type": "security|performance|compliance"
}
```

### Output
```json
{
  "timestamp": "2026-05-15T15:00:00Z",
  "status": "compliant",
  "checks": {
    "encryption": "PASS",
    "rbac": "PASS",
    "logging": "PASS"
  },
  "issues": []
}
```

---

## 3. Success Criteria

- ✅ All checks complete
- ✅ Issues identified early
- ✅ Recommendations provided
- ✅ Report accurate

---

## 4. Error Handling

| Error | Recovery |
|---|---|
| `CHECK_FAILED` | Log and continue |
| `CONFIG_INVALID` | Skip check |

---

## 5. Release Gates

- [ ] All checks run
- [ ] Issues caught
- [ ] Report generated
- [ ] JSON valid

---

**Status:** ENTERPRISE READY
**Last Updated:** 2026-05-15
