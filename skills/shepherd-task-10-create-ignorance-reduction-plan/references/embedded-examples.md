# Embedded ignorance-reduction plan examples

## Embedded Examples

The following are real, completed ignorance reduction plans. Study them to understand the expected depth, formatting, and tone. When you create a NEW plan, the **Resolution:** sections must be EMPTY (the human fills them in).

### Example 1: Java `@CopilotTool` ergonomics (copilot-sdk, issue #1682)

```markdown
# Implementation plan: `@CopilotTool` ergonomics (issue #1682)

Human DRI: Ed Burns<br>
ADR: `java/docs/adr/adr-005-tool-definition.md`<br>
Issue: https://github.com/github/copilot-sdk/issues/1682

---

## Completed phases

### Phase 1 ✅ — Define the problem and architectural decision

- ADR-005 evaluates three options (status quo, record-as-schema, annotation-on-method).
- Decision: annotation-on-method with compile-time JSR 269 processor (langchain4j-style API, Micronaut-style implementation).

### Phase 2 ✅ — Verify the existing low-level path works in Java

- `test/snapshots/tools/low_level_tool_definition.yaml` created.
- `LowLevelToolDefinitionIT` passes with explicit `ToolDefinition.create()` / `createOverride()`.
- This proves the low-level API is correct and will serve as the foundation that the high-level API delegates to.

---

## Phase 3 — Ignorance reduction: questions to answer before writing code

This phase is about eliminating unknowns. Each item is a question or spike. Resolve these **before** writing production code.

### 3.1 — Package placement

**Question:** Where do `@CopilotTool` and `@Param` live?

Current SDK structure is a single module (`copilot-sdk-java`). Two options:

| Option | Location | Trade-off |
|--------|----------|-----------|
| A | `com.github.copilot.rpc` (alongside `ToolDefinition`) | Keeps everything together but the `rpc` package is already dense (40+ classes). |
| B | New package `com.github.copilot.tool` | Cleaner separation; the `tool` package holds annotations, processor, and `ToolDefinition.fromObject()`. But `ToolDefinition` itself stays in `rpc` (it's a JSON-RPC type). |

**Recommendation:** Option B — new `com.github.copilot.tool` package for annotations + processor + schema generation. `ToolDefinition` stays in `rpc` and gets a new static method `fromObject(Object)` that delegates to `tool` package internals.

**Action:** Decide; update `module-info.java` exports if new package is added.

**Resolution:** Select Option B.

### 3.2 — `@CopilotTool` annotation design

**Question:** What attributes does `@CopilotTool` need?

Based on ADR-005 and the C#/langchain4j comparisons:

```java
@Documented
@Retention(RetentionPolicy.SOURCE)   // only needed at compile time for processor
@Target(ElementType.METHOD)
@CopilotExperimental
public @interface CopilotTool {
    /** Tool description (sent to the model). */
    String value();

    /** Tool name. Defaults to method name converted to snake_case. */
    String name() default "";

    /** Whether this tool overrides a built-in tool. */
    boolean overridesBuiltInTool() default false;

