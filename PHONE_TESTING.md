# Thử web trên điện thoại Android qua dây cáp

Hướng dẫn này cho cách chạy bản **đang viết trên laptop** ngay trên **Chrome điện thoại**, và soi lỗi của điện thoại từ laptop. Không cần deploy, không cần Android Studio.

> Chỉ dùng được với điện thoại **Android**. iPhone cần máy Mac.

Quy ước trong file này:

| Thứ | Giá trị |
| --- | --- |
| Thư mục dự án | `D:\Data\Personal\Portfolio` |
| Thư mục `adb` | `D:\platform-tools` |
| Cổng web (Vite) | `5173` |
| Cổng server realtime | `8787` |

---

## 1. Chuẩn bị (làm một lần)

### 1.1. Tải Platform Tools (có `adb`)
1. Vào **developer.android.com/tools/releases/platform-tools** và tải bản cho Windows.
2. Giải nén vào `D:\platform-tools`. Trong đó phải có `adb.exe`.

### 1.2. Bật gỡ lỗi USB trên điện thoại
1. **Cài đặt → Giới thiệu điện thoại**, tìm dòng **Số hiệu bản dựng** (Build number; với Samsung nằm trong "Thông tin phần mềm").
2. Bấm vào dòng đó **7 lần liên tiếp**, đến khi máy báo đã là nhà phát triển.
3. Quay lại **Cài đặt → Tùy chọn nhà phát triển** và bật **Gỡ lỗi USB** (USB debugging).

---

## 2. Mỗi lần thử

### Bước 1. Chạy web trên laptop
Mở terminal trong thư mục dự án:

```powershell
cd D:\Data\Personal\Portfolio
npm run dev
```

Dòng in ra phải là `Local: http://127.0.0.1:5173/`.

Nếu cần các tính năng có server (đăng nhập, Hải chiến online), mở **thêm một terminal** và chạy:

```powershell
cd D:\Data\Personal\Portfolio
npm run spacehank:server
```

### Bước 2. Cắm cáp và cho phép
1. Cắm điện thoại vào laptop bằng **cáp có truyền dữ liệu** (có cáp chỉ sạc, máy sẽ không nhận).
2. Điện thoại hiện hộp **"Cho phép gỡ lỗi USB?"**. Tích "luôn cho phép từ máy tính này" rồi bấm **Cho phép**.
3. Kiểm tra:

```powershell
cd D:\platform-tools
.\adb devices
```

Kết quả đúng có một dòng như `2665506f25017ece   device`.

| Thấy | Nghĩa là | Cách xử lý |
| --- | --- | --- |
| `device` | Đã nối được | Làm tiếp |
| `unauthorized` | Chưa bấm Cho phép trên điện thoại | Mở khóa màn hình, bấm Cho phép rồi chạy lại `.\adb devices` |
| Danh sách trống | Máy không nhận | Đổi cáp, hoặc đổi chế độ USB của điện thoại sang **Truyền tệp** |

### Bước 3. Nối cổng từ điện thoại về laptop
Vẫn trong `D:\platform-tools`:

```powershell
.\adb reverse tcp:5173 tcp:5173
.\adb reverse tcp:8787 tcp:8787
```

Mỗi lệnh in ra số cổng (`5173`, `8787`) là thành công. Dòng đầu cho trang web, dòng hai cho server.

> Rút cáp rồi cắm lại thì **phải chạy lại hai lệnh này**.

### Bước 4. Mở trang trên điện thoại
Trong **Chrome điện thoại**, gõ đúng như sau (nhớ có `http://`):

```
http://localhost:5173/spacehank?demo
```

- Dùng chữ **`localhost`**, đừng dùng địa chỉ IP của laptop. Chỉ `localhost` và `https` mới được trình duyệt coi là "an toàn", mà service worker, thông báo, chia sẻ và vân tay đều cần điều đó.
- Phải là **`http://`**, không phải `https://`. Nếu Chrome tự đổi thành `https://` sẽ báo `ERR_CONNECTION_CLOSED`.
- `?demo` mở chế độ demo, không cần mật khẩu. Bỏ đi nếu muốn dùng bản thật (cần chạy server ở Bước 1).
- Sửa code trên laptop thì điện thoại tự tải lại.

### Bước 5. Soi lỗi của điện thoại từ laptop
1. Mở **Chrome trên laptop**, vào `chrome://inspect/#devices`.
2. Trang đang mở trên điện thoại hiện trong danh sách. Bấm **inspect**.
3. Cửa sổ DevTools hiện ra: **Console** (lỗi), **Network**, **Application** (service worker, bộ nhớ). Bên trái là hình màn hình điện thoại đang chạy thật.

