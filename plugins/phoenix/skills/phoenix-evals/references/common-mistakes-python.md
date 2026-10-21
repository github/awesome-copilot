# Common Mistakes (Python)

Patterns that LLMs frequently generate incorrectly from training data.

## Legacy Model Classes

```python
# WRONG
from phoenix.evals import OpenAIModel, AnthropicModel
model = OpenAIModel(model="gpt-4")

# RIGHT
from phoenix.evals import LLM
llm = LLM(provider="openai", model="gpt-4o")
```

**Why**: `OpenAIModel`, `AnthropicModel`, etc. are legacy 1.0 wrappers in `phoenix.evals.legacy`.
The `LLM` class is provider-agnostic and is the current 2.0 API.

## Using run_evals Instead of evaluate_dataframe

```python
# WRONG — legacy 1.0 API
from phoenix.evals import run_evals
results = run_evals(dataframe=df, evaluators=[eval1], provide_explanation=True)
# Returns list of DataFrames

# RIGHT — current 2.0 API
from phoenix.evals import evaluate_dataframe
results_df = evaluate_dataframe(dataframe=df, evaluators=[eval1])
# Returns single DataFrame with {name}_score dict columns
```

**Why**: `run_evals` is the legacy 1.0 batch function. `evaluate_dataframe` is the current
2.0 function with a different return format.

## Wrong Result Column Names

```python
# WRONG — column doesn't exist
score = results_df["relevance"].mean()

# WRONG — column exists but contains dicts, not numbers
score = results_df["relevance_score"].mean()

# RIGHT — extract numeric score from dict
scores = results_df["relevance_score"].apply(
    lambda x: x.get("score", 0.0) if isinstance(x, dict) else 0.0
)
score = scores.mean()
```

**Why**: `evaluate_dataframe` returns columns named `{name}_score` containing Score dicts
like `{"name": "...", "score": 1.0, "label": "...", "explanation": "..."}`.

## Deprecated project_name Parameter

```python
# WRONG
df = client.spans.get_spans_dataframe(project_name="my-project")

# RIGHT
df = client.spans.get_spans_dataframe(project_identifier="my-project")
```

**Why**: `project_name` is deprecated in favor of `project_identifier`, which also
accepts project IDs.

## Wrong Client Constructor

```python
# WRONG
client = Client(endpoint="https://app.phoenix.arize.com")
client = Client(url="https://app.phoenix.arize.com")

# RIGHT — for remote/cloud Phoenix
client = Client(base_url="https://app.phoenix.arize.com", api_key="...")

# ALSO RIGHT — for local Phoenix (falls back to env vars or localhost:6006)
client = Client()
```

**Why**: The parameter is `base_url`, not `endpoint` or `url`. For local instances,
`Client()` with no args works fine. For remote instances, `base_url` and `api_key` are required.

## Too-Aggressive Time Filters

```python
# WRONG — often returns zero spans
from datetime import datetime, timedelta
df = client.spans.get_spans_dataframe(
    project_identifier="my-project",
    start_time=datetime.now() - timedelta(hours=1),
)

# RIGHT — use limit to control result size instead
df = client.spans.get_spans_dataframe(
    project_identifier="my-project",
    limit=50,
)
```

**Why**: Traces may be from any time period. A 1-hour window frequently returns
nothing. Use `limit=` to control result size instead.

## Not Filtering Spans Appropriately

```python
# WRONG — fetches all spans including internal LLM calls, retrievers, etc.
df = client.spans.get_spans_dataframe(project_identifier="my-project")

# RIGHT for end-to-end evaluation — filter to top-level spans
df = client.spans.get_spans_dataframe(
    project_identifier="my-project",
    root_spans_only=True,
)

# RIGHT for RAG evaluation — fetch child spans for retriever/LLM metrics
all_spans = client.spans.get_spans_dataframe(
    project_identifier="my-project",
)
retriever_spans = all_spans[all_spans["span_kind"] == "RETRIEVER"]
llm_spans = all_spans[all_spans["span_kind"] == "LLM"]
```

**Why**: For end-to-end evaluation (e.g., overall answer quality), use `root_spans_only=True`.
For RAG systems, you often need child spans separately — retriever spans for
DocumentRelevance and LLM spans for Faithfulness. Choose the right span level
for your evaluation target.

## Assuming Span Output is Plain Text

```python
# WRONG — output may be JSON, not plain text
df["output"] = df["attributes.output.value"]

# RIGHT — parse JSON and extract the answer field
import json

def extract_answer(output_value):
    if not isinstance(output_value, str):
        return str(output_value) if output_value is not None else ""
    try:
        parsed = json.loads(output_value)
        if isinstance(parsed, dict):
            for key in ("answer", "result", "output", "response"):
                if key in parsed:
                    return str(parsed[key])
    except (json.JSONDecodeError, TypeError):
        pass
    return output_value

df["output"] = df["attributes.output.value"].apply(extract_answer)
```

**Why**: LangChain and other frameworks often output structured JSON from root spans,
like `{"context": "...", "question": "...", "answer": "..."}`. Evaluators need
the actual answer text, not the raw JSON.

## Using @create_evaluator for LLM-Based Evaluation

```python
# WRONG — @create_evaluator doesn't call an LLM
@create_evaluator(name="relevance", kind="llm")
def relevance(input: str, output: str) -> str:
    pass  # No LLM is involved

# RIGHT — use ClassificationEvaluator for LLM-based evaluation
from phoenix.evals import ClassificationEvaluator, LLM

relevance = ClassificationEvaluator(
    name="relevance",
    prompt_template="Is this relevant?\n{{input}}\n{{output}}\nAnswer:",
    llm=LLM(provider="openai", model="gpt-4o"),
    choices={"relevant": 1.0, "irrelevant": 0.0},
)
```

**Why**: `@create_evaluator` wraps a plain Python function. Setting `kind="llm"`
marks it as LLM-based but you must implement the LLM call yourself.
For LLM-based evaluation, prefer `ClassificationEvaluator` which handles
the LLM call, structured output parsing, and explanations automatically.

## Using llm_classify Instead of ClassificationEvaluator

```python
# WRONG — legacy 1.0 API
from phoenix.evals import llm_classify
results = llm_classify(
    dataframe=df,
    template=template_str,
    model=model,
    rails=["relevant", "irrelevant"],
)

# RIGHT — current 2.0 API
from phoenix.evals import ClassificationEvaluator, async_evaluate_dataframe, LLM

classifier = ClassificationEvaluator(
    name="relevance",
    prompt_template=template_str,
    llm=LLM(provider="openai", model="gpt-4o"),
    choices={"relevant": 1.0, "irrelevant": 0.0},
)
results_df = await async_evaluate_dataframe(dataframe=df, evaluators=[classifier])
```

**Why**: `llm_classify` is the legacy 1.0 function. The current pattern is to create
an evaluator with `ClassificationEvaluator` and run it with `async_evaluate_dataframe()`.

## Using HallucinationEvaluator

```python
# WRONG — deprecated
from phoenix.evals import HallucinationEvaluator
eval = HallucinationEvaluator(model)

# RIGHT — use FaithfulnessEvaluator
from phoenix.evals.metrics import FaithfulnessEvaluator
from phoenix.evals import LLM
eval = FaithfulnessEvaluator(llm=LLM(provider="openai", model="gpt-4o"))
```

**Why**: `HallucinationEvaluator` is deprecated. `FaithfulnessEvaluator` is its replacement,
using "faithful"/"unfaithful" labels with maximized score (1.0 = faithful).
