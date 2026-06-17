# Arize AX Plugin

Arize AX platform skills for LLM observability, evaluation, and optimization. Includes trace export, instrumentation, datasets, experiments, evaluators, AI provider integrations, annotations, prompt optimization, and deep linking to the Arize UI.

## Installation

```bash
# Using Copilot CLI
copilot plugin install arize-ax@awesome-copilot
```

## What's Included

### Skills

| Skill | Description |
|-------|-------------|
| `arize-trace` | Export and analyze Arize traces and spans for debugging LLM applications using the ax CLI. |
| `arize-instrumentation` | Add Arize AX tracing to applications using a two-phase agent-assisted workflow. |
| `arize-dataset` | Create, manage, and query versioned evaluation datasets using the ax CLI. |
| `arize-experiment` | Run experiments against datasets and compare results using the ax CLI. |
| `arize-evaluator` | Create and run LLM-as-judge evaluators for automated scoring of spans and experiments. |
| `arize-ai-provider-integration` | Store and manage LLM provider credentials for use with evaluators. |
| `arize-annotation` | Create annotation configs and bulk-apply human feedback labels to spans. |
| `arize-prompt-optimization` | Optimize LLM prompts using production trace data, evaluations, and annotations. |
| `arize-link` | Generate deep links to the Arize UI for traces, spans, sessions, datasets, and more. |
