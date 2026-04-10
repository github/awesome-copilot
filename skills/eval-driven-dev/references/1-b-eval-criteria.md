# Step 1b: Eval Criteria

Define what quality dimensions matter for this app — based on the entry point (`01-entry-point.md`) you've already documented.

This document serves two purposes:

1. **Dataset creation (Step 4)**: The use cases tell you what kinds of items to generate — each use case should have representative items in the dataset.
2. **Evaluator selection (Step 3)**: The eval criteria tell you what evaluators to choose and how to map them.

Keep this concise — it's a planning artifact, not a comprehensive spec.

---

## What to define

### 1. Use cases

List the distinct scenarios the app handles. Each use case becomes a category of dataset items. **Each use case description must be a concise one-liner that conveys both (a) what the input is and (b) what the expected behavior or outcome is.** The description should be specific enough that someone unfamiliar with the app can understand the scenario and its success criteria.

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

**Good criteria are specific to the app's purpose.** Examples:

- Voice customer support agent: "Does the agent verify the caller's identity before transferring?", "Are responses concise enough for phone conversation?"
- Research report generator: "Does the report address all sub-questions?", "Are claims supported by retrieved sources?"
- RAG chatbot: "Are answers grounded in the retrieved context?", "Does it say 'I don't know' when context is missing?"

**Bad criteria are generic evaluator names dressed up as requirements.** Don't say "Factual accuracy" or "Response relevance" — say what factual accuracy or relevance means for THIS app.

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
```
