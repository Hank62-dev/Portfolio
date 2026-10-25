"""Conversation-scoped Document Store.

Manages the full lifecycle of user-uploaded documents per conversation:
download → extract text → chunk → embed → upsert Qdrant → search.

Uses a single Qdrant collection with payload-based multi-tenancy
(filter on conversation_id). This is the official Qdrant best practice.

Completely separate from LightRAG (which handles global company KB).
"""

import asyncio
import logging
import uuid as uuid_lib
from typing import Any

import httpx
import numpy as np

from src.cache.redis_client import get_redis
from src.config import settings
from src.rag.doc_chunker import chunk_text
from src.rag.doc_parser import extract_text
from src.rag.embeddings import bge_m3_embed

logger = logging.getLogger(__name__)

# Redis key prefix for tracking chunked documents
_CHUNKED_PREFIX = "doc:chunked:"

# Max documents per conversation
MAX_DOCS_PER_CONVERSATION = 50


class ConversationDocStore:
    """Manages user-uploaded documents scoped to conversations in Qdrant."""

    def __init__(self):
        self._client = None
        self._collection_ready = False

    def _get_client(self):
        """Lazy-init sync Qdrant client (singleton)."""
        if self._client is None:
            from qdrant_client import QdrantClient
            self._client = QdrantClient(
                host=settings.qdrant_host,
                port=settings.qdrant_port,
                timeout=10,
            )
            logger.info(
                "DocStore Qdrant client connected: %s:%d",
                settings.qdrant_host, settings.qdrant_port,
            )
        return self._client

    async def ensure_collection(self) -> None:
        """Create the user docs collection if it doesn't exist."""
        if self._collection_ready:
            return

        try:
            client = self._get_client()
            collection_name = settings.user_docs_collection

            exists = await asyncio.to_thread(
                client.collection_exists, collection_name,
            )

            if not exists:
                from qdrant_client.models import Distance, VectorParams

                await asyncio.to_thread(
                    client.create_collection,
                    collection_name=collection_name,
                    vectors_config=VectorParams(
                        size=settings.embedding_dimension,
                        distance=Distance.COSINE,
                    ),
                )
                logger.info("Created Qdrant collection: %s", collection_name)

                # Create payload index on conversation_id for fast filtering
                from qdrant_client.models import PayloadSchemaType

                await asyncio.to_thread(
                    client.create_payload_index,
                    collection_name=collection_name,
                    field_name="conversation_id",
                    field_schema=PayloadSchemaType.KEYWORD,
                )
                logger.info("Created payload index on conversation_id")
            else:
                logger.info("Qdrant collection '%s' already exists", collection_name)

            self._collection_ready = True

        except Exception as e:
            logger.error("Failed to ensure Qdrant collection: %s", e)
            raise

    # ── Chunk tracking (Redis) ──────────────────────────────────────

    async def is_chunked(self, doc_id: str) -> bool:
        """Check if a document has already been chunked and stored."""
        redis = get_redis()
        if redis is None:
            return False
        try:
            return bool(await redis.exists(f"{_CHUNKED_PREFIX}{doc_id}"))
        except Exception:
            return False

    async def _mark_chunked(self, doc_id: str, chunk_count: int) -> None:
        """Mark a document as chunked in Redis."""
        redis = get_redis()
        if redis is None:
            return
        try:
            await redis.set(
                f"{_CHUNKED_PREFIX}{doc_id}",
                str(chunk_count),
                ex=86400 * 30,  # 30 days TTL
            )
        except Exception as e:
            logger.warning("Failed to mark doc as chunked: %s", e)

    # ── Document ingestion ──────────────────────────────────────────

    async def ingest_document(
        self,
        conversation_id: str,
        doc_id: str,
        url: str,
        name: str,
    ) -> int:
        """Download, parse, chunk, embed, and store a document.

        Args:
            conversation_id: Conversation this document belongs to.
            doc_id: Unique document ID from BE.
            url: Download URL for the file.
            name: Original filename.

        Returns:
            Number of chunks created (0 if already chunked or error).
        """
        # Skip if already processed
        if await self.is_chunked(doc_id):
            logger.info("Doc '%s' already chunked, skipping", name)
            return 0

        try:
            await self.ensure_collection()

            # 1. Download file
            content = await self._download(url)
            logger.info("Downloaded '%s': %dKB", name, len(content) // 1024)

            # 2. Extract text
            text = extract_text(content, name)
            if not text or len(text.strip()) < 10:
                logger.warning("Doc '%s' has no extractable text, skipping", name)
                return 0

            # 3. Chunk text
            chunks = chunk_text(
                text,
                chunk_size=settings.user_docs_chunk_size,
                overlap=settings.user_docs_chunk_overlap,
            )
            if not chunks:
                logger.warning("Doc '%s' produced no chunks, skipping", name)
                return 0

            # 4. Embed chunks
            embeddings = await bge_m3_embed(chunks)

            # 5. Upsert to Qdrant
            await self._upsert_chunks(
                conversation_id=conversation_id,
                doc_id=doc_id,
                doc_name=name,
                chunks=chunks,
                embeddings=embeddings,
            )

            # 6. Mark as chunked
            await self._mark_chunked(doc_id, len(chunks))

            logger.info(
                "Ingested doc '%s': %d chunks for conversation=%s",
                name, len(chunks), conversation_id[:8],
            )
            return len(chunks)

        except Exception as e:
            logger.error("Failed to ingest doc '%s': %s", name, str(e))
            return 0

    async def ingest_documents(
        self,
        conversation_id: str,
        documents: list[dict[str, str]],
    ) -> int:
        """Ingest multiple documents for a conversation.

        Args:
            conversation_id: Conversation ID.
            documents: List of dicts with {id, url, name}.

        Returns:
            Total number of new chunks created.
        """
        total_chunks = 0
        for doc in documents:
            doc_id = doc.get("id", "")
            url = doc.get("url", "")
            name = doc.get("name", "unknown")

            if not doc_id or not url:
                logger.warning("Skipping doc with missing id or url: %s", doc)
                continue

            count = await self.ingest_document(conversation_id, doc_id, url, name)
            total_chunks += count

        return total_chunks

    # ── Search ──────────────────────────────────────────────────────

    async def search(
        self,
        conversation_id: str,
        query_embedding: np.ndarray,
        top_k: int = 5,
    ) -> list[dict]:
        """Search user documents for a specific conversation.

        Args:
            conversation_id: Only search docs belonging to this conversation.
            query_embedding: Pre-computed query embedding vector.
            top_k: Number of top results to return.

        Returns:
            List of {text, source, score, doc_id, doc_name} dicts.
        """
        try:
            await self.ensure_collection()

            from qdrant_client.models import (
                FieldCondition,
                Filter,
                MatchValue,
            )

            client = self._get_client()
            query_vector = query_embedding.flatten().tolist()

            response = await asyncio.to_thread(
                client.query_points,
                collection_name=settings.user_docs_collection,
                query=query_vector,
                query_filter=Filter(
                    must=[
                        FieldCondition(
                            key="conversation_id",
                            match=MatchValue(value=conversation_id),
                        )
                    ]
                ),
                limit=top_k,
                with_payload=True,
            )

            chunks = []
            for hit in response.points:
                payload = hit.payload or {}
                chunks.append({
                    "text": payload.get("chunk_text", ""),
                    "source": payload.get("doc_name", "user_doc"),
                    "score": float(hit.score),
                    "doc_id": payload.get("doc_id", ""),
                    "doc_name": payload.get("doc_name", ""),
                })

            logger.info(
                "DocStore search: conversation=%s, results=%d, top_score=%.3f",
                conversation_id[:8],
                len(chunks),
                chunks[0]["score"] if chunks else 0.0,
            )
            return chunks

        except Exception as e:
            logger.error("DocStore search failed: %s", e)
            return []

    async def has_documents(self, conversation_id: str) -> bool:
        """Check if a conversation has any indexed documents."""
        try:
            await self.ensure_collection()

            from qdrant_client.models import (
                FieldCondition,
                Filter,
                MatchValue,
            )

            client = self._get_client()
            result = await asyncio.to_thread(
                client.count,
                collection_name=settings.user_docs_collection,
                count_filter=Filter(
                    must=[
                        FieldCondition(
                            key="conversation_id",
                            match=MatchValue(value=conversation_id),
                        )
                    ]
                ),
                exact=False,
            )
            return result.count > 0

        except Exception as e:
            logger.debug("DocStore has_documents check failed: %s", e)
            return False

    async def delete_conversation_docs(self, conversation_id: str) -> int:
        """Delete all documents for a conversation from Qdrant.

        Returns:
            Number of points deleted.
        """
        try:
            await self.ensure_collection()

            from qdrant_client.models import (
                FieldCondition,
                Filter,
                MatchValue,
            )

            client = self._get_client()

            # Count before delete
            count_result = await asyncio.to_thread(
                client.count,
                collection_name=settings.user_docs_collection,
                count_filter=Filter(
                    must=[
                        FieldCondition(
                            key="conversation_id",
                            match=MatchValue(value=conversation_id),
                        )
                    ]
                ),
                exact=True,
            )
            count = count_result.count

            if count > 0:
                from qdrant_client.models import FilterSelector

                await asyncio.to_thread(
                    client.delete,
                    collection_name=settings.user_docs_collection,
                    points_selector=FilterSelector(
                        filter=Filter(
                            must=[
                                FieldCondition(
                                    key="conversation_id",
                                    match=MatchValue(value=conversation_id),
                                )
                            ]
                        )
                    ),
                )
                logger.info(
                    "Deleted %d vectors for conversation=%s",
                    count, conversation_id[:8],
                )

            return count

        except Exception as e:
            logger.error("Failed to delete conversation docs: %s", e)
            return 0

    # ── Internal helpers ────────────────────────────────────────────

    async def _download(self, url: str) -> bytes:
        """Download file from URL with timeout and size limit."""
        async with httpx.AsyncClient(
            timeout=30.0,
            follow_redirects=True,
        ) as client:
            response = await client.get(url)
            response.raise_for_status()

            content = response.content
            if len(content) > 25 * 1024 * 1024:
                raise ValueError(
                    f"File too large: {len(content) / 1024 / 1024:.1f}MB (max 25MB)"
                )
            return content

    async def _upsert_chunks(
        self,
        conversation_id: str,
        doc_id: str,
        doc_name: str,
        chunks: list[str],
        embeddings: np.ndarray,
    ) -> None:
        """Upsert chunk vectors to Qdrant with metadata payload."""
        from qdrant_client.models import PointStruct

        points = []
        for i, (chunk_text_val, embedding) in enumerate(zip(chunks, embeddings)):
            # Deterministic UUID: same doc+chunk always gets same ID (idempotent)
            point_id = str(uuid_lib.uuid5(
                uuid_lib.NAMESPACE_DNS,
                f"{doc_id}:{i}",
            ))
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding.tolist(),
                    payload={
                        "conversation_id": conversation_id,
                        "doc_id": doc_id,
                        "doc_name": doc_name,
                        "chunk_index": i,
                        "chunk_text": chunk_text_val,
                    },
                )
            )

        client = self._get_client()

        # Qdrant recommends batches of <= 100 points
        batch_size = 100
        for start in range(0, len(points), batch_size):
            batch = points[start:start + batch_size]
            await asyncio.to_thread(
                client.upsert,
                collection_name=settings.user_docs_collection,
                points=batch,
            )

        logger.info(
            "Upserted %d chunks to Qdrant: doc=%s, conversation=%s",
            len(points), doc_name, conversation_id[:8],
        )
