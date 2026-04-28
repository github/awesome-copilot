# Step 2a: Instrument with `wrap`

> For the full `wrap()` API reference, see `wrap-api.md`.

**Goal**: Add `wrap()` calls at data boundaries so the eval harness can (1) inject controlled inputs in place of real external dependencies, and (2) capture outputs for scoring.

---

## Data-flow analysis

Starting from LLM call sites, trace backwards and forwards through the code to find:

- **Dependency input**: data from external systems (databases, APIs, caches, file systems, network fetches)
- **App output**: data going out to users or external systems
- **Intermediate state**: internal decisions relevant to evaluation (routing, tool calls)

You do **not** need to wrap LLM call arguments or responses — those are already captured by OpenInference auto-instrumentation.

## Adding `wrap()` calls

For each data point found, add a `wrap()` call in the application code:

```python
import pixie

# External dependency data — function form (prevents the real call in eval mode)
profile = pixie.wrap(db.get_profile, purpose="input", name="customer_profile",
    description="Customer profile fetched from database")(user_id)

# External dependency data — function form (prevents the real call in eval mode)
history = pixie.wrap(redis.get_history, purpose="input", name="conversation_history",
    description="Conversation history from Redis")(session_id)

# App output — what the user receives
response = pixie.wrap(response_text, purpose="output", name="response",
    description="The assistant's response to the user")

# Intermediate state — internal decision relevant to evaluation
selected_agent = pixie.wrap(selected_agent, purpose="state", name="routing_decision",
    description="Which agent was selected to handle this request")
```

### Value vs. function wrapping

```python
# Value form: wrap a data value (result already computed)
profile = pixie.wrap(db.get_profile(user_id), purpose="input", name="customer_profile")

# Function form: wrap the callable — in eval mode the original function is
# NOT called; the registry value is returned instead.
profile = pixie.wrap(db.get_profile, purpose="input", name="customer_profile")(user_id)
```

**CRITICAL: Always use function form for `purpose="input"` wraps on external calls** — HTTP requests, database queries, API calls, file reads, cache lookups. Function form prevents the real call from executing in eval mode, so the dataset value is returned directly without making a live network request or database query. Value form still executes the real call first and only replaces the result afterwards — this wastes time, creates flaky tests, and makes evals dependent on external service availability.

The only case where value form is acceptable for `purpose="input"` is when the wrapped value is a local computation (no I/O, no side effects) that is cheap to recompute.

### Placement rules

1. **Wrap at the data boundary** — where data enters or exits the application, not deep inside utility functions.
2. **Names must be unique** across the entire application (used as registry keys and dataset field names).
3. **Use `lower_snake_case`** for names.
4. **Don't change the function's interface** — `wrap()` is purely additive, returns the same type.

### Placement by purpose

#### `purpose="input"` — where external data enters

Place input wraps at the **boundary where external data enters the app**, not at intermediate processing stages. In a pipeline architecture (fetch → process → extract → format):

- **Correct**: `wrap(fetch_page, purpose="input", name="fetched_page")(url)` using **function form** at the HTTP fetch boundary — in eval mode, the fetch is skipped entirely and the dataset value is returned; in trace mode, the real fetch runs and the result is captured.
- **Incorrect**: `wrap(html_content, purpose="input", name="fetched_page")` using value form — the HTTP fetch still runs in eval mode (wasting time and creating flaky tests), and only the result is replaced afterwards.
- **Incorrect**: `wrap(processed_chunks, purpose="input", name="chunks")` after parsing — eval mode bypasses parsing and chunking entirely.

**Principle**: `wrap(purpose="input")` replaces the _minimum external dependency_ while exercising the _maximum internal logic_. Push the boundary as far upstream as possible. **Always use function form** for input wraps on external calls — this prevents the real call from executing in eval mode.

#### `purpose="output"` — where processed data exits

Track **downstream** from the LLM response to find where data leaves the app — sent to the user, written to storage, rendered in UI, or passed to an external system. Wrap at that exit boundary.

- Don't wrap raw LLM responses — those are already captured by OpenInference auto-instrumentation as `llm_span` entries.
- Wrap the app's **final processed result** — after any post-processing, formatting, or transformation the app applies to the LLM output.
- If the app has multiple output channels (e.g., a response to the user AND a side-effect write to a database), wrap each one separately.

```python
# Final response after the app's formatting pipeline
response = pixie.wrap(formatted_response, purpose="output", name="response",
    description="Final response sent to the user")

# Side-effect output — data written to external storage
pixie.wrap(saved_record, purpose="output", name="saved_summary",
    description="Summary record saved to the database")
```

**Principle**: output wraps are observation-only — they capture what the app produced so evaluators can score it. They are never mocked or injected during eval runs.

#### `purpose="state"` — internal decisions relevant to evaluation

Some eval criteria need to judge the app's internal reasoning — not just what went in or came out, but _how_ the app made decisions. Wrap internal state when an eval criterion requires it and the data isn't visible in inputs or outputs.

Common examples:

- **Agent routing**: which sub-agent or tool was selected to handle a request
- **Plan/step decisions**: what steps the agent chose to execute
- **Memory updates**: what the agent added to or removed from its working memory
- **Retrieval results**: which documents/chunks were retrieved before being fed to the LLM

```python
# Agent routing decision
selected_agent = pixie.wrap(selected_agent, purpose="state", name="routing_decision",
    description="Which agent was selected to handle this request")

# Retrieved context fed to LLM
pixie.wrap(retrieved_chunks, purpose="state", name="retrieved_context",
    description="Document chunks retrieved by RAG before LLM call")
```

**Principle**: only wrap state that an eval criterion actually needs. Don't wrap every variable — state wraps are for internal data that evaluators must see but that doesn't appear in the app's inputs or outputs.

### Coverage check

After adding all `wrap()` calls, go through each eval criterion from `pixie_qa/02-eval-criteria.md` and verify:

1. Every criterion that judges **what went in** has a corresponding `input` or `entry` wrap.
2. Every criterion that judges **what came out** has a corresponding `output` wrap.
3. Every criterion that judges **how the app decided** has a corresponding `state` wrap.

If a criterion needs data that isn't captured, add the wrap now — don't defer.

---

## Output

Modified application source files with `wrap()` calls at data boundaries.
