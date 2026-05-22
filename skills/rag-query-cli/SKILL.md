---
name: 'rag-query-cli'
description: 'Interactive CLI for searching and querying documents indexed in a RAG system using Azure AI Search and Azure OpenAI. Supports hybrid search, source tracking, response generation, and UTF-8 compatibility on Windows.'
---

# RAG Query CLI — Interactive Document Search

**Query your RAG system interactively from the command line.**

## Overview

Interactive CLI for searching and querying documents indexed in your RAG system using Azure AI Search + Azure OpenAI.

## Features

- Hybrid search (keyword + semantic ranking)
- Document retrieval with source tracking
- Response generation with context
- Performance metrics
- Handling of special UTF-8 characters (Windows compatible)

## Requirements

- Azure OpenAI account with model deployed
- Azure AI Search instance with indexed documents
- `.env` file with credentials:
  - `AZURE_OPENAI_KEY`
  - `AZURE_OPENAI_ENDPOINT`
  - `AZURE_SEARCH_ENDPOINT`
  - `AZURE_SEARCH_KEY`
  - `AZURE_SEARCH_INDEX`
  - `AZURE_OPENAI_MODEL`

## Installation

```bash
# Dependencies in ../.../requirements.txt
pip install -r .github/requirements.txt
```

## Usage

### Interactive Query (Recommended)

```bash
# From the project root
python .github/skills/rag-query-cli/query.py "Your question here"

# Example
python .github/skills/rag-query-cli/query.py "What is the user onboarding process?"
```

### Direct Execution

```python
from query import RAGExecutor

executor = RAGExecutor()
result = executor.execute("your question", verbose=True)

print(result['response'])
print("Sources:", result['sources'])
print("Metrics:", result['metrics'])
```

## Output

```
[QUERY] What is the user onboarding process?

[SEARCHING] Searching documents...
[OK] Found 5 relevant documents

[GENERATING] Generating response...
[OK] Response generated

[RESPONSE]
Based on documentation, the user onboarding process involves...

[SOURCES]
   - knowledge/pdfs/Onboarding_Manual.pdf
   - knowledge/procedures/User_Setup.docx

[METRICS]
   Search: 234ms
   Inference: 1523ms
   Total: 1757ms
   Tokens: 412
```

## Advanced Options

### Custom Top-K

```bash
# Retrieve more context (default is 5)
python .github/skills/rag-query-cli/query.py "question" --top 10
```

### Quiet Mode

```bash
# Only answer output
python .github/skills/rag-query-cli/query.py "question" --quiet
```
