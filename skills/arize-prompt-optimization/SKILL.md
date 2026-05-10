---
name: arize-prompt-optimization
description: "INVOKE THIS SKILL when optimizing, improving, or debugging LLM prompts using production trace data, evaluations, and annotations. Also use when the user wants to make their AI respond better or improve AI output quality. Covers extracting prompts from spans, gathering performance signal, and running a data-driven optimization loop using the ax CLI."
---

# Arize Prompt Optimization Skill

> **`SPACE`** — All `--space` flags and the `ARIZE_SPACE` env var accept a space **name** (e.g., `my-workspace`) or a base64 space **ID** (e.g., `U3BhY2U6...`). Find yours with `ax spaces list`.

## Concepts

### Where Prompts Live in Trace Data

LLM applications emit spans following OpenInference semantic conventions. Prompts are stored in different span attributes depending on the span kind and instrumentation:

| Column | What it contains | When to use |
|--------|-----------------|-------------|
| `attributes.llm.input_messages` | Structured chat messages (system, user, assistant, tool) in role-based format | **Primary source** for chat-based LLM prompts |
| `attributes.llm.input_messages.roles` | Array of roles: `system`, `user`, `assistant`, `tool` | Extract individual message roles |
| `attributes.llm.input_messages.contents` | Array of message content strings | Extract message text |
| `attributes.input.value` | Serialized prompt or user question (generic, all span kinds) | Fallback when structured messages are not available |
| `attributes.llm.prompt_template.template` | Template with `{variable}` placeholders (e.g., `"Answer {question} using {context}"`) | When the app uses prompt templates |
| `attributes.llm.prompt_template.variables` | Template variable values (JSON object) | See what values were substituted into the template |
| `attributes.output.value` | Model response text | See what the LLM produced |
| `attributes.llm.output_messages` | Structured model output (including tool calls) | Inspect tool-calling responses |

### Finding Prompts by Span Kind

- **LLM span** (`attributes.openinference.span.kind = 'LLM'`): Check `attributes.llm.input_messages` for structured chat messages, OR `attributes.input.value` for a serialized prompt. Check `attributes.llm.prompt_template.template` for the template.
- **Chain/Agent span**: `attributes.input.value` contains the user's question. The actual LLM prompt lives on **child LLM spans** -- navigate down the trace tree.
- **Tool span**: `attributes.input.value` has tool input, `attributes.output.value` has tool result. Not typically where prompts live.

### Performance Signal Columns

These columns carry the feedback data used for optimization:

| Column pattern | Source | What it tells you |
|---------------|--------|-------------------|
| `annotation.<name>.label` | Human reviewers | Categorical grade (e.g., `correct`, `incorrect`, `partial`) |
| `annotation.<name>.score` | Human reviewers | Numeric quality score (e.g., 0.0 - 1.0) |
| `annotation.<name>.text` | Human reviewers | Freeform explanation of the grade |
| `eval.<name>.label` | LLM-as-judge evals | Automated categorical assessment |
| `eval.<name>.score` | LLM-as-judge evals | Automated numeric score |
| `eval.<name>.explanation` | LLM-as-judge evals | Why the eval gave that score -- **most valuable for optimization** |
| `attributes.input.value` | Trace data | What went into the LLM |
| `attributes.output.value` | Trace data | What the LLM produced |
| `{experiment_name}.output` | Experiment runs | Output from a specific experiment |

## Prerequisites

Proceed directly with the task — run the `ax` command you need. Do NOT check versions, env vars, or profiles upfront.

If an `ax` command fails, troubleshoot based on the error:
- `command not found` or version error → see references/ax-setup.md
- `401 Unauthorized` / missing API key → run `ax profiles show` to inspect the current profile. If the profile is missing or the API key is wrong, follow references/ax-profiles.md to create/update it. If the user doesn't have their key, direct them to https://app.arize.com/admin > API Keys
- Space unknown → run `ax spaces list` to pick by name, or ask the user
- Project unclear → ask the user, or run `ax projects list -o json --limit 100` and present as selectable options
- LLM provider call fails (missing OPENAI_API_KEY / ANTHROPIC_API_KEY) → run `ax ai-integrations list --space SPACE` to check for platform-managed credentials. If none exist, ask the user to provide the key or create an integration via the **arize-ai-provider-integration** skill
- **Security:** Never read `.env` files or search the filesystem for credentials. Use `ax profiles` for Arize credentials and `ax ai-integrations` for LLM provider keys. If credentials are not available through these channels, ask the user.

