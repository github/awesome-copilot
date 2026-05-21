---
name: rag-indexer
description: 'Design document ingestion and indexing workflows for Azure AI Search, including chunking, metadata strategy, and incremental reindexing guidance.'
---

# RAG Indexer

Use this skill to define and improve indexing pipelines for RAG on Azure AI Search.

## Use for

- Source inventory and ingestion sequencing
- Chunking and overlap strategy selection
- Metadata schema design for filters and citations
- Hybrid retrieval baseline (keyword + vector + semantic ranker)
- Reindexing strategy for changed documents

## Do not use for

- End-user chat UX implementation
- Azure subscription governance and policy enforcement

## Output contract

Provide:

1. Ingestion workflow by source type
2. Chunking and embedding settings
3. Index schema proposal
4. Retrieval tuning checklist
5. Verification queries and expected outcomes
