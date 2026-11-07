# Kế hoạch làm app Android (APK) cho Hank62 / SpaceHank

> Trạng thái: **chỉ là kế hoạch, chưa làm gì.** Thứ tự đã chốt: hoàn thiện bản web trước, sau đó mới đóng gói thành app.
> Phạm vi: Android, cài trực tiếp bằng file APK (không CH Play, không App Store). iPhone nằm ngoài kế hoạch (xem mục 9).

---

## 1. Mục tiêu

Hiện bản "Install app" trên Android chỉ là **WebAPK**: Chrome đóng gói chính trang web thành một biểu tượng có khung riêng. Vẫn là website, nên có những thứ nó không làm được. App APK thật nhằm có thêm:

| # | Mong muốn | PWA hiện tại | App APK |
|---|---|---|---|
| 1 | Widget ở màn hình chính | Không | Có (Kotlin) |
| 2 | Chạy nền thật: nhạc/podcast ổn định, nhắc việc đúng giờ | Dễ bị hệ thống tạm dừng khi tắt màn hình | Có (foreground service + AlarmManager) |
| 3 | Thông báo không phụ thuộc trình duyệt | Phụ thuộc Chrome + Web Push | Có (FCM + thông báo cục bộ) |
| 4 | Tên, icon, màn hình khởi động riêng | Một phần (manifest) | Đầy đủ |
| 5 | Chia sẻ cho bạn bè bằng file APK | Không | Có |

Không phải mục tiêu: lên CH Play, iOS, viết lại toàn bộ giao diện bằng native.

## 2. Các hướng đã cân nhắc

| Hướng | Mô tả | Ưu | Nhược | Kết luận |
|---|---|---|---|---|
| **TWA / Bubblewrap** | Giống WebAPK nhưng có APK riêng | Rất nhẹ, giữ nguyên web | Không có widget, không có dịch vụ nền, vẫn Web Push qua Chrome | Không đủ cho mục tiêu 1–3 |
| **Capacitor** (vỏ WebView + plugin) | Web chạy trong WebView, thêm mã Android khi cần | Tái dùng 100% giao diện hiện tại; có plugin thông báo, có chỗ để viết Kotlin cho widget/dịch vụ nền | Phải duy trì thêm một phần mã Android; WebView khác Chrome một chút | **Chọn** |
| React Native / Flutter / Kotlin thuần | Viết lại app | Mượt nhất, native hoàn toàn | Viết lại mọi thứ, hai bản phải đồng bộ tính năng | Quá tốn, loại |

## 3. Kiến trúc đề xuất

```
┌──────────────── App Android (Capacitor) ────────────────┐
│  WebView ──tải──▶ https://<site>.vercel.app/spacehank     │
│     ▲  ▼  cầu nối JS (Capacitor bridge)                   │
│  Plugin gốc: thông báo cục bộ · FCM · âm thanh nền ·      │
│              widget · nhận chia sẻ · cập nhật APK         │
└───────────────────────────────────────────────────────────┘
                 │ HTTPS + cookie            │ FCM
                 ▼                           ▼
        Render (server + RAG)         Firebase Cloud Messaging
                 │
              Neon Postgres
```

Quyết định chính: **WebView tải thẳng trang web đang chạy trên Vercel** (đặt `server.url` của Capacitor), không nhét bản build vào trong APK.

- Có lợi: mọi cập nhật web đi tới app ngay như hiện nay (cả thanh "Có gì mới"); origin của trang vẫn là origin Vercel nên `SPACEHANK_ORIGIN` và chính sách cookie của server **không phải đổi**.
- Đánh đổi: mở app lúc không có mạng sẽ không có giao diện nếu service worker chưa cache. Service worker hiện đã precache nên phần lớn vẫn mở được; cần kiểm tra thực tế.
- Phương án dự phòng nếu cần chạy offline hoàn toàn: nhét bản build vào APK (origin sẽ là `https://localhost`), lúc đó phải cho server nhận thêm origin thứ hai và xử lý lại cookie. Không làm trừ khi cần.