## Phase 1: Extract the Current Prompt

### Find LLM spans containing prompts

```bash
# Sample LLM spans (where prompts live)
ax spans export PROJECT --filter "attributes.openinference.span.kind = 'LLM'" -l 10 --stdout

# Filter by model
ax spans export PROJECT --filter "attributes.llm.model_name = 'gpt-4o'" -l 10 --stdout

# Filter by span name (e.g., a specific LLM call)
ax spans export PROJECT --filter "name = 'ChatCompletion'" -l 10 --stdout
```

### Export a trace to inspect prompt structure

```bash
# Export all spans in a trace
ax spans export PROJECT --trace-id TRACE_ID

# Export a single span
ax spans export PROJECT --span-id SPAN_ID
```

### Extract prompts from exported JSON

```bash
# Extract structured chat messages (system + user + assistant)
jq '.[0] | {
  messages: .attributes.llm.input_messages,
  model: .attributes.llm.model_name
}' trace_*/spans.json

# Extract the system prompt specifically
jq '[.[] | select(.attributes.llm.input_messages.roles[]? == "system")] | .[0].attributes.llm.input_messages' trace_*/spans.json

# Extract prompt template and variables
jq '.[0].attributes.llm.prompt_template' trace_*/spans.json

# Extract from input.value (fallback for non-structured prompts)
jq '.[0].attributes.input.value' trace_*/spans.json
```

### Reconstruct the prompt as messages

Once you have the span data, reconstruct the prompt as a messages array:

```json
[
  {"role": "system", "content": "You are a helpful assistant that..."},
  {"role": "user", "content": "Given {input}, answer the question: {question}"}
]
```

If the span has `attributes.llm.prompt_template.template`, the prompt uses variables. Preserve these placeholders (`{variable}` or `{{variable}}`) -- they are substituted at runtime.

## Phase 2: Gather Performance Data

### From traces (production feedback)

```bash
# Find error spans -- these indicate prompt failures
ax spans export PROJECT \
  --filter "status_code = 'ERROR' AND attributes.openinference.span.kind = 'LLM'" \
  -l 20 --stdout

# Find spans with low eval scores
ax spans export PROJECT \
  --filter "annotation.correctness.label = 'incorrect'" \
  -l 20 --stdout

# Find spans with high latency (may indicate overly complex prompts)
ax spans export PROJECT \
  --filter "attributes.openinference.span.kind = 'LLM' AND latency_ms > 10000" \
  -l 20 --stdout

# Export error traces for detailed inspection
ax spans export PROJECT --trace-id TRACE_ID
```

### From datasets and experiments

```bash
# Export a dataset (ground truth examples)
ax datasets export DATASET_NAME --space SPACE
# -> dataset_*/examples.json

# Export experiment results (what the LLM produced)
ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
# -> experiment_*/runs.json
```

### Merge dataset + experiment for analysis

Join the two files by `example_id` to see inputs alongside outputs and evaluations:

```bash
# Count examples and runs
jq 'length' dataset_*/examples.json
jq 'length' experiment_*/runs.json

# View a single joined record
jq -s '
  .[0] as $dataset |
  .[1][0] as $run |
  ($dataset[] | select(.id == $run.example_id)) as $example |
  {
    input: $example,
    output: $run.output,
    evaluations: $run.evaluations
  }
' dataset_*/examples.json experiment_*/runs.json

# Find failed examples (where eval score < threshold)
jq '[.[] | select(.evaluations.correctness.score < 0.5)]' experiment_*/runs.json
```

### Identify what to optimize

Look for patterns across failures:

1. **Compare outputs to ground truth**: Where does the LLM output differ from expected?
2. **Read eval explanations**: `eval.*.explanation` tells you WHY something failed
3. **Check annotation text**: Human feedback describes specific issues
4. **Look for verbosity mismatches**: If outputs are too long/short vs ground truth
5. **Check format compliance**: Are outputs in the expected format?

## Phase 3: Optimize the Prompt

### The Optimization Meta-Prompt

Use this template to generate an improved version of the prompt. Fill in the three placeholders and send it to your LLM (GPT-4o, Claude, etc.):

````
You are an expert in prompt optimization. Given the original baseline prompt
and the associated performance data (inputs, outputs, evaluation labels, and
explanations), generate a revised version that improves results.

ORIGINAL BASELINE PROMPT
========================

{PASTE_ORIGINAL_PROMPT_HERE}

========================

PERFORMANCE DATA
================

The following records show how the current prompt performed. Each record
includes the input, the LLM output, and evaluation feedback:

