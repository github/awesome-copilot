---
name: acreadiness-policy
description: 'Help the user pick, write, or apply an AgentRC policy. Policies customise readiness scoring by disabling irrelevant checks, overriding impact/level, setting pass-rate thresholds, or chaining org baselines with team overrides. Use when the user asks about strict mode, AI-only scoring, custom weights, CI gating, or wants org-wide standardisation.'
argument-hint: "[show | new <name> | apply <path-or-pkg>] — e.g. /acreadiness-policy show, /acreadiness-policy new strict-frontend"
---

# /acreadiness-policy — AgentRC policies

Use this skill when the user asks about **policies**, **strict mode**, **custom scoring**, **disabling checks**, **org standards**, or **CI gating** of readiness.

A policy is a small JSON file with three optional sections — `criteria`, `extras`, `thresholds` — that customise how AgentRC scores readiness.

## Built-in examples

AgentRC ships with three example policies in `examples/policies/`:

| Policy | What it does |
|---|---|
| `strict.json` | 100% pass rate, raises impact on key criteria |
| `ai-only.json` | Disables all repo-health checks, focuses on AI tooling |
| `repo-health-only.json` | Disables AI checks, focuses on traditional quality |

Recommend these as starting points before writing a custom policy.

## Policy schema

```jsonc
{
  "name": "my-policy",
  "criteria": {
    "disable":  ["env-example", "observability", "dependabot"],
    "override": {
      "readme":      { "impact": "high", "level": 2 },
      "lint-config": { "title": "Linter required" }
    }
  },
  "extras": {
    "disable": ["pre-commit"]
  },
  "thresholds": {
    "passRate": 0.9
  }
}
```

### Impact weights

| Impact | Weight |
|---|---|
| critical | 5 |
| high | 4 |
| medium | 3 |
| low | 2 |
| info | 0 |

`Score = 1 − (deductions / max possible weight)`. Grades: **A** ≥ 0.9, **B** ≥ 0.8, **C** ≥ 0.7, **D** ≥ 0.6, **F** < 0.6.

## Sub-commands

### `show`
List policies currently in effect (from `agentrc.config.json` `policies` array, or none).

### `new <name>`
Scaffold `policies/<name>.json` with sensible defaults. Walk the user through:
1. **What to disable** — irrelevant pillars or extras for their stack (e.g. disable `observability` for a static site).
2. **What to raise** — override `impact` to `high` or `critical` for must-haves (e.g. `readme`, `codeowners`).
3. **Pass-rate threshold** — typical org baselines: `0.7` (lenient), `0.85` (standard), `1.0` (strict).
4. Reference the policy from `agentrc.config.json`:
   ```json
   { "policies": ["./policies/<name>.json"] }
   ```

### `apply <path-or-pkg>`
Run `agentrc readiness --json --policy <source>` and re-render the report by handing off to the `assess` skill / `ai-readiness-reporter` agent. Supports chaining:
```bash
npx -y github:microsoft/agentrc readiness --json --policy ./org-baseline.json,./team-frontend.json
```

## CI gating

Combine policies with `--fail-level` to enforce a minimum maturity level in CI:

```yaml
- run: npx -y github:microsoft/agentrc readiness --policy ./policies/strict.json --fail-level 3
```

## Advanced

JSON policies can disable, override, and set thresholds — but **cannot add new criteria**. For new detection logic, point users at AgentRC's TypeScript plugin system (`docs/dev/plugins.md`).

## Operating rules

- **Never silently disable a pillar.** If the user wants to disable `observability`, confirm and explain the trade-off.
- **Prefer overriding `impact` over disabling.** Disabling hides the gap entirely; overriding lets it still appear in the report.
- **Recommend extras stay enabled.** They cost nothing — they don't affect the score.
- **Suggest layering** — most orgs want a baseline policy + per-team overrides chained with `--policy a.json,b.json`.