Phần mã web phải biết mình đang chạy trong app hay trong trình duyệt. Dự kiến một lớp mỏng `platform` (ví dụ `src/features/spacehank/platform.js`) với các hàm như `notifyAt(time, text)`, `playBackground(track)`, `pushWidgetData(data)`. Trên web nó rơi về cách làm hiện tại; trong app nó gọi plugin. Nhờ vậy bản web không bị phá và không phải rẽ nhánh khắp nơi.

## 4. Từng tính năng gốc

### 4.1 Tên, icon, màn hình khởi động
- Dùng công cụ tạo tài nguyên của Capacitor từ một file logo vuông (1024×1024) và một ảnh nền splash.
- Tên app, mã gói (`applicationId`, ví dụ `dev.hank62.app`). **Mã gói đặt một lần rồi không đổi**, vì đổi là thành app khác.
- Độ khó: thấp.

### 4.2 Nhắc việc đúng giờ
- Plugin thông báo cục bộ + `AlarmManager.setExactAndAllowWhileIdle`. Chạy cả khi không có mạng, không cần server.
- Android 12+ cần quyền "báo thức & lời nhắc chính xác" (`SCHEDULE_EXACT_ALARM`); Android 13+ cần quyền thông báo. Cần màn hình xin quyền rõ ràng.
- Web phải gửi vào app danh sách việc/lịch sắp tới mỗi khi dữ liệu đổi (đặt lại báo thức), và đặt lại sau khi khởi động lại điện thoại (`BOOT_COMPLETED`).
- Độ khó: trung bình thấp.

### 4.3 Thông báo do server gửi
- Web Push **không chạy trong WebView**. Cần Firebase Cloud Messaging (miễn phí).
- Việc phía bạn: tạo một project Firebase, thêm app Android, lấy `google-services.json` (khoảng 15 phút, trên web).
- Việc phía mã: server (`server/push.mjs`) gửi thêm qua FCM cho thiết bị app, vẫn giữ Web Push cho người dùng trình duyệt; bảng `push_subs` thêm cột loại (`web` / `fcm`). Giữ nguyên nguyên tắc hiện tại: chỉ truy vấn khi có việc sắp đến hạn, không làm Neon/Render thức vô ích.
- Bấm vào thông báo phải mở đúng màn hình trong app.
- Độ khó: trung bình.

### 4.4 Nhạc và podcast chạy nền
- Cần dịch vụ nền loại media (foreground service) kèm thông báo điều khiển (phát/tạm dừng/tua) và hỗ trợ tai nghe, màn hình khoá. Viết bằng Kotlin (dựa trên Media3).
- Hai cách: (a) giữ trình phát trong WebView và chỉ thêm "bảo hộ" để hệ thống không giết nó; (b) chuyển việc phát âm thanh sang trình phát gốc, web chỉ ra lệnh. Cách (b) ổn định hơn nhưng tốn công hơn. Đề xuất thử (a) trước, chỉ làm (b) nếu vẫn bị ngắt.
- Cần làm trước ở web: trình phát podcast và nhạc đang là hai nơi riêng (`podcast/player.js` và trình phát nhạc cũ); nên thống nhất giao diện điều khiển trước khi cắm phần gốc.
- Rủi ro lớn nhất: Xiaomi/Oppo/Samsung tự tắt app nền. Người dùng phải tắt "tối ưu pin" cho app; có thể thêm màn hình hướng dẫn trong app.
- Độ khó: **cao nhất** trong các mục.

### 4.5 Widget màn hình chính
- Viết `AppWidgetProvider` bằng Kotlin. Web đẩy một gói dữ liệu nhỏ (JSON) xuống bộ nhớ của app mỗi khi đổi; widget chỉ đọc và hiển thị, không chạy lại cả app.
- Nội dung đề xuất cho widget đầu tiên: việc hôm nay, việc sắp đến hạn, thói quen hôm nay. Bấm vào mở đúng màn hình.
- Chỉ hiện được dữ liệu đã có sẵn; không tương tác phức tạp.
- Độ khó: trung bình cao (phần khó là thiết kế giao diện widget mà không xem được trên máy thật).

### 4.6 Nhận chia sẻ từ app khác
- PWA hiện có `share_target`; trong APK **không tự có**. Cần khai báo `intent-filter` và chuyển nội dung vào web. Để ở giai đoạn cuối.

## 5. Build, ký và phát hành

