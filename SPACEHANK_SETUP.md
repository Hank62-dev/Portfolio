# SpaceHank — hướng dẫn setup và deploy từ đầu đến cuối

Tài liệu này đi theo thứ tự: chuẩn bị tài khoản → lấy từng biến môi trường → deploy Render → deploy Vercel → nối hai bên → kiểm tra. Làm đúng thứ tự, vì các biến `VITE_*` được ghi cứng vào bản build trên Vercel.

## 1. Tổng quan

| Phần | Công nghệ | Chạy ở | Cần làm gì |
|---|---|---|---|
| Portfolio và giao diện `/spacehank` | Vite + React | **Vercel** | Import repo, nhập 3 biến `VITE_*` |
| Realtime server (`server/index.mjs`) | Node + WebSocket, đăng nhập bằng mật khẩu | **Render** (`hank62-realtime`) | Đặt mật khẩu và origin |
| Hank RAG (`.integrations/hank62-rag`) | FastAPI + Gemini + LightRAG | **Render** (`hank62-rag`) | Cần Gemini, Qdrant, Postgres, Redis |

Chỉ cần trang portfolio: làm mục 6 (Vercel) và bỏ trống 3 biến `VITE_*`. Trang SpaceHank sẽ báo offline.

Không có chế độ demo giả. Realtime server chưa chạy thì UI chỉ báo offline. Agent chưa có worker command thì task bị từ chối.

## 2. Chi phí tham khảo

Giá thay đổi, hãy kiểm tra lại tại https://render.com/pricing trước khi tạo.

- Render `hank62-realtime`: gói `starter` (trả phí, vài USD mỗi tháng). Gói free ngủ khi không dùng, không hợp với WebSocket.
- Render `hank62-rag`: gói `standard` (2GB RAM, khoảng 25 USD mỗi tháng) kèm ổ đĩa 1GB.
- Vercel: gói Hobby miễn phí là đủ.
- Qdrant Cloud, Neon, Upstash: đều có gói free đủ để chạy thử.
- Gemini API: gói free có giới hạn lượt gọi. Mỗi tin nhắn chat gọi thêm một lần embedding.

## 3. Danh sách biến môi trường và nơi lấy

### 3.1. Vercel (frontend)

Nhập trong Vercel → Project → Settings → Environment Variables, **trước khi bấm Deploy**. Sau khi đổi giá trị phải Redeploy, vì biến được ghi vào bản build.

| Biến | Giá trị | Lấy ở đâu |
|---|---|---|
| `VITE_SPACEHANK_API_URL` | `https://<realtime>.onrender.com` | URL của service `hank62-realtime` trên Render (bước 5) |
| `VITE_SPACEHANK_WS_URL` | `wss://<realtime>.onrender.com` | Cùng URL trên, đổi `https` thành `wss` |
| `VITE_HANK_RAG_API_URL` | `https://<rag>.onrender.com` | URL của service `hank62-rag` trên Render |

Không bao giờ đặt mật khẩu hay API key vào biến `VITE_*`. Mọi người đều đọc được chúng trong trình duyệt.

### 3.2. Render — service `hank62-realtime`

| Biến | Giá trị | Lấy ở đâu |
|---|---|---|
| `SPACEHANK_PASSWORD` | Chuỗi ngẫu nhiên dài | Bạn tự tạo. Chạy `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` rồi lưu vào trình quản lý mật khẩu. Đây là mật khẩu bạn gõ khi đăng nhập `/spacehank` |
| `SPACEHANK_ORIGIN` | `https://<ten-du-an>.vercel.app` | URL Vercel của bạn, không có `/` ở cuối. Ở lần tạo đầu chưa có URL Vercel nên điền tạm `https://example.com`, rồi sửa lại ở bước 7 |

Các biến đã có sẵn trong `render.yaml`, không cần nhập: `NODE_VERSION`, `SPACEHANK_PORT`, `SPACEHANK_WORKDIR`.

Không đặt `SPACEHANK_CODEX_CMD`, `SPACEHANK_CLAUDE_CMD` và các biến `SPACEHANK_*_CMD` khác. Render không cài sẵn các CLI đó, nên việc giao task sẽ bị từ chối. Điều này là bình thường ở production. Chỉ thêm một biến `SPACEHANK_<ID>_CMD` khi command đó thật sự tồn tại trong service.

