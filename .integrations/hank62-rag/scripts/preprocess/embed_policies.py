"""Phase 3: Embed Policies to Qdrant RAG.

Source: 
  - WAREHOUSE/SOP_kho_v3.docx
  - WAREHOUSE/chinh_sach_cong_ty/*.docx (19 files)
Output:
  - data/extracted/policy_chunks.json (Lưu lại để dễ review và backup)
  - Upsert to Qdrant collection: 'warehouse_policies'

Lưu ý: Script này dùng để "Seed" dữ liệu RAG 1 lần duy nhất lúc deploy.
"""

import json
import os
import glob
import sys
import asyncio
import docx

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, PayloadSchemaType

from dotenv import load_dotenv

# Path setups
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "..", "SEAL SP2026 FOR STUDENTS", "warehouse", "WAREHOUSE")
OUT_DIR = os.path.join(BASE_DIR, "..", "..", "data", "extracted")
os.makedirs(OUT_DIR, exist_ok=True)
CHUNKS_FILE = os.path.join(OUT_DIR, "policy_chunks.json")

# Config path to src
sys.path.append(os.path.abspath(os.path.join(BASE_DIR, "..", "..")))
from src.config import settings
from src.rag.embeddings import bge_m3_embed
from src.rag.doc_chunker import chunk_text

COLLECTION_NAME = "warehouse_policies"


def read_docx(file_path: str) -> str:
    """Đọc file docx, gộp các đoạn văn lại."""
    try:
        doc = docx.Document(file_path)
        full_text = []
        for para in doc.paragraphs:
            text = para.text.strip()
            if text:
                full_text.append(text)
        return "\n".join(full_text)
    except Exception as e:
        print(f"❌ Error reading {file_path}: {e}")
        return ""


async def process_and_embed_policies():
    print("=" * 60)
    print("Phase 3: Chunking & Embedding Policies")
    print("=" * 60)

    # 1. Tìm các file Docs
    sop_file = os.path.join(DATA_DIR, "SOP_kho_v3.docx")
    policy_dir = os.path.join(BASE_DIR, "..", "..", "SEAL SP2026 FOR STUDENTS", "chinh_sach_cong_ty")
    policy_files = sorted(glob.glob(os.path.join(policy_dir, "*.docx")))

    all_files = []
    if os.path.exists(sop_file):
        all_files.append((sop_file, "sop"))
    else:
        print(f"⚠️ SOP file not found: {sop_file}")

    for pf in policy_files:
        all_files.append((pf, "policy"))

    print(f"Found {len(all_files)} DOCX files (1 SOP + {len(policy_files)} Policies)")

    # 2. Đọc Text & Chunking
    print("\n📦 Cắt văn bản thành Chunks (512 chars, 50 overlap)...")
    all_chunks = []
    chunk_id_counter = 1

    for file_path, doc_type in all_files:
        filename = os.path.basename(file_path)
        content = read_docx(file_path)
        if not content:
            continue

        # Dùng hàm chunk chuẩn của project hoặc tự tạo nếu module không khớp
        # Ở đây dùng hàm tự thiết kế lại cho an toàn
        text_chunks = [content[i:i+512] for i in range(0, len(content), 512 - 50)]

        for text in text_chunks:
            text = text.strip()
            if len(text) < 20: # Bỏ qua chunk quá ngắn
                continue
                
            all_chunks.append({
                "chunk_id": f"chunk_{chunk_id_counter}",
                "text": text,
                "metadata": {
                    "source": filename,
                    "doc_type": doc_type,
                    "length": len(text)
                }
            })
            chunk_id_counter += 1

    print(f"✅ Tạo thành công {len(all_chunks)} chunks.")

    # 3. Lưu xuống ổ cứng (Lưu lại để Backup / Review)
    with open(CHUNKS_FILE, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã lưu chuỗi chunks ra: {CHUNKS_FILE}")

    # 4. Tính toán NLP Embeddings
    print(f"\n🧠 Chạy model BGE-M3 nhúng {len(all_chunks)} chunks sang Vector...")
    texts = [c["text"] for c in all_chunks]
    
    # Bắt đầu tính toán embeddings (Gọi hàm bất đồng bộ)
    try:
        embeddings = await bge_m3_embed(texts)
    except Exception as e:
        print(f"❌ Custom embedding failed, error: {e}")
        return

    print("✅ Nhúng embeddings thành công (Kích thước 1024d).")

    # 5. Push thẳng vào Vector DB (Qdrant)
    print(f"\n🚀 Đẩy {len(all_chunks)} vectors vào Qdrant Collection: {COLLECTION_NAME}")
    try:
        client = QdrantClient(host=settings.qdrant_host, port=settings.qdrant_port, timeout=30)
        
        # Check xem collection có chưa, chưa thì cày lại
        if not client.collection_exists(COLLECTION_NAME):
            client.create_collection(
                collection_name=COLLECTION_NAME,
                vectors_config=VectorParams(size=settings.embedding_dimension, distance=Distance.COSINE)
            )
            print(f"  + Tạo mới Collection '{COLLECTION_NAME}'")
            
            # Tạo index để query theo doc_type cho nhanh
            client.create_payload_index(
                collection_name=COLLECTION_NAME, field_name="doc_type", field_schema=PayloadSchemaType.KEYWORD
            )
        else:
            print(f"  + Collection '{COLLECTION_NAME}' đã tồn tại.")

        points = []
        for i, chunk in enumerate(all_chunks):
            points.append(PointStruct(
                id=i + 1,
                vector=embeddings[i],
                payload={
                    "text": chunk["text"],
                    "source": chunk["metadata"]["source"],
                    "doc_type": chunk["metadata"]["doc_type"]
                }
            ))

        # Upsert theo batch (nếu nhiều) - ở đây chỉ ~100-200 nên 1 lượt là ok
        client.upsert(
            collection_name=COLLECTION_NAME,
            points=points
        )
        print("✅ Upsert lên Qdrant hoàn tất!")

    except Exception as e:
        print(f"❌ Qdrant error: {e}")

    print("\n" + "=" * 60)
    print("✅ All Done! Databsae Vector Qdrant đã sẵn sàng.")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(process_and_embed_policies())
