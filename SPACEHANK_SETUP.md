# SpaceHank — hướng dẫn setup và deploy từ đầu đến cuối

Tài liệu này đi theo thứ tự: chuẩn bị tài khoản → lấy từng biến môi trường → deploy Render → deploy Vercel → nối hai bên → kiểm tra. Làm đúng thứ tự, vì các biến `VITE_*` được ghi cứng vào bản build trên Vercel.

## 1. Tổng quan

| Phần | Công nghệ | Chạy ở | Cần làm gì |
|---|---|---|---|
| Portfolio và giao diện `/spacehank` | Vite + React | **Vercel** | Import repo, nhập 3 biến `VITE_*` |
| Realtime server (`server/index.mjs`) | Node + WebSocket, đăng nhập bằng mật khẩu | **Render** (`hank62-realtime`) | Đặt mật khẩu và origin |
| Hank RAG (`.integrations/hank62-rag`) | FastAPI + Gemini + LightRAG | **Render** (`hank62-rag`) | Cần Gemini, Qdrant, Postgres, Redis |

Chỉ cần trang portfolio: làm mục 6 (Vercel) và bỏ trống 3 biến `VITE_*`. Trang SpaceHank sẽ báo offline.

Realtime server chưa chạy thì phần đăng nhập chỉ báo offline, và agent chưa có worker command thì task bị từ chối. Ngoại lệ là `/spacehank?demo`: chế độ demo công khai với dữ liệu giả, không gửi gì lên server và tách riêng khỏi workspace thật (Hải chiến online trong demo vẫn cần realtime server, vì hai người chơi nối với nhau qua đó).

## 2. Chỉ dùng gói miễn phí: giới hạn cần biết

Toàn bộ cấu hình dùng gói free, không cần thẻ trả phí. Đổi lại có các giới hạn dưới đây. Điều kiện gói free có thể thay đổi, hãy kiểm tra lại trên trang của từng dịch vụ trước khi tạo.

| Dịch vụ | Giới hạn gói free |
|---|---|
| Render (cả hai service) | 512MB RAM. Service ngủ sau 15 phút không có request (hoặc tin nhắn WebSocket), lần đánh thức tiếp theo mất khoảng 1 phút. Mỗi tài khoản có 750 giờ chạy mỗi tháng. **Không có ổ đĩa bền vững** |
| Vercel (Hobby) | Miễn phí, dành cho dự án cá nhân phi thương mại |
| Qdrant Cloud | Cluster 1GB. Cluster không hoạt động 1 tuần sẽ bị tạm dừng, 4 tuần sẽ bị xóa. Bạn cần vào dashboard để kích hoạt lại |
| Neon (Postgres) | Khoảng 100 CU-giờ tính toán và 0,5GB dung lượng mỗi tháng. Database tự ngủ khi rảnh nên truy vấn đầu tiên chậm |
| Upstash (Redis) | 500.000 lệnh mỗi tháng, 256MB dữ liệu |
| Gemini API | Có hạn mức theo phút và theo ngày, và hạn mức thay đổi theo model. Mỗi tin nhắn chat gọi nhiều lần LLM (guard, router, RAG, verification) và 1–2 lần embedding. Xem hạn mức hiện tại của bạn tại https://aistudio.google.com |

Hệ quả thực tế:

