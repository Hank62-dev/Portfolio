# SpaceHank — setup, vận hành và deploy

SpaceHank gồm ba phần chạy thật:

- Vite/React frontend: giao diện `/spacehank` và WebGL company floor.
- Node realtime server: authentication, WebSocket telemetry, task dispatch và worker process.
- Hank RAG (`.integrations/one61-rag`): FastAPI xử lý chat, upload, embeddings và truy hồi tài liệu.

Không có demo fallback. Nếu realtime server chưa chạy thì UI chỉ hiển thị offline và không gửi task. Nếu agent chưa có worker command thì task bị từ chối; SpaceHank không tự giả lập kết quả.

## Yêu cầu

- Node.js 20 hoặc 22 và npm.
- Python 3.11, uv.
- Docker Desktop nếu dùng service của One61 RAG.
- Gemini API key cho Hank RAG.
- CLI/API worker thật cho từng agent muốn giao việc.

## Chạy local

### 1. Frontend và biến môi trường

```powershell
npm install
Copy-Item .env.example .env
```

Đổi `SPACEHANK_PASSWORD` thành secret dài. Chỉ cấu hình command cho worker thực sự có trên máy:

```env
VITE_SPACEHANK_WS_URL=ws://localhost:8787
VITE_SPACEHANK_API_URL=http://localhost:8787
VITE_HANK_RAG_API_URL=http://localhost:8000
SPACEHANK_PASSWORD=use-a-long-random-secret
SPACEHANK_ORIGIN=http://localhost:5173
SPACEHANK_WORKDIR=D:\Data\Personal\Portfolio
SPACEHANK_CODEX_CMD=codex exec --full-auto
SPACEHANK_CLAUDE_CMD=claude -p
```

Worker command phải đọc prompt từ `stdin` và trả exit code `0` khi hoàn tất. Không đặt API key/secret trong biến `VITE_*`.

### 2. Hank RAG

```powershell
Set-Location .integrations\one61-rag
Copy-Item .env.example .env
docker compose up -d
uv sync --extra dev
uv run uvicorn src.main:app --host 127.0.0.1 --port 8000 --workers 1
```

Điền `GEMINI_API_KEY` trong file RAG env. Kiểm tra `http://localhost:8000/health`. Thiếu key là lỗi cấu hình thật, không có mock response.

### 3. Realtime server

Ở terminal khác, tại thư mục gốc:

```powershell
npm run spacehank:server
```

Kiểm tra `http://localhost:8787/health`. Kết quả phải có `mode: "production"` và `configuredWorkers`.

### 4. Frontend

```powershell
npm run dev
```

Mở `http://localhost:5173/spacehank`, đăng nhập bằng `SPACEHANK_PASSWORD`.

## Luồng dữ liệu thật

1. Browser đăng nhập Node server và nhận HttpOnly session cookie.
2. Browser mở WebSocket có xác thực.
3. Tạo task sẽ kiểm tra agent ID và worker command.
4. Node spawn command trong `SPACEHANK_WORKDIR`, ghi prompt vào stdin, stream stdout/stderr thành event.
5. Exit code quyết định task `completed` hoặc `failed`.
6. UI chỉ hiển thị agent/event nhận từ server.
7. Chat và upload tài liệu đi thẳng tới Hank RAG FastAPI.

WebGL floor là lớp hiển thị telemetry; chuyển động nhân viên không phải bằng chứng model đã hoàn thành việc. Kết quả thật nằm ở worker output, task status và event stream.

## Thêm worker

Tên biến được tạo từ agent ID, viết hoa:

```env
SPACEHANK_GEMINI_CMD=<command-that-reads-stdin>
SPACEHANK_GROK_CMD=<command-that-reads-stdin>
SPACEHANK_DEEPSEEK_CMD=<command-that-reads-stdin>
```

Chỉ thêm command khi có runtime/API tương ứng. Label model không thay thế executable thật.

## Build và deploy

```powershell
npm run build
npm run preview
```

Nên deploy thành ba service:

1. Frontend trên Vercel, Netlify hoặc Nginx static hosting. Set build-time URLs: `https://realtime.example.com`, `wss://realtime.example.com`, `https://rag.example.com`.
2. Node realtime server trên VPS, Fly.io, Railway hoặc Render, chạy `npm run spacehank:server`.
3. Hank RAG trên Docker host/service riêng với HTTPS và persistence cho database, vector store, Redis.

Production bắt buộc:

- `SPACEHANK_ORIGIN` phải đúng origin frontend, không dùng `*`.
- Dùng HTTPS/WSS và reverse proxy TLS.
- Dùng password random dài; không commit `.env` hoặc API keys.
- Giới hạn quyền của worker và `SPACEHANK_WORKDIR`.
- Có log/monitoring cho Node, FastAPI, database và worker.
- Tasks/events hiện lưu trong memory; restart sẽ mất lịch sử. Muốn audit lâu dài cần thêm database persistence.

## Troubleshooting

- **SERVER OFFLINE:** kiểm tra Node server và hai biến URL realtime; đổi Vite env thì restart dev server.
- **Worker command is not configured:** thêm `SPACEHANK_<AGENT_ID>_CMD`, restart Node, rồi dispatch lại.
- **RAG offline:** kiểm tra Uvicorn, `/health`, Docker dependencies và `GEMINI_API_KEY`.
- **Login lỗi:** kiểm tra origin, credentials và `SPACEHANK_PASSWORD` trước khi start server.

