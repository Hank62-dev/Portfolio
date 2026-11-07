# Bảo mật: 20 điểm cần kiểm tra trước khi ra mắt

Bảng này ghi hệ thống đang đứng ở đâu với từng điểm. "N/A" nghĩa là kiến trúc hiện tại không có thứ đó nên điểm này không áp dụng. Cột cuối nói việc **bạn** còn phải làm (hầu hết là điền biến trên Render).

Kiến trúc để dễ đọc: trang web (Vercel) gọi hai service trên Render. `hank62-realtime` (Node) giữ phiên đăng nhập, AI, đồng bộ, podcast, thông báo đẩy và nói chuyện với Postgres (Neon). `hank62-rag` (Python) trả lời câu hỏi từ tài liệu. Trình duyệt **không bao giờ** nói chuyện trực tiếp với database.

| # | Điểm | Trạng thái | Chi tiết |
|---|---|---|---|
| 1 | Giấu API key | ✅ | Mọi key (Gemini, Hugging Face, VAPID, webhook Discord, lịch) chỉ nằm trong biến môi trường của server. Phía trình duyệt chỉ có các biến `VITE_*` là địa chỉ URL, không có bí mật. |
| 2 | Dọn bí mật trong Git | ✅ | Đã quét toàn bộ lịch sử: không có key, token, khoá riêng hay webhook. Chỉ có mật khẩu giả cho database chạy trên máy (`hank62_rag:hank62_rag@localhost`) và ví dụ trong tài liệu. `.env` nằm trong `.gitignore`. Workflow `security.yml` quét lại mỗi lần push và mỗi tuần. |
| 3 | Dùng khoá "public" cho DB | N/A | Không có kết nối từ trình duyệt tới database, nên không có khoá công khai nào. `DATABASE_URL` chỉ nằm ở server. |
| 4 | Row-level security | N/A | Database chỉ được server truy cập, và chỉ có một chủ. Nếu sau này cho trình duyệt nối thẳng vào database (kiểu Supabase) thì bắt buộc bật RLS. |
| 5 | Mã hoá dữ liệu nhạy cảm | ⚠️ một phần | Đang truyền qua HTTPS/WSS. Mật khẩu không bao giờ được lưu, có thể giữ dạng băm (điểm 10). Dữ liệu ghi chú, nhật ký trong Neon **không** mã hoá đầu cuối: chủ database và Neon đọc được. Khoá vân tay của nhật ký chỉ che trên màn hình. Mã hoá đầu cuối sẽ làm thông báo đẩy từ server (cần đọc tiêu đề việc, thói quen) và tìm kiếm trên server không còn dùng được, nên **chưa làm**. |
| 6 | Xác thực phía server | ✅ | Mọi route làm việc đều gọi `requireAuth`. Phần hở lớn nhất trước đây là **RAG: không có đăng nhập nào**, nay đã khoá bằng vé (mục 4.2d trong `SPACEHANK_SETUP.md`). Ngoại lệ có chủ đích: `/health`, đăng nhập, và hải chiến online (vào bằng mã phòng, có kiểm tra origin và giới hạn). |
| 7 | Khoá quyền truy cập bản ghi | ✅ | Một chủ duy nhất: mọi route đọc hoặc ghi dữ liệu đều cần phiên của chủ. |
| 8 | Chặn sửa trường trái phép | ✅ | Đồng bộ chỉ nhận kho trong danh sách cho phép, id hợp lệ, bản ghi là object nhỏ hơn 256 KB. Client không đặt được các trường của server (số thứ tự, trạng thái xoá chỉ qua đúng đường). |
| 9 | Cookie phiên an toàn | ✅ | `HttpOnly`, `Secure`, `SameSite=None` (bắt buộc vì Vercel và Render là hai site khác nhau), token ký HMAC, token truy cập sống 30 phút, token làm mới chỉ gửi tới `/api/auth`. Mọi request ghi đều bị kiểm tra `Origin` nên cookie `SameSite=None` không bị lợi dụng để giả mạo. Hạn chế: không thu hồi từng token riêng lẻ; đổi mật khẩu hoặc `SPACEHANK_SESSION_SECRET` là đăng xuất mọi thiết bị. |
| 10 | Băm mật khẩu | ✅ (cần bật) | Hỗ trợ `SPACEHANK_PASSWORD_HASH` (scrypt, có salt, so sánh hằng thời gian). **Bạn cần:** chạy `npm run spacehank:hash-password -- "mật khẩu dài"`, dán kết quả vào Render, rồi xoá `SPACEHANK_PASSWORD`. |
| 11 | Giới hạn tần suất đăng nhập | ✅ | Khoá sau 10 lần sai từ một địa chỉ trong 15 phút, và **50 lần sai từ mọi địa chỉ cộng lại** (chặn dò mật khẩu bằng nhiều địa chỉ). Đã sửa lỗi cũ: địa chỉ người gọi lấy từ đầu `X-Forwarded-For` (client tự viết được, né giới hạn dễ dàng), nay lấy từ cuối (do proxy của Render thêm). Mọi route khác cũng có giới hạn tần suất; route tốn tài nguyên (AI, podcast, vé RAG) chặt hơn. |
| 12 | Chống bot | ⚠️ đủ cho một chủ | Không có CAPTCHA. Với một người dùng duy nhất, giới hạn tần suất và khoá đăng nhập (điểm 11) đã đủ. Hải chiến online có trần 300 phòng và tin nhắn 4 KB. |
| 13 | Truy vấn có tham số | ✅ | Mọi giá trị đi qua `$1, $2...`. Duy nhất chỗ ghép chuỗi là một đoạn điều kiện cố định trong code, không chứa dữ liệu người dùng. |
| 14 | Kiểm tra mọi đầu vào | ✅ | Có giới hạn kích thước và kiểm tra kiểu ở đồng bộ, task, AI, Discord, podcast (độ dài từ khoá, địa chỉ), thông báo đẩy. Địa chỉ feed podcast đi qua bộ tải an toàn (xem mục "Podcast: chặn SSRF" bên dưới). |
| 15 | Escape nội dung người dùng | ✅ | React tự escape. Không có `dangerouslySetInnerHTML`, `innerHTML`, `eval` nào trong mã. Nội dung nhập từ file (`.md`, `.docx`, `.html`...) được escape khi chuyển thành ghi chú, và trình soạn thảo chỉ giữ các thẻ nó biết. |
| 16 | Hạn chế upload | ✅ | Đồng bộ file: giới hạn kích thước (4 MB), hạn mức tổng, và **chỉ nhận đúng loại** (ảnh cho kho ảnh, âm thanh cho ghi âm; SVG, HTML, script bị từ chối). File trả về kèm `nosniff`, `Content-Security-Policy: sandbox` và tải xuống thay vì mở. RAG: chỉ nhận PDF, DOCX, TXT, MD, CSV, JSON, tối đa 25 MB, và cần vé. |
| 17 | Gọn câu trả lời API | ✅ | `/health` của cả hai service chỉ trả `ok` (trước đây lộ tên model, số agent, cấu hình worker). Lỗi 500 chỉ trả "Internal server error", chi tiết nằm trong log. `/api/stats` của RAG (lộ thống kê key) nay cần vé. |
| 18 | Header bảo mật | ✅ / 🔶 | API: `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `HSTS`, `COOP`, `Permissions-Policy`, CSP chặt, `no-store`. Trang web (Vercel): các header trên cộng CSP **áp dụng** cho `base-uri`, `object-src`, `form-action`, `frame-ancestors`. CSP đầy đủ (chặn script lạ) đang ở chế độ **Report-Only** để không làm vỡ app: mở app, xem Console có dòng "violates the following Content Security Policy directive" không, nếu sạch thì đổi tên header thành `Content-Security-Policy` trong `vercel.json`. Ghi chú: CSP đang cho phép script inline (Google Analytics, JSON-LD), muốn chặt hơn cần chuyển sang nonce hoặc hash. |
| 19 | Ép HTTPS | ✅ | Vercel và Render chuyển HTTP sang HTTPS; cookie đặt cờ `Secure`; thêm HSTS trên cả hai nơi. |
| 20 | Quét thư viện | ✅ / ⚠️ | Thư viện chạy trên máy người dùng: **0 lỗ hổng** sau khi nâng `react-router-dom` lên 7 (sửa lỗi open redirect). Còn 14 cảnh báo ở công cụ build và test (vitest, esbuild...) không đi vào sản phẩm; một số cần nâng bản chính (có thể làm vỡ test), để Dependabot tạo pull request. Đã thêm Dependabot (npm, pip, GitHub Actions) và workflow `security.yml` chạy `npm audit --omit=dev` mỗi push và mỗi tuần. Thư viện Python của RAG chưa được quét (nên chạy `pip-audit` một lần). |

## Việc mới làm thêm ngoài danh sách 20 điểm

- **Podcast: chặn SSRF.** Server đọc feed RSS do người khác đặt địa chỉ, nên `server/safeFetch.mjs` kiểm tra địa chỉ thật mà tên miền trỏ tới **ngay lúc kết nối**: từ chối localhost, mạng riêng, địa chỉ metadata của đám mây (169.254.169.254), kiểm tra lại sau mỗi lần chuyển hướng, giới hạn dung lượng (kể cả khi nén), thời gian và cổng. Có test chứng minh.
- **Ghi âm giọng nói thành chữ**: bản ghi chỉ gửi đi cho một lần gọi, không lưu lại; đi qua hạn mức AI mỗi ngày.

## Việc bạn cần làm để các bảo vệ trên có hiệu lực

1. **Đặt `RAG_TOKEN_SECRET`** (cùng một giá trị) trên cả `hank62-realtime` và `hank62-rag`. Chưa đặt thì RAG vẫn mở. Cách làm: mục 4.2d trong `SPACEHANK_SETUP.md`.
2. **Đổi sang `SPACEHANK_PASSWORD_HASH`** (tuỳ chọn nhưng nên làm).
3. Nếu có Cloudflare hoặc proxy khác đứng trước Render, đặt `TRUSTED_PROXY_HOPS=2` (mặc định 1).
4. Sau khi deploy trang web, mở Console xem có báo vi phạm CSP không, rồi chuyển CSP Report-Only thành enforce.
5. Bật Dependabot alerts trong GitHub (Settings → Code security), và chạy `pip-audit` cho RAG.
