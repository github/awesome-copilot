# Self-Learning System

Maintain project learning artifacts under a designated lessons/memories directory (e.g., `.github/SecurityLessons` and `.github/SecurityMemories`).

## When to Create

### Lesson

Create a lesson when:

- A scan produces a false positive that required manual correction
- A finding category, STRIDE category, or flaw type is missed on first pass and caught by the self-critique loop
- A tool or methodology limitation is discovered
- A language-specific rule misfires
- An SCA dependency cannot be resolved

### Memory

Create a memory when:

- An architecture decision, security convention, or technology stack detail is discovered
- A dependency management pattern, domain-specific threat pattern, or threat actor profile is identified
- A project coding convention, framework idiom, or known false-positive pattern is found
- Any codebase-specific knowledge would be useful for future scans of the same codebase

## Lesson Template

```markdown
# Security Lesson: <short-title>

## Metadata

- CreatedAt: <date>
- Status: active | deprecated
- Supersedes: <previous lesson if any>

## Context

- Triggering scan/task:
- Component analyzed:

## Issue

- What went wrong or was missed:
- Expected behavior:
- Actual behavior:

## Root Cause

- Why was this missed or incorrect:

## Resolution

- How it was corrected:

## Preventive Guidance

- How to avoid this in future scans:
```

## Memory Template

```markdown
# Security Memory: <short-title>

## Metadata

- CreatedAt: <date>
- Status: active | deprecated
- Supersedes: <previous memory if any>

## Context

- Triggering scan/task:
- Scope/system:

## Key Fact

- What was discovered:
- Why it matters for security analysis:

## Reuse Guidance

- When to apply this knowledge:
- Related components:
```

## Governance Rules

1. **Dedup check**: Before creating a new lesson or memory, search existing files for similar content. Update existing records rather than creating duplicates.
2. **Conflict resolution**: If new evidence conflicts with an existing active lesson/memory, mark the older one as `deprecated` and create the updated version with a `Supersedes` reference.
3. **Reuse at scan start**: At the start of every analysis, check the lessons/memories directory for applicable context. Apply relevant guidance before beginning analysis.
