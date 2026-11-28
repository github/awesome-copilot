---
name: kill-ai-slop
description: Audit, restyle, or build web and mobile interfaces using evidence from the product rather than generic design patterns. Use for UI, landing pages, apps, mobile screens, or requests to reduce visual sameness.
---

# Kill AI Slop

Improve the interface only when there is evidence that a decision harms clarity, function, or the product's character. This is not a list of forbidden visual styles.

## Workflow

1. Confirm the scope, stack, breakpoints, brand, behavior, and content that must be preserved. Determine whether the user asked for an audit or implementation.
2. Inspect the real product: code, tokens, assets, rendered screens, and relevant interaction states. Separate observations from assumptions.
3. Identify only a few high-impact issues. For each, state the visible evidence and its user impact.
4. Choose one direction that fits the product, content, task, and accessibility needs. Reuse existing design tokens and components where appropriate.
5. Make the smallest coherent changes in scope. Preserve brand, content, semantics, and behavior that the request did not ask to change.
6. Verify relevant breakpoints and states, including overflow, readability, keyboard and focus behavior, contrast, interaction targets, and reduced motion. Report what you actually tested and what remains unchecked.

## Guardrails

- Treat gradients, cards, shadows, rounded corners, popular fonts, and animations as signals to inspect—not automatic problems.
- Do not change an interface just to silence a lint warning or match a trend.
- Do not invent product claims, features, evidence, or assets.
- Avoid adding dependencies or decoration unless they solve an observed problem.
- Do not assign an automatic “AI slop” score; visual judgment needs product context and rendered results.