- **Trang có thể chậm lần đầu.** Sau 15 phút rảnh, realtime server và RAG ngủ. Lần truy cập kế tiếp phải chờ đánh thức, RAG lâu hơn vì phải nạp thư viện.
- **Đăng nhập SpaceHank mất khi realtime server ngủ hoặc restart,** vì phiên lưu trong bộ nhớ. Bạn phải đăng nhập lại. Các ván Hải chiến online đang chơi cũng mất vì phòng chỉ nằm trong bộ nhớ (ứng dụng tự nối lại trong 20 phút nếu server còn giữ phòng).
- **Kho tri thức LightRAG không bền.** Không có ổ đĩa bền vững nên dữ liệu đồ thị LightRAG mất mỗi lần RAG ngủ hoặc restart, trong khi vector trong Qdrant vẫn còn nên RAG không nạp lại. Kết quả: câu hỏi dựa trên kho tri thức có thể trả về trống sau mỗi lần restart. Chat với tài liệu bạn tải lên (lưu trong Qdrant) và hỏi đáp trên dữ liệu kho (Postgres) không bị ảnh hưởng.
- **Hết hạn mức Gemini thì chat dừng đến khi hạn mức được đặt lại.** Hạn mức theo ngày thường đặt lại vào nửa đêm giờ Thái Bình Dương.
- **Nếu Render kill RAG vì hết bộ nhớ (OOM),** gói free không đủ. Tôi đo thử RAG chạy rảnh, chưa kết nối Qdrant/Postgres/Redis, đã dùng khoảng 300MB. Khi kết nối đủ và xử lý chat, mức dùng có thể gần 512MB. Nếu xảy ra, cách duy nhất để ổn định là nâng gói `standard` (trả phí) hoặc chạy RAG ở nơi khác.
- **Giữ cluster Qdrant không bị tạm dừng:** dự án phải có truy cập ít nhất mỗi tuần.

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

Các biến đã có sẵn trong `render.yaml`, không cần nhập: `NODE_VERSION`, `SPACEHANK_PORT`, `SPACEHANK_WORKDIR`, `AI_DAILY_LIMIT` (mặc định 60 lượt AI mỗi ngày, để không cháy quota free).

**Biến tuỳ chọn cho các tính năng riêng của chủ workspace.** Bỏ trống thì tính năng đó tự tắt, workspace vẫn chạy bình thường:

| Biến | Dùng cho | Lấy ở đâu |
|---|---|---|
| `GEMINI_API_KEY` | Hank DJ (chọn nhạc theo tâm trạng) và bản tin buổi sáng | Cùng key Gemini ở mục 3.3 |
| `HF_TOKEN` | Image Studio (tạo ảnh bằng FLUX qua Hugging Face) | https://huggingface.co/settings/tokens → tạo token loại Read. Có hạn mức free, hạn mức đổi theo thời điểm nên hãy xem trang của Hugging Face |
| `CALENDAR_ICS_URL` | Lịch hôm nay trong bản tin | Google Calendar → Settings → chọn lịch → "Secret address in iCal format". Link này là bí mật, chỉ đặt trên Render, không đặt vào biến `VITE_*` |

Tạo ảnh bằng Gemini cũng được (khi không có `HF_TOKEN`), nhưng model ảnh của Gemini có thể không nằm trong gói free, nên Image Studio ưu tiên Hugging Face.

Không đặt `SPACEHANK_CODEX_CMD`, `SPACEHANK_CLAUDE_CMD` và các biến `SPACEHANK_*_CMD` khác. Render không cài sẵn các CLI đó, nên việc giao task sẽ bị từ chối. Điều này là bình thường ở production. Chỉ thêm một biến `SPACEHANK_<ID>_CMD` khi command đó thật sự tồn tại trong service.

### 3.3. Render — service `hank62-rag`

| Biến | Giá trị | Lấy ở đâu |
|---|---|---|
| `GEMINI_API_KEY` | Chuỗi `AIza...` | https://aistudio.google.com/apikey → Create API key. Dùng cho cả chat và embedding |
| `DATABASE_URL` | `postgresql://user:pass@host/db?sslmode=require` | Mục 4.2 |
| `QDRANT_URL` | `https://<cluster>.cloud.qdrant.io:6333` | Mục 4.1 |
| `QDRANT_API_KEY` | Chuỗi API key | Mục 4.1 |
| `REDIS_URL` | `rediss://default:pass@host:6379` | Mục 4.3 |
| `CORS_ORIGINS` | `https://<ten-du-an>.vercel.app` | URL Vercel của bạn, không có `/` ở cuối. Nhiều origin thì cách nhau bằng dấu phẩy (ví dụ thêm domain riêng). Ở lần tạo đầu điền tạm `https://example.com`, rồi sửa lại ở bước 7 |

