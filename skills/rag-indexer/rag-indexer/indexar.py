#!/usr/bin/env python3
"""
RAG Indexer - Index documents into Azure AI Search

Usage:
    python indexar.py
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SearchField,
    SearchFieldDataType,
    SimpleField,
    SearchableField,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
    SemanticConfiguration,
    SemanticField,
    SemanticPrioritizedFields,
    SemanticSearch,
)
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv
import PyPDF2
from docx import Document
import time

class RAGIndexer:
    """Index documents into Azure AI Search"""

    def __init__(self):
        load_dotenv()
        
        self.search_endpoint = os.getenv("AZURE_SEARCH_ENDPOINT")
        self.search_key = os.getenv("AZURE_SEARCH_API_KEY")
        self.index_name = os.getenv("AZURE_SEARCH_INDEX", "pokemon-index")
        
        self.credential = AzureKeyCredential(self.search_key)
        self.index_client = SearchIndexClient(
            endpoint=self.search_endpoint,
            credential=self.credential
        )
        self.search_client = SearchClient(
            endpoint=self.search_endpoint,
            index_name=self.index_name,
            credential=self.credential
        )
        
        self.indexed_documents = []
        self.stats = {
            "total_files": 0,
            "indexed_documents": 0,
            "chunks_created": 0,
            "errors": []
        }

    def ensure_index_exists(self):
        """Create search index if it doesn't exist"""
        try:
            # Check if index exists
            try:
                self.index_client.get_index(self.index_name)
                print(f"✅ Index '{self.index_name}' already exists")
                return
            except:
                pass
            
            # Create new index
            print(f"📝 Creating index '{self.index_name}'...")
            
            fields = [
                SimpleField(name="id", type=SearchFieldDataType.String, key=True),
                SimpleField(name="source_file", type=SearchFieldDataType.String, filterable=True),
                SimpleField(name="chunk_id", type=SearchFieldDataType.Int32),
                SearchableField(name="content", type=SearchFieldDataType.String),
                SimpleField(name="source_type", type=SearchFieldDataType.String, filterable=True),
                SimpleField(name="created_at", type=SearchFieldDataType.String),
            ]
            
            vector_search = VectorSearch(
                algorithms=[HnswAlgorithmConfiguration(name="myHnsw")],
                profiles=[
                    VectorSearchProfile(
                        name="myVectorProfile",
                        algorithm_configuration_name="myHnsw",
                    )
                ],
            )
            
            semantic_config = SemanticConfiguration(
                name="my-semantic-config",
                prioritized_fields=SemanticPrioritizedFields(
                    content_fields=[SemanticField(field_name="content")],
                ),
            )
            
            semantic_search = SemanticSearch(configurations=[semantic_config])
            
            index = SearchIndex(
                name=self.index_name,
                fields=fields,
                vector_search=vector_search,
                semantic_search=semantic_search,
            )
            
            self.index_client.create_index(index)
            print(f"✅ Index '{self.index_name}' created successfully")
            
        except Exception as e:
            print(f"❌ Error creating index: {e}")
            self.stats["errors"].append(f"Index creation: {e}")

    def extract_text_from_pdf(self, file_path: Path) -> str:
        """Extract text from PDF file"""
        try:
            text = ""
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                for page in pdf_reader.pages:
                    text += page.extract_text()
            return text
        except Exception as e:
            print(f"⚠️  Error reading PDF {file_path}: {e}")
            self.stats["errors"].append(f"PDF extraction {file_path}: {e}")
            return ""

    def extract_text_from_docx(self, file_path: Path) -> str:
        """Extract text from DOCX file"""
        try:
            doc = Document(file_path)
            text = "\n".join([para.text for para in doc.paragraphs])
            return text
        except Exception as e:
            print(f"⚠️  Error reading DOCX {file_path}: {e}")
            self.stats["errors"].append(f"DOCX extraction {file_path}: {e}")
            return ""

    def extract_text_from_sql(self, file_path: Path) -> str:
        """Extract text from SQL file"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            print(f"⚠️  Error reading SQL {file_path}: {e}")
            self.stats["errors"].append(f"SQL extraction {file_path}: {e}")
            return ""

    def extract_text_from_file(self, file_path: Path) -> str:
        """Extract text from various file types"""
        suffix = file_path.suffix.lower()
        
        if suffix == ".pdf":
            return self.extract_text_from_pdf(file_path)
        elif suffix == ".docx":
            return self.extract_text_from_docx(file_path)
        elif suffix == ".sql":
            return self.extract_text_from_sql(file_path)
        elif suffix in [".txt", ".md", ".xml"]:
            try:
                with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                    return f.read()
            except Exception as e:
                print(f"⚠️  Error reading {suffix} {file_path}: {e}")
                self.stats["errors"].append(f"Text extraction {file_path}: {e}")
                return ""
        else:
            return ""

    def chunk_text(self, text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
        """Split text into chunks with overlap"""
        if not text:
            return []
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            chunk = text[start:end]
            chunks.append(chunk)
            start = end - overlap
        
        return chunks

    def index_file(self, file_path: Path, source_type: str) -> int:
        """Index a single file and return number of chunks indexed"""
        try:
            self.stats["total_files"] += 1
            
            # Extract text
            text = self.extract_text_from_file(file_path)
            if not text:
                print(f"⚠️  No content extracted from {file_path.name}")
                return 0
            
            # Create chunks
            chunks = self.chunk_text(text)
            if not chunks:
                return 0
            
            # Prepare documents for indexing
            documents = []
            for chunk_id, chunk in enumerate(chunks):
                # Create valid ID (only alphanumeric, dash, underscore)
                import hashlib
                file_hash = hashlib.md5(str(file_path).encode()).hexdigest()[:8]
                doc_id = f"doc_{file_hash}_{chunk_id}"
                
                # Use relative path for display
                try:
                    rel_path = str(file_path.relative_to(Path.cwd()))
                except ValueError:
                    rel_path = file_path.name
                
                documents.append({
                    "id": doc_id,
                    "source_file": rel_path,
                    "chunk_id": chunk_id,
                    "content": chunk,
                    "source_type": source_type,
                    "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                })
            
            # Upload to search index
            result = self.search_client.upload_documents(documents)
            
            self.stats["chunks_created"] += len(chunks)
            self.stats["indexed_documents"] += 1
            
            return len(chunks)
            
        except Exception as e:
            print(f"❌ Error indexing {file_path}: {e}")
            self.stats["errors"].append(f"Indexing {file_path}: {e}")
            return 0

    def index_directory(self, directory: Path, source_type: str, pattern: str = "*"):
        """Index all files in a directory matching pattern"""
        print(f"\n📂 Indexing {source_type} from {directory.name}/")
        
        count = 0
        for file_path in sorted(directory.rglob(pattern)):
            if file_path.is_file():
                chunks = self.index_file(file_path, source_type)
                if chunks > 0:
                    print(f"  ✅ {file_path.name} ({chunks} chunks)")
                    count += 1
        
        print(f"  Total: {count} files indexed")
        return count

    def run(self):
        """Run the complete indexing process"""
        print("\n" + "="*60)
        print("  RAG Indexer - Indexing Documents")
        print("="*60)
        
        # Ensure index exists
        self.ensure_index_exists()
        
        # Index knowledge directory recursively
        knowledge_dir = Path("knowledge")
        if not knowledge_dir.exists():
            print(f"❌ {knowledge_dir} not found")
            return
        
        print("\n🔍 Starting indexation...\n")
        
        # Index PDFs
        self.index_directory(knowledge_dir / "pdfs", "pdf", "*.pdf")
        
        # Index procedure documents
        self.index_directory(knowledge_dir / "procedimientos", "document", "*")
        
        # Index code (SQL, etc)
        self.index_directory(knowledge_dir / "codigo", "code", "*")
        
        # Index presentations
        self.index_directory(knowledge_dir / "presentaciones", "presentation", "*")
        
        # Print summary
        print("\n" + "="*60)
        print("  Indexation Summary")
        print("="*60)
        print(f"✅ Total files processed: {self.stats['total_files']}")
        print(f"✅ Total documents indexed: {self.stats['indexed_documents']}")
        print(f"✅ Total chunks created: {self.stats['chunks_created']}")
        
        if self.stats["errors"]:
            print(f"\n⚠️  Errors encountered ({len(self.stats['errors'])})")
            for error in self.stats["errors"][:5]:  # Show first 5 errors
                print(f"  - {error}")
        
        print("\n✅ Indexation complete! Ready to query.")
        print("="*60 + "\n")

if __name__ == "__main__":
    indexer = RAGIndexer()
    indexer.run()
