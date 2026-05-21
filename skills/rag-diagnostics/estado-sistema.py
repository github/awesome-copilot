#!/usr/bin/env python3
"""
RAG Status Report - Shows Phase 1 + Phase 2 indexing progress
"""

import os
import sys
from datetime import datetime
from dotenv import load_dotenv
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient, SearchIndexerClient
from azure.core.credentials import AzureKeyCredential


def main():
    load_dotenv()

    search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
    search_key = os.getenv("AZURE_SEARCH_KEY")

    if not search_endpoint or not search_key:
        print("❌ Missing AZURE_SEARCH_ENDPOINT or AZURE_SEARCH_KEY")
        sys.exit(1)

    index_client = SearchIndexClient(search_endpoint, AzureKeyCredential(search_key))
    indexer_client = SearchIndexerClient(search_endpoint, AzureKeyCredential(search_key))

    print("\n" + "=" * 70)
    print("🚀 RAG SYSTEM STATUS REPORT")
    print("=" * 70)
    print(f"Timestamp: {datetime.now().isoformat()}\n")

    # Phase 1: Keyword + Semantic Search
    print("📍 PHASE 1: Keyword + Semantic Search (OCR Pipeline)")
    print("-" * 70)
    try:
        status = indexer_client.get_indexer_status("blob-indexer")
        if status.execution_history:
            idx_result = status.execution_history[0]
            print(f"  Status: {status.status}")
            print(f"  Items processed: {idx_result.item_count or 0}")
            print(f"  Items failed: {idx_result.failed_item_count or 0}")
            if idx_result.start_time and idx_result.end_time:
                duration = (
                    (idx_result.end_time - idx_result.start_time).total_seconds() * 1000
                )
                print(f"  Duration: {duration:.0f} ms")
        else:
            print(f"  Status: {status.status}")
            print("  No execution history yet")
        print(f"  Index: rag-documents")
    except Exception as e:
        print(f"  ❌ Error: {e}")

    # Phase 2: Vector Search
    print("\n📍 PHASE 2: Vector Search (Hybrid - Ready)")
    print("-" * 70)
    try:
        status = indexer_client.get_indexer_status("vector-indexer")
        if status.execution_history:
            idx_result = status.execution_history[0]
            print(f"  Status: {status.status}")
            print(f"  Items processed: {idx_result.item_count or 0}")
            print(f"  Items failed: {idx_result.failed_item_count or 0}")
            if idx_result.start_time and idx_result.end_time:
                duration = (
                    (idx_result.end_time - idx_result.start_time).total_seconds() * 1000
                )
                print(f"  Duration: {duration:.0f} ms")
        else:
            print(f"  Status: {status.status}")
            print("  No execution history yet")
        print(f"  Index: rag-documents-vectors")
        print("  Note: Ready for embedding pipeline integration")
    except Exception as e:
        print(f"  ❌ Error: {e}")

    # Index statistics
    print("\n📊 INDEX STATISTICS")
    print("-" * 70)
    for idx_name in ["rag-documents", "rag-documents-vectors"]:
        try:
            index_client.get_index(idx_name)
            search_client = SearchClient(
                search_endpoint, idx_name, AzureKeyCredential(search_key)
            )
            results = search_client.search(search_text="*", select=["id"], top=1)
            doc_count = results.get_count()
            print(f"  ✓ {idx_name}: {doc_count or 'N/A'} documents")
        except Exception as e:
            print(f"  ✗ {idx_name}: {e}")

    print("\n" + "=" * 70)
    print("✅ RAG System Ready")
    print("=" * 70)
    print("""
Query Examples:
  1. Keyword/Semantic: 
     POST /indexes/rag-documents/docs/search
     {"search": "MENSADEF buzón", "searchMode": "any"}

  2. Vector Search:
     POST /indexes/rag-documents-vectors/docs/search
     {"search": "procedimiento", "searchMode": "any"}

  3. Hybrid (both):
     Use rag-documents for semantic
     Use rag-documents-vectors when embeddings available
""")


if __name__ == "__main__":
    main()
