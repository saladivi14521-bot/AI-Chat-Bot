"""
SmartRep AI - Vector Store Service (ChromaDB)
Manages embeddings for RAG (Retrieval Augmented Generation)
"""
import os
import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Dict, Optional
from loguru import logger
from app.core.config import settings


class VectorStore:
    """Manages ChromaDB collections for business knowledge bases"""

    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            persist_dir = os.environ.get("CHROMA_PERSIST_DIR", "")
            if persist_dir:
                # Railway / Docker: use PersistentClient with local storage
                try:
                    os.makedirs(persist_dir, exist_ok=True)
                    self._client = chromadb.PersistentClient(path=persist_dir)
                    logger.info(f"ChromaDB PersistentClient at {persist_dir}")
                except Exception as e:
                    logger.warning(f"ChromaDB PersistentClient failed: {e}, using in-memory")
                    self._client = chromadb.Client()
            else:
                # Local dev: try HttpClient first, fallback to in-memory
                try:
                    self._client = chromadb.HttpClient(
                        host=settings.CHROMA_HOST,
                        port=settings.CHROMA_PORT,
                    )
                    # Test connection
                    self._client.heartbeat()
                    logger.info("Connected to ChromaDB HttpClient")
                except Exception as e:
                    logger.warning(f"ChromaDB HttpClient failed: {e}, using PersistentClient")
                    try:
                        self._client = chromadb.PersistentClient(path="./chroma_data")
                        logger.info("ChromaDB PersistentClient at ./chroma_data")
                    except Exception as e2:
                        logger.warning(f"PersistentClient also failed: {e2}, using in-memory")
                        self._client = chromadb.Client()
        return self._client

    def _get_collection_name(self, business_id: str) -> str:
        """Get collection name for a business"""
        safe_id = business_id.replace("-", "_")
        return f"{settings.CHROMA_COLLECTION_PREFIX}{safe_id}"

    def _get_or_create_collection(self, business_id: str):
        """Get or create a ChromaDB collection for a business"""
        collection_name = self._get_collection_name(business_id)
        return self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"},
        )

    async def add_document(
        self,
        business_id: str,
        doc_id: str,
        content: str,
        metadata: Optional[Dict] = None,
    ) -> str:
        """Add a document to the vector store"""
        try:
            collection = self._get_or_create_collection(business_id)
            collection.add(
                ids=[doc_id],
                documents=[content],
                metadatas=[metadata or {}],
            )
            logger.info(f"Added document {doc_id} to collection for business {business_id}")
            return doc_id
        except Exception as e:
            logger.error(f"Failed to add document: {e}")
            return doc_id

    async def update_document(
        self,
        business_id: str,
        doc_id: str,
        content: str,
        metadata: Optional[Dict] = None,
    ):
        """Update a document in the vector store"""
        try:
            collection = self._get_or_create_collection(business_id)
            collection.update(
                ids=[doc_id],
                documents=[content],
                metadatas=[metadata or {}],
            )
            logger.info(f"Updated document {doc_id}")
        except Exception as e:
            logger.error(f"Failed to update document: {e}")

    async def delete_document(self, business_id: str, doc_id: str):
        """Delete a document from the vector store"""
        try:
            collection = self._get_or_create_collection(business_id)
            collection.delete(ids=[doc_id])
            logger.info(f"Deleted document {doc_id}")
        except Exception as e:
            logger.error(f"Failed to delete document: {e}")

    async def search(
        self,
        business_id: str,
        query: str,
        n_results: int = 5,
        where: Optional[Dict] = None,
    ) -> List[Dict]:
        """Search the vector store for relevant documents"""
        try:
            collection = self._get_or_create_collection(business_id)
            params = {
                "query_texts": [query],
                "n_results": min(n_results, collection.count()) if collection.count() > 0 else 1,
            }
            if where:
                params["where"] = where

            if collection.count() == 0:
                return []

            results = collection.query(**params)

            docs = []
            for i in range(len(results["ids"][0])):
                docs.append({
                    "id": results["ids"][0][i],
                    "content": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i] if results.get("metadatas") else {},
                    "distance": results["distances"][0][i] if results.get("distances") else 0,
                })
            return docs
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    async def get_collection_count(self, business_id: str) -> int:
        """Get the number of documents in a collection"""
        try:
            collection = self._get_or_create_collection(business_id)
            return collection.count()
        except Exception:
            return 0


vector_store = VectorStore()
