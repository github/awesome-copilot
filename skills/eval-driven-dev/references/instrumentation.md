# Instrumentation

This reference covers the tactical implementation of instrumentation in Step 2: how to use `@observe`, `enable_storage()`, and `start_observation` correctly.

For full API signatures and all available parameters, see `references/pixie-api.md` (Instrumentation API section).

For guidance on **what** to instrument (which functions, based on your eval criteria), see Step 2a in the main skill instructions.

---

## Adding `enable_storage()` at application startup

Call `enable_storage()` once at the beginning of the application's startup code — inside `main()`, or at the top of a server's initialization. **Never at module level** (top of a file outside any function), because that causes storage setup to trigger on import.

Good places:

- Inside `if __name__ == "__main__":` blocks
- In a FastAPI `lifespan` or `on_startup` handler
- At the top of `main()` / `run()` functions
- Inside the `runnable` function in test files

```python
# ✅ CORRECT — at application startup
async def main():
    enable_storage()
    ...

# ✅ CORRECT — in a runnable for tests
def runnable(eval_input):
    enable_storage()
    my_function(**eval_input)

# ❌ WRONG — at module level, runs on import
from pixie import enable_storage
enable_storage()  # this runs when any file imports this module!
```

---

## Wrapping functions with `@observe` or `start_observation`

Instrument the **existing function** that the app actually calls during normal operation. The `@observe` decorator or `start_observation` context manager goes on the production code path — not on new helper functions created for testing.

```python
# ✅ CORRECT — decorating the existing production function
from pixie import observe

@observe(name="answer_question")
def answer_question(question: str, context: str) -> str:  # existing function
    ...  # existing code, unchanged
```

```python
# ✅ CORRECT — decorating a class method (works exactly the same way)
from pixie import observe

class OpenAIAgent:
    def __init__(self, model: str = "gpt-4o-mini"):
        self.client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        self.model = model

    @observe(name="openai_agent_respond")
    def respond(self, user_message: str, conversation_history: list | None = None) -> str:
        # existing code, unchanged — @observe handles `self` automatically
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_message})
        response = self.client.chat.completions.create(model=self.model, messages=messages)
        return response.choices[0].message.content or ""
```

**`@observe` handles `self` and `cls` automatically** — it strips them from the captured input so only the meaningful arguments appear in traces. Do NOT create wrapper methods or call unbound methods to work around this. Just decorate the existing method directly.

```python
# ✅ CORRECT — context manager inside an existing function
from pixie import start_observation

async def main():  # existing function
    ...
    with start_observation(input={"user_input": user_input}, name="handle_turn") as obs:
        result = await Runner.run(current_agent, input_items, context=context)
        # ... existing response handling ...
        obs.set_output(response_text)
    ...
```

---

## Anti-patterns to avoid

### Creating new wrapper functions

```python
# ❌ WRONG — creating a new function that duplicates logic from main()
@observe(name="run_for_eval")
async def run_for_eval(user_messages: list[str]) -> str:
    # This duplicates what main() does, creating a separate code path
    # that diverges from production. Don't do this.
    ...
```

### Creating wrapper methods instead of decorating the existing method

```python
# ❌ WRONG — creating a new _respond_observed wrapper method
class OpenAIAgent:
    def respond(self, user_message, conversation_history=None):
        result = self._respond_observed({
            'user_message': user_message,
            'conversation_history': conversation_history,
        })
        return result['result']

    @observe
    def _respond_observed(self, args):
        # WRONG: creates a separate code path, changes the interface,
        # and breaks when called as an unbound method.
        ...

# ✅ CORRECT — just decorate the existing method directly
class OpenAIAgent:
    @observe(name="openai_agent_respond")
    def respond(self, user_message, conversation_history=None):
        ...  # existing code, unchanged
```

### Bypassing the app by calling the LLM directly

```python
# ❌ WRONG — calling the LLM directly instead of calling the app's function
@observe(name="agent_answer_question")
def answer_question(question: str) -> str:
    # This bypasses the entire app and calls OpenAI directly.
    # You're testing a script you just wrote, not the user's app.
    response = client.responses.create(
        model="gpt-4.1",
        input=[{"role": "user", "content": question}],
    )
    return response.output_text
```

---

## Rules

- **Never add new wrapper functions** to the application code for eval purposes.
- **Never bypass the app by calling the LLM provider directly** — if you find yourself writing `client.responses.create(...)` or `openai.ChatCompletion.create(...)` in a test or utility function, you're not testing the app. Import and call the app's own function instead.
- **Never change the function's interface** (arguments, return type, behavior).
- **Never duplicate production logic** into a separate "testable" function.
- The instrumentation is purely additive — if you removed all pixie imports and decorators, the app would work identically.
- After instrumentation, call `flush()` at the end of runs to make sure all spans are written.
- For interactive apps (CLI loops, chat interfaces), instrument the **per-turn processing** function — the one that takes user input and produces a response. The eval `runnable` should call this same function.

**Import rule**: All pixie symbols are importable from the top-level `pixie` package. Never import from submodules (`pixie.instrumentation`, `pixie.evals`, `pixie.storage.evaluable`, etc.) — always use `from pixie import ...`.

---

## What to instrument based on eval criteria

**LLM provider calls are auto-captured.** When you call `enable_storage()`, pixie activates OpenInference instrumentors that automatically trace every LLM API call (OpenAI, Anthropic, Google, etc.) with full input/output messages, token usage, and model parameters. You do NOT need `@observe` on a function just because it contains an LLM call — the LLM call is already instrumented.

**Use `@observe` for application-level functions** whose inputs, outputs, or intermediate states your evaluators need but that aren't visible from the LLM call alone:

| What your evaluator needs                                  | What to instrument with `@observe`                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------ |
| App-level input/output (what user sent, what app returned) | The app's entry-point or per-turn processing function                    |
| Retrieved context (for faithfulness/grounding checks)      | The retrieval function — captures what documents were fetched            |
| Routing/dispatch decisions                                 | The routing function — captures which tool/agent/department was selected |
| Side-effects sent to external systems                      | The function that writes to the external system — captures what was sent |
| Conversation history handling                              | The per-turn processing function — captures how history is assembled     |
| Intermediate processing stages                             | Each intermediate function — captures each stage                         |

If your eval criteria can be fully assessed from the auto-captured LLM inputs and outputs alone, you may not need `@observe` at all. But typically you need at least one `@observe` on the app's entry-point function to capture the application-level input/output shape that the dataset and evaluators work with.
