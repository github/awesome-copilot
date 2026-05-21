#!/usr/bin/env python3
"""RAG Indexing Runner Module - Document indexing orchestration"""

import sys
import os
from pathlib import Path

# Force UTF-8
os.environ['PYTHONIOENCODING'] = 'utf-8'
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except:
    pass

# Add current dir to path
sys.path.insert(0, str(Path(__file__).parent))

# Try to import document indexer
try:
    from document_indexer import DocumentIndexer
    HAS_INDEXER = True
except ImportError:
    HAS_INDEXER = False


class RAGIndexingRunner:
    """Orchestrates document indexing for RAG"""
    
    def __init__(self, knowledge_path: Path = None):
        self.knowledge_path = knowledge_path or Path("knowledge/")
        self.indexer = DocumentIndexer() if HAS_INDEXER else None
    
    def run(self):
        """Execute indexing workflow"""
        print("\n" + "="*60)
        print("RAG DOCUMENT INDEXING")
        print("="*60 + "\n")
        
        print(f"Scanning: {self.knowledge_path}\n")
        
        # Scan folders
        doc_inventory = self._scan_knowledge_folder()
        
        if not doc_inventory['total']:
            print("⚠️  No documents found!")
            print("Add documents to knowledge/ subfolders and run again.\n")
            return 1
        
        # Index documents
        print("Indexing documents...\n")
        print(f"Strategy:")
        print(f"  • Chunking: 300 tokens with 50 overlap")
        print(f"  • Vectorization: Enabled")
        print(f"  • Semantic ranking: Enabled\n")
        
        if self.indexer:
            try:
                stats = self.indexer.index_knowledge_folder(str(self.knowledge_path))
                print(f"Documents processed: {stats['documents_processed']}")
                print(f"Chunks created: {stats['chunks_created']}")
                print(f"Errors: {stats['errors']}\n")
            except Exception as e:
                print(f"Indexing error: {e}\n")
        else:
            print("Document indexer not available (mock mode)\n")
        
        print("="*60)
        print("✅ INDEXING COMPLETE")
        print("="*60 + "\n")
        
        return 0
    
    def _scan_knowledge_folder(self):
        """Scan knowledge folder and count documents"""
        inventory = {
            'pdfs': 0,
            'procedimientos': 0,
            'codigo': 0,
            'presentaciones': 0,
            'total': 0
        }
        
        for doc_type, count in inventory.items():
            if doc_type == 'total':
                continue
            
            path = self.knowledge_path / doc_type
            if path.exists():
                files = list(path.glob("*"))
                # Exclude directories
                count = len([f for f in files if f.is_file()])
                inventory[doc_type] = count
                inventory['total'] += count
                symbol = "✅" if count > 0 else "  "
                print(f"  {symbol} {doc_type:20s}: {count:3d} files")
            else:
                print(f"  ⚠️  {doc_type:20s}: Not found (creating...)")
                path.mkdir(parents=True, exist_ok=True)
        
        return inventory


def main():
    """Entry point for indexing"""
    print("\n📚 RAG Indexing Agent\n")
    
    runner = RAGIndexingRunner()
    return runner.run()


if __name__ == "__main__":
    sys.exit(main())
