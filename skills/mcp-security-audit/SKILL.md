---
name: mcp-security-audit
description: |
  Audit MCP (Model Context Protocol) server configurations for security issues. Use this skill when:
  - Reviewing .mcp.json files for security risks
  - Checking MCP server args for hardcoded secrets or shell injection patterns
  - Validating that MCP package-runner dependencies use exact reviewed versions, not bare names, @latest, or ranges
  - Detecting mutable npm/npx, bunx, pnpm dlx, yarn dlx, and npm exec references in MCP configurations
  - Auditing which MCP servers a project registers and whether they're on an approved list
  - Checking for environment variable usage vs. hardcoded credentials in MCP configs
  - Any request like "is my MCP config secure?", "audit my MCP servers", or "check .mcp.json"
  keywords: [mcp, security, audit, secrets, shell-injection, supply-chain, governance]
---

# MCP Security Audit

Audit MCP server configurations for security issues — secrets exposure, shell injection, unpinned dependencies, and unapproved servers.

## Overview

MCP servers give agents direct tool access to external systems. A misconfigured `.mcp.json` can expose credentials, allow shell injection, or connect to untrusted servers. This skill catches those issues before they reach production.

```
.mcp.json → Parse Servers → Check Each Server:
  1. Secrets in args/env?
  2. Shell injection patterns?
  3. Mutable package selectors (bare, @latest, ranges)?
  4. Dangerous commands (eval, bash -c)?
  5. Server on approved list?
→ Generate Report
```

## When to Use

- Reviewing any `.mcp.json` file in a project
- Onboarding a new MCP server to a project
- Auditing all MCP servers in a monorepo or plugin marketplace
- Pre-commit checks for MCP configuration changes
- Security review of agent tool configurations

---

## Audit Check 1: Hardcoded Secrets

Scan MCP server args and env values for hardcoded credentials.

```python
import json
import re
from pathlib import Path

SECRET_PATTERNS = [
    (r'(?i)(api[_-]?key|token|secret|password|credential)\s*[:=]\s*["\'][^"\']{8,}', "Hardcoded secret"),
    (r'(?i)Bearer\s+[A-Za-z0-9\-._~+/]+=*', "Hardcoded bearer token"),
    (r'(?i)(ghp_|gho_|ghu_|ghs_|ghr_)[A-Za-z0-9]{30,}', "GitHub token"),
    (r'sk-[A-Za-z0-9]{20,}', "OpenAI API key"),
    (r'AKIA[0-9A-Z]{16}', "AWS access key"),
    (r'-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----', "Private key"),
]

def check_secrets(mcp_config: dict) -> list[dict]:
    """Check for hardcoded secrets in MCP server configurations."""
    findings = []
    raw = json.dumps(mcp_config)
    for pattern, description in SECRET_PATTERNS:
        matches = re.findall(pattern, raw)
        if matches:
            findings.append({
                "severity": "CRITICAL",
                "check": "hardcoded-secret",
                "message": f"{description} found in MCP configuration",
                "evidence": f"Pattern matched: {pattern}",
                "fix": "Use environment variable references: ${ENV_VAR_NAME}"
            })
    return findings
```

**Good practice — use env var references:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js"],
      "env": {
        "API_KEY": "${MY_API_KEY}",
        "DB_URL": "${DATABASE_URL}"
      }
    }
  }
}
```

**Bad — hardcoded credentials:**
```json
{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["server.js", "--api-key", "sk-abc123realkey456"],
      "env": {
        "DB_URL": "postgresql://admin:password123@prod-db:5432/main"
      }
    }
  }
}
```

---

## Audit Check 2: Shell Injection Patterns

Detect dangerous command patterns in MCP server args.

```python
import json
import re

DANGEROUS_PATTERNS = [
    (r'\$\(', "Command substitution $(...)"),
    (r'`[^`]+`', "Backtick command substitution"),
    (r';\s*\w', "Command chaining with semicolon"),
    (r'\|\s*\w', "Pipe to another command"),
    (r'&&\s*\w', "Command chaining with &&"),
    (r'\|\|\s*\w', "Command chaining with ||"),
    (r'(?i)eval\s', "eval usage"),
    (r'(?i)bash\s+-c\s', "bash -c execution"),
    (r'(?i)sh\s+-c\s', "sh -c execution"),
    (r'>\s*/dev/tcp/', "TCP redirect (reverse shell pattern)"),
    (r'curl\s+.*\|\s*(ba)?sh', "curl pipe to shell"),
]

def check_shell_injection(server_config: dict) -> list[dict]:
    """Check MCP server args for shell injection risks."""
    findings = []
    args_text = json.dumps(server_config.get("args", []))
    for pattern, description in DANGEROUS_PATTERNS:
        if re.search(pattern, args_text):
            findings.append({
                "severity": "HIGH",
                "check": "shell-injection",
                "message": f"Dangerous pattern in MCP server args: {description}",
                "fix": "Use direct command execution, not shell interpolation"
            })
    return findings
