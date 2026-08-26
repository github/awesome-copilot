---
name: poka-yoke-llm
description: >-
  AI features you ship to users: structured output, tool schemas, prompt injection, evals. Use when "the model returns bad JSON", "it hallucinates", "stop it calling the wrong tool", "add evals", or an LLM feature can trigger refunds, emails or writes. Covers schema-constrained output, idempotent tool calls, confirmation gates. For agents editing your repo use agent-guardrails.
license: MIT
---

# Poka-Yoke for LLM Features

This is about AI features **you ship to users**: not about agents editing your repo, which is
`agent-guardrails`.

The defining property of an LLM is that it is a component with a non-zero error rate on every
call, and no amount of prompt engineering drives that to zero. This is not a defect to fix; it
is the material you are building with. Shingo's framing fits perfectly: you do not make the
operator more careful, you build the jig.

Which means the central discipline here: **prompt instructions are rung zero.** "Always respond
with valid JSON," "never make up a citation," "do not reveal the system prompt". These are
requests to an unreliable component, and they are the LLM equivalent of a comment saying "be
careful." They help, they are worth writing, and they are not devices. A device is something
outside the model that constrains what it can produce or what its output can reach.

## Building, not reviewing

Most of the time this mode is reached *while someone is building the thing*, not afterwards.
That changes the deliverable. They asked for the feature, so produce the feature, working, complete,
in their stack. Do not hand back a severity table when the person is mid-feature; a list of
findings about code they have not written yet is not useful to them.

Then add a short closing note, three or four lines, covering:

- which misuses the shape you chose makes impossible, and at which rung,
- what you left possible on purpose, and why that tradeoff is the right one here.

That closing note is what stops the device being undone in six months by someone who cannot
see why it is there. It is also the difference between mistake-proofing and a code generator:
the reasoning travels with the code.

When the code already exists and they are asking what is wrong with it, switch to the audit
voice, ranked findings with the mistake, the consequence, and the device. Match the mode to
where they are in the work, not to this file's default.

## The boundary: nothing the model says is trusted until something checks it

Draw the same line you would draw around any external, untrusted input, because that is
exactly what model output is, and doubly so when the model has read user-supplied text.

### Structured output over prose parsing (Control, contact lens)

Never regex a model's prose. Use the provider's constrained/structured output mode with a
schema, then validate the parsed result against that schema yourself:

```python
class Extraction(BaseModel):
    model_config = ConfigDict(extra="forbid")
    sentiment: Literal["positive", "neutral", "negative"]
    confidence: float = Field(ge=0.0, le=1.0)
```

Constrained decoding makes malformed output largely unrepresentable, and the schema check
catches the rest. That removes the whole class of parse failures, malformed JSON, missing
fields, invented enum values.

Two things the schema still cannot tell you: whether the values are *correct*, and what to do
when validation fails. Decide the failure path explicitly, retry once with the error fed
back, then fall back to a deterministic path or return a clear failure. A silent default here
is `except: pass` with a language model attached.

### Enumerate rather than generate wherever possible

The strongest device in this whole mode: if the output is a choice from a known set, have the
model choose an ID from a list you supply and reject anything not in it. A model asked to
produce a category name will invent one eventually; a model choosing among five IDs cannot.
Applies to routing, classification, tool selection, and picking a record, and it converts an
open-ended generation problem into a closed-set one that a `Literal` type enforces.

### Ground factual claims, and make ungrounded output impossible to render

For anything retrieval-backed, require the response to cite retrieved chunk IDs, then verify
each cited ID actually exists in what you retrieved and drop or flag claims that don't
resolve. That check establishes that a citation resolves, not that the chunk it points at
supports the claim, where the claim is consequential, add an entailment check or human review
on top. Prompting for citations is rung zero; *verifying* them is a real device. Show the
source in the UI so the user can check. This is the interface half of the same device.