### 3.3. Render — service `hank62-rag`

| Biến | Giá trị | Lấy ở đâu |
|---|---|---|
| `GEMINI_API_KEY` | Chuỗi `AIza...` | https://aistudio.google.com/apikey → Create API key. Dùng cho cả chat và embedding |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Mục 4.2 |
| `QDRANT_URL` | `https://<cluster>.cloud.qdrant.io:6333` | Mục 4.1 |
| `QDRANT_API_KEY` | Chuỗi API key | Mục 4.1 |
| `REDIS_URL` | `rediss://default:pass@host:6379` | Mục 4.3 |

Các biến đã có sẵn trong `render.yaml`: `PYTHON_VERSION`, `GEMINI_MODEL`, `GEMINI_FAST_MODEL`, `LIGHTRAG_WORKING_DIR` (trỏ vào ổ đĩa bền vững `/var/data`). Hãy kiểm tra tên model còn dùng được tại https://ai.google.dev/gemini-api/docs/models. Nếu cần đổi, sửa `GEMINI_MODEL` và `GEMINI_FAST_MODEL` trong Render.

## 4. Tạo các dịch vụ ngoài

### 4.1. Qdrant Cloud (vector database)

1. Vào https://cloud.qdrant.io, đăng ký và tạo một cluster (gói Free).
2. Mở cluster, copy **Cluster URL** (có dạng `https://xxxx.<region>.cloud.qdrant.io`). Thêm `:6333` ở cuối nếu URL chưa có cổng. Đó là `QDRANT_URL`.
3. Mở tab **API Keys** → Create → copy key. Đó là `QDRANT_API_KEY`. Key chỉ hiện một lần.

Không cần tạo collection. RAG tự tạo khi khởi động.

### 4.2. Postgres (dữ liệu kho và lịch sử chat)

Ví dụ dùng Neon, bạn cũng có thể dùng Render Postgres hoặc Supabase.

1. Vào https://neon.tech, tạo project và database.
2. Ở trang **Connection Details**, copy connection string. Đó là `DATABASE_URL`. Giữ `?sslmode=require` ở cuối.
3. Mở **SQL Editor**, dán toàn bộ nội dung file `.integrations/hank62-rag/scripts/sql/warehouse_schema.sql` rồi chạy, để tạo bảng.
4. Nạp dữ liệu kho (không bắt buộc, chỉ cần nếu dùng tính năng hỏi đáp trên dữ liệu kho). Chạy trên máy bạn:
   ```powershell
   Set-Location .integrations\hank62-rag
   $env:DATABASE_URL = "<connection-string>"
   uv sync
   uv run python -m scripts.import_warehouse_to_postgres
   ```

Nếu bỏ qua Postgres, RAG vẫn chạy nhưng không có lịch sử hội thoại và không hỏi được dữ liệu kho.

### 4.3. Redis (cache và bộ nhớ hội thoại)

Ví dụ dùng Upstash. Bạn cũng có thể dùng Render Key Value.

1. Vào https://upstash.com, tạo một Redis database, chọn vùng gần Render của bạn.
2. Trong trang database, tìm phần kết nối bằng TCP (không phải REST). Copy URL có dạng `rediss://default:<password>@<host>:6379`. Đó là `REDIS_URL`. Chữ `rediss` (hai chữ `s`) nghĩa là có TLS.
3. Nếu dùng Render Key Value: tạo Key Value trong cùng region, rồi copy **Internal Connection String** (`redis://...`). Chỉ dùng được cho service trong cùng tài khoản và cùng region với RAG.

Nếu bỏ qua Redis, RAG chạy bình thường nhưng không có cache và bộ nhớ hội thoại.

## 5. Deploy trên Render

