---
name: rsi-skill
description: Evaluate a prompt, system prompt, skill instruction or agent instruction against concrete test cases, then hill-climb it to a measurably better version using any open model. Use when the user wants to test or improve a prompt, asks "is this prompt any good", "make this prompt better", "eval this", "hill-climb", "optimize my system prompt", or has examples of inputs with the answers they expect.
license: Apache-2.0
---

Improve a piece of instruction text by measuring it, not by guessing. Score the current
prompt on test cases, look at what fails, have a model propose a revision, keep the
revision only if the score goes up on cases it trained on and does not drop on cases it
never saw, and repeat. Everything runs through `scripts/rsi.py` (Python 3 standard
library, no install).

It works on any text that steers a model: a system prompt, a classifier instruction, a
SKILL.md body, an agent's rules, a few-shot block. It changes instructions, not weights.

Worked example with real numbers: [references/example-gsm8k.md](references/example-gsm8k.md)
(GSM8K, 17% to 92% on held-out problems in four rounds).

## 1. Pick a model endpoint

Run `python3 scripts/rsi.py backend`. It uses the first of these that works:

1. `--base-url URL [--api-key-env VAR] [--model M]` if the user named an endpoint.
2. **OptiQ Cloud** when `OPTIQ_CLOUD_KEY` is set (`https://cloud.mlx-optiq.com/api/v1`, open models).
3. **A local `optiq serve`** on `127.0.0.1:8080` (open models on an Apple Silicon Mac; nothing leaves the machine).
4. Any OpenAI-compatible API via `OPENAI_BASE_URL` and `OPENAI_API_KEY`.

If none is available, the command prints how to set one up. Ask the user which they
prefer; never invent keys. The test cases and the prompt are sent to the chosen
endpoint, so confirm with the user before using a remote one for private data.

Pass `--model` when the endpoint serves several models. For reasoning models:
`--reasoning-effort none|low|high` where the API supports it, `--no-think` for servers that
honour `enable_thinking`, or a larger `--max-tokens`. Empty answers are reported as such.

## 2. Write the task and the cases

`python3 scripts/rsi.py init DIR` creates `DIR/prompt.md` and `DIR/cases.jsonl`. Put the
user's current prompt in `prompt.md`. Each line of `cases.jsonl` is one case:

```json
{"input": "text the model receives", "expect": "what a good answer has", "check": "contains"}
```

| check | passes when |
|---|---|
| `exact` | the answer equals `expect` (case, quotes and trailing punctuation ignored) |
| `contains` | the answer contains `expect` (case-insensitive) |
| `regex` | the answer matches the regex in `expect` |
| `number` | the last number in the answer equals `expect` (commas, `$`, `%` ignored) |
| `json:<field>` | a JSON object in the answer has `field` equal to `expect` |
| `judge` | the same model grades the answer PASS against the rubric in `expect` |

Prefer the cheapest check that captures "correct"; use `judge` only for open-ended
answers. Aim for 10 to 40 cases that cover the real spread, including the hard ones the
user has seen fail. With fewer than 6 there is no held-out set, so say the result may
overfit. Help the user write cases from real inputs rather than inventing them all.

## 3. Measure, then climb

- `python3 scripts/rsi.py eval DIR` scores the current prompt and lists every failure.
  Show the user the baseline before changing anything.
- `python3 scripts/rsi.py run DIR --rounds 5` holds 30% of the cases aside, then each round
  asks the model to fix the failures and keeps a revision only if training cases improve
  and held-out cases do not get worse. Revisions that quote test inputs verbatim are
  rejected as overfitting. It stops early when every training case passes.
- `--propose-model M` uses a stronger model on the same endpoint to write revisions.
- Results land in `DIR/results/`: `best_prompt.md` and `history.json` (every round's
  scores and candidate prompt).

## 4. Report

Tell the user the baseline and final scores (train and held out), the model and endpoint,
and show the diff between the original and the best prompt. Name any case that still
fails and why. Apply `best_prompt.md` only after the user agrees.

## Where to try it next

Agent-style tasks with checkable answers make good targets. The LocalLLaMA mini
benchmarks on Hugging Face are small enough to iterate on:
[typed-decisions](https://huggingface.co/datasets/LocalLLaMA/typed-decisions),
[typed-extraction](https://huggingface.co/datasets/LocalLLaMA/typed-extraction),
[browsecomp-plus-mini](https://huggingface.co/datasets/LocalLLaMA/browsecomp-plus-mini),
[terminal-bench-mini](https://huggingface.co/datasets/LocalLLaMA/terminal-bench-mini) and
[deepswe-mini](https://huggingface.co/datasets/LocalLLaMA/deepswe-mini). Ask before
downloading a dataset.

## Notes

- A higher score means the prompt fits these cases better; it is only as good as the cases.
- One run is one sample. Re-run `eval` on the best prompt to confirm before trusting it.
