# Step 1c: Eval Criteria

Define what quality dimensions matter for this app — based on the project analysis (`00-project-analysis.md`) and the entry point (`01-entry-point.md`) you've already documented.

This document serves two purposes:

1. **Dataset creation (Step 4)**: The use cases tell you what kinds of items to generate — each use case should have representative items in the dataset.
2. **Evaluator selection (Step 3)**: The eval criteria tell you what evaluators to choose and how to map them.

**Derive use cases from the capability inventory** in `pixie_qa/00-project-analysis.md`. **Derive eval criteria from the hard problems / failure modes** — not generic quality dimensions like "factuality" or "relevance".

Keep this concise — it's a planning artifact, not a comprehensive spec.

---

## What to define

### 1. Use cases

List the distinct scenarios the app handles. Derive these from the **capability inventory** in `pixie_qa/00-project-analysis.md` — each capability should map to at least one use case. Each use case becomes a category of dataset items. **Each use case description must be a concise one-liner that conveys both (a) what the input is and (b) what the expected behavior or outcome is.** The description should be specific enough that someone unfamiliar with the app can understand the scenario and its success criteria.

When possible, indicate the **expected difficulty level** for each use case — e.g., "routine" for straightforward cases, "challenging" for edge cases or failure-mode scenarios. This guides dataset creation (Step 4) to include entries across a range of difficulty levels rather than clustering at easy cases.

**Good use case descriptions:**

- "Reroute to human agent on account lookup difficulties"
- "Answer billing question using customer's plan details from CRM"
- "Decline to answer questions outside the support domain"
- "Summarize research findings including all queried sub-topics"

**Bad use case descriptions (too vague):**

- "Handle billing questions"
- "Edge case"
- "Error handling"

### 2. Eval criteria

Define **high-level, application-specific eval criteria** — quality dimensions that matter for THIS app. Each criterion will map to an evaluator in Step 3.

**Good criteria are specific to the app's purpose** and derived from the **hard problems / failure modes** in `pixie_qa/00-project-analysis.md`. Examples:

- Voice customer support agent: "Does the agent verify the caller's identity before transferring?", "Are responses concise enough for phone conversation?"
- Research report generator: "Does the report address all sub-questions?", "Are claims supported by retrieved sources?"
- RAG chatbot: "Are answers grounded in the retrieved context?", "Does it say 'I don't know' when context is missing?"
- Web scraper: "Does the extracted data match the requested schema fields?", "Does it handle malformed HTML without crashing or losing data?"

**Bad criteria are generic evaluator names dressed up as requirements.** Don't say "Factual accuracy" or "Response relevance" — say what factual accuracy or relevance means for THIS app. If your criteria could apply to any chatbot (e.g., "Groundedness", "PromptRelevance"), they're too generic — go back to the failure modes in `00-project-analysis.md` and derive criteria from those.

At this stage, don't pick evaluator classes or thresholds. That comes in Step 3.

### 3. Check criteria applicability and observability

For each criterion:

1. **Determine applicability scope** — does this criterion apply to ALL use cases, or only a subset? If a criterion is only relevant for certain scenarios (e.g., "identity verification" only applies to account-related requests, not general FAQ), mark it clearly. This distinction is critical for Step 4 (dataset creation) because:
   - **Universal criteria** → become dataset-level default evaluators
   - **Case-specific criteria** → become item-level evaluators on relevant rows only

2. **Verify observability** — for each criterion, identify what data point in the app needs to be captured as a `wrap()` call to evaluate it. This drives the wrap coverage in Step 2.
   - If the criterion is about the app's final response → captured by `wrap(purpose="output", name="response")`
   - If it's about a routing decision → captured by `wrap(purpose="state", name="routing_decision")`
   - If it's about data the app fetched and used → captured by `wrap(purpose="input", name="...")`

---

## Projects with multiple capabilities

If the project analysis (`pixie_qa/00-project-analysis.md`) lists multiple capabilities, you should evaluate at minimum the **2-3 most important / commonly used** capabilities. Don't limit the dataset to a single capability when the project's value comes from breadth.

For each additional capability beyond the first:

- Add use cases in `02-eval-criteria.md`
- Plan for a separate trace (run `pixie trace` with different entry points / configs) in Step 2
- Plan dataset entries covering that capability in Step 4

If time or context constraints make it impractical to cover all capabilities, **document which ones you covered and which you skipped** (with rationale) at the end of `02-eval-criteria.md`.

---

## Criteria quality gate (mandatory self-check)

Before writing `02-eval-criteria.md`, run this check on every criterion:

> **For each criterion, ask: "If the app returned a structurally correct but semantically wrong or hallucinated answer, would this criterion catch it?"**

- If the answer is "no" for ALL criteria, your criteria set is **structural-only** — it checks plumbing (fields exist, data flowed through) but not quality (content is correct, complete, non-hallucinated). **You must add at least one semantic criterion** that evaluates the _content_ of the app's output, not just its shape.
- Structural criteria (field existence, JSON validity, format checks) are useful but insufficient. They pass even when the app returns fabricated or incorrect data.

**Examples of structural vs semantic criteria:**

| Structural (checks shape)                   | Semantic (checks quality)                                                  |
| ------------------------------------------- | -------------------------------------------------------------------------- |
| "Required fields are present in the output" | "Extracted values match the source content — no hallucinated data"         |
| "Source type matches expected type"         | "The app correctly interpreted noisy input without losing key facts"       |
| "Output is valid JSON"                      | "The summary accurately captures the main points of the document"          |
| "Response contains at least N characters"   | "The response addresses the user's specific question, not a generic topic" |

A good criteria set has **both** structural and semantic criteria. Structural criteria catch gross failures (app crashed, returned empty output). Semantic criteria catch quality failures (app ran but returned wrong/hallucinated/incomplete content).

---

## Output: `pixie_qa/02-eval-criteria.md`

Write your findings to this file. **Keep it short** — the template below is the maximum length.

### Template

```markdown
# Eval Criteria

## Use cases

1. <Use case name>: <one-liner conveying input + expected behavior>
2. ...

## Eval criteria

| #   | Criterion | Applies to    | Data to capture |
| --- | --------- | ------------- | --------------- |
| 1   | ...       | All           | wrap name: ...  |
| 2   | ...       | Use case 1, 3 | wrap name: ...  |

## Capability coverage

Capabilities covered: <list>
Capabilities skipped (with rationale): <list or "none">
```
