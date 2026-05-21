#!/usr/bin/env python3
"""
RAG Query Executor - Main entry point for RAG queries

Usage:
    python consultar.py "Your question about the documentation"
"""

import os
import sys
import json
import time
from typing import Optional
from openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

# Fix UTF-8 encoding on Windows
if sys.platform == 'win32':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')


class RAGExecutor:
    """Execute RAG queries against indexed documentation"""

    def __init__(self):
        load_dotenv()
        
        # Initialize OpenAI client
        self.openai_client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-08-01-preview"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        
        # Initialize Search client
        self.search_client = SearchClient(
            endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
            index_name=os.getenv("AZURE_SEARCH_INDEX", "pokemon-index"),
            credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_API_KEY"))
        )
        
        self.model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")
        self.metrics = {}

    def search_documents(self, query: str, top_k: int = 5) -> list:
        """
        Search for relevant documents using hybrid search + semantic ranking
        (Azure best practices for Classic RAG)
        
        Args:
            query: Search query
            top_k: Number of results to return
            
        Returns:
            List of relevant document chunks
        """
        start_time = time.time()
        
        # Clean query: remove special punctuation that Azure Search doesn't handle well
        clean_query = query.strip()
        for char in "¿?!¡":
            clean_query = clean_query.replace(char, "")
        clean_query = clean_query.strip()
        
        try:
            # Hybrid search: keyword + BM25 + semantic ranking
            # This is the recommended approach for Classic RAG
            search_results = self.search_client.search(
                search_text=clean_query,
                query_type="semantic",
                semantic_configuration_name="default",
                select=["id", "content", "source_file", "metadata_storage_path"],
                top=top_k
            )
            
            # Convert to list to ensure we can iterate
            results = list(search_results)
            
            documents = []
            for result in results:
                doc = {
                    "content": result.get("content", ""),
                    "source": result.get("source_file", result.get("metadata_storage_path", "unknown")),
                    "score": result.get("@search.score", 0),
                    "reranker_score": result.get("@search.reranker_score", 0)  # Semantic ranking score
                }
                documents.append(doc)
            
            search_time = time.time() - start_time
            self.metrics["search_time_ms"] = search_time * 1000
            self.metrics["retrieved_documents"] = len(documents)
            
            return documents
            
        except Exception as e:
            print(f"⚠️  Semantic ranking no disponible, usando keyword search: {e}")
            
            # Fallback a keyword search si semantic ranking no está disponible
            try:
                search_results = self.search_client.search(
                    search_text=clean_query,
                    top=top_k
                )
                
                results = list(search_results)
                documents = []
                for result in results:
                    doc = {
                        "content": result.get("content", ""),
                        "source": result.get("source_file", result.get("metadata_storage_path", "unknown")),
                        "score": result.get("@search.score", 0)
                    }
                    documents.append(doc)
                
                return documents
            except Exception as fallback_error:
                print(f"❌ Search error: {fallback_error}")
                return []

    def generate_response(self, query: str, context_docs: list) -> str:
        """
        Generate RAG response using OpenAI with retrieved context
        
        Args:
            query: User query
            context_docs: Retrieved document chunks
            
        Returns:
            Generated response
        """
        start_time = time.time()
        
        # Build context from retrieved docs
        context = "\n\n".join([
            f"Source: {doc['source']}\n{doc['content']}"
            for doc in context_docs
        ])
        
        # Build prompt
        system_prompt = """You are a helpful assistant answering questions based on provided documentation.
Use the provided context to answer the question accurately and concisely.
If the answer is not in the provided context, say so clearly.
Always cite your sources."""

        user_prompt = f"""Context:
{context}

Question: {query}

Answer:"""

        try:
            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=1000
            )
            
            inference_time = time.time() - start_time
            self.metrics["inference_time_ms"] = inference_time * 1000
            self.metrics["tokens_used"] = response.usage.total_tokens
            
            return response.choices[0].message.content
            
        except Exception as e:
            print(f"❌ Inference error: {e}")
            return f"Error generating response: {e}"

    def execute(self, query: str, verbose: bool = False) -> dict:
        """
        Execute complete RAG pipeline
        
        Args:
            query: User query
            verbose: Print intermediate steps
            
        Returns:
            Dict with query, response, sources, and metrics
        """
        start_time = time.time()
        
        if verbose:
            print(f"\n[QUERY] {query}")
        
        # Step 1: Search
        if verbose:
            print("[SEARCHING] Searching documents...")
        
        context_docs = self.search_documents(query)
        
        if not context_docs:
            return {
                "query": query,
                "response": "No relevant documents found.",
                "sources": [],
                "metrics": self.metrics
            }
        
        if verbose:
            print(f"[OK] Found {len(context_docs)} relevant documents")
        
        # Step 2: Generate response
        if verbose:
            print("[GENERATING] Generating response...")
        
        response = self.generate_response(query, context_docs)
        
        if verbose:
            print("[OK] Response generated")
        
        total_time = time.time() - start_time
        self.metrics["total_time_ms"] = total_time * 1000
        
        return {
            "query": query,
            "response": response,
            "sources": [doc["source"] for doc in context_docs],
            "metrics": self.metrics
        }


def main():
    """Main entry point"""
    
    if len(sys.argv) < 2:
        print("Usage: python consultar.py \"Your question\"")
        print("Example: python consultar.py \"What is the data retention policy?\"")
        sys.exit(1)
    
    query = " ".join(sys.argv[1:])
    
    # Execute RAG
    executor = RAGExecutor()
    result = executor.execute(query, verbose=True)
    
    # Display results
    print(f"\n[RESPONSE]\n{result['response']}")
    
    if result['sources']:
        print(f"\n[SOURCES]")
        for source in result['sources']:
            # Encode safely to handle special characters
            try:
                print(f"   - {source}")
            except UnicodeEncodeError:
                print(f"   - {source.encode('utf-8', errors='replace').decode('utf-8', errors='replace')}")
    
    print(f"\n[METRICS]")
    print(f"   Search: {result['metrics'].get('search_time_ms', 0):.1f}ms")
    print(f"   Inference: {result['metrics'].get('inference_time_ms', 0):.1f}ms")
    print(f"   Total: {result['metrics'].get('total_time_ms', 0):.1f}ms")
    print(f"   Tokens: {result['metrics'].get('tokens_used', 0)}")


if __name__ == "__main__":
    main()
