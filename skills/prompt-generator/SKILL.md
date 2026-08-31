---
name: prompt-generator
description: Turn a rough task description into a well-engineered LLM prompt (system and/or user prompt). Use when the user wants a prompt written, drafted, improved, or "engineered" for use with an LLM — not when they want their own request to Claude Code answered directly.
trigger: /prompt-generator
---

# prompt-generator

Draft or improve a prompt intended for use with an LLM (any model — not this
conversation). Output is the prompt itself, ready to paste elsewhere.

## Inputs to look for

Before drafting, make sure these are pinned down. If more than one is
missing or ambiguous, ask (batch into one question) rather than guessing —
a wrong guess here means a wasted round-trip on a deliverable, not a quick
fix.

- **Task**: what should the prompt make the model do? Get the concrete verb
  (classify, extract, summarize, rewrite, converse, generate code, judge/
  score) not just a topic.
- **Inputs the prompt will receive**: what variable content gets fed in at
  call time (a document, a user message, a JSON payload)? Prompts that will
  be templated need clear placeholders.
- **Output shape**: free text, strict JSON/schema, a fixed set of labels,
  code, a specific length or format? If structured, get the exact shape —
  don't invent field names.
- **Target model/platform**, if it changes the answer: a big frontier model
  tolerates a looser prompt; a small/fast model or a strict function-calling
  setup needs more explicit structure and fewer implicit assumptions. If
  unstated and it doesn't change the draft, don't ask — default to a
  model-agnostic prompt.
- **Failure modes to guard against**: does the user already know a way this
  goes wrong (hallucinating fields, refusing valid requests, verbose
  preamble, ignoring an edge case)? Fold each one into an explicit
  instruction or constraint — don't leave it implicit.

## Process

1. Pin down the inputs above.
2. Draft the prompt using the structure below — include only the sections
   that earn their place; a three-line classification prompt doesn't need a
   Constraints section it has nothing to put in.
3. Show the prompt in a fenced code block, ready to copy. Do not wrap it in
   commentary above/below beyond one line noting anything the user should
   double check (e.g., a placeholder they need to fill in, an assumption you
   made because they didn't specify).

## Structure to draw from

- **Role / framing** — who the model is acting as, only if that changes
  behavior (a specific persona, expertise level, or audience). Skip generic
  "You are a helpful assistant" filler.
- **Task** — the concrete instruction, stated as an imperative, first.
- **Context** — background the model needs but that isn't the task itself
  (domain facts, prior conversation state, constraints of the system it's
  embedded in).
- **Input format** — how variable content will be delivered (inline,
  delimited, a named placeholder like `{{document}}`).
- **Output format** — exact shape expected back. For structured output,
  give the schema or a literal example, not a prose description of it.
- **Constraints / rules** — explicit dos and don'ts, especially for known
  failure modes. Prefer positive instructions ("answer in one paragraph")
  over negative ones ("don't be too long") where possible — models follow
  concrete targets more reliably than vague prohibitions.
- **Examples** — one or two, only when the task is ambiguous enough that
  behavior can't be pinned down by instruction alone (edge-case handling,
  a specific tone, a non-obvious format). Don't pad a clear prompt with
  examples it doesn't need.

## Rules

- Write the prompt to be self-contained: whoever pastes it into a fresh
  model context has no memory of this conversation.
- Prefer clear, direct instructions over clever phrasing. Say the
  constraint plainly rather than trying to imply it.
- Don't add meta-instructions the user didn't ask for (chain-of-thought
  prompting, persona flourishes, safety boilerplate) unless the task
  calls for it or they requested it.
- If the user is iterating on an existing prompt, edit it — don't rewrite
  from scratch and discard structure/wording they've already tuned, unless
  they ask for a full rewrite.
- If the task is small and unambiguous (one clear instruction, no
  structured output, no edge cases), a short prompt is correct — do not
  inflate it with sections for the sake of looking thorough.

## Example

Input: "write me a prompt that takes a support ticket and tells me if it's
urgent"

Missing: output format (label only, or label + reasoning?), what counts as
urgent. Ask once, batched, then draft — for example:

```
You are triaging incoming support tickets for urgency.

Given a support ticket, classify it as one of: "urgent", "normal", "low".

Urgent means: production down, data loss, security issue, or the customer
explicitly states a business-critical deadline within 24 hours. Normal
means a functional issue with a workaround or no stated deadline. Low means
a question, feature request, or cosmetic issue.

Respond with only the label — no explanation, no punctuation.

Ticket:
{{ticket_text}}
```
