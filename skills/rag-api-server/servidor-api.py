#!/usr/bin/env python3
"""
RAG Server - REST API for RAG queries
Ideal for integrating RAG into web apps, dashboards, or third-party tools

Usage:
    # Start server
    python servidor-api.py --port 8000 --host 0.0.0.0
    
    # Query from client
    curl -X POST http://localhost:8000/query \
      -H "Content-Type: application/json" \
      -d '{"query": "¿Cuál es la política de retención?"}'
"""

import os
import json
import logging
import argparse
import time
from typing import Dict, List, Any, Optional
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from azure.openai import AzureOpenAI
from azure.search.documents import SearchClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv


# ============================================
# Logging Setup
# ============================================

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('./logs/rag-server.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


# ============================================
# Pydantic Models
# ============================================

class QueryRequest(BaseModel):
    """Request model for RAG queries"""
    query: str
    top_k: Optional[int] = 5
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 1000
    include_sources: Optional[bool] = True


class QueryResponse(BaseModel):
    """Response model for RAG queries"""
    query: str
    response: str
    sources: List[Dict[str, Any]]
    metrics: Dict[str, Any]
    timestamp: str


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    openai_connected: bool
    search_connected: bool
    timestamp: str


# ============================================
# RAG Server
# ============================================

class RAGServer:
    """FastAPI RAG Server with conversation support"""
    
    def __init__(self):
        load_dotenv()
        
        # Initialize OpenAI client
        self.openai_client = AzureOpenAI(
            api_key=os.getenv("AZURE_OPENAI_KEY"),
            api_version="2024-08-01-preview",
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
        )
        
        # Initialize Search client
        self.search_client = SearchClient(
            endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
            index_name=os.getenv("AZURE_SEARCH_INDEX"),
            credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_KEY"))
        )
        
        self.model = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o")
        
        # Session store for multi-turn conversations
        self.sessions: Dict[str, List[Dict]] = {}
        
        logger.info("✅ RAG Server initialized")
    
    def search_documents(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for relevant documents"""
        try:
            results = self.search_client.search(
                search_text=query,
                search_mode="all",
                top=top_k,
                query_type="semantic",
                semantic_configuration_name="default"
            )
            
            documents = []
            for result in results:
                documents.append({
                    "content": result.get("content", ""),
                    "source": result.get("source", "unknown"),
                    "score": float(result.get("@search.score", 0))
                })
            
            return documents
            
        except Exception as e:
            logger.error(f"Search error: {e}")
            raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")
    
    def generate_response(
        self,
        query: str,
        context_docs: List[Dict[str, Any]],
        temperature: float = 0.3,
        max_tokens: int = 1000
    ) -> str:
        """Generate RAG response using OpenAI"""
        try:
            # Build context
            context = "\n\n".join([
                f"Source: {doc['source']}\n{doc['content']}"
                for doc in context_docs
            ])
            
            system_prompt = """You are a helpful assistant answering questions based on provided documentation.
Use the provided context to answer accurately and concisely.
If the answer is not in the context, say so clearly.
Always cite your sources when possible."""

            user_prompt = f"""Context:
{context}

Question: {query}

Answer:"""

            response = self.openai_client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Inference error: {e}")
            raise HTTPException(status_code=500, detail=f"Inference failed: {str(e)}")
    
    def query(self, req: QueryRequest) -> QueryResponse:
        """Execute RAG query"""
        start_time = time.time()
        
        logger.info(f"Query: {req.query}")
        
        # Search
        documents = self.search_documents(req.query, req.top_k)
        
        if not documents:
            return QueryResponse(
                query=req.query,
                response="No relevant documents found.",
                sources=[],
                metrics={"search_time_ms": (time.time() - start_time) * 1000},
                timestamp=datetime.utcnow().isoformat()
            )
        
        # Generate response
        response = self.generate_response(
            req.query,
            documents,
            req.temperature,
            req.max_tokens
        )
        
        total_time = time.time() - start_time
        
        return QueryResponse(
            query=req.query,
            response=response,
            sources=documents if req.include_sources else [],
            metrics={
                "search_time_ms": round((time.time() - start_time - total_time) * 1000, 2),
                "total_time_ms": round(total_time * 1000, 2),
                "documents_retrieved": len(documents)
            },
            timestamp=datetime.utcnow().isoformat()
        )
    
    def health_check(self) -> HealthResponse:
        """Check server health and connections"""
        openai_ok = False
        search_ok = False
        
        try:
            self.openai_client.models.list()
            openai_ok = True
        except:
            pass
        
        try:
            self.search_client.get_index()
            search_ok = True
        except:
            pass
        
        return HealthResponse(
            status="healthy" if (openai_ok and search_ok) else "degraded",
            openai_connected=openai_ok,
            search_connected=search_ok,
            timestamp=datetime.utcnow().isoformat()
        )


# ============================================
# FastAPI App
# ============================================

def create_app() -> FastAPI:
    """Create FastAPI application"""
    
    app = FastAPI(
        title="RAG Server",
        description="REST API for Retrieval-Augmented Generation queries",
        version="1.0.0"
    )
    
    # CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Initialize RAG server
    rag = RAGServer()
    
    # ============================================
    # Routes
    # ============================================
    
    @app.get("/health", response_model=HealthResponse)
    async def health():
        """Health check endpoint"""
        return rag.health_check()
    
    @app.post("/query", response_model=QueryResponse)
    async def query(request: QueryRequest):
        """Execute RAG query"""
        if not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        return rag.query(request)
    
    @app.post("/batch-query")
    async def batch_query(requests: List[QueryRequest]):
        """Execute multiple RAG queries"""
        responses = []
        for req in requests:
            try:
                responses.append(rag.query(req))
            except Exception as e:
                responses.append({
                    "error": str(e),
                    "query": req.query
                })
        
        return {"results": responses, "count": len(responses)}
    
    @app.get("/")
    async def root():
        """API root"""
        return {
            "name": "RAG Server",
            "version": "1.0.0",
            "endpoints": {
                "health": "GET /health",
                "query": "POST /query",
                "batch": "POST /batch-query",
                "docs": "GET /docs"
            }
        }
    
    logger.info("✅ FastAPI app created")
    return app


# ============================================
# Main
# ============================================

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="RAG Server")
    parser.add_argument("--host", default="127.0.0.1", help="Server host (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Server port (default: 8000)")
    parser.add_argument("--workers", type=int, default=4, help="Number of workers (default: 4)")
    parser.add_argument("--reload", action="store_true", help="Enable auto-reload")
    
    args = parser.parse_args()
    
    # Create logs directory
    Path("./logs").mkdir(exist_ok=True)
    
    # Create and run app
    import uvicorn
    
    logger.info(f"🚀 Starting RAG Server at http://{args.host}:{args.port}")
    logger.info(f"📚 API Docs: http://{args.host}:{args.port}/docs")
    
    uvicorn.run(
        "servidor-api:create_app",
        host=args.host,
        port=args.port,
        workers=args.workers,
        reload=args.reload,
        factory=True
    )