    /** Whether to skip permission checks. */
    boolean skipPermission() default false;
}
```

**Open questions:**

1. Should `@CopilotTool` have `@Retention(SOURCE)` or `RUNTIME`? ADR-005 says "compile-time preferred, runtime fallback" — if we want a fallback path, we need `RUNTIME`.

2. Is `ToolDefer` needed on the annotation, or is that too niche for v1?

**Recommendation:** Start with `RUNTIME` retention so the reflection fallback works. Defer `ToolDefer` support to a follow-up.

**Resolution:** Select `RUNTIME` and `ToolDefer` support.

### 3.3 — Type-to-JSON-Schema mapping

**Question:** What Java types do we need to map to JSON Schema, and how?

Minimum viable set:

| Java type | JSON Schema |
|-----------|-------------|
| `String` | `{"type": "string"}` |
| `int`, `Integer`, `long`, `Long` | `{"type": "integer"}` |
| `double`, `Double`, `float`, `Float` | `{"type": "number"}` |
| `boolean`, `Boolean` | `{"type": "boolean"}` |
| `enum` types | `{"type": "string", "enum": ["V1", "V2", ...]}` |
| `List<T>`, `Collection<T>` | `{"type": "array", "items": <schema-of-T>}` |

**Key design decision:** The annotation processor must generate this schema at compile time from `javax.lang.model` types (`TypeMirror`, `DeclaredType`, etc.), NOT from `java.lang.reflect` types.

**Spike needed:** Write a small proof-of-concept that maps `TypeMirror` → JSON Schema `Map` literal in generated source code.

**Recommendation:** Start with flat types (primitives, String, enums) and `List<primitive>`. Defer nested records to a follow-up.

**Resolution:**

### 3.4 — Generated code shape

**Question:** What exactly does the processor generate?

```java
// GENERATED — do not edit
final class MyTools$$CopilotToolMeta {
    static List<ToolDefinition> definitions(MyTools instance) {
        return List.of(
            new ToolDefinition("set_current_phase", "Sets the current phase",
                Map.of("type", "object",
                       "properties", Map.of("phase", Map.of("type", "string",
                               "description", "The phase to transition to")),
                       "required", List.of("phase")),
                invocation -> {
                    String phase = (String) invocation.getArguments().get("phase");
                    return CompletableFuture.completedFuture(
                        instance.setCurrentPhase(phase));
                }, null, null, null)
        );
    }
}
```

**Open questions:**

1. Access levels — require public/package-private, or support private via MethodHandles?
2. Return type handling — String, void, CompletableFuture, other?
3. Argument deserialization — direct casts vs ObjectMapper.convertValue()?

**Recommendation:** Require at least package-private. Support String, void, CompletableFuture<String>. Use direct casts for simple types, ObjectMapper for complex.

**Resolution:**

---

## Phase 4 — Implementation (the build order)

After Phase 3 questions are resolved, implement in this order. Each step should be a separately testable commit.

### 4.1 — Annotations (`@CopilotTool`, `@Param`)

**What:** Create the two annotation classes.

**Files to create:**
- `java/src/main/java/com/github/copilot/tool/CopilotTool.java`
- `java/src/main/java/com/github/copilot/tool/Param.java`

**Tests:** Compile-only: ensure they compile and can be applied.

**Gating criteria:** `mvn clean compile` passes.

### 4.2 — Schema generation utility

**What:** Utility class that maps `javax.lang.model` types to JSON Schema `Map` literals.

**Tests:** Unit tests exercising type-to-schema mapping.

**Gating criteria:** Correct schema for String, int, boolean, enum, List<String>.

### 4.3 — Annotation processor

**What:** JSR 269 processor that generates `$$CopilotToolMeta` classes.

**Tests:** Compilation tests with programmatic JavaCompiler.

**Gating criteria:** Generates correct metadata for 2-3 `@CopilotTool` methods.

### 4.4 — `ToolDefinition.fromObject(Object)`

**What:** Runtime bridge that loads generated metadata.

**Tests:** End-to-end: annotated class → processor → fromObject() → working tools.

**Gating criteria:** Returns working `List<ToolDefinition>`.

### 4.5 — E2E integration test

**What:** Failsafe IT using ergonomic API against replay proxy.

**Gating criteria:** Same assertions as low-level test pass.

---

## Phase 5 — Documentation and examples

- Update `java/README.md` with ergonomic tool definition example.
- Reference ADR-005 for design rationale.
```

### Example 2: Java Real Estate Demo (BRK-206, dd-3017826)

