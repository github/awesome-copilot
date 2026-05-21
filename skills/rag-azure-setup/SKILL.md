---
name: rag-azure-setup
description: 'Plan and scaffold Azure resources for a production-ready RAG baseline with Azure OpenAI, Azure AI Search, Storage, and observability defaults.'
---

# RAG Azure Setup

Use this skill when a user needs to prepare Azure infrastructure for a RAG system.

## Use for

- Selecting region and service SKUs for a RAG baseline
- Defining minimum resources: Azure OpenAI, AI Search, Storage, App Insights
- Choosing identity model: API keys vs managed identity + RBAC
- Producing IaC-ready parameter sets

## Do not use for

- Deep document preparation and chunking implementation
- Non-Azure cloud infrastructure planning

## Output contract

Provide:

1. Chosen architecture tier with rationale
2. Resource list and SKU choices
3. Security posture defaults
4. Estimated monthly cost range and main drivers
5. A short next-step checklist