---

## 3. Soi chính app Hank62 đã cài (bản deploy)

App đã cài trên điện thoại chạy bản **đã deploy** (`hank62dev.vercel.app`), không thể trỏ vào laptop. Nhưng vẫn soi được lỗi của nó:

1. Cắm cáp, bật gỡ lỗi USB như trên. **Không cần** `adb reverse`.
2. Mở app Hank62 trên điện thoại.
3. Trên laptop vào `chrome://inspect/#devices`, thấy trang Hank62 thì bấm **inspect**.

Muốn thử tính năng chỉ có khi cài app (chia sẻ vào app, thông báo cập nhật): push code, đợi Vercel deploy, rồi mở app đã cài và đợi nó báo có bản mới.

---

## 4. Gỡ rối thường gặp

| Hiện tượng | Nguyên nhân | Cách xử lý |
| --- | --- | --- |
| `adb` không được nhận ra | Chưa vào thư mục `D:\platform-tools` hoặc thiếu `.\` | `cd D:\platform-tools` rồi gõ `.\adb ...` |
| `ERR_CONNECTION_CLOSED` | Trang đang là `https://` | Gõ lại với `http://localhost:5173/...` |
| `ERR_EMPTY_RESPONSE` | Vite chỉ nghe ở IPv6 trên Windows | Đã sửa trong `vite.config.js` (`server.host: '127.0.0.1'`). Kiểm tra `npm run dev` in ra `http://127.0.0.1:5173/`. |
| "Không thể truy cập trang" | Web chưa chạy, hoặc quên chạy lại `adb reverse` sau khi cắm lại cáp | Chạy `npm run dev`, rồi chạy lại hai lệnh `adb reverse` |
| Vite nhảy sang cổng khác (`5174`...) | Cổng 5173 đang bận | Tắt tiến trình cũ, hoặc đổi số cổng trong lệnh `adb reverse` và URL |
| `adb devices` báo `unauthorized` | Chưa cho phép trên điện thoại | Bấm Cho phép ở hộp thoại trên điện thoại |
| Đăng nhập báo lỗi origin | Server chỉ chấp nhận `http://localhost:5173` | Đúng địa chỉ như Bước 4, không dùng IP hay cổng khác |
| Khoá vân tay / chia sẻ / thông báo không chạy | Trang không "an toàn" | Dùng `localhost` hoặc bản `https://hank62dev.vercel.app` |

---

## 5. Xem màn hình điện thoại trên laptop (tuỳ chọn, chưa thử trên máy này)

### scrcpy: chiếu màn hình điện thoại lên laptop
Lướt trên điện thoại thì cửa sổ trên laptop chạy theo, và dùng chuột điều khiển ngược lại được. Chạy với mọi app, kể cả Hank62 đã cài.

1. Tải **scrcpy-win64-…zip** từ **github.com/Genymobile/scrcpy** (mục Releases), giải nén vào `D:\scrcpy`.
2. Cắm cáp như trên, rồi:

```powershell
cd D:\scrcpy
.\scrcpy.exe
```

Nếu báo `adb` lệch phiên bản: `D:\platform-tools\adb kill-server` rồi chạy lại.

### Browser Sync: lướt ở một bên thì bên kia lướt theo
Chỉ cho trang web đang chạy thử, không cho app đã cài. Đăng nhập và tính năng cần server sẽ không chạy, vì server chỉ chấp nhận `localhost:5173`. Chỉ nên dùng ở chế độ demo.

```powershell
cd D:\Data\Personal\Portfolio
npx browser-sync start --proxy "127.0.0.1:5173" --port 3000 --ws --no-open
```

```powershell
cd D:\platform-tools
.\adb reverse tcp:3000 tcp:3000
```

Rồi mở `http://localhost:3000/spacehank?demo` trên **cả** Chrome laptop và Chrome điện thoại.

---

## 6. Tóm tắt các lệnh

```powershell
# Laptop, terminal 1
cd D:\Data\Personal\Portfolio
npm run dev

# Laptop, terminal 2 (chỉ khi cần server)
cd D:\Data\Personal\Portfolio
npm run spacehank:server

# Laptop, terminal 3: kiểm tra và nối cổng (chạy lại mỗi lần cắm lại cáp)
cd D:\platform-tools
.\adb devices
.\adb reverse tcp:5173 tcp:5173
.\adb reverse tcp:8787 tcp:8787

# Điện thoại (Chrome): http://localhost:5173/spacehank?demo
# Laptop (Chrome):     chrome://inspect/#devices  ->  inspect
```