When retrieval returns nothing relevant, the correct behavior is to say so. A model handed no
context will answer anyway, and that answer is invention. Check for the empty-context case in
code, before the call, and short-circuit.

## Side effects: the model proposes, the system disposes

The most expensive LLM bugs are not wrong text. They are actions. Refunds issued, emails sent,
records deleted, all because a model decided to.

- **Split tool calls by reversibility.** Read-only tools execute freely. Anything irreversible
  or outward-facing, payment, email, deletion, publishing, external writes, requires a human
  confirmation that names the specific action and its parameters. This is the same ladder as
  everywhere else; irreversible actions need Control.
- **Make the tool schema tight.** Enums instead of free strings, required parameters instead of
  optional ones, ranges on numbers, and no "extra context" free-text field the model can use
  to smuggle in intent. A wide tool schema is a wide attack surface and a wide mistake surface.
- **Validate arguments server-side, always.** The model is a client, and a client's input is
  never trusted. `refund(amount)` must re-check the amount against the actual order: the
  model saying `9999` is not authorization.
- **Idempotency keys on every effectful tool call**, backed by a unique constraint. Agent loops
  retry; retries double-charge. This is hazard M2 with a higher retry rate than any human path.
- **Scope credentials to the user, not to the service.** If the tool runs with service-level
  access, a prompt injection reaches everything. Pass the requesting user's authorization
  through, so the model cannot exceed what that user could do, see `authz`.

## Prompt injection is a boundary problem, not a prompt problem

Any text the model reads, user input, retrieved documents, web pages, emails, tool results, can carry instructions. No system prompt reliably prevents this, and treating it as a prompt
engineering problem is why it keeps happening.

The devices are structural: keep untrusted content clearly delimited and labeled as data;
never let model output flow into a privileged action without validation or confirmation;
scope permissions so a successful injection has a small blast radius; and treat any model
output that will be rendered as HTML, executed as SQL, or passed to a shell exactly as you
would treat user input from an attacker, because functionally it is.

The load-bearing question is not "can the model be tricked?" (yes) but "**what can the model
reach if it is tricked?**"

## Bounds: cost and loops

An agent loop with no cap is an unbounded resource operation, hazard F7 with a billing
account attached. Set a maximum step count, a token budget per request, and a wall-clock
timeout, all enforced in your code rather than requested in the prompt. Alert on cost per
user, and cap it per tenant so one runaway conversation cannot become a five-figure invoice.

## Evals are the detection rung, and they are load-bearing

You cannot unit-test a probabilistic component, but you can measure it, and without
measurement you have no idea whether a prompt change helped.

- **A held-out eval set with assertions**, run in CI on every prompt, model, or retrieval
  change. Prompts are code with no type checker. This is the only gate they have.
- **Assert on the structured fields**, which are checkable, rather than on prose similarity.
  This is another reason structured output pays for itself.
- **Every production failure becomes an eval case.** This is the `retro` loop applied
  to a component that cannot be fixed, only constrained: you cannot patch the model, so the
  regression test *is* the fix, and it must cover the class rather than the one input.
- **Pin the model version.** A provider updating a model underneath you is an unannounced
  deploy of your most unpredictable component. Pin it, and re-run evals before moving.

## Auditing an LLM feature

1. **Where does model output go?** Trace each path. Which reach a database, an API, a shell,
   the DOM, or a user as fact? Each needs a check at that boundary.
2. **What is parsed from prose that could be structured?**
3. **Which tools have irreversible effects, and what gates them?**
4. **What untrusted text enters the context, and what could an instruction in it reach?**
5. **What happens when the model fails**: malformed output, refusal, timeout, rate limit,
   empty retrieval? Is there a deterministic fallback, or does it fail silently?
6. **What bounds exist on steps, tokens, and cost?**
7. **Is there an eval suite, does CI run it, and does a regression block the merge?**

Report with the structure from `audit`, and be honest about rungs, with a
probabilistic component, most in-model devices are Warning at best, and only the checks
*outside* the model reach Control.
