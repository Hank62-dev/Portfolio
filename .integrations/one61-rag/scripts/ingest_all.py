"""Script to ingest all raw documents into LightRAG knowledge base."""

import asyncio
import glob
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(message)s")
logger = logging.getLogger(__name__)


async def main():
    from src.rag.engine import RAGEngine

    engine = RAGEngine()
    await engine.initialize()

    raw_dir = "data/raw"
    files = sorted(glob.glob(f"{raw_dir}/*.txt"))

    if not files:
        logger.warning("No .txt files found in %s", raw_dir)
        return

    logger.info("Found %d documents to ingest", len(files))

    documents = []
    for filepath in files:
        with open(filepath, encoding="utf-8") as f:
            content = f.read().strip()
            if content:
                documents.append(content)
                logger.info("  Loaded: %s (%d chars)", filepath, len(content))

    result = await engine.ingest(documents)
    logger.info("Ingestion complete: %s", result)


if __name__ == "__main__":
    asyncio.run(main())