Các biến đã có sẵn trong `render.yaml`: `PYTHON_VERSION`, `GEMINI_MODEL`, `GEMINI_FAST_MODEL`, `GEMINI_FALLBACK_MODEL`. Khi Gemini báo 503 (model quá tải), RAG tự thử lại 2 lần rồi chuyển sang model dự phòng này; để trống thì chỉ thử lại. Khi model chính hết quota trong ngày (429, gói free của Gemini 3.8 Flash chỉ có 20 request/ngày), RAG không chờ nữa mà chuyển ngay sang model dự phòng, và các câu hỏi sau cũng đi thẳng sang đó cho đến khi quota hồi lại. Server Node (Hank DJ, bản tin, Creator Lab) làm tương tự với `GEMINI_TEXT_FALLBACK_MODEL` (mặc định `gemini-3.5-flash-lite`; đặt rỗng để tắt). Hãy kiểm tra tên model còn dùng được tại https://ai.google.dev/gemini-api/docs/models. Nếu cần đổi, sửa `GEMINI_MODEL` và `GEMINI_FAST_MODEL` trong Render.

## 4. Tạo các dịch vụ ngoài

### 4.1. Qdrant Cloud (vector database)

1. Vào https://cloud.qdrant.io, đăng ký và tạo một cluster (gói Free).
2. Mở cluster, copy **Cluster URL** (có dạng `https://xxxx.<region>.cloud.qdrant.io`). Thêm `:6333` ở cuối nếu URL chưa có cổng. Đó là `QDRANT_URL`.
3. Mở tab **API Keys** → Create → copy key. Đó là `QDRANT_API_KEY`. Key chỉ hiện một lần.

Không cần tạo collection. RAG tự tạo khi khởi động.

### 4.2. Postgres (cuộc trò chuyện và tài liệu)

Ví dụ dùng Neon, bạn cũng có thể dùng Render Postgres hoặc Supabase.

1. Vào https://neon.tech, tạo project và database.
2. Ở trang **Connection Details**, copy connection string. Đó là `DATABASE_URL`. Giữ `?sslmode=require` ở cuối.
3. Mở **SQL Editor**, dán toàn bộ nội dung file `.integrations/hank62-rag/scripts/sql/warehouse_schema.sql` rồi bấm **Run**. File tạo 3 bảng `conversations`, `messages`, `documents` (đúng những bảng code RAG đọc trong `src/db/postgres.py`). Chạy lại nhiều lần vẫn an toàn, không xoá dữ liệu.
4. Kiểm tra: chạy `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;`, phải thấy 3 bảng trên.

Nếu bỏ qua Postgres, RAG vẫn chạy nhưng không đọc được lịch sử hội thoại lưu trong database (bộ nhớ ngắn hạn vẫn ở Redis, vector tài liệu vẫn ở Qdrant).

File kho vận cũ (giao hàng, chuyến bay, hải quan) được giữ ở `scripts/sql/logistics_demo_schema.sql`, chỉ dùng nếu bạn muốn chạy lại bản demo kho vận với `scripts/import_warehouse_to_postgres.py`. Hank chung chung không cần nó.

### 4.2b. Đồng bộ dữ liệu cá nhân giữa các thiết bị (dùng chung database Neon)

Ghi chú, nhật ký, ảnh, thói quen, thu chi, thẻ ôn, Creator Lab… được lưu vào Postgres để máy nào đăng nhập cũng thấy. **Service `hank62-realtime` cần `DATABASE_URL`** (không phải chỉ RAG).

1. Dùng lại project Neon ở mục 4.2 (cùng connection string cũng được, bảng của đồng bộ có tiền tố `sync_` nên không đụng bảng RAG), hoặc tạo database riêng.
2. Render → service `hank62-realtime` → **Environment** → thêm `DATABASE_URL` = connection string (giữ `?sslmode=require`) → **Save, rebuild, and deploy**. Server tự tạo bảng khi khởi động, bạn không phải chạy SQL.
3. Mở app đã đăng nhập: ở thanh bên (hoặc menu "More" trên điện thoại) có dòng trạng thái: "Synced vừa xong". Chưa có `DATABASE_URL` thì dòng đó ghi "Sync is off".
4. Dữ liệu đã có sẵn trên từng máy sẽ được tải lên một lần ở lần đồng bộ đầu tiên; máy mới chỉ cần đăng nhập để kéo về.