1. Đẩy code lên GitHub (repo `Hank62-dev/Portfolio`, nhánh `main`).
2. Vào https://dashboard.render.com → **New** → **Blueprint** → chọn repo → Connect. Render đọc `render.yaml` và đề xuất hai service.
3. Render hỏi các biến `sync: false`. Điền theo mục 3.2 và 3.3. Với `SPACEHANK_ORIGIN`, điền tạm `https://example.com`.
4. Bấm **Apply**. Lần build đầu của RAG mất vài phút.
5. Khi cả hai service ở trạng thái Live, mở từng service và copy URL ở đầu trang. Tên có thể có hậu tố ngẫu nhiên nếu tên bị trùng, hãy copy URL thật:
   - `hank62-realtime` → `https://....onrender.com` (dùng cho `VITE_SPACEHANK_API_URL` và `VITE_SPACEHANK_WS_URL`).
   - `hank62-rag` → `https://....onrender.com` (dùng cho `VITE_HANK_RAG_API_URL`).
6. Kiểm tra:
   ```powershell
   curl https://<realtime>.onrender.com/health
   curl https://<rag>.onrender.com/health
   ```
   Realtime phải trả về `"mode":"production"`. RAG phải trả về `"status":"healthy"`.

Lần khởi động đầu, RAG tự nạp tài liệu chính sách vào Qdrant ở chế độ nền. Việc này gọi Gemini nhiều lần và có thể mất vài phút đến hàng chục phút. Trong lúc đó `/health` vẫn trả lời bình thường, nhưng câu trả lời dựa trên tài liệu chưa đầy đủ. Xem tiến độ trong **Logs** của service `hank62-rag`. Ổ đĩa 1GB giữ dữ liệu LightRAG qua các lần restart, nên bước này chỉ chạy một lần.

## 6. Deploy trên Vercel

1. Vào https://vercel.com/new → import repo `Hank62-dev/Portfolio`.
2. Cấu hình: Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`. `vercel.json` đã có rewrite, nên refresh `/spacehank` không bị 404.
3. Mở **Environment Variables** và nhập 3 biến ở mục 3.1 với URL Render ở bước 5.5.
4. Bấm **Deploy**. Khi xong, ghi lại URL (ví dụ `https://portfolio-xxx.vercel.app`).

## 7. Nối hai bên

1. Vào Render → service `hank62-realtime` → **Environment** → sửa `SPACEHANK_ORIGIN` thành đúng URL Vercel (không có `/` ở cuối) → Save. Service tự redeploy.
2. Mở `https://<vercel>/spacehank` → đăng nhập bằng `SPACEHANK_PASSWORD`.
3. Nhãn realtime phải hiện online. Chat gửi tới RAG phải có phản hồi.

Muốn tránh bước sửa lại: đặt tên project Vercel trước, URL sẽ là `https://<ten-du-an>.vercel.app`, rồi dùng đúng URL đó cho `SPACEHANK_ORIGIN` ngay từ bước 5.3. Nếu tên bị trùng, Vercel thêm hậu tố và bạn phải sửa lại như trên.

## 8. Chạy local để phát triển

Yêu cầu: Node.js 22, Python 3.11, uv, Docker Desktop.

```powershell
npm install
Copy-Item .env.example .env
```

Sửa `.env`:

```env
VITE_SPACEHANK_WS_URL=ws://localhost:8787
VITE_SPACEHANK_API_URL=http://localhost:8787
VITE_HANK_RAG_API_URL=http://localhost:8000
SPACEHANK_PASSWORD=<chuoi-ngau-nhien-dai>
SPACEHANK_ORIGIN=http://localhost:5173
SPACEHANK_WORKDIR=D:\Data\Personal\Portfolio
SPACEHANK_CODEX_CMD=codex exec --full-auto
SPACEHANK_CLAUDE_CMD=claude -p
```

Worker command phải đọc prompt từ `stdin` và trả exit code `0` khi xong. Chỉ đặt command cho CLI thật sự có trên máy.

Chạy Hank RAG (terminal 1):

```powershell
Set-Location .integrations\hank62-rag
Copy-Item .env.example .env
docker compose up -d
uv sync --extra dev
uv run uvicorn src.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Điền `GEMINI_API_KEY` trong `.integrations/hank62-rag/.env`. Docker Compose khởi động Qdrant, Redis và Postgres local, các giá trị mặc định trong `.env.example` đã khớp. Với Qdrant local, không cần đặt `QDRANT_URL`.

Chạy realtime server (terminal 2, tại thư mục gốc):

```powershell
npm run spacehank:server
```

Chạy frontend (terminal 3):

```powershell
npm run dev
```

Mở `http://localhost:5173/spacehank`. Kiểm tra `http://localhost:8787/health` và `http://localhost:8000/health`.

