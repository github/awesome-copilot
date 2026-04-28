# Evaluators: Overview

When and how to build automated evaluators.

## Decision Framework

```
Should I Build an Evaluator?
        │
        ▼
Can I fix it with a prompt change?
    YES → Fix the prompt first
    NO  → Is this a recurring issue?
          YES → Build evaluator
          NO  → Add to watchlist
```

**Don't automate prematurely.** Many issues are simple prompt fixes.

## Evaluator Requirements

1. **Clear criteria** - Specific, not "Is it good?"
2. **Labeled test set** - 100+ examples with human labels
3. **Measured accuracy** - Know TPR/TNR before deploying

## Evaluator Lifecycle

1. **Discover** - Error analysis reveals pattern
2. **Design** - Define criteria and test cases
3. **Implement** - Build code or LLM evaluator
4. **Calibrate** - Validate against human labels
5. **Deploy** - Add to experiment/CI pipeline
6. **Monitor** - Track accuracy over time
7. **Maintain** - Update as product evolves

## What NOT to Automate

- **Rare issues** - <5 instances? Watchlist, don't build
- **Quick fixes** - Fixable by prompt change? Fix it
- **Evolving criteria** - Stabilize definition first