Giới hạn: nhạc (file quá lớn), file ghi âm và ảnh trên 4 MB (`SYNC_MAX_BLOB_MB`) chỉ ở lại trên máy; dung lượng đồng bộ tối đa 300 MB (`SYNC_QUOTA_MB`) để không làm đầy database miễn phí (Neon free 0,5 GB, dùng chung với RAG). Hai máy sửa cùng một bản ghi cùng lúc thì lần sửa sau thắng. Dữ liệu trong database không được mã hoá đầu cuối: chủ database và Neon đọc được.

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

Lần khởi động đầu, RAG tự nạp tài liệu chính sách vào Qdrant ở chế độ nền. Việc này gọi Gemini nhiều lần và có thể mất vài phút đến hàng chục phút. Trong lúc đó `/health` vẫn trả lời bình thường, nhưng câu trả lời dựa trên tài liệu chưa đầy đủ. Xem tiến độ trong **Logs** của service `hank62-rag`. Vì gói free không có ổ đĩa bền vững, dữ liệu đồ thị LightRAG mất khi service ngủ hoặc restart (xem mục 2). Qdrant vẫn giữ vector nên RAG không tự nạp lại.

#### Hank trả lời những gì

Hank không còn bị giới hạn ở logistics. Mỗi câu hỏi được trả lời từ ba nguồn, và nhãn dưới câu trả lời cho biết nguồn nào đã dùng:

- **Kiến thức của Hank**: bất kỳ chủ đề nào, kể cả khi bạn không có tài liệu liên quan.
- **Tài liệu của bạn**: file thêm trong tab Document Vault được lưu vào một thư viện chung (`LIBRARY_SCOPE`, mặc định `hank62-library`) và mọi cuộc chat đều đọc nó. Có thể xóa từng file trong Vault. Tài liệu tải lên trực tiếp trong một cuộc chat vẫn chỉ thuộc cuộc chat đó.
- **Web**: dùng Google Search grounding của Gemini, không cần thêm key. Công tắc ở đầu khung chat: Tự động (tìm khi câu hỏi cần thông tin mới), Luôn bật, Tắt. Đặt `WEB_SEARCH_ENABLED=false` trên service `hank62-rag` để tắt hẳn. Nếu tìm kiếm lỗi, Hank vẫn trả lời bằng kiến thức của nó và nói rõ điều đó. Câu trả lời từ web không được cache. Mỗi lần tìm kiếm tính vào hạn mức Gemini của bạn, và hạn mức grounding của gói free có thể khác hạn mức chat thông thường.

Sau khi cập nhật code, redeploy service `hank62-rag` để thay đổi này có hiệu lực.

## 6. Deploy trên Vercel

1. Vào https://vercel.com/new → import repo `Hank62-dev/Portfolio`.
2. Cấu hình: Framework Preset `Vite`, Build Command `npm run build`, Output Directory `dist`. `vercel.json` đã có rewrite, nên refresh `/spacehank` không bị 404.
3. Mở **Environment Variables** và nhập 3 biến ở mục 3.1 với URL Render ở bước 5.5.
4. Bấm **Deploy**. Khi xong, ghi lại URL (ví dụ `https://portfolio-xxx.vercel.app`).

## 7. Nối hai bên

1. Vào Render → service `hank62-realtime` → **Environment** → sửa `SPACEHANK_ORIGIN` thành đúng URL Vercel (không có `/` ở cuối) → Save. Service tự redeploy.
2. Mở `https://<vercel>/spacehank` → đăng nhập bằng `SPACEHANK_PASSWORD`.
3. Nhãn realtime phải hiện online. Chat gửi tới RAG phải có phản hồi.
4. Thử Hải chiến online: mở `https://<vercel>/spacehank?demo`, vào Trò chơi → Hải chiến → Chơi online → tạo phòng. Nếu báo không nối được máy chủ, `SPACEHANK_ORIGIN` chưa khớp đúng origin của trang. Lần nối đầu sau khi server ngủ có thể mất khoảng 1 phút.