{PASTE_RECORDS_HERE}

================

HOW TO USE THIS DATA

1. Compare outputs: Look at what the LLM generated vs what was expected
2. Review eval scores: Check which examples scored poorly and why
3. Examine annotations: Human feedback shows what worked and what didn't
4. Identify patterns: Look for common issues across multiple examples
5. Focus on failures: The rows where the output DIFFERS from the expected
   value are the ones that need fixing

ALIGNMENT STRATEGY

- If outputs have extra text or reasoning not present in the ground truth,
  remove instructions that encourage explanation or verbose reasoning
- If outputs are missing information, add instructions to include it
- If outputs are in the wrong format, add explicit format instructions
- Focus on the rows where the output differs from the target -- these are
  the failures to fix

RULES

Maintain Structure:
- Use the same template variables as the current prompt ({var} or {{var}})
- Don't change sections that are already working
- Preserve the exact return format instructions from the original prompt

Avoid Overfitting:
- DO NOT copy examples verbatim into the prompt
- DO NOT quote specific test data outputs exactly
- INSTEAD: Extract the ESSENCE of what makes good vs bad outputs
- INSTEAD: Add general guidelines and principles
- INSTEAD: If adding few-shot examples, create SYNTHETIC examples that
  demonstrate the principle, not real data from above

Goal: Create a prompt that generalizes well to new inputs, not one that
memorizes the test data.

OUTPUT FORMAT

Return the revised prompt as a JSON array of messages:

[
  {"role": "system", "content": "..."},
  {"role": "user", "content": "..."}
]

Also provide a brief reasoning section (bulleted list) explaining:
- What problems you found
- How the revised prompt addresses each one
````

### Preparing the performance data

Format the records as a JSON array before pasting into the template:

```bash
# From dataset + experiment: join and select relevant columns
jq -s '
  .[0] as $ds |
  [.[1][] | . as $run |
    ($ds[] | select(.id == $run.example_id)) as $ex |
    {
      input: $ex.input,
      expected: $ex.expected_output,
      actual_output: $run.output,
      eval_score: $run.evaluations.correctness.score,
      eval_label: $run.evaluations.correctness.label,
      eval_explanation: $run.evaluations.correctness.explanation
    }
  ]
' dataset_*/examples.json experiment_*/runs.json

# From exported spans: extract input/output pairs with annotations
jq '[.[] | select(.attributes.openinference.span.kind == "LLM") | {
  input: .attributes.input.value,
  output: .attributes.output.value,
  status: .status_code,
  model: .attributes.llm.model_name
}]' trace_*/spans.json
```

### Applying the revised prompt

After the LLM returns the revised messages array:

1. Compare the original and revised prompts side by side
2. Verify all template variables are preserved
3. Check that format instructions are intact
4. Test on a few examples before full deployment

## Phase 4: Iterate

### The optimization loop

```
1. Extract prompt    -> Phase 1 (once)
2. Run experiment    -> ax experiments create ...
3. Export results    -> ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
4. Analyze failures  -> jq to find low scores
5. Run meta-prompt   -> Phase 3 with new failure data
6. Apply revised prompt
7. Repeat from step 2
```

### Measure improvement

```bash
# Compare scores across experiments
# Experiment A (baseline)
jq '[.[] | .evaluations.correctness.score] | add / length' experiment_a/runs.json

# Experiment B (optimized)
jq '[.[] | .evaluations.correctness.score] | add / length' experiment_b/runs.json

# Find examples that flipped from fail to pass
jq -s '
  [.[0][] | select(.evaluations.correctness.label == "incorrect")] as $fails |
  [.[1][] | select(.evaluations.correctness.label == "correct") |
    select(.example_id as $id | $fails | any(.example_id == $id))
  ] | length
' experiment_a/runs.json experiment_b/runs.json
```

### A/B compare two prompts

1. Create two experiments against the same dataset, each using a different prompt version
2. Export both: `ax experiments export EXP_A` and `ax experiments export EXP_B`
3. Compare average scores, failure rates, and specific example flips
4. Check for regressions -- examples that passed with prompt A but fail with prompt B

## Prompt Engineering Best Practices

Apply these when writing or revising prompts:

