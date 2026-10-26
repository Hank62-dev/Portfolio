"""Script to reset Qdrant DB and ingest WAREHOUSE data into LightRAG."""

import asyncio
import logging
import shutil
import sys
from pathlib import Path

import docx
import fitz
import pandas as pd
from qdrant_client import AsyncQdrantClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from src.config import settings
from src.rag.engine import RAGEngine

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)


async def reset_qdrant():
    """Delete the LightRAG Qdrant collection and local storage."""
    # Delete local LightRAG storage which holds the graph data and KV mappings
    storage_dir = Path(settings.lightrag_working_dir)
    if storage_dir.exists():
        shutil.rmtree(storage_dir)
        logger.info("Deleted local LightRAG storage: %s", storage_dir)

    # Delete Qdrant collection
    try:
        client = AsyncQdrantClient(host=settings.qdrant_host, port=settings.qdrant_port)
        # LightRAG defaults to collection names like 'LightRAG_entities', 'LightRAG_chunks', etc.
        # We can just delete the known ones or wipe all
        collections_response = await client.get_collections()
        for collection in collections_response.collections:
            if collection.name.startswith("LightRAG") or "rag" in collection.name.lower():
                await client.delete_collection(collection.name)
                logger.info("Deleted Qdrant collection: %s", collection.name)
    except Exception as e:
        logger.warning("Could not connect to Qdrant to reset collections: %s", e)


def read_docx(filepath: str) -> str:
    """Extract text from a DOCX file."""
    doc = docx.Document(filepath)
    full_text = []
    for para in doc.paragraphs:
        if para.text.strip():
            full_text.append(para.text.strip())
    return "\n".join(full_text)


def read_pdf(filepath: str) -> str:
    """Extract text from a PDF file."""
    try:
        doc = fitz.open(filepath)
        text = "\n".join([page.get_text() for page in doc])
        return text.strip()
    except Exception as e:
        logger.error("Failed to read PDF %s: %s", filepath, e)
        return ""


def read_repack_csv(filepath: str) -> list[str]:
    """Convert repack CSV rows into descriptive text documents."""
    df = pd.read_csv(filepath).fillna("Không có")
    docs = []
    for _, row in df.iterrows():
        doc = (
            f"Nhật ký đóng gói lại: Đơn hàng {row['order_code']} (Mã vận đơn: {row['tracking_code']}) "
            f"được yêu cầu đóng gói lại vào {row['requested_at']} bởi khách hàng {row['customer_code']}. "
            f"Lý do: {row['reason']}. "
            f"Số kiện ban đầu: {row['original_box_count']}, số kiện sau đóng gói: {row['new_box_count']}. "
            f"Trọng lượng ban đầu: {row['original_weight_kg']} kg, trọng lượng sau đóng gói: {row['new_weight_kg']} kg. "
            f"Phí đóng gói: {row['repack_fee_vnd']} VND, Chi phí vật tư: {row['material_cost_vnd']} VND. "
            f"Nhân viên thực hiện: {row['repack_staff']}, Người phê duyệt: {row['approved_by']}. "
            f"Trạng thái: {row['status']}. Hoàn thành vào: {row['completed_at']}."
        )
        docs.append(doc)
    return docs


