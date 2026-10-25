# Ma Trận Xử Lý Tình Huống Ngoại Lệ & Quản Trị Rủi Ro Biên Giới (Edge Cases & Exception Handling Matrix)
## Cross-Border Racehorse Transport System — Specification v2.0

> **Mã tài liệu**: `SPEC-EDGE-CASES-RISK-MATRIX`  
> **Áp dụng cho**: Toàn bộ hệ thống kỹ thuật và nghiệp vụ vận hành hiện trường.  
> **Mục tiêu**: Bộ kịch bản ứng phó cho hơn 20 tình huống biên (Edge Cases) thường gặp trong logistics ngựa đua quốc tế, đảm bảo an toàn sinh học và không bị động khi hội đồng phản biện chất vấn.

---

## 📑 Mục Lục Các Nhóm Rủi Ro

1. [Nhóm 1: Rủi Ro Kỹ Thuật & Mất Kết Nối Ngoại Tuyến (Offline & Telemetry Edge Cases)](#nhóm-1-rủi-ro-kỹ-thuật--mất-kết-nối-ngoại-tuyến-offline--telemetry-edge-cases)
2. [Nhóm 2: Rủi Ro Y Tế Sinh Học & Dịch Bệnh Tại Biên Giới (Biosecurity & Veterinary Edge Cases)](#nhóm-2-rủi-ro-y-tế-sinh-học--dịch-bệnh-tại-biên-giới-biosecurity--veterinary-edge-cases)
3. [Nhóm 3: Rủi Ro Hải Quan, Đình Công & Ách Tắc Cửa Khẩu (Customs & Border Blockade Edge Cases)](#nhóm-3-rủi-ro-hải-quan-đình-công--ách-tắc-cửa-khẩu-customs--border-blockade-edge-cases)
4. [Nhóm 4: Rủi Ro Pháp Lý Về Thời Gian Lái Xe Của Tài Xế (Driver Tachograph & Regulation EC 561/2006)](#nhóm-4-rủi-ro-pháp-lý-về-thời-gian-lái-xe-của-tài-xế-driver-tachograph--regulation-ec-5612006)
5. [Nhóm 5: Rủi Ro Bất Khả Kháng: Tử Vong & Nhân Đạo (Equine Casualty & Euthanasia Protocol)](#nhóm-5-rủi-ro-bất-khả-kháng-tử-vong--nhân-đạo-equine-casualty--euthanasia-protocol)

---

## Nhóm 1: Rủi Ro Kỹ Thuật & Mất Kết Nối Ngoại Tuyến (Offline & Telemetry Edge Cases)

### EC-TECH-01: Mất Sóng Di Động / GPS Khi Đi Qua Đường Hầm Eurotunnel Hoặc Đèo Alps
- **Bối cảnh**: Xe đi vào đường ngầm dưới đáy biển Eurotunnel (dài 50 km) hoặc qua các hầm đèo cao ngất (Mont Blanc, Fréjus), thiết bị mất kết nối 4G/5G và tín hiệu định vị GPS hoàn toàn trong 1-2 giờ.
- **Cơ chế xử lý hệ thống (System Offline-First Architecture)**:
  1. Ứng dụng di động của tài xế chuyển sang chế độ **Offline Mode**: Toàn bộ dữ liệu nhập mốc, nhật ký đo thân nhiệt và ảnh chụp được lưu trữ cục bộ vào cơ sở dữ liệu SQLite / IndexedDB trên điện thoại.
  2. Hệ thống hộp đen trên xe tiếp tục ghi nhận dữ liệu nhiệt độ thùng xe và tọa độ quán tính vào bộ nhớ đệm (Flash Memory).
  3. Ngay khi xe ra khỏi cửa hầm và bắt lại sóng mạng, ứng dụng tự động thực hiện **Đồng bộ hàng đợi nền (Background Queue Sync)** đẩy toàn bộ dữ liệu về máy chủ trung tâm kèm con dấu thời gian gốc (Original Timestamp) để tránh bị hệ thống phạt chậm trễ mốc.
  4. Trên giao diện giám sát của Quản lý và Khách hàng, trạng thái hiển thị: *"Đang qua khu vực hạn chế sóng (In-Tunnel / Mountain Pass) — Dự kiến kết nối lại sau 45 phút"*, tránh gây hoang mang cho chủ ngựa.

### EC-TECH-02: Điện Thoại Tài Xế Bị Rơi Vỡ Hoặc Hết Pin Đột Ngột
- **Bối cảnh**: Điện thoại thông minh của tài xế chính bị hỏng nguồn giữa hành trình, không thể mở ứng dụng để quét mã QR biên giới hoặc ký e-POD.
- **Cơ chế xử lý**:
  1. **Đăng nhập thiết bị thứ cấp (Secondary Device Hot-swap)**: Nhân viên đi kèm thứ hai (Escort / Co-driver) mở ứng dụng trên điện thoại dự phòng, đăng nhập tài khoản cá nhân có gắn quyền phụ lái của chuyến xe đó.
  2. Toàn bộ thông tin chuyến đi, mã vạch hải quan và danh sách ngựa được máy chủ đồng bộ tức thì sang thiết bị phụ lái.
  3. Trong trường hợp cả 2 điện thoại đều hỏng, tài xế sử dụng toàn bộ **bản in dự phòng (Physical Paper Dossier)** trong túi chống nước cabin xe đã chuẩn bị từ trước theo bảng kiểm tra.

---

## Nhóm 2: Rủi Ro Y Tế Sinh Học & Dịch Bệnh Tại Biên Giới (Biosecurity & Veterinary Edge Cases)

### EC-VET-01: Một Cá Thể Ngựa Trong Đàn Bị Phát Hiện Dương Tính Dịch Bệnh Tại BCP
- **Bối cảnh**: Xe chở 4 con ngựa. Khi tới BCP Cảng Calais, Bác sĩ Thú y kiểm tra nhanh nghi ngờ 1 con bị bệnh Viêm thiếu máu truyền nhiễm (EIA) hoặc có vết loét nghi Bệnh Dịch hạch (Glanders).
- **Cơ chế phân tách an toàn sinh học (Biosecurity Isolation Protocol)**:
  1. Con ngựa nghi nhiễm bị đưa vào chuồng cách ly áp lực âm riêng biệt của trạm BCP để lấy mẫu xét nghiệm khẳng định (PCR/ELISA).
  2. Ba con ngựa còn lại:
     - Vì đi chung một xe kín (cùng chia sẻ không khí và nguồn nước), theo luật thú y EU (AHL 2016/429), ba con ngựa còn lại được xếp vào diện "Tiếp xúc gần có nguy cơ" (*Contact Animals*).
     - Chúng **không được phép thông quan chạy thẳng vào đất liền**, mà phải lưu trú tại khu cách ly theo dõi của BCP trong tối thiểu 24-48 giờ để chờ kết quả xét nghiệm chính thức của cá thể bị nghi ngờ.
  3. `Transport Specialist` kích hoạt quy trình giải trình dịch tễ, gửi lịch sử xét nghiệm âm tính 90 ngày trước đó của cả 4 con cho Bác sĩ Trưởng trạm BCP để xin giảm thiểu thời gian cách ly.
  4. Nếu kết quả khẳng định cá thể thứ nhất dương tính: Cá thể đó bị buộc quay đầu hoặc tiêu hủy nhân đạo theo luật thú y EU; ba cá thể còn lại phải khử trùng toàn diện và đưa về khu nuôi cách ly chỉ định.

### EC-VET-02: Hộ Chiếu Ngựa Bị Rách, Nhòe Nước Hoặc Mờ Sơ Đồ Xoáy Lông (Silhouette)
- **Bối cảnh**: Hộ chiếu giấy bị nước đổ vào làm mờ hình vẽ nhận dạng vết bớt lông hoặc mất con dấu tiêm phòng.
- **Cơ chế xử lý**:
  1. Tài xế sử dụng máy đọc vi mạch quét mã microchip 15 số của ngựa.
  2. `Transport Specialist` truy cập cơ sở dữ liệu số hóa trực tuyến của Hiệp hội Giống (như Weatherbys ePassport App hoặc France Galop SIRE Extranet), trích xuất bản sao kỹ thuật số có chữ ký điện tử (*Certified Digital Extract*) có hình ảnh sơ đồ lông độ nét cao.
  3. Gửi tệp PDF có mã xác thực trực tiếp qua email chính thức của Trạm trưởng BCP cửa khẩu để chấp thuận đối chiếu tương đương.

---

## Nhóm 3: Rủi Ro Hải Quan, Đình Công & Ách Tắc Cửa Khẩu (Customs & Border Blockade Edge Cases)

### EC-BORDER-01: Hải Quan Pháp Đình Công (Grève) Gây Tắc Nghẽn Cảng Calais
- **Bối cảnh**: Nghiệp đoàn công nhân phà hoặc hải quan Pháp đình công bất ngờ, dòng xe tải bị dồn ứ kéo dài hơn 20 km tại bờ biển Dover, thời gian chờ vượt quá 12-24 giờ.
- **Cơ chế chuyển hướng đa phương thức (Multimodal Rerouting Protocol)**:
  1. `Fleet & Route Coordinator` kích hoạt kế hoạch chuyển hướng BCP khẩn cấp:
     - **Phương án A**: Chuyển hướng xe từ Cảng Dover sang **Cảng Harwich** để đi phà đêm sang **Cảng Hoek van Holland (Hà Lan)**, sau đó chạy đường bộ vòng qua Bỉ vào Pháp.
     - **Phương án B**: Chuyển tuyến sang đường hầm Eurotunnel (nếu phà đình công nhưng đường hầm tàu hỏa vẫn chạy).
  2. `Transport Specialist` thực hiện:
     - Đăng nhập TRACES-NT, sửa đổi trường `Nominated BCP` trên tờ khai CHED-A từ `FRCAL1 (Calais)` sang `NLHVH1 (Hoek van Holland)`.
     - Thông báo trước qua email cho cơ quan kiểm dịch NVWA Hà Lan để được ưu tiên luồng động vật sống khi phà cập bến.
  3. Toàn bộ chi phí phát sinh (vé phà mới, nhiên liệu) được tự động ghi nhận vào Quỹ Dự phòng Khẩn cấp của hợp đồng dịch vụ.

### EC-BORDER-02: Khách Hàng Hủy Chuyến Khi Bác Sĩ Thú Y Đã Xuất Bản Chứng Thư EHC
- **Bối cảnh**: Mọi giấy tờ đã hoàn tất, EHC đã được Bác sĩ Thú y OV ký và gửi TRACES-NT, nhưng 12 tiếng trước khi đi khách hàng báo ngựa bị đau cơ xin hủy chuyến.
- **Cơ chế hủy chứng từ kiểm dịch (Dossier Revocation & Waste Protocol)**:
  1. `Transport Specialist` phải lập tức gửi thông báo hủy chứng thư trên hệ thống TRACES-NT và thông báo cho APHA Carlisle.
  2. Bác sĩ Thú y OV lập biên bản hủy số sê-ri của chứng thư EHC 8438 (để tránh bị lợi dụng xuất khẩu lậu cá thể ngựa khác).
  3. Khách hàng chịu 100% phí dịch vụ thú y đã phát sinh (phí Bác sĩ OV khám lâm sàng, phí cấp EHC và phí Sổ ATA Carnet không hoàn lại).

---

## Nhóm 4: Rủi Ro Pháp Lý Về Thời Gian Lái Xe Của Tài Xế (Driver Tachograph & Regulation EC 561/2006)

### EC-DRIVER-01: Xung Đột Giữa Luật Thời Gian Lái Xe (EC 561/2006) Và Luật Phúc Lợi Động Vật (EC 1/2005)
- **Bối cảnh khó xử nhất trong logistics động vật sống**:
  - Hộp đen kỹ thuật số của tài xế (*Digital Tachograph*) báo tài xế đã lái xe đủ 9 tiếng trong ngày, **bắt buộc phải dừng xe nghỉ ngơi 11 tiếng theo Quy định (EC) 561/2006**.
  - Tuy nhiên, xe đang kẹt giữa đường cao tốc cách trạm nghỉ ngựa 30 phút, nếu dừng xe lại ở lề đường thì ngựa sẽ bị sốc nhiệt trong thùng xe (vi phạm Quy định Phúc lợi Động vật EC 1/2005).
- **Cơ chế pháp lý giải quyết xung đột (Legal Derogation Protocol)**:
  1. **Áp dụng Điều 12 Quy định (EC) 561/2006 (Derogation for Animal Welfare)**: Luật châu Âu cho phép tài xế được quyền lái vượt quá thời gian quy định trong trường hợp khẩn cấp để đảm bảo an toàn cho động vật sống trên xe tới nơi an toàn gần nhất.
  2. Ngay khi tới được trạm dừng nghỉ hoặc bãi đỗ an toàn, tài xế bắt buộc phải:
     - Xuất phiếu in từ đồng hồ Tachograph (Tachograph Printout).
     - Tự tay viết bằng bút mực vào mặt sau phiếu in: *"Áp dụng Điều 12 EC 561/2006 — Lái xe thêm 35 phút để đưa động vật họ ngựa đến trạm kiểm soát phúc lợi tránh sốc nhiệt"*.
     - Đính kèm bản sao Journey Log có chữ ký xác nhận của trạm dừng nghỉ.
  3. Bằng chứng này giúp tài xế được miễn trừ phạt tiền 100% khi Cảnh sát Giao thông đường bộ (Gendarmerie Pháp hoặc BAG Đức) thanh tra hộp đen.

---

## Nhóm 5: Rủi Ro Bất Khả Kháng: Tử Vong & Nhân Đạo (Equine Casualty & Euthanasia Protocol)

### EC-CASUALTY-01: Ngựa Bị Gãy Xương Nghiêm Trọng Do Tai Nạn Hoặc Đau Ruột Cấp Tính Không Thể Phục Hồi
- **Bối cảnh**: Xe gặp va chạm giao thông hoặc ngựa bị xoắn ruột hoại tử giữa đường, Bác sĩ Thú y lưu động kết luận ngựa đau đớn cùng cực và không thể cứu chữa, bắt buộc phải trợ tử nhân đạo (*Emergency Euthanasia*).
- **Quy trình bắt buộc chuẩn mực quốc tế (FEI & Insurance Protocol)**:
  1. **Nguyên tắc "Hai Chữ Ký Thú Y" (Two-Vet Principle)**:
     - Trừ trường hợp ngựa hấp hối cận kề cái chết, việc quyết định trợ tử cá thể ngựa đua trị giá hàng triệu USD bắt buộc phải có sự đồng thuận của **2 Bác sĩ Thú y độc lập** (hoặc Bác sĩ Thú y hiện trường cùng sự xác nhận qua video call của Bác sĩ Thú y riêng của chủ ngựa).
  2. **Ghi nhận Bằng chứng Phục vụ Bảo hiểm**:
     - Chụp ảnh toàn thân, chụp rõ vết thương, chụp số microchip trên máy quét cạnh đầu ngựa.
     - Lập Biên bản Trợ tử Khẩn cấp (*Emergency Euthanasia Certificate*) ghi rõ lý do nhân đạo để tránh chịu tội ngược đãi động vật theo Bộ luật Hình sự châu Âu.
  3. **Xử lý Xác động vật theo Quy định Thú y (Carcass Disposal per EU Reg 1069/2009)**:
     - Tuyệt đối không được phép tự ý chôn cất dọc đường hoặc mang xác qua biên giới.
     - Liên hệ dịch vụ thu gom thi thể động vật được cấp phép của địa phương (*Equine Cremation / Knacker Service*) có chứng nhận kiểm dịch để xử lý hỏa táng.
  4. Thông báo khẩn cấp cho Quản lý Logistics và Hãng bảo hiểm trong vòng tối đa **2 giờ** kể từ thời điểm xảy ra sự cố.