| Technique | When to apply | Example |
|-----------|--------------|---------|
| Clear, detailed instructions | Output is vague or off-topic | "Classify the sentiment as exactly one of: positive, negative, neutral" |
| Instructions at the beginning | Model ignores later instructions | Put the task description before examples |
| Step-by-step breakdowns | Complex multi-step processes | "First extract entities, then classify each, then summarize" |
| Specific personas | Need consistent style/tone | "You are a senior financial analyst writing for institutional investors" |
| Delimiter tokens | Sections blend together | Use `---`, `###`, or XML tags to separate input from instructions |
| Few-shot examples | Output format needs clarification | Show 2-3 synthetic input/output pairs |
| Output length specifications | Responses are too long or short | "Respond in exactly 2-3 sentences" |
| Reasoning instructions | Accuracy is critical | "Think step by step before answering" |
| "I don't know" guidelines | Hallucination is a risk | "If the answer is not in the provided context, say 'I don't have enough information'" |

### Variable preservation

When optimizing prompts that use template variables:

- **Single braces** (`{variable}`): Python f-string / Jinja style. Most common in Arize.
- **Double braces** (`{{variable}}`): Mustache style. Used when the framework requires it.
- Never add or remove variable placeholders during optimization
- Never rename variables -- the runtime substitution depends on exact names
- If adding few-shot examples, use literal values, not variable placeholders

## Workflows

### Optimize a prompt from a failing trace

1. Find failing traces:
   ```bash
   ax traces list PROJECT --filter "status_code = 'ERROR'" --limit 5
   ```
2. Export the trace:
   ```bash
   ax spans export PROJECT --trace-id TRACE_ID
   ```
3. Extract the prompt from the LLM span:
   ```bash
   jq '[.[] | select(.attributes.openinference.span.kind == "LLM")][0] | {
     messages: .attributes.llm.input_messages,
     template: .attributes.llm.prompt_template,
     output: .attributes.output.value,
     error: .attributes.exception.message
   }' trace_*/spans.json
   ```
4. Identify what failed from the error message or output
5. Fill in the optimization meta-prompt (Phase 3) with the prompt and error context
6. Apply the revised prompt

### Optimize using a dataset and experiment

1. Find the dataset and experiment:
   ```bash
   ax datasets list --space SPACE
   ax experiments list --dataset DATASET_NAME --space SPACE
   ```
2. Export both:
   ```bash
   ax datasets export DATASET_NAME --space SPACE
   ax experiments export EXPERIMENT_NAME --dataset DATASET_NAME --space SPACE
   ```
3. Prepare the joined data for the meta-prompt
4. Run the optimization meta-prompt
5. Create a new experiment with the revised prompt to measure improvement

### Debug a prompt that produces wrong format

1. Export spans where the output format is wrong:
   ```bash
   ax spans export PROJECT \
     --filter "attributes.openinference.span.kind = 'LLM' AND annotation.format.label = 'incorrect'" \
     -l 10 --stdout > bad_format.json
   ```
2. Look at what the LLM is producing vs what was expected
3. Add explicit format instructions to the prompt (JSON schema, examples, delimiters)
4. Common fix: add a few-shot example showing the exact desired output format

### Reduce hallucination in a RAG prompt

1. Find traces where the model hallucinated:
   ```bash
   ax spans export PROJECT \
     --filter "annotation.faithfulness.label = 'unfaithful'" \
     -l 20 --stdout
   ```
2. Export and inspect the retriever + LLM spans together:
   ```bash
   ax spans export PROJECT --trace-id TRACE_ID
   jq '[.[] | {kind: .attributes.openinference.span.kind, name, input: .attributes.input.value, output: .attributes.output.value}]' trace_*/spans.json
   ```
3. Check if the retrieved context actually contained the answer
4. Add grounding instructions to the system prompt: "Only use information from the provided context. If the answer is not in the context, say so."

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ax: command not found` | See references/ax-setup.md |
| `No profile found` | No profile is configured. See references/ax-profiles.md to create one. |
| No `input_messages` on span | Check span kind -- Chain/Agent spans store prompts on child LLM spans, not on themselves |
| Prompt template is `null` | Not all instrumentations emit `prompt_template`. Use `input_messages` or `input.value` instead |
| Variables lost after optimization | Verify the revised prompt preserves all `{var}` placeholders from the original |
| Optimization makes things worse | Check for overfitting -- the meta-prompt may have memorized test data. Ensure few-shot examples are synthetic |
| No eval/annotation columns | Run evaluations first (via Arize UI or SDK), then re-export |
| Experiment output column not found | The column name is `{experiment_name}.output` -- check exact experiment name via `ax experiments get` |
| `jq` errors on span JSON | Ensure you're targeting the correct file path (e.g., `trace_*/spans.json`) |