def read_delivery_csv(filepath: str) -> list[str]:
    """Convert delivery CSV rows into descriptive text documents."""
    df = pd.read_csv(filepath).fillna("Không có")
    docs = []
    for _, row in df.iterrows():
        doc = (
            f"Theo dõi giao hàng nội địa: Đơn hàng {row['order_code']} (Mã vận đơn: {row['tracking_code']}) "
            f"thuộc khách hàng {row['customer_code']}. "
            f"Người nhận: {row['recipient_name']}, SĐT: {row['recipient_phone']}. "
            f"Địa chỉ: {row['full_address']}, {row['district']}, {row['province']}. "
            f"Đơn vị vận chuyển: {row['carrier']} (Mã tracking DVVC: {row['carrier_tracking_code']}). "
            f"Xuất phát từ kho: {row['domestic_warehouse']}. "
            f"Phí vận chuyển: {row['shipping_fee_vnd']} VND, Tiền thu hộ (COD): {row['cod_amount']} VND. "
            f"Trạng thái giao hàng: {row['delivery_status']}. Số lần giao: {row['attempt_count']}. "
            f"Ngày dự kiến: {row['scheduled_date']}, Ngày giao thực tế: {row['actual_delivery_date']}. "
            f"Ghi chú: {row['delivery_note']}."
        )
        docs.append(doc)
    return docs


async def main():
    logger.info("--- RESETTING DATABASE ---")
    await reset_qdrant()

    engine = RAGEngine()
    await engine.initialize()

    warehouse_dir = Path("WAREHOUSE")
    documents = []

    logger.info("--- READING DATA ---")

    # 1. Read SOP (DOCX)
    sop_file = warehouse_dir / "SOP_kho_v3.docx"
    if sop_file.exists():
        logger.info("Reading %s...", sop_file.name)
        sop_text = read_docx(str(sop_file))
        # Add as a single large document (LightRAG handles chunking internally)
        documents.append(f"Tài liệu Quy trình vận hành chuẩn (SOP) kho bãi:\n\n{sop_text}")
    else:
        logger.warning("Not found: %s", sop_file)

    # 2. Read Repack CSV
    repack_file = warehouse_dir / "nhat_ky_dong_goi_lai.csv"
    if repack_file.exists():
        logger.info("Reading %s...", repack_file.name)
        repack_docs = read_repack_csv(str(repack_file))
        documents.extend(repack_docs)
    else:
        logger.warning("Not found: %s", repack_file)

    # 3. Read Delivery CSV
    delivery_file = warehouse_dir / "theo_doi_giao_noi_dia.csv"
    if delivery_file.exists():
        logger.info("Reading %s...", delivery_file.name)
        delivery_docs = read_delivery_csv(str(delivery_file))
        documents.extend(delivery_docs)
    else:
        logger.warning("Not found: %s", delivery_file)

    # 4. Read Customs Declarations (PDFs)
    to_khai_dir = warehouse_dir / "to_khai_hai_quan"
    if to_khai_dir.exists() and to_khai_dir.is_dir():
        pdf_files = list(to_khai_dir.glob("*.pdf"))
        logger.info("Found %d PDFs in %s", len(pdf_files), to_khai_dir.name)
        for pdf_file in pdf_files:
            pdf_text = read_pdf(str(pdf_file))
            if pdf_text:
                documents.append(f"Tờ khai hải quan ({pdf_file.name}):\n\n{pdf_text}")
    else:
        logger.warning("Not found: %s", to_khai_dir)

    # 5. Read Flight Manifests (PDFs)
    manifest_dir = warehouse_dir / "manifest_chuyen_bay"
    if manifest_dir.exists() and manifest_dir.is_dir():
        pdf_files = list(manifest_dir.glob("*.pdf"))
        logger.info("Found %d PDFs in %s", len(pdf_files), manifest_dir.name)
        for pdf_file in pdf_files:
            pdf_text = read_pdf(str(pdf_file))
            if pdf_text:
                documents.append(
                    f"Lược khai hàng hóa / Manifest chuyến bay ({pdf_file.name}):\n\n{pdf_text}"
                )
    else:
        logger.warning("Not found: %s", manifest_dir)

    logger.info("Prepared %d documents/records for ingestion.", len(documents))

    if documents:
        logger.info("--- STARTING INGESTION (LIGHTRAG) ---")
        result = await engine.ingest(documents)
        logger.info("Ingestion complete: %s", result)
    else:
        logger.warning("No documents found to ingest!")


if __name__ == "__main__":
    asyncio.run(main())