Làm tương tự cho RAG: vào Render → service `hank62-rag` → **Environment** → sửa `CORS_ORIGINS` thành URL Vercel → Save. Nếu quên bước này, chat sẽ lỗi CORS trong trình duyệt. URL xem trước (preview) của Vercel có địa chỉ khác URL chính, nên chúng bị chặn trừ khi bạn thêm vào `CORS_ORIGINS`.

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
| Hải chiến online báo không nối được máy chủ, trong khi các tab khác vẫn chạy | `SPACEHANK_ORIGIN` khác origin của trang đang mở (ví dụ đang mở URL xem trước của Vercel), hoặc `VITE_SPACEHANK_WS_URL` sai | Mở bằng đúng domain chính, kiểm tra hai biến, rồi Redeploy |
| Trang `/spacehank` báo SERVER OFFLINE | Biến `VITE_*` sai hoặc chưa redeploy | Sửa biến trên Vercel rồi Redeploy |
| Trình duyệt báo lỗi CORS khi gọi realtime | `SPACEHANK_ORIGIN` sai | Sửa như trên |
| Trình duyệt báo lỗi CORS khi chat hoặc upload (gọi RAG) | `CORS_ORIGINS` của RAG thiếu hoặc không khớp URL Vercel | Đặt đúng origin, `https://`, không có `/` ở cuối, rồi chờ service redeploy |
| `Worker command is not configured` | Agent chưa có `SPACEHANK_<ID>_CMD` | Bình thường ở production. Chỉ thêm command khi nó tồn tại trong service |
| RAG `/health` trả `rag_initialized: false` | Qdrant sai URL hoặc API key | Kiểm tra `QDRANT_URL` (có `https://` và cổng `:6333`) và `QDRANT_API_KEY`, xem log |
| Chat báo lỗi `GEMINI_API_KEY not configured` | Thiếu key | Điền `GEMINI_API_KEY` |
| Log RAG báo `Postgres pool init failed` | `DATABASE_URL` sai hoặc thiếu `sslmode=require` | Kiểm tra connection string |
| Log RAG báo `Redis unavailable` | `REDIS_URL` sai hoặc thiếu TLS | Dùng `rediss://` với Upstash |
| Log RAG báo 429 hoặc quota khi embedding | Hết hạn mức Gemini | Đợi hoặc nâng gói Gemini |
| RAG bị Render kill vì hết bộ nhớ | Gói free chỉ có 512MB | Không sửa được trong gói free. Cần gói `standard` (trả phí) hoặc nơi chạy khác |
| Truy cập lần đầu chậm khoảng 1 phút | Service free đang ngủ | Bình thường ở gói free. Chờ rồi tải lại |
| Câu hỏi về kho tri thức trả về trống sau khi RAG restart | Dữ liệu đồ thị LightRAG mất vì không có ổ đĩa | Xem mục 2. Hạn chế của gói free |
| Qdrant báo không kết nối được sau thời gian dài không dùng | Cluster free bị tạm dừng | Vào https://cloud.qdrant.io kích hoạt lại cluster |

## 11. Bảo mật

- Không commit `.env`, API key hay mật khẩu. File `.env` đã nằm trong `.gitignore`.
- Chỉ dùng HTTPS/WSS ở production.
- Đặt `SPACEHANK_ORIGIN` đúng một origin, không dùng `*`. Hải chiến online không cần đăng nhập (bạn bè vào bằng mã phòng), nên origin này cùng giới hạn tin nhắn 4 KB, giới hạn tốc độ và trần 300 phòng là thứ bảo vệ nó.
- Khoá vân tay của nhật ký chỉ che nhật ký trên màn hình, không mã hoá dữ liệu lưu trên máy. Ghi chú, nhật ký, ảnh và Mơ nằm trong trình duyệt của từng thiết bị, xoá dữ liệu trang hoặc gỡ app là mất, và chưa có sao lưu.
- Đổi `SPACEHANK_PASSWORD` ngay nếu nghi ngờ bị lộ.
- Giới hạn quyền của worker và `SPACEHANK_WORKDIR`.
- RAG chỉ cho trình duyệt từ các origin trong `CORS_ORIGINS` gọi API. CORS chỉ chặn trình duyệt, không chặn `curl` hay script, và RAG chưa có đăng nhập. Ai biết URL RAG vẫn gọi được ngoài trình duyệt và tiêu tốn quota Gemini của bạn. Nếu cần chặn hẳn, thêm xác thực (ví dụ API key hoặc đi qua proxy có đăng nhập) trước khi công khai rộng rãi.
- Bật backup cho Postgres và Qdrant trước khi nạp dữ liệu quan trọng.
