"""
SmartRep AI - Vector Store Service (ChromaDB)
Manages embeddings for RAG (Retrieval Augmented Generation)
"""
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
            try:
                self._client = chromadb.HttpClient(
                    host=settings.CHROMA_HOST,
                    port=settings.CHROMA_PORT,
                )
                logger.info("Connected to ChromaDB")
            except Exception as e:
                logger.warning(f"ChromaDB connection failed, using in-memory: {e}")
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
        """Search for similar documents"""
        try:
            collection = self._get_or_create_collection(business_id)
            results = collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where,
            )

            documents = []
            if results and results["documents"]:
                for i, doc in enumerate(results["documents"][0]):
                    documents.append({
                        "id": results["ids"][0][i] if results["ids"] else None,
                        "content": doc,
                        "metadata": results["metadatas"][0][i] if results["metadatas"] else {},
                        "distance": results["distances"][0][i] if results["distances"] else 0,
                    })

            return documents
        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []

    async def add_bulk_documents(
        self,
        business_id: str,
        documents: List[Dict],
    ):
        """Add multiple documents at once"""
        try:
            collection = self._get_or_create_collection(business_id)
            ids = [d["id"] for d in documents]
            contents = [d["content"] for d in documents]
            metadatas = [d.get("metadata", {}) for d in documents]

            collection.add(
                ids=ids,
                documents=contents,
                metadatas=metadatas,
            )
            logger.info(f"Added {len(documents)} documents in bulk for business {business_id}")
        except Exception as e:
            logger.error(f"Bulk add failed: {e}")

    async def delete_collection(self, business_id: str):
        """Delete entire collection for a business"""
        try:
            collection_name = self._get_collection_name(business_id)
            self.client.delete_collection(collection_name)
            logger.info(f"Deleted collection for business {business_id}")
        except Exception as e:
            logger.error(f"Failed to delete collection: {e}")

    async def get_collection_count(self, business_id: str) -> int:
        """Get the number of documents in a collection"""
        try:
            collection = self._get_or_create_collection(business_id)
            return collection.count()
        except Exception:
            return 0


# Singleton instance
vector_store = VectorStore()