```markdown
# Implementation plan: Java Real Estate Agent Orchestrator Demo (dd-3017826)

Human DRI: Ed Burns<br>
Reference C# demo: `BRK206-00/src/AgentOrchestrator/`<br>
Copilot SDK for Java: `copilot-sdk/java/` (version 1.0.7-SNAPSHOT)<br>
Related ADRs: `java/docs/adr/adr-005-tool-definition.md`, `java/docs/adr/adr-006-tool-definition-inline.md`

---

## Goal

Create a Java analog of the C# Blazor AgentOrchestrator demo that showcases the Copilot SDK for Java. The demo implements a real-estate lead-management pipeline powered by multiple concurrent `CopilotSession` agents with custom tools, system message customization, and real-time UI updates.

### Technology stack

| Concern | Technology |
|---------|-----------|
| Runtime | OpenLiberty 26.0.0.5 |
| Platform | Jakarta EE 11 (Faces 4.0, CDI 4.0, WebSocket 2.1) |
| UI framework | PrimeFaces 15.0.16 |
| AI orchestration | Copilot SDK for Java 1.0.7-SNAPSHOT |
| Database | H2 in-memory |
| Build | Maven, Liberty Maven Plugin |

### SDK features to demonstrate

1. Custom tool definition via `@CopilotTool` annotations
2. Agentic session loop (`session.sendAndWait(...)`)
3. System message customization
4. Real-time session events
5. Multiple concurrent sessions
6. Permission handling

---

## Completed phases

### Phase 1 ✅ — Define the architecture mapping (C# → Java)

- Component mapping table (Program.cs → server.xml+CDI, AppState → @ApplicationScoped, etc.)
- Threading model (Task.Run → virtual threads, await → .join())
- Project structure defined

---

## Phase 2 — Ignorance reduction: questions to answer before writing code

### 2.1 — CopilotClient lifecycle in Jakarta CDI

**Question:** How should `CopilotClient` be created and managed in CDI?

The C# demo creates `CopilotClient` as a singleton in `AppState`. In Java, `CopilotClient` implements `AutoCloseable`. We need:

1. A `@Produces @ApplicationScoped` method that creates the client in `Empty` mode.
2. A `@Disposes` method that calls `close()` on shutdown.

**Spike needed:** Verify `CopilotClient` constructor options in 1.0.7-SNAPSHOT support `Empty` mode and `baseDirectory`.

**Resolution:**

### 2.2 — `sendAndWait` blocking semantics on virtual threads

**Question:** Does the Java SDK's `sendAndWait(...)` block the calling thread, or does it return a `CompletableFuture`?

If it returns `CompletableFuture`, we call `.join()` on a virtual thread. If synchronous, call directly.

**Resolution:**

### 2.3 — Session event subscription in Java SDK

**Question:** What is the Java equivalent of `Session.On<SessionEvent>(handler)`?

Need to confirm:
- The method name and signature
- Whether it accepts a `Class<T>` event type filter
- Whether the handler receives events on the calling thread or a callback thread

**Resolution:**

### 2.4 — WebSocket push from CDI to JSF

**Question:** How do we push UI updates from a background virtual thread to the browser?

Options:
| Option | Mechanism |
|--------|-----------|
| A | `f:websocket` (Jakarta Faces 4.0 built-in) |
| B | PrimeFaces `p:socket` |
| C | Raw Jakarta WebSocket endpoint |

**Recommendation:** Option A — standard, no PrimeFaces-specific coupling.

**Resolution:**

---

## Phase 3 — Implementation

### 3.1 — Project skeleton

**What:** Maven project with Liberty plugin, server.xml, minimal Faces page.

**Gating criteria:** `mvn liberty:run` starts; index.xhtml renders.

### 3.2 — Property database + JPA seeding

**What:** H2 in-memory DB, JPA entities, seed 100 properties from JSON.

**Gating criteria:** Properties queryable from a test CDI bean.

### 3.3 — CopilotClient + session lifecycle

**What:** CDI producer, agent class, single-agent run loop.

**Gating criteria:** One agent completes a session with a custom tool.

### 3.4 — Full pipeline + UI

**What:** Multi-agent orchestration, WebSocket push, PrimeFaces UI.

**Gating criteria:** Full pipeline demo works end-to-end.
```

### Example 3: Python Agent Demo (BRK-206, issue #28)

