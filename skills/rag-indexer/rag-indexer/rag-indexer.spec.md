# SPEC: RAG Indexer Specialist

**GitHub Spec Kit Enterprise Compliance**

---

## 1. Overview

| Attribute | Value |
|-----------|-------|
| **Name** | rag-indexer-specialist |
| **Purpose** | Index documents from knowledge/ folder into Azure Search |
| **Type** | Data Pipeline Skill |
| **Tier** | 1 (Critical — RAG quality depends on this) |
| **Input** | Document paths, extraction configuration |
| **Output** | JSON with indexing stats (docs processed, chunks created, errors) |
| **Responsibility** | Document parsing, chunking, embedding, Azure Search ingestion |

---

## 2. Input/Output Contract

### 2.1 Input Schema

```json
{
  "action": "scan|index|clear",
  "knowledge_folder": "./knowledge",
  "search_index_name": "rag-pokemon-index",
  "search_endpoint": "https://rag-pokemon-search.search.windows.net/",
  "search_key": "***",
  "chunk_size": 2048,
  "chunk_overlap": 200,
  "file_types": [".pdf", ".docx", ".md", ".xlsx"],
  "dry_run": false
}
```

**Required Fields:**
- `action`: One of {scan, index, clear}
- `knowledge_folder`: Path to documents
- `search_index_name`: Azure Search index name

**Optional Fields:**
- `chunk_size`: Default 2048 tokens
- `chunk_overlap`: Default 200 tokens
- `file_types`: Default [.pdf, .docx, .md, .xlsx]
- `dry_run`: Default false

### 2.2 Output Schema

```json
{
  "timestamp": "2026-05-15T15:00:00Z",
  "action": "index",
  "status": "success|error",
  "duration_seconds": 450,
  "result": {
    "files_found": 42,
    "files_processed": 42,
    "files_skipped": 0,
    "documents_created": 1950,
    "chunks_created": 8420,
    "bytes_indexed": 125000000,
    "errors": [],
    "warnings": [
      {
        "file": "knowledge/pdfs/old-format.pdf",
        "message": "OCR quality 62% (expected 85%+)",
        "impact": "Some paragraphs may be incomplete"
      }
    ],
    "indexed_files": [
      {
        "path": "knowledge/pdfs/manual-volume-1.pdf",
        "documents": 450,
        "chunks": 1920,
        "bytes": 15000000,
        "status": "indexed",
        "extraction_method": "Azure Document Intelligence"
      },
      {
        "path": "knowledge/procedimientos/proceso-defensa.md",
        "documents": 25,
        "chunks": 105,
        "bytes": 250000,
        "status": "indexed",
        "extraction_method": "Markdown parser"
      }
    ],
    "performance": {
      "docs_per_second": 4.3,
      "chunks_per_second": 18.7,
      "average_extraction_time_ms": 230,
      "average_embedding_time_ms": 45,
      "average_indexing_time_ms": 120
    }
  },
  "error": null,
  "metadata": {
    "search_index": "rag-pokemon-index",
    "index_size_mb": 245,
    "batch_size": 500
  }
}
```

---

## 3. Success Criteria

### 3.1 Functional Requirements

| Requirement | Success Metric | Validation |
|---|---|---|
| **Scan documents** | Finds all files in knowledge/ | Compare vs manual listing |
| **Parse PDFs** | OCR quality > 85% | Compare extracted vs original |
| **Extract text** | 95%+ success rate | Manual sampling of 10 files |
| **Create chunks** | Chunks properly sized (±10%) | Verify chunk token count |
| **Generate embeddings** | Embeddings created via embedding service | Verify in Azure Search |
| **Bulk index** | 1,000 docs/min sustainable | Measure throughput |
| **Error recovery** | Continues on parse failure | One bad file doesn't stop others |
| **Dry-run support** | dry_run=true shows plan | No Azure changes made |

### 3.2 Non-Functional Requirements

| Requirement | Target | Measurement |
|---|---|---|
| **Indexing speed** | > 4 docs/sec | Timer in logs |
| **Memory usage** | < 2GB for 10K docs | Memory profiler |
| **Resumability** | Can resume after failure | Run twice, only missing docs indexed |
| **Deduplication** | No duplicate chunks | Query Azure Search for duplicates |

---

## 4. Error Handling Table

| Error Code | Condition | Recovery | Retry? |
|---|---|---|---|
| `KNOWLEDGE_FOLDER_NOT_FOUND` | knowledge/ path missing | Create empty folder structure | No |
| `INVALID_FILE_TYPE` | File type not supported | Skip, continue | No |
| `PDF_CORRUPT` | PDF can't be parsed | Log warning, skip file | No |
| `OCR_QUALITY_LOW` | OCR confidence < 60% | Log warning, use best effort | No |
| `EMBEDDING_FAILED` | Embedding API error | Retry 3x with backoff | Yes |
| `SEARCH_INDEX_NOT_FOUND` | Search index doesn't exist | Create via rag-azure-setup first | No |
| `AUTHENTICATION_FAILED` | Invalid Search credentials | Check `.env` | No |
| `INDEXING_TIMEOUT` | Operation > 30 min | Retry with smaller batch | Yes |

---

## 5. Integration Points

### Called By
- **rag-onboarding.agent.md** — Phase 5 (Index Documents)
- **Manual indexing** — CLI or agent invocation

### Calls
- **Azure Document Intelligence** (PDF/image extraction)
- **Azure OpenAI Embeddings** (text-embedding-3-small)
- **Azure Search** (indexing API)

### Output Consumed By
- **rag-chat.agent.md** — Uses indexed documents for search
- **Monitoring systems** — Indexing stats logged

---

## 6. Release Gates

- [ ] **File scanning** — Finds all documents correctly
- [ ] **OCR quality** — > 85% confidence on PDFs
- [ ] **Chunking** — Chunks within ±10% of target size
- [ ] **Embedding quality** — Vectors generated and searchable
- [ ] **Bulk indexing** — > 4 docs/sec sustained
- [ ] **Error handling** — One failure doesn't stop process
- [ ] **Dry-run test** — No Azure changes made
- [ ] **Resumability** — Can restart without re-indexing

---

## 7. Testing Strategy

```bash
# Scan phase: Find all documents
python indexer.py --action scan --knowledge-folder ./knowledge

# Dry-run: Show what would be indexed
python indexer.py --action index --knowledge-folder ./knowledge --dry-run

# Index phase: Actual ingestion
python indexer.py --action index --knowledge-folder ./knowledge

# Verify: Query for test document
az search query -i rag-pokemon-index -q "test phrase from indexed doc"

# Clear: Remove all indexed documents
python indexer.py --action clear --knowledge-folder ./knowledge
```

---

## 8. Document Organization

Expected folder structure:

```
knowledge/
├── pdfs/
│   ├── user-manual-vol1.pdf
│   ├── specifications.pdf
│   └── api-guide.pdf
├── procedimientos/
│   ├── setup-guide.md
│   ├── deployment.docx
│   └── runbook.xlsx
├── codigo/
│   ├── schema.sql
│   ├── config.json
│   └── setup.py
└── presentaciones/
    ├── architecture.pptx
    ├── roadmap.pptx
    └── demo-video.mp4
```

---

## 9. Version & Changelog

| Version | Date | Changes |
|---|---|---|
| 1.0.0 | 2026-05-15 | Initial Spec Kit release |

---

**Status:** ENTERPRISE READY — Spec Kit Compliant
**Last Updated:** 2026-05-15
