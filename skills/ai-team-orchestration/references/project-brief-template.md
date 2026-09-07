# PROJECT_BRIEF.md Template

Use this only when the project benefits from durable context across sessions. Keep it concise and omit irrelevant sections.

```markdown
# PROJECT_BRIEF.md - [Project Name]

> Last updated: [date]

## 1. Goal and Users

[What the project is, who it serves, and the outcome it should create.]

## 2. Current Scope

**In scope**
- [outcome]

**Out of scope**
- [explicit exclusion]

## 3. Stack and Architecture

- Runtime/language: [value]
- Frameworks/libraries: [value]
- Data/services: [value]
- Deployment: [value or not applicable]
- Tests/checks: [verified commands]

[Short architecture description or diagram when useful.]

## 4. Key Files

| Area | Path | Purpose |
|---|---|---|
| [area] | `[path]` | [purpose] |

## 5. How to Work

- Setup: [verified command or link]
- Run: [verified command or link]
- Test: [verified commands]
- Deploy: [verified process or not applicable]
- Repository rules: [links to contribution/security instructions]

## 6. Safety and Constraints

- [secrets/privacy/data rules]
- [compatibility or reliability invariant]
- [operational constraint]

## 7. Current State

**Working**
- [item]

**Known issues**
- [issue/link]

**Next**
- [next outcome]

## 8. Team and Handoff

- Producer: scope, coordination, and merge
- Dev: implementation and verification
- QA: optional independent behavioral verification

## Onboarding checklist (add to brief)

- Setup verified: `npm ci` / `pip -r requirements.txt`
- Tests run: `npm test` / `pytest -q`
- Lint pass: `npm run lint`
- Where to find CI logs and deploy dashboards

## Where to record decisions

- Add short entries to DECISIONS.md or create an issue with the decision tag. Each entry should include: title, date, owner, 1-line summary, rationale, and link to PR/issue.

Record material decisions, blockers, and the next action here or in the active plan. Use GitHub Issues or the repository's tracker for bugs and follow-up work.
```
