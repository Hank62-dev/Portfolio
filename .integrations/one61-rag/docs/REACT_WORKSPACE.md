# One61 React Workspace

Giao diện React + Tailwind CSS 4 lấy cảm hứng từ macOS: khung toàn màn hình,
sidebar, chế độ sáng/tối, bố cục thích ứng với điện thoại. Không có dock hay wallpaper.

Dùng pnpm 11.8.0, ghim trong `packageManager`. Chỉ cho phép script cài đặt
của `esbuild` qua `pnpm-workspace.yaml`.

Styles nằm trong utility classes của JSX. `src/tailwind.css` chỉ chứa import
Tailwind và cấu hình variants; không có CSS component viết tay.

## Chạy phát triển

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

Mở `http://localhost:5173/ui/`. Vite chuyển `/api/*` và `/health` đến
FastAPI tại `http://127.0.0.1:8000`.

Chạy backend trong terminal riêng từ thư mục gốc:

```powershell
uv run python -m src.main
```

Giao diện vẫn mở được khi backend chưa chạy; chat và tải tài liệu sẽ báo lỗi
kết nối. Không có câu trả lời hay số liệu giả.

## Build và chạy cùng FastAPI

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm build
cd ..
uv run python -m src.main
```

Mở `http://localhost:8000/demo`. FastAPI phục vụ tài nguyên tại `/ui/`.
Nếu chưa build, `/demo` vẫn phục vụ console HTML cũ. Docker tự build React.

## Chức năng

- Chat qua `/api/chat`; gửi đúng `session_id` và lịch sử hội thoại.
- Chọn chế độ `fast` hoặc `reasoning`; dừng chờ phản hồi.
- Upload qua `/api/test/upload`, cùng ID cuộc trò chuyện.
- PDF, DOCX, TXT, MD, CSV, JSON; tối đa 25 MB mỗi tệp.
- Hiển thị nguồn trích dẫn, trạng thái đối chiếu và câu hỏi tiếp theo từ API.
- Lưu câu trả lời, tìm kiếm lịch sử bằng `Ctrl K` / `⌘ K`, xuất JSON.
- Lịch sử và theme lưu trong `localStorage` của trình duyệt hiện tại.
- Tài liệu được lập chỉ mục trên backend theo từng cuộc trò chuyện.

Nút dừng hủy việc chờ trên trình duyệt; backend có thể vẫn hoàn thành xử lý.
Upload hiện dùng endpoint demo có sẵn, không phải luồng tài khoản production.

## Kiểm tra

```powershell
cd frontend
pnpm test
pnpm build
```

Kiểm tra bằng Node stdlib: khôi phục lịch sử, payload chat, phản hồi lỗi,
kiểm tra tệp ở biên upload. Không thêm thư viện UI, router hay test framework.
