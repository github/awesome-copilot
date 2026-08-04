# The 7 AG-UI interaction patterns on this stack

These are the canonical AG-UI "dojo" patterns (dojo.ag-ui.com has live Microsoft Agent Framework examples). The MAF AG-UI integration documents support for all seven. The table maps each pattern to its agent-side and CopilotKit-side implementation; the notes that follow cover what is NOT obvious.

CopilotKit hook naming: `useCopilotAction` still exists but is documented as a legacy compatibility hook. Current names: `useFrontendTool` (agent-callable frontend tools), `useHumanInTheLoop` (approval UI; successor to `useCopilotAction` with `renderAndWaitForResponse`), `useRenderToolCall` / `useRenderTool` (render-only generative UI), `useCoAgent` / `useCoAgentStateRender` (shared state). Verify the exact exports against the installed package's TypeScript declarations — names have moved between minors.

| # | Pattern | Agent side (MAF Python) | CopilotKit side |
| --- | --- | --- | --- |
| 1 | Agentic chat + frontend tools | plain `Agent` — frontend tools arrive via `RunAgentInput.tools` | `useFrontendTool({ name, parameters, handler })` |
| 2 | Backend tool rendering | `@tool` (executes server-side) | `useRenderToolCall` / render entry for the tool name |
| 3 | Human-in-the-loop | `@tool(approval_mode="always_require")` + `AgentFrameworkAgent(require_confirmation=True)` | `useHumanInTheLoop({ name, render })`, resolve via `respond(...)` |
| 4 | Agentic generative UI | long-running tool emitting progress state | `useCoAgentStateRender` rendering in-progress state |
| 5 | Tool-based generative UI | declaration-only tool (no executable body) the model must call | `useFrontendTool` with `render`, often `followUp: false` |
| 6 | Shared state | state schema + state updates from tools | `useCoAgent` — read `state`, write via `setState` |
| 7 | Predictive state updates | tool-argument streaming configured as optimistic state predictions | `useCoAgent` + confirmation UI |

## Notes that save hours

**Pattern 1 (frontend tools).** The tool executes in the browser; the agent only emits the call. If the agent reports it cannot see a frontend tool, check the CopilotKit runtime actually forwards registered tools into `RunAgentInput.tools` on the current package version — a regression in this exact forwarding existed in 1.62.x (CopilotKit/CopilotKit#5813, fixed shortly after). Upgrading or pinning past the fix matters more than any code change.

**Pattern 2 (backend tool rendering).** The render component receives the streamed tool-call arguments and, later, the result. Two rendering phases exist: live `TOOL_CALL_*` events during the run, and the `MESSAGES_SNAPSHOT` at run end. A card that renders during streaming can vanish at `RUN_FINISHED` if the snapshot represents the turn differently (notably: multiple tool calls lumped into one assistant message when the UI renders only the first). Always verify the card is still present after the run completes.

**Pattern 3 (HITL).** Full treatment in hitl.md — including the payload-shape contract and the duplicate-execution hazard.

**Pattern 5 (tool-based generative UI).** The agent-side tool is a declaration without an implementation — the model "calls" it and the frontend renders the arguments as UI. Use `followUp: false` when the tool call is the terminal act of the turn, otherwise the agent narrates the tool call redundantly. If the model must always produce the UI, constrain tool choice on the agent side rather than hoping the prompt suffices.

**Patterns 4/6/7 (state family) — architecture dependency.** `STATE_SNAPSHOT`/`STATE_DELTA` (RFC 6902 JSON Patch) events are emitted natively only when the AG-UI adapter wraps an in-process agent (Architectures A and B in architecture.md). A Responses-protocol bridge (Architecture C) does not get these events from the hosted agent; they must be synthesized by the bridge from tool-argument deltas, and `setState` from the client must be explicitly forwarded into the agent's input. Before implementing a shared-state feature, confirm which side of this line the codebase is on — otherwise you will write frontend code against events that never arrive. `useCoAgent().state` staying permanently empty usually means the agent has no state schema configured or no tool ever writes the state key, not a frontend bug.

**Parameter renames ripple into the UI.** Render components typically parse specific fields out of the streamed tool arguments. Renaming a Python tool parameter silently breaks the card (wrong/missing field) while the agent keeps working — the bridge/adapter forwards arguments verbatim. Grep the frontend for the old field name whenever you rename a tool parameter.

**Grounding-safe tool docstrings.** Don't embed concrete example values in parameter descriptions for fields the model should derive from live data (account numbers, IDs, amounts): models copy literal examples from descriptions into real calls. Describe the shape, use placeholders, and validate inside the tool.