- **Build trên GitHub Actions**, không cần cài Android Studio: workflow dựng web → `npx cap sync android` → `./gradlew assembleRelease` → đưa APK lên tab Releases hoặc Artifacts.
- **Khoá ký cố định**: tạo một lần bằng `keytool`, lưu mật khẩu vào GitHub Secrets (`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, …). Mất khoá hoặc đổi khoá thì các bản sau **không cài đè được** lên bản cũ. Phải sao lưu khoá ở nơi an toàn ngoài repo. **Không bao giờ commit keystore.**
- Cài đặt: bật "Cài ứng dụng không rõ nguồn" cho trình duyệt/trình quản lý file dùng để mở APK. Google Play Protect có thể hiện cảnh báo "ứng dụng chưa được quét"; chọn tiếp tục cài.
- **Cập nhật**: phần web cập nhật tự động. Phần vỏ gốc thì không: cần tải APK mới. Kế hoạch: app kiểm tra một file `android-version.json` (hoặc GitHub Releases) và hiện thông báo "Có bản app mới" kèm nút tải. Chỉ cần làm khi vỏ gốc thay đổi.
- Chia sẻ cho bạn bè: gửi link tải APK. Bạn bè vẫn cần mật khẩu của chủ tài khoản mới vào được dữ liệu; hiện tại app là **công cụ cá nhân**, chưa có đăng ký nhiều người dùng.

## 6. Những việc cần làm ở bản web TRƯỚC khi đóng gói

Đây là phần "hoàn thiện web trước" liên quan trực tiếp tới app. Không bắt buộc hết, nhưng càng xong sớm càng đỡ làm lại:

**Nên có (ảnh hưởng thẳng tới app)**
- [ ] Thanh phát podcast toàn cục (mini-bar) và thống nhất điều khiển với trình phát nhạc, vì chạy nền cần một điểm điều khiển duy nhất.
- [ ] Nơi tập trung dữ liệu "việc sắp tới" để vừa dùng cho thông báo server, vừa cho báo thức cục bộ, vừa cho widget (một hàm, ba nơi dùng).
- [ ] Lớp `platform` (mục 3) với bản web làm việc đúng như hiện tại.
- [ ] Kiểm tra thủ công bản web trên điện thoại cho các phần chưa xem được bằng mắt: xem ảnh nhật ký, ghi chú toàn màn hình, nhập tệp vào Second Brain, tab Podcast (phát, tua, thanh trượt), thanh "Có gì mới", AI chạy nền khi đổi tab, nhãn 3D, điều hướng React Router 7.
- [ ] Chạy ổn định: đặt `RAG_TOKEN_SECRET` giống nhau trên cả hai dịch vụ Render.

**Nên có (chất lượng)**
- [ ] Nháp (draft) còn lại sau khi tải lại trang (hiện chỉ giữ trong bộ nhớ).
- [ ] Các hộp thoại tạo thẻ/Deals và DJ chạy nền như các tác vụ AI khác.
- [ ] Podcast nghe offline (tải tập về); hiện chưa có.
- [ ] Bỏ qua các cảnh báo công cụ dev còn lại (vitest/esbuild bản lớn) khi tiện; đóng các PR Dependabot đang lỗi.
- [ ] Chuyển CSP từ Report-Only sang áp dụng thật sau khi xem báo cáo vi phạm.

**Phải kiểm tra sớm vì có thể ảnh hưởng cả web lẫn app**
- Server (Render) và trang (Vercel) là hai miền khác nhau, cookie đăng nhập là `SameSite=None`, tức "cookie bên thứ ba". Trình duyệt đang siết loại cookie này. Nếu đăng nhập bắt đầu hỏng trên một số trình duyệt, cách lâu dài là đưa API về cùng miền với trang (proxy qua Vercel hoặc tên miền riêng). WebView Android cũng cần bật cookie bên thứ ba cho miền API; sẽ thử ngay ở Giai đoạn 1.

## 7. Các giai đoạn khi bắt đầu làm app

Mỗi giai đoạn kết thúc bằng một file APK để bạn cài thử, báo lại rồi mới sang giai đoạn tiếp.

| GĐ | Nội dung | Bạn kiểm tra được gì |
|---|---|---|
| **1. Vỏ cơ bản** | Capacitor + icon/tên/splash + tải trang Vercel + workflow build APK + khoá ký | Cài được; mở vào thẳng SpaceHank; đăng nhập giữ được; đóng mở lại vẫn đăng nhập |
| **2. Nhắc việc đúng giờ** | Thông báo cục bộ + báo thức chính xác + đặt lại sau khởi động | Tạo việc có giờ, khoá máy, đến giờ thì máy báo (kể cả tắt mạng) |
| **3. Nhạc & podcast nền** | Dịch vụ media + điều khiển ở thông báo/màn hình khoá | Phát podcast, tắt màn hình 30 phút, vẫn phát; nút trên khoá màn hình hoạt động |
| **4. Widget** | Widget "Hôm nay" | Thêm widget; sửa việc trong app thì widget đổi theo |
| **5. Thông báo server (FCM)** | Firebase + server gửi FCM | Tắt hẳn app, server gửi thông báo vẫn tới; bấm mở đúng màn hình |
| **6. Hoàn thiện** | Nhận chia sẻ, thông báo "có bản app mới", hướng dẫn tắt tối ưu pin | Chia sẻ ảnh/chữ từ app khác vào được; có thông báo bản mới |

Mỗi tính năng gốc kèm một dòng trong `public/changelog.json`, và test cho phần mã JS (phần Kotlin chỉ thử được trên máy thật).

## 8. Việc bạn cần làm (chỉ phía bạn mới làm được)

1. Cung cấp logo vuông (hoặc đồng ý dùng chữ H hiện tại) và tên app.
2. Chạy một lần lệnh tạo khoá ký, dán vào GitHub Secrets (mình đưa lệnh cụ thể từng bước), và **sao lưu** file khoá.
3. (GĐ 5) Tạo project Firebase và đưa file `google-services.json`.
4. Cài APK thử trên điện thoại thật và báo lại (mình không có máy Android để chạy thử, nên không thể tự xác nhận hiển thị, âm thanh nền hay widget).
5. Tắt tối ưu pin cho app nếu máy là Xiaomi/Oppo/Samsung/Huawei.

## 9. Giới hạn và rủi ro

- **Không tự kiểm chứng được trên máy thật**: GĐ 3 (nền) và GĐ 4 (widget) có thể cần vài vòng sửa theo phản hồi của bạn.
- **Hãng điện thoại tự tắt app nền** không giải quyết được hoàn toàn bằng mã; chỉ giảm được bằng hướng dẫn người dùng.
- **WebView không giống Chrome tuyệt đối**: một số API web (ví dụ ghi âm, chia sẻ, thông báo) cần xin quyền hoặc plugin riêng. Cần thử lại từng tính năng chính sau GĐ 1 (ghi âm memo, chọn ảnh, nhập tệp, phát audio).
- **Duy trì thêm**: có thêm mã Android để bảo trì khi Android/Capacitor lên bản mới.
- **Bảo mật**: APK chia sẻ nên không chứa khoá bí mật nào; mọi khoá vẫn nằm ở server. Không nhúng mật khẩu hay token vào app.
- **Cài đặt không qua cửa hàng** nghĩa là không có tự cập nhật, và Play Protect có thể cảnh báo.
- **iPhone**: không khả thi nếu không có Mac/Xcode; app ký bằng Apple ID miễn phí hết hạn sau 7 ngày. Người dùng iPhone tiếp tục dùng PWA ("Thêm vào Màn hình chính").

## 10. Câu hỏi còn mở (chốt khi bắt đầu GĐ 1)

1. Tên hiển thị và mã gói (mặc định: "Hank62", `dev.hank62.app`)?
2. Logo: dùng chữ H hiện tại hay có logo mới?
3. Có cần chạy offline hoàn toàn (nhét web vào APK) hay tải trang trực tiếp là đủ (đề xuất: tải trực tiếp)?
4. Widget đầu tiên hiện nội dung gì (đề xuất: việc hôm nay + thói quen)?
5. Có định chia sẻ cho bạn bè dùng chung dữ liệu của bạn hay chỉ để xem bản trình diễn? (Quyết định có cần chế độ nhiều người dùng không; hiện chưa có.)
