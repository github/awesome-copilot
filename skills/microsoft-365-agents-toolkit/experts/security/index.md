# security-router

## purpose

Route security-hardening tasks to the minimal set of micro-expert files. Read only the clusters that match the user's request.

## task clusters

### Input Validation
When: sanitizing user input, preventing injection, XSS prevention, content validation, PII handling
Read:
- `input-validation-ts.md`
Cross-domain deps: `../teams/ui.adaptive-cards-ts.md` (card action payloads that need validation), `../teams/ai.function-calling-implementation-ts.md` (AI function parameter validation)

### Secrets Management
When: secrets, credentials, API keys, Key Vault, environment variables, secret rotation
Read:
- `secrets-ts.md`
Cross-domain deps: `../teams/runtime.app-init-ts.md` (App constructor credentials), `../bridge/infra-secrets-config-ts.md` (only if bridging between AWS and Azure)

### General Hardening
When: broad security review, security audit, hardening checklist, defense in depth
Read:
- `input-validation-ts.md`
- `secrets-ts.md`
Cross-domain deps: `../teams/mcp.security-ts.md` (only if using MCP)

## combining rule

If a request covers both input validation and secrets, read both files (same as "General Hardening").

## file inventory

`input-validation-ts.md` | `secrets-ts.md`
