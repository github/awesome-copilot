---
name: pts-pivotal-token-search
description: Use PTS (Pivotal Token Search) to find the tokens, sentences and latent concepts that change whether a language model solves a task, read the resulting events file, explore it in the visualizer, and export it as datasets. Use when the user wants to analyze reasoning steps of a small local model, interpret a PTS events file, or plan a search.
license: Apache-2.0
---

Use this skill when the user wants to find which reasoning events change a language model's chance of solving a task, using PTS (https://github.com/codelion/pts). Do not use it for hosted-model advice or for general prompt tuning.

Ask before anything downloads model weights or datasets. Searches are slow and sample many continuations, so state the cost before starting one. Work on local files only. Do not run `pts push` or `pts export --hf-push` unless the user explicitly asks to publish.

## 1. What PTS measures

PTS searches for events, scores each by how much it changes the model's probability of reaching a correct answer, labels them with one shared vocabulary, and can link them into chains. The score idea is `outcome_with_event - outcome_without_or_altered_event`.

| Scale | What it finds | Scoring |
|---|---|---|
| Latent | Concepts active in mid-layer activations, not yet emitted (called meta-tokens) | Readout score from a lens |
| Token | Emitted tokens that flip success probability | `P(success \| prefix+token) - P(success \| prefix)` |
| Sentence | Reasoning sentences that flip success probability (thought anchors) | Probability with the sentence vs. with an alternative |

Token and sentence search needs a task with a checkable answer, because "success" has to be measured.

## 2. Check that PTS is installed

This skill does not install PTS. Check whether it is available:

```bash
pts --help
```

If the command is missing, tell the user and point them to the install steps in the project README (https://github.com/codelion/pts). Do not clone repositories or run install commands for them, and do not run code from an unpinned source. Python 3.9+ is stated in the README. If `pts --help` lists `run, migrate, fit-jlens, enrich, link, export, push`, the install works.

## 3. Plan a search

Check with the user: model, dataset, device, and time budget. The README examples use `Qwen/Qwen3-0.6B`. Check the flags first:

```bash
pts run --help
```

Token scale, then sentence scale (README form):

```bash
pts run --granularity token    --model Qwen/Qwen3-0.6B --output-path events.jsonl
pts run --granularity sentence --model Qwen/Qwen3-0.6B --output-path events.jsonl
```

Help text and source show these defaults for `pts run`: dataset `codelion/optillmbench` (downloaded from the Hub), `--num-samples 50`, `--max-examples 100`, `--temperature 0.6`, `--max-new-tokens 512`, `--seed 42`. For a first pass, lower `--max-examples` and `--num-samples` and say so. `--dataset`, `--query-key` and `--answer-key` select the user's own task; `--task-type` labels it.

## 4. Latent scale (optional, more setup)

Latent events need a Jacobian lens (J-lens) for the model. Options listed in the README:

```bash
pts fit-jlens --model Qwen/Qwen3-0.6B --output-path ./jlens     # calibrate once
pts enrich --input-path events.jsonl --output-path events_latent.jsonl \
           --model Qwen/Qwen3-0.6B --jlens-path ./jlens \
           --readout-method jlens --with-latent --shuffle-control
```

`--jlens-path` also accepts a reference lens from the Hub (`hf://...`), which means a download. `--readout-method logit_lens` needs no calibration but is a weaker signal. Always add `--shuffle-control`; if link scores do not beat the shuffled baseline, treat the structure as chance. `pts run --granularity all` searches all three scales and links them. `pts enrich` refuses events from a different model unless `--allow-model-mismatch` is set; that is exploratory only.

## 5. Read the output

The output is JSONL, one event per line (docs/dataset_schema.md in the repo). Key fields:

- `granularity`: `latent`, `token` or `sentence`. `label`: the token, sentence or meta-token. `context`: the prefix before it.
- `prob_before`, `prob_after`, `prob_delta`, `is_positive`: the measured shift. For token and sentence events, `score` is `abs(prob_delta)`; `is_positive` tells you the direction.
- Latent events have these four fields set to `null`. Their `score` is a readout score (a probability for `jlens` and `logit_lens`, a cosine for `jlens_cosine`). Never rank or threshold latent and emitted events together on `score`.
- `position` means different things: absolute token index for pivotal tokens, sentence index for thought anchors, a negative offset from the source event for enriched latent events. Do not compare them.
- `model_id`: records are specific to this model and do not transfer.
- `category`: one shared vocabulary across scales: interpretation, planning, decomposition, fact_retrieval, computation, verification, self_correction, backtracking, uncertainty, exploration, consolidation, final_answer, tool_use, safety, deception_or_shortcut, unknown. Labels are assigned by pattern matching, so check a sample by hand.
- `linked_event_ids`, `precedes_event_ids`: links are scored heuristics, not verified causal paths.

Summarize with plain Python (json lines, sort by `abs(prob_delta)` within one scale) and show the user the top events in context before drawing conclusions.

## 6. Visualizer

The hosted viewer is https://huggingface.co/spaces/codelion/pts-visualizer. Per its README it has Overview, Event Explorer, Causal Event Graph, Embedding Space and Reasoning Timeline views, and is built for the two published datasets (`codelion/Qwen3-0.6B-pts`, `codelion/DeepSeek-R1-Distill-Qwen-1.5B-pts`). To run it locally, README says `cd visualizer && python app.py`; it has its own `requirements.txt` (gradio, plotly and others), so ask before installing. Do not upload the user's events to a hosted Space without their say-so.

## 7. Turn results into datasets

```bash
pts link   --input-path events.jsonl --output-path linked.jsonl
pts export --input-path linked.jsonl --output-path out.jsonl --format dpo
pts export --help
```

Formats: `causal_events`, `metatokens`, `pivotal_tokens`, `thought_anchors`, `dpo`, `steering`. Useful filters: `--min-prob-delta`, `--min-score`, `--max-pairs`, `--balance`. `pts migrate` reads older pivotal-token or thought-anchor files into the schema. The README says steering vectors feed OptiLLM's autothink. Some formats may load a model or a dataset (`--model`, `--dataset`); run `pts export --help` and confirm with the user first. Check the output on a small file first.

## 8. Numbers the README reports

The README compares meta-token category matches against chance on two reasoning models: 2.6x for Qwen3-0.6B and 3.6x for DeepSeek-R1-1.5B. J-lens lift is 2.76x and 3.64x, against a logit-lens control of 2.41x and 3.29x. The J-lens beats the control for DeepSeek (n=239) but only trends ahead with overlapping results for Qwen (n≈100). The README states these are observational, not causal. Quote them with those caveats or not at all.

## 9. Limits to state

- Cost: each event needs many sampled continuations, so searches grow with examples times samples times length. Small models and small samples first.
- Causal claims need controls: a high probability shift is measured with sampling noise. Re-run with other seeds, and for any claim about mechanism run an intervention (alter or remove the event, or steer, then re-measure).
- Latent results are observational. A lens shows what an activation leans toward, not that it caused anything. The README says the latent implementation is an independent reimplementation, not validated against the original authors' results.
- Results depend on the task, the model and the sampling settings (temperature, top-p, samples). Findings on a 0.6B model need not hold on other models.
- Tasks with unreliable answer checking give unreliable scores.