Nếu trước đây bạn index bằng model embedding cũ (BGE-M3), hãy xóa các collection Qdrant `lightrag_vdb_*`, `hkt_user_docs` và thư mục `.integrations/hank62-rag/data/lightrag_storage` rồi nạp lại. Vector Gemini và vector cũ nằm trong không gian khác nhau.

## 9. Luồng dữ liệu

1. Trình duyệt đăng nhập vào realtime server và nhận cookie phiên `HttpOnly`. Khi `SPACEHANK_ORIGIN` là `https://...`, cookie là `SameSite=None; Secure` để hoạt động giữa Vercel và Render.
2. Trình duyệt mở WebSocket có xác thực.
3. Tạo task sẽ kiểm tra agent ID và worker command.
4. Node chạy command trong `SPACEHANK_WORKDIR`, ghi prompt vào stdin và đẩy stdout/stderr thành event.
5. Exit code quyết định task `completed` hay `failed`.
6. Chat và upload tài liệu đi thẳng từ trình duyệt tới Hank RAG.

Task và event lưu trong bộ nhớ. Restart server là mất lịch sử và phải đăng nhập lại. Muốn lưu lâu dài cần thêm database cho realtime server.

## 10. Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| Realtime service trên Render không lên, log báo `SPACEHANK_ORIGIN is required` hoặc `SPACEHANK_PASSWORD is required` | Thiếu biến | Điền biến trong Render → Environment |
| Đăng nhập báo thành công nhưng tải lại lại bị đăng xuất | `SPACEHANK_ORIGIN` không khớp URL Vercel, hoặc dùng `http://` | Đặt đúng origin `https://...`, không có `/` ở cuối |
| Trang `/spacehank` báo SERVER OFFLINE | Biến `VITE_*` sai hoặc chưa redeploy | Sửa biến trên Vercel rồi Redeploy |
| Trình duyệt báo lỗi CORS khi gọi realtime | `SPACEHANK_ORIGIN` sai | Sửa như trên |
| `Worker command is not configured` | Agent chưa có `SPACEHANK_<ID>_CMD` | Bình thường ở production. Chỉ thêm command khi nó tồn tại trong service |
| RAG `/health` trả `rag_initialized: false` | Qdrant sai URL hoặc API key | Kiểm tra `QDRANT_URL` (có `https://` và cổng `:6333`) và `QDRANT_API_KEY`, xem log |
| Chat báo lỗi `GEMINI_API_KEY not configured` | Thiếu key | Điền `GEMINI_API_KEY` |
| Log RAG báo `Postgres pool init failed` | `DATABASE_URL` sai hoặc thiếu `sslmode=require` | Kiểm tra connection string |
| Log RAG báo `Redis unavailable` | `REDIS_URL` sai hoặc thiếu TLS | Dùng `rediss://` với Upstash |
| Log RAG báo 429 hoặc quota khi embedding | Hết hạn mức Gemini | Đợi hoặc nâng gói Gemini |
| RAG bị Render kill vì hết bộ nhớ | Gói quá nhỏ | Dùng gói `standard` trở lên |
| Ngủ đông / chậm lần đầu | Gói free của Render | Dùng gói trả phí |

## 11. Bảo mật

- Không commit `.env`, API key hay mật khẩu. File `.env` đã nằm trong `.gitignore`.
- Chỉ dùng HTTPS/WSS ở production.
- Đặt `SPACEHANK_ORIGIN` đúng một origin, không dùng `*`.
- Đổi `SPACEHANK_PASSWORD` ngay nếu nghi ngờ bị lộ.
- Giới hạn quyền của worker và `SPACEHANK_WORKDIR`.
- RAG hiện cho phép mọi origin gọi API (CORS `*`) và không có đăng nhập. Ai có URL RAG đều gọi được và tiêu tốn quota Gemini của bạn. Cân nhắc giới hạn origin hoặc thêm xác thực trước khi công khai rộng rãi.
- Bật backup cho Postgres và Qdrant trước khi nạp dữ liệu quan trọng.
