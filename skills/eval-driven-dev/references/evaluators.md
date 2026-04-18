# Built-in Evaluators

> Auto-generated from pixie source code docstrings.
> Do not edit by hand — regenerate from the upstream [pixie-qa](https://github.com/yiouli/pixie-qa) source repository.

Autoevals adapters — pre-made evaluators wrapping `autoevals` scorers.

This module provides :class:`AutoevalsAdapter`, which bridges the
autoevals `Scorer` interface to pixie's `Evaluator` protocol, and
a set of factory functions for common evaluation tasks.

Public API (all are also re-exported from `pixie.evals`):

**Core adapter:** - :class:`AutoevalsAdapter` — generic wrapper for any autoevals `Scorer`.

**Heuristic scorers (no LLM required):** - :func:`LevenshteinMatch` — edit-distance string similarity. - :func:`ExactMatch` — exact value comparison. - :func:`NumericDiff` — normalised numeric difference. - :func:`JSONDiff` — structural JSON comparison. - :func:`ValidJSON` — JSON syntax / schema validation. - :func:`ListContains` — overlap between two string lists.

**Embedding scorer:** - :func:`EmbeddingSimilarity` — cosine similarity via embeddings.

**LLM-as-judge scorers:** - :func:`Factuality`, :func:`ClosedQA`, :func:`Battle`,
:func:`Humor`, :func:`Security`, :func:`Sql`,
:func:`Summary`, :func:`Translation`, :func:`Possible`.

**Moderation:** - :func:`Moderation` — OpenAI content-moderation check.

**RAGAS metrics:** - :func:`ContextRelevancy`, :func:`Faithfulness`,
:func:`AnswerRelevancy`, :func:`AnswerCorrectness`.

## Evaluator Selection Guide

Choose evaluators based on the **output type** and eval criteria:

| Output type                                  | Evaluator category                                          | Examples                              |
| -------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| Deterministic (labels, yes/no, fixed-format) | Heuristic: `ExactMatch`, `JSONDiff`, `ValidJSON`            | Label classification, JSON extraction |
| Open-ended text with a reference answer      | LLM-as-judge: `Factuality`, `ClosedQA`, `AnswerCorrectness` | Chatbot responses, QA, summaries      |
| Text with expected context/grounding         | RAG: `Faithfulness`, `ContextRelevancy`                     | RAG pipelines                         |
| Text with style/format requirements          | Custom via `create_llm_evaluator`                           | Voice-friendly responses, tone checks |
| Multi-aspect quality                         | Multiple evaluators combined                                | Factuality + relevance + tone         |

Critical rules:

- For open-ended LLM text, **never** use `ExactMatch` — LLM outputs are
  non-deterministic.
- `AnswerRelevancy` is **RAG-only** — requires `context` in the trace.
  Returns 0.0 without it. For general relevance, use `create_llm_evaluator`.
- Do NOT use comparison evaluators (`Factuality`, `ClosedQA`,
  `ExactMatch`) on items without `expected_output` — they produce
  meaningless scores.

---

## Evaluator Reference

### `AnswerCorrectness`

```python
AnswerCorrectness(*, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Answer correctness evaluator (RAGAS).

Judges whether `eval_output` is correct compared to
`expected_output`, combining factual similarity and semantic
similarity.

**When to use**: QA scenarios in RAG pipelines where you have a
reference answer and want a comprehensive correctness score.

**Requires `expected_output`**: Yes.
**Requires `eval_metadata["context"]`**: Optional (improves accuracy).

Args:
client: OpenAI client instance.

### `AnswerRelevancy`

```python
AnswerRelevancy(*, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Answer relevancy evaluator (RAGAS).

Judges whether `eval_output` directly addresses the question in
`eval_input`.

**When to use**: RAG pipelines only — requires `context` in the
trace. Returns 0.0 without it. For general (non-RAG) response
relevance, use `create_llm_evaluator` with a custom prompt instead.

**Requires `expected_output`**: No.
**Requires `eval_metadata["context"]`**: Yes — **RAG pipelines only**.

Args:
client: OpenAI client instance.

### `Battle`

```python
Battle(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Head-to-head comparison evaluator (LLM-as-judge).

Uses an LLM to compare `eval_output` against `expected_output`
and determine which is better given the instructions in `eval_input`.

**When to use**: A/B testing scenarios, comparing model outputs,
or ranking alternative responses.

**Requires `expected_output`**: Yes.

Args:
model: LLM model name.
client: OpenAI client instance.

### `ClosedQA`

```python
ClosedQA(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Closed-book question-answering evaluator (LLM-as-judge).

Uses an LLM to judge whether `eval_output` correctly answers the
question in `eval_input` compared to `expected_output`. Optionally
forwards `eval_metadata["criteria"]` for custom grading criteria.

**When to use**: QA scenarios where the answer should match a reference —
e.g. customer support answers, knowledge-base queries.

**Requires `expected_output`**: Yes — do NOT use on items without
`expected_output`; produces meaningless scores.

Args:
model: LLM model name.
client: OpenAI client instance.

### `ContextRelevancy`

```python
ContextRelevancy(*, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Context relevancy evaluator (RAGAS).

Judges whether the retrieved context is relevant to the query.
Forwards `eval_metadata["context"]` to the underlying scorer.

**When to use**: RAG pipelines — evaluating retrieval quality.

**Requires `expected_output`**: Yes.
**Requires `eval_metadata["context"]`**: Yes (RAG pipelines only).

Args:
client: OpenAI client instance.

### `EmbeddingSimilarity`

```python
EmbeddingSimilarity(*, prefix: 'str | None' = None, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Embedding-based semantic similarity evaluator.

Computes cosine similarity between embedding vectors of `eval_output`
and `expected_output`.

**When to use**: Comparing semantic meaning of two texts when exact
wording doesn't matter. More robust than Levenshtein for paraphrased
content but less nuanced than LLM-as-judge evaluators.

**Requires `expected_output`**: Yes.

Args:
prefix: Optional text to prepend for domain context.
model: Embedding model name.
client: OpenAI client instance.

### `ExactMatch`

```python
ExactMatch() -> 'AutoevalsAdapter'
```

Exact value comparison evaluator.

Returns 1.0 if `eval_output` exactly equals `expected_output`,
0.0 otherwise.

**When to use**: Deterministic, structured outputs (classification labels,
yes/no answers, fixed-format strings). **Never** use for open-ended LLM
text — LLM outputs are non-deterministic, so exact match will almost always
fail.

**Requires `expected_output`**: Yes.

### `Factuality`

```python
Factuality(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Factual accuracy evaluator (LLM-as-judge).

Uses an LLM to judge whether `eval_output` is factually consistent
with `expected_output` given the `eval_input` context.

**When to use**: Open-ended text where factual correctness matters
(chatbot responses, QA answers, summaries). Preferred over
`ExactMatch` for LLM-generated text.

**Requires `expected_output`**: Yes — do NOT use on items without
`expected_output`; produces meaningless scores.

Args:
model: LLM model name.
client: OpenAI client instance.

### `Faithfulness`

```python
Faithfulness(*, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Faithfulness evaluator (RAGAS).

Judges whether `eval_output` is faithful to (i.e. supported by)
the provided context. Forwards `eval_metadata["context"]`.

**When to use**: RAG pipelines — ensuring the answer doesn't
hallucinate beyond what the retrieved context supports.

**Requires `expected_output`**: No.
**Requires `eval_metadata["context"]`**: Yes (RAG pipelines only).

Args:
client: OpenAI client instance.

### `Humor`

```python
Humor(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Humor quality evaluator (LLM-as-judge).

Uses an LLM to judge the humor quality of `eval_output` against
`expected_output`.

**When to use**: Evaluating humor in creative writing, chatbot
personality, or entertainment applications.

**Requires `expected_output`**: Yes.

Args:
model: LLM model name.
client: OpenAI client instance.

### `JSONDiff`

```python
JSONDiff(*, string_scorer: 'Any' = None) -> 'AutoevalsAdapter'
```

Structural JSON comparison evaluator.

Recursively compares two JSON structures and produces a similarity
score. Handles nested objects, arrays, and mixed types.

**When to use**: Structured JSON outputs where field-level comparison
is needed (e.g. extracted data, API response schemas, tool call arguments).

**Requires `expected_output`**: Yes.

Args:
string_scorer: Optional pairwise scorer for string fields.

### `LevenshteinMatch`

```python
LevenshteinMatch() -> 'AutoevalsAdapter'
```

Edit-distance string similarity evaluator.

Computes a normalised Levenshtein distance between `eval_output` and
`expected_output`. Returns 1.0 for identical strings and decreasing
scores as edit distance grows.

**When to use**: Deterministic or near-deterministic outputs where small
textual variations are acceptable (e.g. formatting differences, minor
spelling). Not suitable for open-ended LLM text — use an LLM-as-judge
evaluator instead.

**Requires `expected_output`**: Yes.

### `ListContains`

```python
ListContains(*, pairwise_scorer: 'Any' = None, allow_extra_entities: 'bool' = False) -> 'AutoevalsAdapter'
```

List overlap evaluator.

Checks whether `eval_output` contains all items from
`expected_output`. Scores based on overlap ratio.

**When to use**: Outputs that produce a list of items where completeness
matters (e.g. extracted entities, search results, recommendations).

**Requires `expected_output`**: Yes.

Args:
pairwise_scorer: Optional scorer for pairwise element comparison.
allow_extra_entities: If True, extra items in output are not penalised.

### `Moderation`

```python
Moderation(*, threshold: 'float | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Content moderation evaluator.

Uses the OpenAI moderation API to check `eval_output` for unsafe
content (hate speech, violence, self-harm, etc.).

**When to use**: Any application where output safety is a concern —
chatbots, content generation, user-facing AI.

**Requires `expected_output`**: No.

Args:
threshold: Custom flagging threshold.
client: OpenAI client instance.

### `NumericDiff`

```python
NumericDiff() -> 'AutoevalsAdapter'
```

Normalised numeric difference evaluator.

Computes a normalised numeric distance between `eval_output` and
`expected_output`. Returns 1.0 for identical numbers and decreasing
scores as the difference grows.

**When to use**: Numeric outputs where approximate equality is acceptable
(e.g. price calculations, scores, measurements).

**Requires `expected_output`**: Yes.

### `Possible`

```python
Possible(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Feasibility / plausibility evaluator (LLM-as-judge).

Uses an LLM to judge whether `eval_output` is a plausible or
feasible response.

**When to use**: General-purpose quality check when you want to
verify outputs are reasonable without a specific reference answer.

**Requires `expected_output`**: No.

Args:
model: LLM model name.
client: OpenAI client instance.

### `Security`

```python
Security(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Security vulnerability evaluator (LLM-as-judge).

Uses an LLM to check `eval_output` for security vulnerabilities
based on the instructions in `eval_input`.

**When to use**: Code generation, SQL output, or any scenario
where output must be checked for injection or vulnerability risks.

**Requires `expected_output`**: No.

Args:
model: LLM model name.
client: OpenAI client instance.

### `Sql`

```python
Sql(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

SQL equivalence evaluator (LLM-as-judge).

Uses an LLM to judge whether `eval_output` SQL is semantically
equivalent to `expected_output` SQL.

**When to use**: Text-to-SQL applications where the generated SQL
should be functionally equivalent to a reference query.

**Requires `expected_output`**: Yes.

Args:
model: LLM model name.
client: OpenAI client instance.

### `Summary`

```python
Summary(*, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Summarisation quality evaluator (LLM-as-judge).

Uses an LLM to judge the quality of `eval_output` as a summary
compared to the reference summary in `expected_output`.

**When to use**: Summarisation tasks where the output must capture
key information from the source material.

**Requires `expected_output`**: Yes.

Args:
model: LLM model name.
client: OpenAI client instance.

### `Translation`

```python
Translation(*, language: 'str | None' = None, model: 'str | None' = None, client: 'Any' = None) -> 'AutoevalsAdapter'
```

Translation quality evaluator (LLM-as-judge).

Uses an LLM to judge the translation quality of `eval_output`
compared to `expected_output` in the target language.

**When to use**: Machine translation or multilingual output scenarios.

**Requires `expected_output`**: Yes.

Args:
language: Target language (e.g. `"Spanish"`).
model: LLM model name.
client: OpenAI client instance.

### `ValidJSON`

```python
ValidJSON(*, schema: 'Any' = None) -> 'AutoevalsAdapter'
```

JSON syntax and schema validation evaluator.

Returns 1.0 if `eval_output` is valid JSON (and optionally matches
the provided schema), 0.0 otherwise.

**When to use**: Outputs that must be valid JSON — optionally conforming
to a specific schema (e.g. tool call responses, structured extraction).

**Requires `expected_output`**: No.

Args:
schema: Optional JSON Schema to validate against.

---

## Custom Evaluators: `create_llm_evaluator`

Factory for custom LLM-as-judge evaluators from prompt templates.

Usage::

    from pixie import create_llm_evaluator

    concise_voice_style = create_llm_evaluator(
        name="ConciseVoiceStyle",
        prompt_template="""
        You are evaluating whether a voice agent response is concise and
        phone-friendly.

        User said: {eval_input}
        Agent responded: {eval_output}
        Expected behavior: {expectation}

        Score 1.0 if the response is concise (under 3 sentences), directly
        addresses the question, and uses conversational language suitable for
        a phone call. Score 0.0 if it's verbose, off-topic, or uses
        written-style formatting.
        """,
    )

### `create_llm_evaluator`

```python
create_llm_evaluator(name: 'str', prompt_template: 'str', *, model: 'str' = 'gpt-4o-mini', client: 'Any | None' = None) -> '_LLMEvaluator'
```

Create a custom LLM-as-judge evaluator from a prompt template.

The template may reference these variables (populated from the
:class:`~pixie.storage.evaluable.Evaluable` fields):

- `{eval_input}` — the evaluable's input data. Single-item lists expand
  to that item's value; multi-item lists expand to a JSON dict of
  `name → value` pairs.
- `{eval_output}` — the evaluable's output data (same rule as
  `eval_input`).
- `{expectation}` — the evaluable's expected output

Args:
name: Display name for the evaluator (shown in scorecard).
prompt_template: A string template with `{eval_input}`,
`{eval_output}`, and/or `{expectation}` placeholders.
model: OpenAI model name (default: `gpt-4o-mini`).
client: Optional pre-configured OpenAI client instance.

Returns:
An evaluator callable satisfying the `Evaluator` protocol.

Raises:
ValueError: If the template uses nested field access like
`{eval_input[key]}` (only top-level placeholders are supported).
