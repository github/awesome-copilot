# Understanding the Application

This reference covers Step 1 of the eval-driven-dev process in detail: how to read the codebase, map the data flows, and document your findings.

---

## What to investigate

Before touching any code, spend time actually reading the source. The code will tell you more than asking the user would.

### 1. How the software runs

What is the entry point? How do you start it? Is it a CLI, a server, a library function? What are the required arguments, config files, or environment variables?

### 2. Find where the LLM provider client is called

Locate every place in the codebase where an LLM provider client is invoked (e.g., `openai.ChatCompletion.create()`, `client.chat.completions.create()`, `anthropic.messages.create()`). These are the anchor points for your analysis. For each LLM call site, record:

- The file and function where the call lives
- Which LLM provider/client is used
- The exact arguments being passed (model, messages, tools, etc.)

### 3. Track backwards: external data dependencies flowing IN

Starting from each LLM call site, trace **backwards** through the code to find every piece of data that feeds into the LLM prompt. Categorize each data source:

**Application inputs** (from the user / caller):

- User messages, queries, uploaded files
- Configuration or feature flags

**External dependency data** (from systems outside the app):

- Database lookups (conversation history from Redis, user profiles from Postgres, etc.)
- Retrieved context (RAG chunks from a vector DB, search results from an API)
- Cache reads
- Third-party API responses

For each external data dependency, document:

- What system it comes from
- What the data shape looks like (types, fields, structure)
- What realistic values look like
- Whether it requires real credentials or can be mocked

**In-code data** (assembled by the application itself):

- System prompts (hardcoded or templated)
- Tool definitions and function schemas
- Prompt-building logic that combines the above

### 4. Track forwards: external side-effects flowing OUT

Starting from each LLM call site, trace **forwards** through the code to find every side-effect the application causes in external systems based on the LLM's output:

- Database writes (saving conversation history, updating records)
- API calls to third-party services (sending emails, creating calendar entries, initiating transfers)
- Messages sent to other systems (queues, webhooks, notifications)
- File system writes

For each side-effect, document:

- What system is affected
- What data is written/sent
- Whether this side-effect is something evaluations should verify (e.g., "did the agent route to the correct department?")

### 5. Identify intermediate states to capture

Along the paths between input and output, identify intermediate states that are necessary for proper evaluation but aren't visible in the final output:

- Tool call decisions and results (which tools were called, what they returned)
- Agent routing / handoff decisions
- Intermediate LLM calls (e.g., summarization before final answer)
- Retrieval results (what context was fetched)
- Any branching logic that determines the code path

These are things that evaluators will need to check criteria like "did the agent verify identity before transferring?" or "did it use the correct tool?"

### 6. Use cases and expected behaviors

What are the distinct things the app is supposed to handle? For each use case, what does a "good" response look like? What would constitute a failure?

---

## Writing MEMORY.md

Write your findings to `pixie_qa/MEMORY.md`. This is the primary working document for the eval effort. It should be human-readable and detailed enough that someone unfamiliar with the project can understand the application and the eval strategy.

**MEMORY.md documents your understanding of the existing application code. It must NOT contain references to pixie commands, instrumentation code you plan to add, or scripts/functions that don't exist yet.** Those belong in later steps, only after they've been implemented.

### Template

```markdown
# Eval Notes: <Project Name>

## How the application works

### Entry point and execution flow

<Describe how to start/run the app, what happens step by step>

### LLM call sites

<For each LLM call in the codebase, document:>

- Where it is in the code (file + function name)
- Which LLM provider/client is used
- What arguments are passed

### External data dependencies (data flowing IN to LLM)

<For each external system the app reads from:>

- **System**: <e.g., Redis, Postgres, vector DB, third-party API>
- **What data**: <e.g., conversation history, user profile, retrieved documents>
- **Data shape**: <types, fields, structure, realistic values>
- **Code path**: <file:line where each read happens>
- **Credentials needed**: <yes/no, what kind>

### External side-effects (data flowing OUT from LLM output)

<For each external system the app writes to / affects:>

- **System**: <e.g., database, API, queue, file system>
- **What happens**: <e.g., saves conversation, sends email, creates calendar entry>
- **Code path**: <file:line where each write happens>
- **Eval-relevant?**: <should evaluations verify this side-effect?>

### Pluggable/injectable interfaces (testability seams)

<For each abstract base class, protocol, or constructor-injected backend:>

- **Interface**: <e.g., `TranscriptionBackend`, `SynthesisBackend`, `StorageBackend`>
- **Defined in**: <file:line>
- **What it wraps**: <e.g., real STT service, real TTS service, Redis>
- **How it's injected**: <constructor param, module-level var, dependency injection framework>
- **Mock strategy**: <what mock implementation should do — e.g., decode UTF-8 instead of real STT>

These are the primary testability seams. In Step 3, you'll write mock implementations of these interfaces.

### Mocking plan summary

<For each external dependency, how will you replace it in the utility function (Step 3)?>

| Dependency          | Mock approach                  | What mock provides (IN)                | What mock captures (OUT) |
| ------------------- | ------------------------------ | -------------------------------------- | ------------------------ |
| <e.g., Redis>       | <mock.patch / mock class / DI> | <conversation history from eval_input> | <saved messages>         |
| <e.g., STT service> | <MockTranscriptionBackend>     | <text from eval_input>                 | <n/a>                    |

### Intermediate states to capture

<States along the execution path needed for evaluation but not in final output:>

- <e.g., tool call decisions, routing choices, retrieval results>
- Include code pointers (file:line) for each

### Final output

<What the user sees, what format, what the quality bar should be>

### Use cases

<List each distinct scenario the app handles, with examples of good/bad outputs>

1. <Use case 1>: <description>
   - Input example: ...
   - Good output: ...
   - Bad output: ...

## Evaluation plan

### What to evaluate and why

<App-specific quality dimensions and rationale — filled in during Step 1>

### Evaluators and criteria

<Filled in during Step 5 — maps each quality criterion to a specific evaluator>

| Criterion | Evaluator | Dataset | Pass criteria | Rationale |
| --------- | --------- | ------- | ------------- | --------- |
| ...       | ...       | ...     | ...           | ...       |

### Data needed for evaluation

<What data to capture, with code pointers>

## Datasets

| Dataset | Items | Purpose |
| ------- | ----- | ------- |
| ...     | ...   | ...     |

## Investigation log

### <date> — <test_name> failure

<Structured investigation entries — filled in during Step 6>
```

If something is genuinely unclear from the code, ask the user — but most questions answer themselves once you've read the code carefully.
