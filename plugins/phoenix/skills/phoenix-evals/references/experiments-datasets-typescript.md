# Experiments: Datasets in TypeScript

Creating and managing evaluation datasets.

## Creating Datasets

```typescript
import { createClient } from "@arizeai/phoenix-client";
import { createDataset } from "@arizeai/phoenix-client/datasets";

const client = createClient();

const { datasetId } = await createDataset({
  client,
  name: "qa-test-v1",
  examples: [
    {
      input: { question: "What is 2+2?" },
      output: { answer: "4" },
      metadata: { category: "math" },
    },
  ],
});
```

## Example Structure

```typescript
interface DatasetExample {
  input: Record<string, unknown>;    // Task input
  output?: Record<string, unknown>;  // Expected output
  metadata?: Record<string, unknown>; // Additional context
}
```

## From Production Traces

```typescript
import { getSpans } from "@arizeai/phoenix-client/spans";

const { spans } = await getSpans({
  project: { projectName: "my-app" },
  parentId: null, // root spans only
  limit: 100,
});

const examples = spans.map((span) => ({
  input: { query: span.attributes?.["input.value"] },
  output: { response: span.attributes?.["output.value"] },
  metadata: { spanId: span.context.span_id },
}));

await createDataset({ client, name: "production-sample", examples });
```

## Retrieving Datasets

```typescript
import { getDataset, listDatasets } from "@arizeai/phoenix-client/datasets";

const dataset = await getDataset({ client, datasetId: "..." });
const all = await listDatasets({ client });
```

## Best Practices

- **Versioning**: Create new datasets, don't modify existing
- **Metadata**: Track source, category, provenance
- **Type safety**: Use TypeScript interfaces for structure
