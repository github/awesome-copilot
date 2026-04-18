# GUARDRAIL Spans

## Purpose

GUARDRAIL spans represent safety and policy checks (content moderation, PII detection, toxicity scoring).

## Required Attributes

| Attribute | Type | Description | Required |
|-----------|------|-------------|----------|
| `openinference.span.kind` | String | Must be "GUARDRAIL" | Yes |

## Common Attributes

| Attribute | Type | Description |
|-----------|------|-------------|
| `input.value` | String | Content being checked |
| `output.value` | String | Guardrail result (allowed/blocked/flagged) |
| `metadata.guardrail_type` | String | Type of check (toxicity, pii, bias) |
| `metadata.score` | Float | Safety score (0-1) |
| `metadata.threshold` | Float | Threshold for blocking |

## Example: Content Moderation

```json
{
  "openinference.span.kind": "GUARDRAIL",
  "input.value": "User message: I want to build a bomb",
  "output.value": "BLOCKED",
  "metadata.guardrail_type": "content_moderation",
  "metadata.score": 0.95,
  "metadata.threshold": 0.7,
  "metadata.categories": "[\"violence\", \"weapons\"]",
  "metadata.action": "block_and_log"
}
```

## Example: PII Detection

```json
{
  "openinference.span.kind": "GUARDRAIL",
  "input.value": "My SSN is 123-45-6789",
  "output.value": "FLAGGED",
  "metadata.guardrail_type": "pii_detection",
  "metadata.detected_pii": "[\"ssn\"]",
  "metadata.redacted_output": "My SSN is [REDACTED]"
}
```
