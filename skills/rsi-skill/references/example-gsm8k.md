# Example: GSM8K, 17% to 92% on held-out problems

A weak one-line prompt, 40 grade-school math problems, an open model, and four rounds of
`rsi.py run`. Everything needed to reproduce it is in
[`examples/gsm8k-40/`](../examples/gsm8k-40).

## Setup

| | |
|---|---|
| Model | `deepseek-v4.1-flash` on OptiQ Cloud |
| Reasoning | switched off (`--reasoning-effort none`), so the prompt has to do the work |
| Data | 40 problems from the GSM8K train split whose reference solutions have 5+ steps (seed 7) |
| Check | `number`: the last number in the answer must equal the GSM8K answer |
| Split | 28 problems to climb on, 12 held out and never shown to the editor |
| Editor | the same model writes each revision |

Starting prompt:

```text
Answer the math word problem. Reply with only the final number.
```

## Run

```bash
export OPTIQ_CLOUD_KEY=...                      # or point --base-url at any OpenAI-compatible API
python3 scripts/rsi.py --model deepseek-v4.1-flash --reasoning-effort none \
    run examples/gsm8k-40 --rounds 4
```

| Round | Train (28) | Held out (12) | Kept? |
|---|---|---|---|
| 0, starting prompt | 5 (18%) | 2 (17%) | baseline |
| 1 | 19 (68%) | 6 (50%) | yes |
| 2 | 15 (54%) | 4 (33%) | no, worse |
| 3 | 17 (61%) | 6 (50%) | no, train did not improve |
| 4 | 27 (96%) | 11 (92%) | yes |

Re-scoring the final prompt on all 40 problems gave 38/40 (95%), against 6/40 (15%) for the
starting prompt.

The final prompt is in [`examples/gsm8k-40/best_prompt.md`](../examples/gsm8k-40/best_prompt.md).
It asks the model to identify every quantity, check which base each "twice as many" or
"a third of the leftover" applies to, update counts after each change, and compute step by
step before giving the number.

## Why it worked

With reasoning switched off, "reply with only the final number" makes the model answer
in one shot, and multi-step problems fail. The revisions talked it into writing its
working first: answers grew to about 570 characters on average, with the number at the
end, which the `number` check reads. The loop rediscovered step-by-step reasoning from
the failures alone. Rounds 2 and 3 show the guard doing its job: both revisions looked
plausible and both were thrown away because they scored worse.

## What this does not show

- With its own reasoning left on, `glm-5.3-flash` already scores 39/40 (98%) with the same
  starting prompt, so there is nothing to climb. The gain here comes from a model that is
  not reasoning on its own.
- It is one run on 40 problems with a 12-problem held-out set. Expect different rounds and
  a different final prompt each time; the size of the jump is the useful signal.
- The problems are from GSM8K's train split, and the score is agreement with GSM8K's
  reference answers.

GSM8K is by OpenAI (Cobbe et al., 2021) and is MIT-licensed;
[openai/gsm8k](https://huggingface.co/datasets/openai/gsm8k).
