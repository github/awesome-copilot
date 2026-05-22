---
name: 'rag-diagnostics'
description: 'Monitors, diagnoses and troubleshoots RAG system health. Verifies Azure AI Search connectivity, index status, configuration, and provides real-time monitoring with actionable error reports.'
---

# RAG Diagnostics — System Health and Monitoring

**Monitor, diagnose and troubleshoot your RAG system.**

## Overview

Collection of diagnostic and monitoring tools to verify Azure AI Search health, index status, and system configuration.

## Features

- System status report (all components)
- Index diagnostics (documents, fields, health)
- Configuration verification
- Real-time monitoring
- Error reports with solutions

## Included Tools

### 1. **system-status.py** — Complete System Status

Check the general health of the RAG and status of components.

```bash
python .github/skills/rag-diagnostics/system-status.py
```

**Output:**
```
========================================================================
  RAG SYSTEM STATUS REPORT
========================================================================

  PHASE 1: Keyword + Semantic Search
   Status: Running
   Items processed: 113
   Items failed: 0
   Duration: 245000 ms
   Index: rag-documents

  PHASE 2: Vector Search
   Status: Running
   Items processed: 86
   Items failed: 0
   Duration: 123000 ms
   Index: rag-documents-vectors

  INDEX STATISTICS
   rag-documents: 113 documents
   rag-documents-vectors: 86 documents
```

### 2. **diagnose.py** — Detailed Diagnostics

Deep analysis of Azure AI Search configuration and issues.

```bash
python .github/skills/rag-diagnostics/diagnose.py
```

**Output:**
```
1  INDEXES
   rag-documents
      - Fields: 7
      - Vectors: No

2  DATA SOURCES
   blob-storage
      - Type: AzureBlobStorage

3  SKILLSETS
   ocr-skillset
      - Skills: 4
      - Types: OcrSkill, SplitSkill, MergeSkill

4  INDEXERS
   blob-indexer
      - Status: Running
      - Schedule: Every hour
```

### 3. **monitor.py** — Real-Time Monitoring

Continuous monitoring of indexer activity.

```bash
python .github/skills/rag-diagnostics/monitor.py
```

**Output:**
```
Monitoring indexer: blob-indexer
Press Ctrl+C to stop

[14:23:45] Status: Running | Processed: 45 | Failed: 0
[14:24:10] Status: Running | Procesados: 89 | Fallidos: 1
[14:24:35] Status: Completed | Procesados: 113 | Fallidos: 0
```

## Requirements

```bash
pip install -r .github/requirements.txt
```

- `.env` with Azure AI Search credentials:
  - `AZURE_SEARCH_ENDPOINT`
  - `AZURE_SEARCH_KEY`

## Usage Examples

### Check System Health

```bash
python .github/skills/rag-diagnostics/system-status.py
```

### Diagnose Indexer Issues

```bash
python .github/skills/rag-diagnostics/diagnose.py
```

### Monitor Live Progress

```bash
# View indexing in real time
python .github/skills/rag-diagnostics/monitor.py
```

## Common Issues and Solutions

| Issue | Diagnosis | Solution |
|---|---|---|
| Empty index | `system-status.py` shows 0 docs | Run `rag-indexer` skill |
| Indexer failed | `diagnose.py` shows status: Failed | Verify credentials in `.env` |
| Semantic search not working | Index mysing semantic config | Recreate index with semantic enabled |
| Indexing slow | `monitor.py` shows low throughput | Increase Search tier or batch size |

## Integration

### In Scripts

```python
from system_status import check_status

status = check_status()
if status['index_count'] == 0:
    print("No documents indexed yet")
else:
    print(f"{status['index_count']} documents ready")
```

### In CI/CD

```bash
# Health check before deployment
python .github/skills/rag-diagnostics/diagnose.py || exit 1
```
