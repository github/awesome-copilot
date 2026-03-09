# ContextStream Taxonomy

> **Source of truth**: https://contextstream.io/docs/event-types

## Event Types

Events are temporal records. The `session(action="capture")` tool accepts these **exact enum values** for `event_type`:

| Event Type | Enum Value | When to Use |
|------------|-----------|-------------|
| Conversation | `conversation` | General conversation capture, meeting notes |
| Decision | `decision` | Architecture choice, technology selection, pattern adoption |
| Insight | `insight` | Analysis result, review summary, pattern discovery |
| Preference | `preference` | User convention expressed during session |
| Note | `note` | General-purpose note |
| Implementation | `implementation` | Code delivered, feature complete, refactor done |
| Task | `task` | Task status update or work item |
| Bug | `bug` | Bug discovered, defect report |
| Feature | `feature` | Feature request or proposal |
| Plan | `plan` | Auto-created by `capture_plan` — do not create manually |
| Correction | `correction` | User corrected the AI's approach |
| Lesson | `lesson` | Extracted lesson from correction |
| Warning | `warning` | Critical issue, security bug, proactive reminder |
| Frustration | `frustration` | User expressed frustration (auto-triggers lesson capture) |
| Session Snapshot | `session_snapshot` | Pre-compaction state capture (used by `capture_smart`) |

> **Note**: `memory(action="create_event")` accepts **any string** for `event_type` — it's more flexible than session capture. Use the standard values above for consistency.

### Classification System (v0.4.64 verified)

ContextStream normalizes user-specified `event_type` values into **3 storage categories**. The original type is preserved in `metadata.original_type`.

| Input Category | Stored `event_type` | Inputs |
|---------------|---------------------|--------|
| Most capture types | `manual_note` | decision, implementation, warning, preference, note, session_snapshot, insight, lesson |
| Bug/feature reports | `ticket` | bug, feature |
| Quick-save (remember) | `preference` | remember |

> This causes query tools (`decisions()`, `decision_trace()`, `get_lessons()`) to return empty — they filter on the stored `event_type` instead of `metadata.original_type`. Workaround: use `recall(query="...")` for semantic search instead.

## Node Types (Knowledge Graph)

Nodes are persistent knowledge entries captured via `memory(action="create_node")`. The `node_type` field accepts **any string** — use descriptive types for discoverability.

**Recommended node types**:

| Node Type | When to Use | Category Examples |
|-----------|------------|-------------------|
| `fact` | Verified truth about the codebase, API, or system | `"architecture"`, `"sdk-pattern"`, `"dependency"` |
| `preference` | User convention, coding standard, workflow rule | `"code-style"`, `"workflow"`, `"tooling"` |
| `constraint` | Hard rule that must not be violated | `"architecture"`, `"tier-rules"`, `"security"` |
| `decision` | Resolved choice (node form for standing rules) | `"architecture"`, `"technology"` |
| `finding` | Discovery from analysis, review, or investigation | `"cross-cutting"`, `"review"`, `"debt"` |
| `hypothesis` | Unverified theory, proposed improvement | `"improvement"`, `"refactor"`, `"experiment"` |
| `bug` | Known defect, broken behavior, security vulnerability | `"security"`, `"compilation"`, `"test-failure"` |
| `lesson` | Learned pattern from mistake or correction | `"anti-pattern"`, `"tooling"`, `"workflow"` |
| `habit` | Recurring user behavior pattern to optimize for | `"workflow"`, `"preference"` |
| `code` | Code snippet, pattern, or template worth preserving | `"pattern"`, `"template"`, `"example"` |
| `insight` | Analytical observation | `"review"`, `"analysis"` |
| `commit` | Notable commit worth referencing | `"milestone"`, `"breaking-change"` |
| `doc` | Reference documentation or spec (node form) | `"api"`, `"architecture"` |
| `pr` | Pull request context or review notes | `"review"`, `"merge"` |
| `ticket` | Issue tracker reference | `"feature"`, `"bug"`, `"enhancement"` |
| `conversation` | Important discussion worth preserving | `"design"`, `"requirements"` |
| `meeting` | Meeting notes or outcomes | `"standup"`, `"planning"` |
| `general` | Generic node that doesn't fit other types | — |

## Choosing Between Events and Nodes

| Use Case | Use Event | Use Node |
|----------|-----------|----------|
| Something happened at a point in time | ✅ Event (temporal) | — |
| A standing truth or rule | — | ✅ Node (persistent) |
| Architecture decision | ✅ Decision event (when made) | ✅ Decision node (as standing rule) |
| Bug discovered during review | ✅ Warning event (to alert) | ✅ Bug node (to track) |
| Cross-cutting pattern found | ✅ Insight event (in review) | ✅ Finding node (as reference) |
| User coding convention | — | ✅ Preference node |
| Something to investigate later | — | ✅ Hypothesis node |

**Best practice**: For important discoveries, capture **both** an event (temporal record) and a node (persistent knowledge). Events answer "what happened when?" — nodes answer "what do we know?"

## Dual Capture Pattern

For important discoveries, capture **both** forms:

1. **Event** (temporal — "when did we learn this?"):
```
mcp_contextstream_session(
  action="capture", event_type="warning",
  title="Security: delete endpoint missing ownership check",
  content="Discovered during server endpoint review..."
)
```

2. **Node** (persistent knowledge — "what do we know?"):
```
mcp_contextstream_memory(
  action="create_node", node_type="bug",
  title="Security: delete endpoint ignores resource ownership",
  content="Delete method allows any authenticated user to delete any resource...",
  category="security"
)
```

## What to ALWAYS Store

- Architecture decisions (Decision event + Decision/Preference node)
- Critical bugs and security issues (Warning event + Bug node)
- Cross-cutting patterns from reviews (Insight event + Finding node)
- User conventions and rules (Preference node)
- Hard architectural constraints (Constraint node)
- Improvement theories to evaluate later (Hypothesis node)
- Implementation completions with provenance (Implementation event)
- Lessons from mistakes (`capture_lesson`)
- Review summaries (Insight event)
- Dependency diagrams (Diagram)
- Architecture specs and roadmaps (Doc)

## What NOT to Store

- Trivial file reads or searches (noise)
- Intermediate tool outputs (ephemeral)
- Things already in git history (redundant)
- Per-line code changes (too granular — summarize instead)

## Anti-Patterns

1. **Using only `insight` events for everything** — use the proper event type
2. **Embedding decisions inside review prose** — extract each as its own Decision event
3. **Skipping node creation** — events record when, nodes make it findable. Create both.
4. **Not creating diagrams** — Mermaid diagrams persist across sessions
5. **Not updating docs** — stale docs mislead future sessions
6. **Ignoring preferences** — they surface in `context()`. Capture them.
7. **Truncating UUIDs** — always use full UUID from API responses
8. **Not calling `context()` each message** — context pressure and relevant decisions are missed