```markdown
# Implementation plan: Python Real Estate Agent Orchestrator Demo (28-python-agent-demo)

Human DRI: Ed Burns<br>
Reference C# demo: `src/AgentOrchestrator/`<br>
Reference Java demo: `src/java-agent-orchestrator/`<br>
Python project root: `src/python_agent_orchestrator/`

---

## Goal

Create a Python analog of the C# Blazor AgentOrchestrator demo that showcases the GitHub Copilot SDK for Python. Same pipeline (Queued → Validating → Searching → Writing Report → Done/Rejected) with multiple concurrent agent sessions, custom tools, and real-time UI updates.

### Technology stack

| Concern | Technology |
|---------|-----------|
| Runtime | CPython 3.14 |
| Backend | FastAPI (ASGI, asyncio-native) |
| UI | Jinja2 + HTMX + Alpine.js + Tailwind CSS |
| Real-time | FastAPI WebSocket |
| AI orchestration | Copilot SDK for Python |
| Database | SQLite in-memory via SQLModel |

### SDK features to demonstrate

1. Custom tool definition (`@define_tool` decorator)
2. Agentic session loop
3. System message customization
4. Real-time session events
5. Multiple concurrent sessions

---

## Phase 1 — Define the architecture mapping (C# → Python)

### 1.1 — Component mapping

| C# Component | Python Equivalent | Notes |
|---|---|---|
| `Program.cs` | `main.py` (FastAPI app factory) | ASGI with lifespan |
| `AppState.cs` | `app_state.py` singleton | Holds client + agents dict |
| `Agent.cs` | `agent.py` async class | Each agent = asyncio.Task |
| `PropertyDatabase.cs` | `property_database.py` (SQLModel) | SQLite in-memory |
| Blazor interactive | HTMX + Alpine.js | Server-rendered + progressive |
| `CopilotTool.DefineTool(method)` | `@define_tool` decorator | SDK native |

### 1.2 — Concurrency model

| C# | Python |
|---|---|
| `Task.Run(...)` | `asyncio.create_task(...)` |
| `await SendAndWaitAsync(...)` | `await session.send()` + `SessionIdleData` |
| `Task.Delay(...)` | `await asyncio.sleep(...)` |

---

## Phase 2 — Ignorance reduction: questions to answer before writing code

### 2.1 — CopilotClient lifecycle in FastAPI

**Question:** How should `CopilotClient` be created and managed in a FastAPI app?

Need:
1. Lifespan handler that creates client on startup, calls `stop()` on shutdown.
2. Decision on `mode="empty"` vs default mode.

**Spike needed:** Confirm `CopilotClient(mode="empty")` works for headless server-side orchestration.

**Resolution:**

### 2.2 — Session send-and-wait pattern

**Question:** The Python SDK's `session.send(msg)` just sends — completion is signaled by `SessionIdleData`. How do we replicate the agentic loop?

**Spike needed:** Confirm multi-turn tool calls work with the wait pattern.

**Resolution:**

### 2.3 — WebSocket push from asyncio to browser

**Question:** How do we push UI updates from a `session.on()` callback to the browser?

**Spike needed:** Verify broadcasting from inside a sync callback works (may need `asyncio.run_coroutine_threadsafe()`).

**Resolution:**

### 2.4 — Property database: SQLModel + SQLite

**Question:** Can synchronous SQLModel handle the load without blocking the event loop?

**Spike needed:** Measure query latency for in-memory reads.

**Resolution:**

---

## Phase 3 — Implementation

### 3.1 — Project skeleton

**What:** FastAPI app, pyproject.toml, basic route.

**Gating criteria:** `uvicorn main:app` starts; health endpoint responds.

### 3.2 — Property database + seeding

**What:** SQLModel models, seed from JSON files.

**Gating criteria:** `pytest test_property_database.py` passes.

### 3.3 — CopilotClient + agent lifecycle

**What:** Lifespan handler, agent class, single-agent run.

**Gating criteria:** One agent completes with a custom tool.

### 3.4 — Full pipeline + WebSocket UI

**What:** Multi-agent orchestration, HTMX/Alpine UI, WebSocket push.

**Gating criteria:** Full pipeline demo works end-to-end.
```

---
