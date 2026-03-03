# Azure AI Foundry

Azure AI Foundry (formerly Azure OpenAI) for building AI-powered applications with models like GPT-4o, GPT-4, and embeddings.

> **💡 For detailed AI guidance**, invoke the **`microsoft-foundry`** skill. It provides model catalog access, RAG patterns, agent creation, and evaluation workflows.

## When to Use

- Chat and conversational AI applications
- Text generation and completion
- Code generation assistants
- Document analysis and summarization
- Embeddings for search and RAG
- Multi-modal applications (vision + text)

## Service Type in azure.yaml

```yaml
services:
  my-ai-service:
    host: containerapp  # AI services typically deployed via Container Apps
    project: ./src/ai-service
```

## Required Supporting Resources

| Resource | Purpose |
|----------|---------|
| Azure AI Foundry account | Model hosting |
| Model deployment | Specific model (GPT-4o, GPT-4, etc.) |
| Key Vault | Store API keys securely |
| Application Insights | Monitor usage and costs |

## Model Selection

| Model | Best For | Context Window |
|-------|----------|----------------|
| GPT-4o | General purpose, vision, latest | 128K |
| GPT-4 | Complex reasoning | 32K |
| GPT-3.5-Turbo | Cost-effective, simple tasks | 16K |
| text-embedding-ada-002 | Embeddings for RAG/search | 8K |

## References

- [Region Availability](region-availability.md)
