"""Script to ingest Pegaxus Transnational Racehorse Transport documents into LightRAG."""

import asyncio
import logging
from pathlib import Path

from src.rag.engine import RAGEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

PEGAXUS_DIR = Path(__file__).resolve().parent.parent / "pegaxus-document"

# Core legal, customs, veterinary and welfare compliance documents for equine logistics RAG
CORE_DOC_PATTERNS = [
    "legal_framework/*.md",
    "compliance_and_sop/*.md",
]


async def main():
    if not PEGAXUS_DIR.exists():
        logger.error("Directory not found: %s", PEGAXUS_DIR)
        return

    logger.info("--- SCANNING PEGAXUS HORSE TRANSPORT DOCUMENTS ---")
    matched_files = []
    for pattern in CORE_DOC_PATTERNS:
        matched_files.extend(list(PEGAXUS_DIR.glob(pattern)))

    matched_files = sorted(list(set(matched_files)))
    logger.info("Found %d core Markdown documents in pegaxus-document", len(matched_files))

    documents = []
    for f in matched_files:
        try:
            content = f.read_text(encoding="utf-8").strip()
            if len(content) > 100:  # Skip trivial empty files
                # Add domain prefix for clear knowledge graph entity attribution
                doc_text = f"# TÀI LIỆU VẬN CHUYỂN NGỰA XUYÊN QUỐC GIA (PEGAXUS)\nNguồn: {f.name}\n\n{content}"
                documents.append(doc_text)
                logger.info("  Loaded: %s (%d chars)", f.name, len(content))
        except Exception as e:
            logger.warning("Could not read %s: %s", f, e)

    if not documents:
        logger.warning("No documents ready for ingestion.")
        return

    logger.info("Initializing LightRAG Engine...")
    engine = RAGEngine()
    await engine.initialize()

    logger.info("--- INGESTING %d PEGAXUS DOCUMENTS INTO KNOWLEDGE GRAPH ---", len(documents))
    result = await engine.ingest(documents)
    logger.info("Ingestion completed: %s", result)


if __name__ == "__main__":
    asyncio.run(main())
