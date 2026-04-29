# Setup: TypeScript

Packages required for Phoenix evals and experiments.

## Installation

```bash
# Using npm
npm install @arizeai/phoenix-client @arizeai/phoenix-evals @arizeai/phoenix-otel

# Using pnpm
pnpm add @arizeai/phoenix-client @arizeai/phoenix-evals @arizeai/phoenix-otel
```

## LLM Providers

For LLM-as-judge evaluators, install Vercel AI SDK providers:

```bash
npm install ai @ai-sdk/openai      # Vercel AI SDK + OpenAI
npm install @ai-sdk/anthropic      # Anthropic
npm install @ai-sdk/google         # Google
```

Or use direct provider SDKs:

```bash
npm install openai                 # OpenAI direct
npm install @anthropic-ai/sdk      # Anthropic direct
```

## Quick Verify

```typescript
import { createClient } from "@arizeai/phoenix-client";
import { createClassificationEvaluator } from "@arizeai/phoenix-evals";
import { registerPhoenix } from "@arizeai/phoenix-otel";

// All imports should work
console.log("Phoenix TypeScript setup complete");
```
