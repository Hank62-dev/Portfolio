# 📘 Cẩm Nang Cài Đặt & Khởi Chạy Dự Án One61 RAG

Tài liệu này hướng dẫn chi tiết từng bước từ con số 0 để cài đặt, nạp cơ sở dữ liệu và vận hành hệ thống **One61 Multi-Agent RAG**.

---

## 📑 Mục lục
1. [Yêu cầu tiên quyết](#1-yêu-cầu-tiên-quyết)
2. [Bước 1: Cấu hình biến môi trường (.env)](#bước-1-cấu-hình-biến-môi-trường-env)
3. [Bước 2: Khởi động cơ sở hạ tầng (Docker)](#bước-2-khởi-động-cơ-sở-hạ-tầng-docker)
4. [Bước 3: Cài đặt thư viện Python](#bước-3-cài-đặt-thư-viện-python)
5. [Bước 4: Nạp dữ liệu kho bãi vào PostgreSQL](#bước-4-nạp-dữ-liệu-kho-bãi-vào-postgresql)
6. [Bước 5: Khởi chạy RAG Service](#bước-5-khởi-chạy-rag-service)
7. [Bước 6: Trải nghiệm & Kiểm thử](#bước-6-trải-nghiệm--kiểm-thử)
8. [Xử lý các sự cố thường gặp (Troubleshooting)](#xử-lý-các-sự-cố-thường-gặp-troubleshooting)

---

## 1. Yêu cầu tiên quyết

Trước khi bắt đầu, hãy đảm bảo máy tính của bạn đã cài đặt các công cụ sau:

* **Python**: Phiên bản `>= 3.11` (Khuyên dùng Python 3.11 hoặc 3.12).
* **uv**: Trình quản lý package Python hiện đại, siêu tốc độ:
  ```powershell
  pip install uv
  ```
  *(Kiểm tra cài đặt: `uv --version`)*
* **Docker Desktop**: Cần được bật và đang chạy (Engine status màu xanh lá).
* **Google Gemini API Key**: Lấy miễn phí tại [Google AI Studio](https://aistudio.google.com/apikey).

---

## Bước 1: Cấu hình biến môi trường (`.env`)

Mở file `.env` ở thư mục gốc của dự án và đảm bảo các biến sau được thiết lập:

```env
# 1. API Key từ Google AI Studio
GEMINI_API_KEY=AQ.your_gemini_api_key_here

# 2. Cấu hình Model thế hệ mới
GEMINI_MODEL=gemini-3.8-flash
GEMINI_FAST_MODEL=gemini-3.5-flash-lite

# 3. Model nhúng BGE-M3
EMBEDDING_MODEL=BAAI/bge-m3
EMBEDDING_DIMENSION=1024
EMBEDDING_DEVICE=cpu

# 4. Qdrant Vector DB
QDRANT_HOST=localhost
QDRANT_PORT=6333
QDRANT_COLLECTION=hkt_rag

# 5. Cơ sở dữ liệu kho bãi PostgreSQL
POSTGRES_USER=one61_rag
POSTGRES_PASSWORD=one61_rag
POSTGRES_DB=one61_rag
DATABASE_URL=postgresql://one61_rag:one61_rag@localhost:5979/one61_rag

# 6. Redis Semantic Cache & Memory
REDIS_URL=redis://localhost:6382/0
CACHE_TTL_SECONDS=3600

# 7. Cấu hình máy chủ FastAPI
HOST=0.0.0.0
PORT=8000
ENABLE_BULLMQ=false
```

---

## Bước 2: Khởi động cơ sở hạ tầng (Docker)

Hệ thống cần 3 dịch vụ hạ tầng gồm:
1. **Qdrant Vector DB** (cổng `6333`): Lưu trữ embeddings chính sách SOP và đồ thị LightRAG.
2. **Redis** (cổng `6382`): Cache ngữ nghĩa và lưu phiên hội thoại.
3. **PostgreSQL** (cổng `5979`): Cơ sở dữ liệu quan hệ chứa toàn bộ dữ liệu đơn hàng, vận chuyển, hàng hỏng.

Mở terminal tại thư mục dự án và chạy:
```powershell
docker compose up -d
```

Kiểm tra trạng thái các container:
```powershell
docker ps
```
Nếu thấy cả 3 container `one61-postgres`, `one61-qdrant`, `one61-redis` đều ở trạng thái `Up` là thành công!

---

## Bước 3: Cài đặt thư viện Python

Sử dụng `uv` để tự động tạo virtual environment (`.venv`) và đồng bộ toàn bộ dependencies:
```powershell
uv sync --extra dev
```

---

## Bước 4: Nạp dữ liệu kho bãi vào PostgreSQL

Dự án đã có sẵn dữ liệu thực tế tại `data/extracted/`. Chạy script sau để tự động nạp hơn 55.000 dòng dữ liệu vào database `one61_rag`:
```powershell
uv run python -m scripts.import_warehouse_to_postgres
```

Kết quả nạp thành công sẽ hiển thị:
```text
Imported deliveries: 8,664 rows
Imported repacking_logs: 600 rows
Imported flight_manifests: 400 rows
Imported manifest_packages: 40,245 rows
Imported customs_declarations: 60 rows
Imported customs_items: 5,240 rows
Imported damage_reports: 120 rows
Imported packing_slips: 500 rows
Warehouse data import finished successfully!
```

### Bước 4b: Nạp tài liệu Pháp lý Vận chuyển Ngựa (Pegaxus) vào RAG *(Tùy chọn)*

Thư mục `pegaxus-document/` lưu trữ bộ tài liệu chuyên sâu về **Pháp lý, Hải quan và Phúc lợi vận chuyển động vật sống xuyên biên giới (EU/UK)**. Để nạp các tài liệu này vào đồ thị tri thức RAG:
```powershell
uv run python -m scripts.ingest_pegaxus
```

---

## Bước 5: Khởi chạy RAG Service

Khởi chạy FastAPI Server bằng lệnh:
```powershell
uv run python -m src.main
```

Server sẽ khởi động và log thông tin:
```text
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Postgres pool created: localhost:5979/one61_rag
INFO:     Redis ready: redis://localhost:6382/0
INFO:     Connecting LightRAG to Qdrant VectorDB at http://localhost:6333
INFO:     Main model: gemini-3.8-flash
INFO:     Fast model: gemini-3.5-flash-lite
INFO:     BGE-M3 preloaded and ready for inference
INFO:     Application startup complete.
```

> **Lưu ý**: Lần đầu khởi động, hệ thống sẽ tải model `BAAI/bge-m3` (~2.2GB) về máy cache, mất khoảng 20-30 giây. Các lần khởi động sau sẽ nạp tức thì.

---

## Bước 6: Trải nghiệm & Kiểm thử

### Cách 1: Sử dụng Giao diện Web Console (Khuyên dùng)
Mở trình duyệt truy cập: **[http://localhost:8000/demo](http://localhost:8000/demo)**

Tại giao diện này, bạn có thể:
1. **Chat trực tiếp**: Nhập câu hỏi vào khung chat để xem câu trả lời của AI.
2. **Xem luồng suy luận Agent (`<thinking>`)**: Theo dõi router phân loại câu hỏi, SQL Agent tạo câu lệnh SQL, hoặc RAG trích xuất ngữ cảnh.
3. **Xem điểm tin cậy**: Kiểm tra `confidence_score` và `groundedness_score` chống ảo giác.
4. **Tải tài liệu mới**: Upload trực tiếp file PDF, DOCX, TXT để bổ sung tri thức cho hệ thống.

---

### Cách 2: Kiểm tra qua API (cURL hoặc Python)

#### Gửi câu hỏi qua PowerShell:
```powershell
curl -X POST "http://localhost:8000/api/chat" `
  -H "Content-Type: application/json" `
  -d '{\"message\": \"Don hang TRK0001617 hien dang o dau?\", \"mode\": \"fast\"}'
```

#### Gửi câu hỏi qua Python Script:
```python
import httpx

response = httpx.post(
    "http://localhost:8000/api/chat",
    json={"message": "Đơn hàng TRK0001617 hiện đang ở đâu?", "mode": "fast"},
    timeout=60.0
)

data = response.json()
print("Câu trả lời:", data["response"]["message"])
print("Độ tin cậy:", data["response"]["verification"]["confidence_score"])
```

---

### Danh sách câu hỏi mẫu để kiểm tra từng Agent:

| Tác vụ | Câu hỏi mẫu | Luồng xử lý |
| :--- | :--- | :---: |
| **Tra cứu vận đơn** | *"Đơn hàng TRK0001617 hiện đang ở đâu?"* | `SQL Agent` |
| **Tra cứu hàng hỏng** | *"Kiểm tra biên bản hư hỏng của đơn TRK0000003"* | `SQL Agent` |
| **Tra cứu chuyến bay** | *"Chuyến bay FL0001 có những kiện hàng nào?"* | `SQL Agent` |
| **Chính sách bồi thường** | *"Hàng hóa bị vỡ khi không mua bảo hiểm thì công ty đền bù bao nhiêu?"* | `RAG Agent` |
| **Quy trình SOP kho** | *"Quy trình đóng gói hàng dễ vỡ yêu cầu những vật tư gì?"* | `RAG Agent` |
| **Hỏi đáp kết hợp** | *"Đơn hàng TRK0001617 của tôi bị giao chậm, theo chính sách thì tôi có được hoàn phí cước không?"* | `Hybrid (SQL + RAG)` |

---

## Xử lý các sự cố thường gặp (Troubleshooting)

### 1. Lỗi `429 RESOURCE_EXHAUSTED` (Giới hạn sử dụng Gemini)
* **Nguyên nhân**: Hạn mức phụ thuộc vào project, model và usage tier; có thể giới hạn số request hoặc token theo phút, ngày. Hạn mức áp dụng cho toàn project, không riêng từng API key. Xem [tài liệu giới hạn sử dụng](https://ai.google.dev/gemini-api/docs/rate-limits) và quota thực tế trong Google AI Studio.
* **Cách xử lý**: Client gọi tối đa 5 lần, gồm lần đầu và 4 lần thử lại. Khi lỗi API có thông tin `retry in ...s`, client chờ theo thời gian đó cộng thêm 2 giây; nếu không có, chờ 20 giây. Hết lượt thử lại, lỗi được trả về; retry không bảo đảm thành công. Giảm số request, chờ hạn mức đặt lại hoặc điều chỉnh quota phù hợp.

### 2. Lỗi `failed to connect to docker API at npipe...`
* **Nguyên nhân**: Docker Desktop chưa được mở hoặc Docker Daemon chưa khởi động xong.
* **Cách xử lý**: Bật ứng dụng **Docker Desktop** trên Windows, đợi icon Docker ở góc phải taskbar chuyển sang màu xanh lá (`Engine running`), sau đó chạy lại lệnh `docker compose up -d`.

### 3. Lỗi trùng cổng PostgreSQL `5979`
* **Nguyên nhân**: Cổng `5979` đang bị chiếm bởi một process hoặc container khác.
* **Cách xử lý**: Dừng container cũ bằng `docker compose down`, hoặc đổi giá trị `5979:5432` trong file `docker-compose.yml` sang cổng khác (ví dụ `5980:5432`) và cập nhật lại `DATABASE_URL` trong file `.env`.

### 4. Muốn reset lại dữ liệu sạch:
* **Reset Database**:
  ```powershell
  docker compose stop postgres
  docker compose rm -f postgres
  docker volume rm one61-rag_postgres_data
  docker compose up -d postgres
  uv run python -m scripts.import_warehouse_to_postgres
  ```
* **Reset Vector DB (Qdrant)**:
  ```powershell
  docker compose stop qdrant
  docker compose rm -f qdrant
  docker volume rm one61-rag_qdrant_data
  docker compose up -d qdrant
  ```

---

<div align="center">
  <sub>Cần hỗ trợ thêm? Xem thêm chi tiết tại tài liệu mã nguồn trong thư mục <code>src/</code>.</sub>
</div>