```

---

## Audit Check 3: Mutable Package References

Review package-runner MCP entries for selectors that can resolve to different package code later. Treat this as a reproducibility and review-boundary signal — not proof that the package is malicious or compromised.

```python
import re
EXACT_SEMVER = re.compile(r"^v?\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$")
def split_package_spec(spec: str):
    """Split npm-style package selectors, including scoped packages."""
    spec = spec.strip()
    if spec.startswith("@"):
        slash = spec.find("/")
        at = spec.rfind("@")
        if slash >= 0 and at > slash:
            return spec[:at], spec[at + 1:] or None
        return spec, None
    if "@" in spec:
        package, version = spec.rsplit("@", 1)
        return package, version or None
    return spec, None


def package_spec_from_runner(server_config: dict):
    """Extract, but never execute, the package selector from common JS runners."""
    command = str(server_config.get("command", "")).replace("\\", "/").rsplit("/", 1)[-1].lower()
    args = [str(arg) for arg in server_config.get("args", []) if isinstance(arg, str)]

    if command in {"npx", "npx.cmd", "bunx"}:
        return next((arg for arg in args if not arg.startswith("-")), None)

    if command in {"npm", "npm.cmd"} and args[:1] and args[0] in {"exec", "x"}:
        tail = args[1:]
        if "--" in tail:
            tail = tail[tail.index("--") + 1:]
        return next((arg for arg in tail if not arg.startswith("-")), None)

    if command in {"pnpm", "yarn", "bun"} and args[:1] and args[0] in {"dlx", "x"}:
        return next((arg for arg in args[1:] if not arg.startswith("-")), None)

    return None


def check_pinned_versions(server_config: dict) -> list[dict]:
    """Flag package selectors that do not identify one exact reviewed version."""
    spec = package_spec_from_runner(server_config)
    if not spec:
        return []

    package, version = split_package_spec(spec)
    if not version or version.lower() == "latest":
        return [{
            "severity": "MEDIUM",
            "check": "mutable-dependency",
            "message": f"Mutable package reference: {spec}",
            "fix": f"Pin {package} to the exact version your team actually reviewed"
        }]

    if not EXACT_SEMVER.fullmatch(version):
        return [{
            "severity": "LOW",
            "check": "non-exact-dependency",
            "message": f"Non-exact package selector: {spec}",
            "fix": f"Replace the range/tag with an exact reviewed version for {package}"
        }]

    return []
```

**Good — exact reviewed version:**
```json
{ "command": "npx", "args": ["-y", "my-mcp-server@2.1.0"] }
```

**Review — mutable references:**
```json
{ "command": "npx", "args": ["-y", "my-mcp-server@latest"] }
{ "command": "npx", "args": ["-y", "my-mcp-server"] }
{ "command": "npx", "args": ["-y", "@scope/server@^2.1.0"] }
```

Do **not** invent a remediation pin by substituting today's registry version. Pin a version that was actually reviewed; if that evidence is unknown, record the uncertainty. `-y` / `--yes` suppresses an interactive prompt and may matter for CI ergonomics, but it is not a vulnerability by itself.

---

## Audit Check 4: Full Audit Runner

Combine all checks into a single audit.

```python
def audit_mcp_config(mcp_path: str) -> dict:
    """Run full security audit on an .mcp.json file."""
    path = Path(mcp_path)
    if not path.exists():
        return {"error": f"{mcp_path} not found"}

    config = json.loads(path.read_text(encoding="utf-8"))
    servers = config.get("mcpServers", {})
    results = {"file": str(path), "servers": {}, "summary": {}}
    total_findings = []

    # Run secrets check once on the whole config (not per-server)
    config_level_findings = check_secrets(config)
    total_findings.extend(config_level_findings)

    for name, server_config in servers.items():
        if not isinstance(server_config, dict):
            continue
        findings = []
        findings.extend(check_shell_injection(server_config))
        findings.extend(check_pinned_versions(server_config))
        results["servers"][name] = {
            "command": server_config.get("command", ""),
            "findings": findings,
        }
        total_findings.extend(findings)

    # Summary
    by_severity = {}
    for f in total_findings:
        sev = f["severity"]
        by_severity[sev] = by_severity.get(sev, 0) + 1

    results["summary"] = {
        "total_servers": len(servers),
        "total_findings": len(total_findings),
        "by_severity": by_severity,
        "passed": len(total_findings) == 0,
    }
    return results
```

**Usage:**
```python
results = audit_mcp_config(".mcp.json")
if not results["summary"]["passed"]:
    for server, data in results["servers"].items():
        for finding in data["findings"]:
            print(f"[{finding['severity']}] {server}: {finding['message']}")
            print(f"  Fix: {finding['fix']}")
```

---

## Output Format

```
MCP Security Audit — .mcp.json
═══════════════════════════════
Servers scanned: 5
Findings: 3 (1 CRITICAL, 1 HIGH, 1 MEDIUM)

[CRITICAL] my-api-server: Hardcoded secret found in MCP configuration
  Fix: Use environment variable references: ${ENV_VAR_NAME}

[HIGH] data-processor: Dangerous pattern in MCP server args: bash -c execution
  Fix: Use direct command execution, not shell interpolation

[MEDIUM] analytics: Mutable package reference: analytics-mcp@latest
  Fix: Pin analytics-mcp to the exact version your team actually reviewed
```

---

## Related Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [Agent Governance Toolkit](https://github.com/microsoft/agent-governance-toolkit) — Full governance framework with MCP trust proxy
- [OWASP ASI-02: Insecure Tool Use](https://owasp.org/www-project-agentic-ai-threats/)
