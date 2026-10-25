# Báo Cáo Chuyên Sâu: Đặc Tả Danh Mục Hồ Sơ, Giấy Tờ Thông Quan & Vận Chuyển Ngựa Đua (Vương Quốc Anh & Toàn Bộ Khối Liên Minh Châu Âu)
## Comprehensive Technical Report — Specification & Legal Framework v2.0 (Master Reference)

> **Dự án**: Hệ thống Quản lý Vận chuyển Ngựa đua Xuyên Biên giới (`swp391-cross-border-racehorse-transport-system`)  
> **Môn học / Mã đề tài**: SWP391 — Đề tài 2 (HoangNT20)  
> **Phạm vi phân tích**: Vương quốc Anh (UK - trụ sở giả định), Cộng hòa Ireland (IE), Pháp (FR), Đức (DE), Ý (IT), Hà Lan (NL), Bỉ (BE), Tây Ban Nha (ES), Thụy Điển & Đan Mạch (Khu vực Bắc Âu), Áo & Ba Lan (Khu vực Trung Âu) và toàn thể Khối Liên minh Châu Âu (EU).  
> **Ngày hoàn thiện**: 2026-09-13  
> **Trạng thái tài liệu**: Báo cáo nghiên cứu & Hồ sơ quy chuẩn chính thức (Official Confirmed Specification).

---

## 📑 Mục Lục Báo Cáo (Table of Contents)

1. [Phần 1: Bảng Tra Cứu Thuật Ngữ Kỹ Thuật & Từ Viết Tắt (Glossary & Abbreviations)](#phần-1-bảng-tra-cứu-thuật-ngữ-kỹ-thuật--từ-viết-tắt-glossary--abbreviations)
2. [Phần 2: Bối Cảnh Pháp Lý Hậu Brexit & Sự Phân Tách Biên Giới UK - EU](#phần-2-bối-cảnh-pháp-lý-hậu-brexit--sự-phân-tách-biên-giới-uk---eu)
3. [Phần 3: Ma Trận So Sánh Các Tuyến Vận Chuyển Đặc Thù](#phần-3-ma-trận-so-sánh-các-tuyến-vận-chuyển-đặc-thù)
4. [Phần 4: Quy Định Giấy Tờ & Kiểm Dịch Chi Tiết Theo Từng Quốc Gia](#phần-4-quy-định-giấy-tờ--kiểm-dịch-chi-tiết-theo-từng-quốc-gia)
   - 4.1. [Vương Quốc Anh (United Kingdom - GB) — Quốc Gia Đặt Trụ Sở Giả Định](#41-vương-quốc-anh-united-kingdom---gb--quốc-gia-đặt-trụ-sở-giả-định)
   - 4.2. [Cộng Hòa Ireland (Republic of Ireland - IE) & Bắc Ireland (NI)](#42-cộng-hòa-ireland-republic-of-ireland---ie--bắc-ireland-ni)
   - 4.3. [Cộng Hòa Pháp (France - FR) — Cửa Ngõ Eo Biển Manche](#43-cộng-hòa-pháp-france---fr--cửa-ngõ-eo-biển-manche)
   - 4.4. [Cộng Hòa Liên Bang Đức (Germany - DE) — Trung Tâm Đua Ngựa & Thể Thao Trung Âu](#44-cộng-hòa-liên-bang-đức-germany---de--trung-tâm-đua-ngựa--thể-thao-trung-âu)
   - 4.5. [Cộng Hòa Ý (Italy - IT) — Hệ Thống Giám Sát Điện Tử Modello 4](#45-cộng-hòa-ý-italy---it--hệ-thống-giám-sát-điện-tử-modello-4)
   - 4.6. [Vương Quốc Hà Lan (The Netherlands - NL) — Cửa Ngõ Cảng Biển & Sân Bay Huyết Mạch](#46-vương-quốc-hà-lan-the-netherlands---nl--cửa-ngõ-cảng-biển--sân-bay-huyết-mạch)
   - 4.7. [Vương Quốc Bỉ (Belgium - BE) — Trung Tâm Vận Tải Hàng Không Ngựa Số 1 Châu Âu](#47-vương-quốc-bỉ-belgium---be--trung-tâm-vận-tải-hàng-không-ngựa-số-1-châu-âu)
   - 4.8. [Vương Quốc Tây Ban Nha (Spain - ES) — Cửa Ngõ Mùa Đông & Tour Thi Đấu Quốc Tế](#48-vương-quốc-tây-ban-nha-spain---es--cửa-ngõ-mùa-đông--tour-thi-đấu-quốc-tế)
   - 4.9. [Khu Vực Bắc Âu (Thụy Điển & Đan Mạch) — Vận Tải Ngựa Đua Xe Kéo (Trotting)](#49-khu-vực-bắc-âu-thụy-điển--đan-mạch--vận-tải-ngựa-đua-xe-kéo-trotting)
   - 4.10. [Khu Vực Trung & Đông Âu (Áo, Ba Lan, Séc) — Tuyến Quá Cảnh Đường Bộ](#410-khu-vực-trung--đông-âu-áo-ba-lan-séc--tuyến-quá-cảnh-đường-bộ)
5. [Phần 5: Đặc Tả Kỹ Thuật 11 Loại Giấy Tờ & Cấu Trúc Dữ Liệu Số Hóa (Template Schemas)](#phần-5-đặc-tả-kỹ-thuật-11-loại-giấy-tờ--cấu-trúc-dữ-liệu-số-hóa-template-schemas)
6. [Phần 6: Kho Nguồn Tra Cứu, Cổng Dịch Vụ Công Trực Tuyến & Văn Bản Luật Cốt Lõi](#phần-6-kho-nguồn-tra-cứu-cổng-dịch-vụ-công-trực-tuyến--văn-bản-luật-cốt-lõi)
7. [Phần 7: Ánh Xạ Vào Kiến Trúc Cơ Sở Dữ Liệu & Quy Tắc Nghiệp Vụ (Flow 2)](#phần-7-ánh-xạ-vào-kiến-trúc-cơ-sở-dữ-liệu--quy-tắc-nghiệp-vụ-flow-2)

---

## Phần 1: Bảng Tra Cứu Thuật Ngữ Kỹ Thuật & Từ Viết Tắt (Glossary & Abbreviations)

Bảng dưới đây chuẩn hóa toàn bộ các thuật ngữ chuyên ngành logistics, thú y và hải quan xuất hiện trong báo cáo và hệ thống:

| Thuật ngữ / Từ viết tắt | Tên tiếng Anh đầy đủ | Giải thích ngữ nghĩa tiếng Việt | Cơ quan / Hệ thống liên quan |
|---|---|---|---|
| **AHL** | Animal Health Law | **Luật Thú y Châu Âu** — Khung pháp lý tối cao của EU về phòng chống dịch bệnh và kiểm soát vận chuyển động vật sống (Quy định 2016/429). | Liên minh Châu Âu (European Union - EU) |
| **AIS** | Automated Import System | **Hệ thống Khai báo Nhập khẩu Tự động** — Phần mềm thông quan điện tử của Hải quan Ireland dành cho hàng hóa và động vật nhập khẩu. | Cơ quan Thuế & Hải quan Ireland (Revenue Commissioners) |
| **APHA** | Animal and Plant Health Agency | **Cơ quan Y tế Động Thực vật Anh** — Cơ quan trực thuộc chính phủ Anh chịu trách nhiệm kiểm dịch, phúc lợi động vật và cấp phép vận tải. | Bộ Môi trường, Thực phẩm & Nông thôn Anh (Defra) |
| **ATA Carnet** | Admission Temporaire / Temporary Admission | **Sổ Tạm nhập Tái xuất Miễn thuế Quốc tế** — Chứng từ hải quan quốc tế đóng vai trò như hộ chiếu tài sản, cho phép tạm nhập ngựa đua đi thi đấu miễn thuế và tiền đặt cọc bảo lãnh. | Phòng Thương mại Quốc tế (ICC) & Phòng Thương mại các nước |
| **ATC** | Animal Transport Certificate | **Giấy chứng nhận Vận chuyển Động vật** — Giấy tờ nội địa bắt buộc tại Anh ghi lại nguồn gốc, quyền sở hữu, ngày giờ khởi hành và điểm đến của động vật. | APHA (Vương quốc Anh) |
| **BCP** | Border Control Post | **Trạm Kiểm soát Biên giới** — Cửa khẩu được EU phê duyệt có đủ trang thiết bị và bác sĩ thú y chính thức để kiểm tra sức khỏe động vật sống trước khi cho phép nhập cảnh. | Ủy ban Châu Âu (DG SANTE) & Thú y nước sở tại |
| **BHA** | British Horseracing Authority | **Cơ quan Quản lý Đua ngựa Anh** — Tổ chức quản lý luật đua, cấp phép trường đua, chứng chỉ huấn luyện viên và quy định vaccine ngựa tại Anh. | Ngành đua ngựa Vương quốc Anh |
| **BMEL** | Bundesministerium für Ernährung und Landwirtschaft | **Bộ Lương thực và Nông nghiệp Liên bang Đức** — Cơ quan quản lý kiểm dịch thú y, dịch tễ và luật bảo vệ động vật tại Đức. | Chính phủ CHLB Đức |
| **BTOM** | Border Target Operating Model | **Mô hình Vận hành Mục tiêu Biên giới** — Cơ chế kiểm soát biên giới mới của chính phủ Anh hậu Brexit nhằm phân loại rủi ro kiểm dịch động thực vật nhập khẩu. | Chính phủ Vương quốc Anh |
| **CDS** | Customs Declaration Service | **Hệ thống Dịch vụ Khai báo Hải quan Anh** — Nền tảng điện tử của Hải quan Anh (HMRC) thay thế hệ thống CHIEF cũ để xử lý tờ khai xuất nhập khẩu. | Cơ quan Thuế & Hải quan Hoàng gia Anh (HMRC) |
| **CEXGAN** | Comercio Exterior Ganadero | **Cổng Kiểm dịch Xuất Nhập khẩu Thú y Tây Ban Nha** — Hệ thống trực tuyến xử lý chứng nhận kiểm dịch cho động vật xuất nhập khẩu tại Tây Ban Nha. | Bộ Nông nghiệp Tây Ban Nha (MAPA) |
| **CHED-A** | Common Health Entry Document for Animals | **Chứng từ Y tế Nhập cảnh Chung cho Động vật** — Tờ khai điện tử bắt buộc trên hệ thống TRACES-NT mà người vận chuyển phải nộp trước 24h khi đưa ngựa vào cửa khẩu EU. | Ủy ban Châu Âu (Hệ thống TRACES-NT) |
| **Coggins Test** | Coggins Test (AGID Test) | **Xét nghiệm Huyết thanh Coggins** — Xét nghiệm miễn dịch khuếch tán thạch (AGID) bắt buộc dùng để phát hiện bệnh Viêm thiếu máu truyền nhiễm ngựa (EIA). | Các phòng xét nghiệm tham chiếu quốc gia |
| **DAFM** | Department of Agriculture, Food and the Marine | **Bộ Nông nghiệp, Thực phẩm và Hàng hải Ireland** — Cơ quan kiểm soát thú y, cấp phép nhập khẩu ngựa và quản trị BCP Cảng Dublin. | Chính phủ Cộng hòa Ireland |
| **DGAL** | Direction Générale de l'Alimentation | **Tổng cục Lương thực & Thú y Pháp** — Cơ quan thuộc Bộ Nông nghiệp Pháp ban hành các quy định kiểm dịch và quản lý trạm kiểm soát SIVEP. | Bộ Nông nghiệp Pháp (Ministère de l'Agriculture) |
| **EHC** | Export Health Certificate | **Chứng thư Kiểm dịch Thú y Xuất khẩu** — Văn bản pháp lý do Bác sĩ thú y chính thức (OV) ký xác nhận cá thể ngựa đạt tiêu chuẩn sức khỏe để xuất khẩu sang quốc gia khác. | Cơ quan thú y nước xuất khẩu (như APHA tại Anh) |
| **EIA** | Equine Infectious Anaemia | **Bệnh Viêm thiếu máu truyền nhiễm ở ngựa (Bệnh sốt đầm lầy - Swamp Fever)** — Căn bệnh do Retrovirus gây ra ở ngựa, bắt buộc xét nghiệm âm tính trước mọi chuyến xuất nhập cảnh. | Bệnh dịch thuộc diện kiểm soát nghiêm ngặt của WOAH |
| **Equidae / Equines** | Equidae | **Động vật họ Ngựa** — Thuật ngữ sinh học bao gồm ngựa nhà, ngựa vằn, lừa và các loài lai. Trong đua ngựa áp dụng cho *Equus caballus*. | Phân loại pháp lý quốc tế |
| **EVA** | Equine Viral Arteritis | **Bệnh Viêm động mạch do virus ở ngựa** — Bệnh truyền nhiễm lây qua đường hô hấp và sinh dục, đặc biệt quan trọng với ngựa đực thuần chủng giống. | Kiểm soát thú y giống đua quốc tế |
| **FAVV / AFSCA** | Federaal Agentschap voor de Veiligheid van de Voedselketen | **Cơ quan An toàn Chuỗi Thực phẩm & Thú y Bỉ** — Cơ quan kiểm soát thú y cửa khẩu Bỉ, trực tiếp kiểm dịch tại Sân bay Liège. | Chính phủ Vương quốc Bỉ |
| **FEI** | Fédération Equestre Internationale | **Liên đoàn Thể thao Cưỡi ngựa Quốc tế** — Tổ chức quản lý các môn thể thao cưỡi ngựa toàn cầu, cơ quan cấp thẻ Hộ chiếu Thể thao (FEI Recognition Card). | Thể thao quốc tế (Trụ sở tại Lausanne, Thụy Sĩ) |
| **FLI** | Friedrich-Loeffler-Institut | **Viện Nghiên cứu Thú y Liên bang Đức** — Trung tâm nghiên cứu dịch tễ và phòng xét nghiệm tham chiếu quốc gia của Đức. | CHLB Đức |
| **FN** | Deutsche Reiterliche Vereinigung | **Liên đoàn Cưỡi ngựa Đức** — Cơ quan quản lý thể thao cưỡi ngựa, cấp hộ chiếu thi đấu và sổ ngựa thể thao tại Đức. | Thể thao CHLB Đức |
| **IFCE** | Institut Français du Cheval et de l'Équitation | **Viện Ngựa và Cưỡi ngựa Quốc gia Pháp** — Cơ quan nhà nước quản lý cơ sở dữ liệu định danh SIRE và các chính sách phát triển ngành ngựa Pháp. | Bộ Nông nghiệp & Bộ Thể thao Pháp |
| **IFHA** | International Federation of Horseracing Authorities | **Hiệp hội Quốc tế các Cơ quan Quản lý Đua ngựa** — Tổ chức điều phối các giải đua ngựa thuần chủng và quy tắc phòng chống doping quốc tế. | Đua ngựa quốc tế (Trụ sở tại Paris, Pháp) |
| **IMHC** | International Movement of Horses Committee | **Ủy ban Vận chuyển Ngựa Quốc tế** — Ban chuyên môn thuộc IFHA chuyên giải quyết các rào cản kiểm dịch và quy trình vận tải ngựa xuyên biên giới. | IFHA / FEI |
| **IMSOC** | Information Management System for Official Controls | **Hệ thống Quản lý Thông tin Kiểm soát Chính thức** — Hệ thống công nghệ tích hợp của EU nhằm trao đổi dữ liệu kiểm dịch giữa các nước thành viên (gồm TRACES-NT). | Ủy ban Châu Âu |
| **IPAFFS** | Import of Products, Animals, Food and Feed System | **Hệ thống Nhập khẩu Động vật và Thực phẩm của Anh** — Cổng dịch vụ công trực tuyến của Anh để người nhập khẩu khai báo trước chuyến hàng động vật từ EU. | Chính phủ Vương quốc Anh |
| **LCCI** | London Chamber of Commerce and Industry | **Phòng Thương mại và Công nghiệp Luân Đôn** — Đơn vị được ủy quyền lớn nhất tại Anh chuyên phát hành sổ ATA Carnet cho hàng hóa và ngựa xuất cảnh. | Vương quốc Anh |
| **MAPA** | Ministerio de Agricultura, Pesca y Alimentación | **Bộ Nông nghiệp, Thủy sản và Thực phẩm Tây Ban Nha** — Cơ quan cấp phép thú y và quản lý hệ thống kiểm dịch CEXGAN tại Tây Ban Nha. | Chính phủ Tây Ban Nha |
| **MASAF** | Ministero dell'Agricoltura, della Sovranità Alimentare e delle Foreste | **Bộ Nông nghiệp, Chủ quyền Lương thực và Rừng Ý** — Cơ quan quản lý nhà nước về lĩnh vực đua ngựa (*Settore Ippica*) tại Ý. | Chính phủ Ý |
| **Modello 4** | Modello 4 Informatizzato | **Tờ khai Di chuyển Động vật Điện tử Ý** — Chứng từ điện tử bắt buộc phải lập trên hệ thống Vetinfo trước khi di chuyển bất kỳ con ngựa nào trong lãnh thổ Ý. | Bộ Y tế Ý (Ministero della Salute) |
| **MRN** | Movement Reference Number | **Mã số Tham chiếu Luân chuyển Hải quan** — Mã số định danh duy nhất cấp cho mỗi tờ khai hải quan điện tử để theo dõi lô hàng xuyên biên giới. | Hệ thống hải quan quốc tế (WCO / EU) |
| **NVWA** | Nederlandse Voedsel- en Warenautoriteit | **Cơ quan An toàn Thực phẩm & Kiểm dịch Thú y Hà Lan** — Cơ quan giám sát trạm kiểm soát BCP Cảng Rotterdam và Sân bay Amsterdam Schiphol. | Chính phủ Hà Lan |
| **OV** | Official Veterinarian | **Bác sĩ Thú y Chính thức** — Bác sĩ thú y tư nhân hoặc nhà nước được cơ quan có thẩm quyền chỉ định và ủy quyền cấp chứng thư kiểm dịch xuất khẩu. | Cơ quan thú y quốc gia (như APHA, DGAL) |
| **PIO** | Passport Issuing Organisation | **Tổ chức Cấp Hộ chiếu Ngựa** — Hiệp hội giống hoặc cơ quan thể thao được nhà nước phê duyệt quyền cấp hộ chiếu định danh cho ngựa (như Weatherbys). | Cơ quan quản lý chăn nuôi các nước |
| **Registered Equidae** | Registered Equidae | **Động vật họ Ngựa đã Đăng ký** — Ngựa đua hoặc ngựa thi đấu thể thao được đăng ký trong sổ phả hệ giống (Studbook) hoặc tổ chức thể thao quốc tế (FEI). | Thuật ngữ pháp lý EU (Hưởng ưu đãi thủ tục) |
| **SAD** | Single Administrative Document | **Tờ khai Hải quan Đơn lẻ** — Biểu mẫu hải quan tiêu chuẩn sử dụng trong thương mại quốc tế và các nước ngoài khối EU (gọi là DAU tại Pháp). | Liên minh Châu Âu & Hải quan quốc tế |
| **SIRE** | Système d'Information Relatif aux Équidés | **Hệ thống Thông tin Định danh Ngựa Quốc gia Pháp** — Cơ sở dữ liệu quốc gia trung tâm lưu trữ toàn bộ dữ liệu microchip, phả hệ và chủ sở hữu ngựa tại Pháp. | IFCE (Pháp) |
| **SIVEP** | Service d'Inspection Vétérinaire et Phytosanitaire aux Frontières | **Trạm Kiểm tra Thú y và Kiểm dịch Thực vật Biên giới** — Đơn vị kiểm soát chuyên ngành của Pháp đặt tại các cửa khẩu BCP cảng biển và đường hầm. | DGAL & Hải quan Pháp |
| **TPA** | Tripartite Agreement | **Thỏa thuận Di chuyển Tự do Ba bên** — Hiệp định lịch sử giữa Anh, Pháp và Ireland cho phép ngựa đua di chuyển qua lại không cần giấy chứng nhận kiểm dịch (Đã hết hiệu lực với Anh sau Brexit). | Anh, Pháp, Ireland |
| **TRACES-NT** | Trade Control and Expert System New Technology | **Hệ thống Kiểm soát Thương mại và Chuyên gia Công nghệ Mới** — Cổng mạng trực tuyến của Ủy ban Châu Âu để theo dõi, chứng nhận và kiểm soát việc nhập khẩu và di chuyển động vật trong EU. | Ủy ban Châu Âu (DG SANTE) |
| **UELN** | Universal Equine Life Number | **Mã số Định danh Cá thể Ngựa Trọn đời Toàn cầu** — Chuỗi mã số định danh duy nhất gồm 15 ký tự gắn liền với mỗi con ngựa trên toàn cầu kể từ khi sinh ra. | Tổ chức UELN quốc tế & WBFSH |
| **Windsor Framework** | The Windsor Framework | **Khuôn khổ Windsor** — Thỏa thuận pháp lý giữa Anh và EU nhằm điều chỉnh Nghị định thư Bắc Ireland, thiết lập luồng xanh/luồng đỏ cho hàng hóa và động vật di chuyển từ Anh sang Bắc Ireland. | Chính phủ Anh & Ủy ban Châu Âu |
| **WOAH** | World Organisation for Animal Health | **Tổ chức Thú y Thế giới** (Tên cũ: OIE) — Cơ quan thiết lập các tiêu chuẩn y tế quốc tế về buôn bán và vận chuyển động vật. | Liên Hợp Quốc / Toàn cầu (Trụ sở tại Paris) |

---

## Phần 2: Bối Cảnh Pháp Lý Hậu Brexit & Sự Phân Tách Biên Giới UK - EU

### 2.1. Sự Thay Đổi Bản Chất Pháp Lý Hậu Brexit
Trước ngày 01/01/2021, Vương quốc Anh (United Kingdom - UK) nằm trọn vẹn trong Thị trường Chung Châu Âu (Single Market) và Liên minh Thuế quan (Customs Union). Ngành vận tải ngựa đua giữa Anh, Ireland và Pháp khi đó được điều chỉnh bởi **Thỏa thuận Ba bên (Tripartite Agreement - TPA)**:
- Ngựa đua thuần chủng Thoroughbred mang hộ chiếu của các tổ chức giống được công nhận (như Weatherbys tại Anh/Ireland, France Galop tại Pháp) được phép di chuyển tự do qua lại biên giới mà **không cần Bác sĩ Thú y kiểm tra tại trạm biên giới, không cần Chứng thư Kiểm dịch Thú y (Export Health Certificate - EHC), và không chịu bất kỳ thủ tục thuế quan hải quan nào**.

Từ ngày 01/01/2021, sau khi Brexit hoàn tất theo [Hiệp định Thương mại và Hợp tác EU-UK (EU-UK TCA)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:22021A0430(01)):
1. **UK trở thành Nước thứ ba (Third Country)**: EU xếp vùng Great Britain (GB - gồm đảo Anh, xứ Wales và Scotland) vào "Danh sách A - Nước thứ ba được phê duyệt" theo [Quy định Thực thi (EU) 2021/404](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0404).
2. **Chấm dứt TPA đối với Anh**: Thỏa thuận tự do di chuyển ba bên chấm dứt hiệu lực với Anh. Mọi chuyến vận chuyển ngựa từ Anh sang EU (và ngược lại) chính thức trở thành **Giao dịch Xuất nhập khẩu Quốc tế Ngoài Khối (Extra-EU Trade)**.
3. **Bắt buộc đi qua Trạm Kiểm soát Biên giới (Border Control Post - BCP)**: Xe tải chở ngựa không thể chạy thẳng qua biên giới mà bắt buộc phải dừng tại các trạm BCP được phê duyệt (như Cảng Calais, Đường hầm Eurotunnel Coquelles tại Pháp, Cảng Dublin tại Ireland) để cơ quan kiểm dịch kiểm tra thực tế (Physical inspection), kiểm tra hồ sơ (Documentary check) và quét mã microchip định danh (Identity check).
4. **Hàng rào kép về giấy phép vận chuyển (Dual Authorisation)**: Sau Brexit, giấy phép vận tải và chứng chỉ tài xế do Anh cấp không còn giá trị trong EU và ngược lại. Đơn vị logistics phải sở hữu **cả Giấy phép Vận tải Động vật của Anh (UK Transporter Authorisation) LẪN Giấy phép của EU (EU Transporter Authorisation Type 2)**.

### 2.2. Khuôn Khổ Pháp Lý Thú Y Cốt Lõi Của Liên Minh Châu Âu (EU Animal Health Law)
Toàn bộ hoạt động vận chuyển ngựa trong khối EU hiện nay chịu sự chi phối của bộ luật thống nhất:
- **Luật Thú y Châu Âu — [Regulation (EU) 2016/429 (Animal Health Law - AHL)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0429)**: Khung pháp lý nền tảng quy định về phòng chống, kiểm soát và xóa bỏ các dịch bệnh động vật có thể lây lan qua biên giới.
- **Quy định Bổ sung — [Commission Delegated Regulation (EU) 2020/688](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0688)**: Quy định chi tiết điều kiện kiểm dịch động vật trên cạn di chuyển giữa các quốc gia thành viên EU (Điều 21, 22, 23 dành riêng cho động vật họ ngựa - Equidae).
- **Quy định Bổ sung — [Commission Delegated Regulation (EU) 2020/692](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0692)**: Thiết lập các điều kiện ngặt nghèo về kiểm dịch và kiểm tra sức khỏe khi nhập cảnh động vật họ ngựa từ nước thứ ba vào EU.
- **Quy định Mẫu Biểu Mẫu — [Commission Implementing Regulation (EU) 2021/403](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0403)**: Ban hành các mẫu chứng thư kiểm dịch thú y chuẩn (Model Animal Health Certificates) trên hệ thống TRACES-NT.
- **Quy định Phúc lợi Động vật khi Vận chuyển — [Council Regulation (EC) No 1/2005](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32005R0001)**: Quy chuẩn bắt buộc về mật độ chuồng, thời gian di chuyển tối đa, điểm dừng nghỉ 24h và mẫu Nhật ký Hành trình (Journey Log).

---

## Phần 3: Ma Trận So Sánh Các Tuyến Vận Chuyển Đặc Thù

Để phục vụ bài toán thiết kế nghiệp vụ của hệ thống (Flow 1 & Flow 2), bảng dưới đây so sánh sự khác nhau rõ rệt giữa vận chuyển nội địa, nội khối EU và các tuyến từ Anh sang EU:

| Tiêu chí So sánh | Tuyến 1: Nội địa UK (GB to GB) | Tuyến 2: Nội khối EU (Pháp to Đức / Pháp to Ý) | Tuyến 3: Tuyến A sang B (UK to Pháp - Phà/Hầm Calais) | Tuyến 4: Tuyến A sang C (UK to Ireland - Phà Dublin) | Tuyến 5: Tuyến UK sang Bắc Ireland (GB to NI) |
|---|---|---|---|---|---|
| **Bản chất nghiệp vụ** | Vận chuyển Nội địa (Domestic) | Lưu thông Tự do Nội khối (Intra-EU Movement) | Xuất khẩu Nước thứ ba vào EU (Extra-EU Import) | Nhập khẩu vào Quốc gia Thành viên EU (Extra-EU Import) | Di chuyển Nội bộ Vương quốc Anh (Windsor Framework) |
| **Cửa khẩu kiểm soát** | Không kiểm soát biên giới | Không biên giới (Khu vực Schengen) | Bắt buộc qua Trạm BCP (Calais Port hoặc Coquelles Eurotunnel) | Bắt buộc qua Trạm BCP Cảng biển (Dublin Port BCP) | Phân luồng Xanh (Green Lane) hoặc Đỏ (Red Lane) tại cảng Belfast/Larne |
| **Hồ sơ định danh cá thể** | Hộ chiếu UK (Weatherbys / PIO công nhận) | Hộ chiếu EU / Thẻ FEI (Registered Equidae) | Hộ chiếu Đã đăng ký + Thẻ FEI Recognition Card | Hộ chiếu Đã đăng ký (Weatherbys Stud Book) | Hộ chiếu UK hợp lệ |
| **Chứng thư kiểm dịch** | Không yêu cầu giấy kiểm dịch thú y | Chứng thư Nội khối TRACES-NT (`EQUI-INTRA`) | Chứng thư Xuất khẩu EHC Mẫu 8438 của Defra/APHA | Chứng thư Xuất khẩu EHC Mẫu 8438 của Defra/APHA | Bản Khai báo Vận chuyển Ngựa (Horse Declaration) |
| **Khai báo kiểm dịch trước** | Không áp dụng | Khai báo trước trên TRACES-NT (24h) | Bắt buộc nộp CHED-A trên TRACES-NT (tối thiểu 24h) | Bắt buộc nộp CHED-A trên TRACES-NT + Khai báo DAFM | Khai báo qua Cổng NIRMS (Northern Ireland Retail Movement) |
| **Xét nghiệm máu bắt buộc** | Không | Không bắt buộc (trừ khi có ổ dịch địa phương) | Xét nghiệm Coggins Test (EIA) âm tính <= 90 ngày | Xét nghiệm Coggins Test (EIA) âm tính <= 90 ngày | Không yêu cầu nếu ngựa chỉ lưu trú tạm thời tại NI |
| **Thủ tục Thuế quan Hải quan** | Không có thủ tục hải quan | Miễn thuế quan & VAT hoàn toàn (Liên minh Thuế quan EU) | Bắt buộc: Sổ ATA Carnet (tạm nhập) hoặc Tờ khai SAD/CDS | Bắt buộc: Sổ ATA Carnet hoặc Tờ khai AIS của Ireland | Khai báo hàng hóa nội bộ (Không chịu thuế EU nếu ở lại NI) |
| **Hệ thống Phần mềm Quốc gia** | Quản lý nội bộ Anh | TRACES-NT (Châu Âu) | UK CDS + EU TRACES-NT + Hải quan Pháp (SI Brexit) | UK CDS + EU TRACES-NT + Hải quan Ireland (AIS) | UK TRD (Trade Remainder Database) |
| **Giấy phép Doanh nghiệp Vận tải** | UK Transporter Authorisation | EU Transporter Authorisation Type 2 | Cần cả 2 giấy phép: UK VÀ EU Type 2 | Cần cả 2 giấy phép: UK VÀ EU Type 2 | Giấy phép Vận tải do Anh cấp (UK Transporter Auth) |
| **Nhật ký Hành trình (Logistics)** | ATC / UK Journey Log (nếu >8h) | EU Journey Log (Phụ lục II Quy định EC 1/2005) | EU Journey Log (Do Thú y BCP Calais phê duyệt) | EU Journey Log (Do Thú y BCP Cảng Dublin phê duyệt) | UK Journey Log (Phê duyệt bởi APHA) |

---

## Phần 4: Quy Định Giấy Tờ & Kiểm Dịch Chi Tiết Theo Từng Quốc Gia

### 4.1. Vương Quốc Anh (United Kingdom - GB) — Quốc Gia Đặt Trụ Sở Giả Định
- **Cơ quan quản lý Thú y & Phúc lợi**: [Cơ quan Y tế Động Thực vật Anh (APHA)](https://www.gov.uk/government/organisations/animal-and-plant-health-agency) thuộc [Bộ Môi trường, Thực phẩm & Nông thôn Anh (Defra)](https://www.gov.uk/government/organisations/department-for-environment-food-rural-affairs).
- **Cơ quan Hải quan**: [Cơ quan Thuế & Hải quan Hoàng gia Anh (HMRC)](https://www.gov.uk/government/organisations/hm-revenue-customs).
- **Hệ thống CNTT chuyên trách**:
  - `IPAFFS (Import of Products, Animals, Food and Feed System)`: Khai báo trước khi nhập khẩu ngựa từ EU vào Anh.
  - `EHC Online (Export Health Certificate Online)`: Đăng ký cấp chứng thư kiểm dịch xuất khẩu sang EU.
  - `CDS (Customs Declaration Service)`: Nộp tờ khai hải quan xuất khẩu/nhập khẩu.
- **Danh mục giấy tờ cần thiết**:
  1. *Khi vận chuyển nội địa (GB to GB)*: Hộ chiếu ngựa (Equine Passport do Weatherbys cấp), Giấy chứng nhận Vận chuyển Động vật (Animal Transport Certificate - ATC) nếu đi trên 8 tiếng, Giấy kiểm định xe chở ngựa của APHA, Bằng năng lực tài xế (Certificate of Competence).
  2. *Khi xuất khẩu từ UK sang EU*: Hộ chiếu ngựa thể thao đã đăng ký (Registered Equine Passport), Chứng thư Kiểm dịch Thú y [EHC Form 8438](https://www.gov.uk/find-an-export-health-certificate/export-equidae-to-the-european-union-8438) do Bác sĩ Thú y Chính thức (OV) ký trong vòng 48h trước giờ đi, Phiếu xét nghiệm âm tính Coggins Test (EIA), Sổ ATA Carnet do [Phòng Thương mại Luân Đôn (LCCI)](https://www.londonchamber.co.uk/international-trade/ata-carnet/) cấp, Tờ khai xuất khẩu CDS, Tờ khai an toàn xuất khẩu (EXS), Nhật ký hành trình EU Journey Log.
  3. *Khi nhập khẩu từ EU về lại UK*: Khai báo trước tối thiểu 24h trên hệ thống IPAFFS để lấy mã số UNN (Unique Notification Number), Chứng thư kiểm dịch xuất khẩu từ nước EU cấp, Sổ ATA Carnet (đóng dấu tái nhập khẩu), làm thủ tục tại Trạm Kiểm soát Biên giới [Sevington Inland Border Facility](https://www.gov.uk/government/publications/attending-an-inland-border-facility/attending-sevington-inland-border-facility) gần Dover.

### 4.2. Cộng Hòa Ireland (Republic of Ireland - IE) & Bắc Ireland (NI)
- **Cơ quan quản lý**: [Bộ Nông nghiệp, Thực phẩm & Hàng hải Ireland (DAFM)](https://www.gov.ie/en/organisation/department-of-agriculture-food-and-the-marine/) và [Cơ quan Thuế & Hải quan Ireland (Revenue Commissioners)](https://www.revenue.ie/).
- **Cửa khẩu kiểm soát trọng yếu**: Trạm BCP Cảng Dublin (Dublin Port BCP) và Trạm BCP Cảng Rosslare (Rosslare Europort).
- **Hệ thống CNTT**: Cổng khai báo hải quan `AIS (Automated Import System)` và [Hệ thống Đăng ký Di chuyển Ngựa DAFM](https://www.gov.ie/en/publication/0fa6a-movement-of-equidae/).
- **Danh mục giấy tờ đặc thù**:
  - *Tuyến từ UK vào Ireland (GB to ROI)*: Vì là tuyến đường biển qua Biển Ailen (Irish Sea), bắt buộc phải có chứng thư EHC 8438, khai báo CHED-A trên TRACES-NT, gửi thông báo trước bằng email/cổng điện tử cho Đội Kiểm dịch Thú y Cảng Dublin (Dublin Port Portal Inspection Team) tối thiểu 24h trước khi tàu cập bến. Tại BCP Cảng Dublin, ngựa được đưa vào khu chuồng kiểm tra để khám lâm sàng và kiểm tra hộ chiếu Weatherbys.
  - *Tuyến Bắc Ireland (GB to Northern Ireland)*: Áp dụng [Khuôn khổ Windsor (Windsor Framework)](https://www.gov.uk/government/publications/the-windsor-framework). Ngựa đua từ Anh sang Bắc Ireland tham dự các giải đua tại Down Royal hay Downpatrick rồi quay về GB không phải chịu kiểm dịch toàn diện nếu người vận chuyển đăng ký cơ chế Luồng Xanh (Green Lane) và có Bản Khai báo Di chuyển Ngựa của Bắc Ireland (DAERA Horse Declaration). Tuy nhiên, nếu từ Bắc Ireland ngựa vượt qua biên giới đất liền để sang Cộng hòa Ireland, toàn bộ hồ sơ kiểm dịch chuẩn EU bắt buộc phải được kích hoạt.

### 4.3. Cộng Hòa Pháp (France - FR) — Cửa Ngõ Eo Biển Manche
- **Cơ quan quản lý**: [Viện Ngựa và Cưỡi ngựa Quốc gia Pháp (IFCE)](https://www.ifce.fr), [Tổng cục Lương thực & Thú y Pháp (DGAL)](https://agriculture.gouv.fr/mouvements-et-echanges-danimaux-vivants) và [Tổng cục Hải quan Pháp (Douane)](https://www.douane.gouv.fr).
- **Cửa ngõ BCP huyết mạch**: Cảng Boulogne-Calais (Phà biển) và Nhà ga Eurotunnel Coquelles (Tàu hỏa ngầm qua eo biển).
- **Hệ thống CNTT**:
  - `SIRE (Système d'Information Relatif aux Équidés)`: Cơ sở dữ liệu định danh bắt buộc toàn bộ ngựa lưu trú tại Pháp.
  - `SI Brexit / Pass En Douane`: Hệ thống biên giới thông minh của Hải quan Pháp liên kết biển số xe tải chuyên dụng với mã vạch tờ khai hải quan (MRN) hoặc mã số sổ ATA Carnet trước khi xe lên phà tại Dover hoặc lên tàu tại Folkestone.
  - `SIVEP (Service d'Inspection Vétérinaire et Phytosanitaire aux Frontières)`: Trạm thú y biên giới tại Calais.
- **Danh mục giấy tờ đặc thù**:
  - *Khi nhập cảnh từ UK qua Calais*: Tài xế phải xuất trình Sổ ATA Carnet đã có mã ghép cặp (Paired) với biển số xe trên hệ thống SI Brexit, Tờ khai CHED-A đã có xác nhận Phần I từ hệ thống TRACES-NT, Giấy kiểm dịch EHC 8438 bản gốc có chữ ký mực/dấu nổi của Bác sĩ Thú y Anh (kèm bản dịch tiếng Pháp nếu có yêu cầu), Nhật ký hành trình EU Journey Log. Sau khi qua trạm SIVEP Calais đạt yêu cầu, Bác sĩ thú y Pháp ký điện tử phê duyệt Phần II của CHED-A, giải phóng xe tiếp tục hành trình vào đất liền châu Âu.
  - *Khi lưu trú thi đấu tại Pháp*: Nếu ngựa lưu trú trên 30 ngày, chủ ngựa phải khai báo thẻ tạm trú với hệ thống IFCE/SIRE.

### 4.4. Cộng Hòa Liên Bang Đức (Germany - DE) — Trung Tâm Đua Ngựa & Thể Thao Trung Âu
- **Cơ quan quản lý**: [Bộ Lương thực và Nông nghiệp Liên bang Đức (BMEL)](https://www.bmel.de), [Viện Nghiên cứu Thú y Friedrich-Loeffler-Institut (FLI)](https://www.fli.de), và [Liên đoàn Cưỡi ngựa Đức (FN)](https://www.pferd-aktuell.de).
- **Cửa khẩu kiểm soát hàng không & cảng biển**: Trung tâm Kiểm soát Động vật Sân bay Quốc tế Frankfurt ([Perishable Center Frankfurt - PCF](https://www.pcf-frankfurt.com)) và Trạm Kiểm soát Thú y Cảng Hamburg ([Veterinäramt Hamburg-Hafen](https://www.hamburg.de/hu/veterinaer-und-einfuhramt)).
- **Cơ quan Hải quan**: [Hải quan Liên bang Đức (Bundeszollverwaltung - Zoll)](https://www.zoll.de).
- **Danh mục giấy tờ đặc thù**:
  - Giấy chứng nhận Thể thao Thi đấu (*Turnierpferde-Eintragung*): Cấp bởi Liên đoàn Cưỡi ngựa Đức (FN) hoặc Hiệp hội Đua ngựa Thuần chủng Đức (*Deutscher Galopp*).
  - Giấy Chứng nhận Kiểm dịch Liên bang Đức (*Tiergesundheitsbescheinigung*): Dùng cho di chuyển nội khối theo chuẩn TRACES-NT.
  - Báo cáo Xét nghiệm Phòng thí nghiệm FLI: Đối với các bệnh truyền nhiễm Equine Infectious Anaemia (EIA) và Bệnh Dịch hạch ngựa (Glanders - *Rotzkrankheit*).
  - Thủ tục Hải quan Tạm nhập tại Đức: Đóng dấu xác nhận sổ ATA Carnet tại các trạm hải quan cửa khẩu sân bay hoặc hải quan nội địa (*Zollamt*).

### 4.5. Cộng Hòa Ý (Italy - IT) — Hệ Thống Giám Sát Điện Tử Modello 4
- **Cơ quan quản lý**: [Bộ Y tế Ý (Ministero della Salute)](https://www.salute.gov.it) và [Bộ Nông nghiệp Ý (MASAF - Cục Đua ngựa Ippica)](https://www.politicheagricole.it).
- **Hệ thống CNTT bắt buộc**: Cổng thông tin thú y quốc gia [Vetinfo Portal](https://www.vetinfo.it) và Cơ sở dữ liệu định danh gia súc [Banca Dati Nazionale (BDN) dell'Anagrafe Zootecnica](https://www.vetinfo.it/jws_bds/).
- **Chứng từ điện tử độc quyền bắt buộc**:
  - **Mẫu điện tử Modello 4 (Modello 4 Informatizzato / Il Foglio Rosa)**: Đây là tờ khai điện tử bắt buộc của pháp luật Ý. Bất kỳ chuyến di chuyển ngựa nào đi vào lãnh thổ Ý, di chuyển giữa các trường đua (như San Siro tại Milan, Capannelle tại Rome) hoặc di chuyển khỏi chuồng trại đều bắt buộc phải được chủ ngựa/huấn luyện viên khởi tạo trên hệ thống Vetinfo trước giờ khởi hành. Tờ khai này tích hợp mã QR Code chứa thông tin tiêm phòng, tình trạng kiểm dịch và địa chỉ chuồng đích.
  - Giấy chứng nhận Thú y của Viện Dịch tễ học Tham chiếu Ý ([Istituto Zooprofilattico Sperimentale - IZSLT](https://www.izslt.it/)) xác nhận không có dịch bệnh Viêm não tủy ngựa (Equine Encephalomyelitis) và Thiếu máu truyền nhiễm (EIA).

### 4.6. Vương Quốc Hà Lan (The Netherlands - NL) — Cửa Ngõ Cảng Biển & Sân Bay Huyết Mạch
- **Cơ quan quản lý**: [Cơ quan An toàn Thực phẩm & Kiểm dịch Thú y Hà Lan (NVWA)](https://www.nvwa.nl).
- **Hạ tầng kiểm soát quốc tế**: Cảng Rotterdam (Cảng biển số 1 châu Âu) và Sân bay Quốc tế Amsterdam Schiphol (Cổng trung chuyển hàng không ngựa thể thao thế giới).
- **Danh mục giấy tờ đặc thù**:
  - Hà Lan là trung tâm giống ngựa thể thao Warmblood số 1 thế giới (Hiệp hội Giống KWPN). Ngựa đua quá cảnh (Transit) qua Hà Lan sang Đức hoặc Pháp phải có Chứng thư Quá cảnh TRACES-NT xác nhận lộ trình.
  - Khai báo BCP Sân bay Schiphol: Tiếp nhận ngựa từ các tour thi đấu quốc tế (Mỹ, Trung Đông) nhập cảnh vào châu Âu. Giấy tờ bắt buộc gồm CHED-A, EHC nước xuất xứ và giấy ủy quyền đại lý hải quan Hà Lan (Douane).

### 4.7. Vương Quốc Bỉ (Belgium - BE) — Trung Tâm Vận Tải Hàng Không Ngựa Số 1 Châu Âu
- **Cơ quan quản lý**: [Cơ quan An toàn Chuỗi Thực phẩm & Thú y Bỉ (FAVV / AFSCA)](https://www.favv-afsca.be).
- **Hạ tầng cốt lõi**: **Liège Airport Horse Inn** ([Sân bay Liège Cargo](https://www.liegeairport.com)). Đây là "khách sạn ngựa và trung tâm logistics hàng không động vật sống" hiện đại nhất châu Âu, xử lý hơn 3.000 cá thể ngựa đua/nhảy rào mỗi năm cho các kỳ Olympic và giải đua thế giới.
- **Danh mục giấy tờ đặc thù**:
  - Giấy chứng nhận Tiếp nhận và Nghỉ ngơi tại Trạm Kiểm soát Dừng nghỉ ([Liège Airport Control Post](https://www.favv-afsca.be)): Biên bản xác nhận ngựa được hạ tải, cho ăn uống, kiểm tra thân nhiệt và nghỉ ngơi đủ thời gian luật định theo Quy định (EC) 1/2005 trước khi tiếp tục vận chuyển bằng đường bộ.
  - Hộ chiếu của các Hiệp hội Giống nhảy rào quốc tế đặt trụ sở tại Bỉ (Zangersheide Studbook, BWP - Belgian Warmblood).

### 4.8. Vương Quốc Tây Ban Nha (Spain - ES) — Cửa Ngõ Mùa Đông & Tour Thi Đấu Quốc Tế
- **Cơ quan quản lý**: [Bộ Nông nghiệp, Thủy sản và Thực phẩm Tây Ban Nha (MAPA)](https://www.mapa.gob.es) và [Liên đoàn Cưỡi ngựa Hoàng gia Tây Ban Nha (RFHE)](https://www.rfhe.com).
- **Hệ thống CNTT**: Cổng kiểm dịch thú y trực tuyến `CEXGAN (Comercio Exterior Ganadero)`.
- **Đặc thù nghiệp vụ**: Tây Ban Nha là điểm đến của các chuỗi giải đua mùa đông lớn nhất châu Âu (Sunshine Tour tại Vejer de la Frontera, Cadiz). Hàng nghìn cá thể ngựa từ Anh, Ireland, Đức, Pháp đổ về Tây Ban Nha từ tháng 1 đến tháng 4 hàng năm.
- **Giấy tờ bắt buộc**:
  - Giấy phép nhập cảnh tạm trú thi đấu thể thao ngắn hạn thông qua hệ thống CEXGAN.
  - Bắt buộc kiểm tra nồng độ kháng thể vaccine Cúm ngựa (Equine Influenza) với mũi tiêm nhắc lại (Booster) không quá 6 tháng trước ngày thi đấu (nghiêm ngặt hơn mức 12 tháng thông thường).

### 4.9. Khu Vực Bắc Âu (Thụy Điển & Đan Mạch) — Vận Tải Ngựa Đua Xe Kéo (Trotting)
- **Cơ quan quản lý**: [Cơ quan Nông nghiệp Thụy Điển (Jordbruksverket)](https://jordbruksverket.se) và [Cơ quan Thú y & Thực phẩm Đan Mạch (Fødevarestyrelsen)](https://www.foedevarestyrelsen.dk).
- **Đặc thù tuyến**: Bắc Âu nổi tiếng thế giới với môn đua ngựa kéo xe (Harness Racing / Trotting), tiêu biểu là giải đua Elitloppet tại Trường đua Solvalla (Stockholm).
- **Tuyến đường bộ qua Cầu Øresund (Đan Mạch sang Thụy Điển)**:
  - Mặc dù Đan Mạch và Thụy Điển đều nằm trong khối EU, việc di chuyển qua Cầu Øresund đòi hỏi phải có Giấy chứng nhận Thú y Nội khối TRACES-NT và đăng ký trước với Cơ quan Nông nghiệp Thụy Điển để kiểm soát dịch bệnh Viêm tử cung truyền nhiễm ở ngựa (CEM - Contagious Equine Metritis).

### 4.10. Khu Vực Trung & Đông Âu (Áo, Ba Lan, Séc) — Tuyến Quá Cảnh Đường Bộ
- **Cơ quan quản lý**: [Bộ Xã hội & Sức khỏe Áo (BMSGPK)](https://www.sozialministerium.at), [Cơ quan Thú y Trưởng Ba Lan (Główny Inspektorat Weterynarii - Wetgiw)](https://www.wetgiw.gov.pl).
- **Quy định Quá cảnh (Transit Regulations)**:
  - Khi xe tải chuyên dụng di chuyển qua Áo, Ba Lan để tới các trường đua tại Trung Âu, ngoài chứng thư TRACES-NT, xe phải tuân thủ nghiêm ngặt **Quy định giới hạn nhiệt độ thùng xe**: Cấm vận chuyển động vật sống khi nhiệt độ dự báo dọc tuyến đường vượt quá 35°C (hoặc dưới -5°C mà không có thiết bị sưởi bổ sung) theo Tiêu chuẩn Phúc lợi Áo.

---

## Phần 5: Đặc Tả Kỹ Thuật 11 Loại Giấy Tờ & Cấu Trúc Dữ Liệu Số Hóa (Template Schemas)

Hệ thống số hóa toàn bộ 11 loại chứng từ theo cấu trúc dữ liệu JSON Schema chuẩn hóa để lưu trữ vào bảng `DossierDocumentItem` (Flow 2):

### Nhóm 1: Hồ Sơ Định Danh & Sở Hữu

```json
{
  "documentType": "EQUINE_PASSPORT",
  "documentName": "Equine Passport / FEI Recognition Card",
  "issuingAuthority": "Weatherbys / France Galop / FEI / IFCE",
  "validityPeriod": "Lifetime (Suốt đời cá thể)",
  "isMandatory": true,
  "schema": {
    "ueln": "String(15) [Mã số cá thể ngựa trọn đời toàn cầu]",
    "microchipNumber": "String(15) [Mã số chip ISO 11784/11785]",
    "horseName": "String",
    "breed": "String [Thoroughbred, Warmblood...]",
    "sex": "Enum(Stallion, Mare, Gelding)",
    "dateOfBirth": "YYYY-MM-DD",
    "color": "String [Bay, Chestnut, Grey...]",
    "feiRegistrationNumber": "String [Mã thẻ vận động viên ngựa FEI]",
    "currentOwnerName": "String",
    "vaccinationLog": [
      {
        "vaccineType": "Equine Influenza / Tetanus",
        "dateAdministered": "YYYY-MM-DD",
        "batchNumber": "String",
        "vetSignature": "String"
      }
    ],
    "foodChainExclusionSigned": true
  }
}
```

### Nhóm 2: Hồ Sơ Kiểm Dịch & Thú Y Xuất Nhập Khẩu

```json
{
  "documentType": "EXPORT_HEALTH_CERTIFICATE",
  "documentName": "Export Health Certificate (EHC Form 8438)",
  "issuingAuthority": "APHA (Animal and Plant Health Agency, UK)",
  "validityPeriod": "10 days from signing (10 ngày kể từ ngày ký)",
  "isMandatory": true,
  "schema": {
    "certificateNumber": "String(Unique)",
    "officialVeterinarianName": "String",
    "ovSpNumber": "String [Mã hành nghề thú y chính thức]",
    "consignorAddress": "String [Địa chỉ chuồng xuất phát tại UK]",
    "consigneeAddress": "String [Địa chỉ trường đua/chuồng trại tại EU]",
    "cogginsTestReference": "String [Mã kết quả xét nghiệm EIA]",
    "cogginsTestDate": "YYYY-MM-DD (Trong vòng 90 ngày)",
    "clinicalInspectionDate": "YYYY-MM-DD (Trong vòng 48h trước khởi hành)",
    "attestationDiseaseFreeZone": true,
    "signedDate": "YYYY-MM-DD",
    "digitalSignatureHash": "String"
  }
}
```

```json
{
  "documentType": "INTRA_EU_HEALTH_CERTIFICATE",
  "documentName": "Intra-EU Animal Health Certificate (EQUI-INTRA)",
  "issuingAuthority": "State Veterinary Authority (DGAL, BMEL, DAFM, Vetinfo)",
  "validityPeriod": "10 to 30 days (10 đến 30 ngày)",
  "isMandatory": true,
  "schema": {
    "tracesCertificateNumber": "String (TRACES-NT Reference)",
    "countryOfOrigin": "ISO-2 (FR, DE, IE, IT...)",
    "countryOfDestination": "ISO-2",
    "consignorEstablishmentApprovalNumber": "String",
    "destinationEstablishmentApprovalNumber": "String",
    "animalUelnList": ["String"],
    "healthAttestationReg2020_688": true,
    "validationTimestamp": "ISO-8601-DateTime"
  }
}
```

```json
{
  "documentType": "CHED_A_DOCUMENT",
  "documentName": "Common Health Entry Document for Animals (CHED-A)",
  "issuingAuthority": "European Commission TRACES-NT / BCP Veterinary Unit",
  "validityPeriod": "Single Entry (Sử dụng cho 1 lần nhập cảnh tại BCP)",
  "isMandatory": true,
  "schema": {
    "chedReference": "CHEDA.EU.YYYY.NNNNNNN",
    "nominatedBcp": "Enum(FRCAL1 - Calais Port, FRCOQ1 - Coquelles, IEDUB1 - Dublin Port)",
    "estimatedArrivalDateTime": "ISO-8601-DateTime",
    "transportMeans": "Enum(Road Truck, Ferry, Air, Rail)",
    "vehicleRegistration": "String",
    "bcpDecisionPart2": "Enum(Acceptable, Non-Acceptable, Quarantine, Channelled)",
    "bcpInspectorName": "String",
    "decisionDate": "ISO-8601-DateTime"
  }
}
```

```json
{
  "documentType": "LAB_TEST_REPORT",
  "documentName": "Laboratory Test Report (Coggins Test & EVA)",
  "issuingAuthority": "Accredited Reference Laboratory (APHA Weybridge, ANSES, FLI, CVRL)",
  "validityPeriod": "30 to 90 days depending on destination country",
  "isMandatory": true,
  "schema": {
    "labName": "String",
    "iso17025AccreditationNumber": "String",
    "sampleId": "String",
    "testType": "Enum(AGID - Coggins, ELISA, Serum Neutralisation)",
    "targetDisease": "Enum(Equine Infectious Anaemia - EIA, Equine Viral Arteritis - EVA)",
    "result": "Enum(Negative, Positive, Inconclusive)",
    "samplingDate": "YYYY-MM-DD",
    "authorizedSignatory": "String"
  }
}
```

### Nhóm 3: Hồ Sơ Hải Quan & Tạm Nhập Tái Xuất Miễn Thuế

```json
{
  "documentType": "ATA_CARNET",
  "documentName": "Carnet de Passages en Douane / ATA Carnet",
  "issuingAuthority": "National Chamber of Commerce (LCCI UK, CCI France, IHK Germany)",
  "validityPeriod": "12 months maximum (Tối đa 12 tháng)",
  "isMandatory": true,
  "schema": {
    "carnetNumber": "AAA/NNNN/NNNN",
    "issuingChamber": "London Chamber of Commerce and Industry (LCCI)",
    "holderName": "Logistics Company / Horse Owner",
    "intendedUse": "International Racehorse Competitions (Thi đấu thể thao)",
    "totalHorsesListed": "Integer",
    "totalDeclaredValueGBP": "Decimal",
    "yellowVoucherExportDate": "YYYY-MM-DD (HMRC Dover)",
    "whiteVoucherImportDate": "YYYY-MM-DD (Douane Calais)",
    "whiteVoucherReExportDate": "YYYY-MM-DD",
    "yellowVoucherReImportDate": "YYYY-MM-DD"
  }
}
```

```json
{
  "documentType": "CUSTOMS_DECLARATION",
  "documentName": "Customs Declaration (CDS / SAD / Delta-G / AIS)",
  "issuingAuthority": "National Customs Authorities (HMRC, Douane, Revenue)",
  "validityPeriod": "Per Journey Movement",
  "isMandatory": false,
  "schema": {
    "mrnNumber": "String(18) [Movement Reference Number]",
    "customsSystem": "Enum(UK_CDS, FR_DELTA_G, IE_AIS, DE_ATLAS)",
    "customsProcedureCode": "String (CPC: 53 00 for Temporary Admission)",
    "bankGuaranteeBondNumber": "String",
    "declarationStatus": "Enum(Submitted, UnderReview, Cleared, Released)"
  }
}
```

### Nhóm 4: Hồ Sơ Phúc Lợi Vận Tải, Xe Chuyên Dụng & Tài Xế

```json
{
  "documentType": "JOURNEY_LOG",
  "documentName": "Journey Log / Route Plan (Council Regulation EC 1/2005)",
  "issuingAuthority": "Competent Veterinary Authority (APHA / Regional Vet EU)",
  "validityPeriod": "Specific Trip Duration (Theo suốt hành trình chuyến đi)",
  "isMandatory": true,
  "schema": {
    "journeyLogNumber": "String",
    "section1_Planning": {
      "departureLocation": "String",
      "destinationLocation": "String",
      "totalEstimatedDurationHours": "Decimal",
      "plannedRestStops": [
        {
          "locationName": "Control Post / Approved Stable",
          "estimatedArrival": "ISO-8601-DateTime",
          "restDurationHours": "Decimal (Tối thiểu 24h sau mỗi 24h chạy xe)"
        }
      ]
    },
    "section2_PlaceOfDeparture": {
      "actualDepartureDateTime": "ISO-8601-DateTime",
      "fitnessForTransportChecked": true,
      "numberOfAnimalsLoaded": "Integer"
    },
    "section3_PlaceOfDestination": {
      "actualArrivalDateTime": "ISO-8601-DateTime",
      "animalsConditionOnArrival": "Enum(AllHealthy, MinorInjuries, Dead)"
    },
    "section4_TransporterDeclaration": {
      "driverSignatures": ["String"],
      "delaysOrIncidentsLog": "String"
    }
  }
}
```

```json
{
  "documentType": "TRANSPORTER_AUTHORISATION",
  "documentName": "Transporter Authorisation (Type 2 - Long Journeys)",
  "issuingAuthority": "APHA (UK) & EU Member State Veterinary Ministry",
  "validityPeriod": "5 years (5 năm)",
  "isMandatory": true,
  "schema": {
    "authorisationCode": "UK/TYPE2/NNNNNN & EU/FR/TYPE2/NNNNNN",
    "jurisdiction": "Enum(UK_ONLY, EU_ONLY, DUAL_AUTHORISED)",
    "scope": "Equidae (Động vật họ ngựa)",
    "validUntil": "YYYY-MM-DD",
    "approvedCompany": "String"
  }
}
```

```json
{
  "documentType": "VEHICLE_APPROVAL_CERTIFICATE",
  "documentName": "Approval Certificate of Means of Transport by Road",
  "issuingAuthority": "Official Vehicle Testing Body (APHA / DREAL France / TÜV Germany)",
  "validityPeriod": "5 years (5 năm)",
  "isMandatory": true,
  "schema": {
    "certificateNumber": "String",
    "chassisNumberVIN": "String(17)",
    "registrationPlate": "String",
    "equipmentChecklist": {
      "pneumaticAirSuspension": true,
      "mechanicalForcedVentilation": true,
      "autonomousTemperatureRecorder": true,
      "satelliteGpsTrackingSystem": true,
      "paddedPaddedPartitions": true,
      "automaticWateringSystem": true
    },
    "inspectionPassDate": "YYYY-MM-DD",
    "expiryDate": "YYYY-MM-DD"
  }
}
```

```json
{
  "documentType": "DRIVER_COMPETENCE_CERTIFICATE",
  "documentName": "Certificate of Competence in Animal Transport",
  "issuingAuthority": "Accredited Examination Body (City & Guilds UK, France Cheval Génétique)",
  "validityPeriod": "Lifetime / Periodic refresh",
  "isMandatory": true,
  "schema": {
    "driverFullName": "String",
    "certificateCode": "String",
    "speciesCovered": "Domestic Equidae (Ngựa nuôi thuần chủng)",
    "assessmentModules": [
      "Equine Behaviour & Handling (Hành vi ngựa)",
      "First Aid & Stress Mitigation (Sơ cứu & giảm stress)",
      "Driving Ergonomics & Road Regulations (Kỹ thuật lái êm dịu)"
    ],
    "issuingBody": "String"
  }
}
```

---

## Phần 6: Kho Nguồn Tra Cứu, Cổng Dịch Vụ Công Trực Tuyến & Văn Bản Luật Cốt Lõi

Toàn bộ các nguồn dưới đây là cổng dịch vụ công chính thống của các cơ quan chính phủ và tổ chức quốc tế:

### 6.1. Cấp Toàn Liên Minh Châu Âu (EU-wide Level)
1. **Ủy ban Châu Âu (European Commission - DG SANTE)**:
   - Cổng thông tin Thương mại & Di chuyển Ngựa: [Live Animals Trade & Movement: Equines](https://food.ec.europa.eu/animals/live-animals-trade-and-movement/equines_en)
   - Danh mục Trạm Kiểm soát Biên giới (BCP) được phê duyệt: [Approved EU Border Control Posts](https://food.ec.europa.eu/animals/entry-union/inspection-posts_en)
   - Phúc lợi động vật khi vận chuyển: [Animal Welfare during Transport](https://food.ec.europa.eu/animals/animal-welfare/animal-welfare-during-transport_en)
2. **Cổng Dịch Vụ Kiểm Dịch Điện Tử TRACES-NT**:
   - Hệ thống làm việc: [European Commission TRACES-NT Portal](https://webgate.ec.europa.eu/tracesnt)
   - Hướng dẫn nghiệp vụ CHED-A: [TRACES-NT Documentation & User Guides](https://tracesnt-documentation.actionsprout.com/)
3. **Cơ Sở Dữ Liệu Luật Châu Âu (EUR-Lex)**:
   - [Quy định Luật Thú y — Regulation (EU) 2016/429 (AHL)](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0429)
   - [Quy định Di chuyển Nội khối — Delegated Regulation (EU) 2020/688](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0688)
   - [Quy định Nhập khẩu Nước thứ ba — Delegated Regulation (EU) 2020/692](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32020R0692)
   - [Mẫu Chứng thư Kiểm dịch — Implementing Regulation (EU) 2021/403](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0403)
   - [Quy định Hộ chiếu Ngựa — Implementing Regulation (EU) 2021/963](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R0963)
   - [Quy định Vận chuyển Phúc lợi — Council Regulation (EC) No 1/2005](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32005R0001)
   - [Quy định Kiểm soát Chính thức — Regulation (EU) 2017/625](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32017R0625)
4. **Tổ Chức Ngành Ngựa Châu Âu**:
   - [European Horse Network (EHN)](https://www.europeanhorsenetwork.eu/)
   - [European Federation of Thoroughbred Breeders' Associations (EFTBA)](https://www.eftba.eu/)
   - [European and Mediterranean Thoroughbred Horseracing Federation (EMHF)](https://www.emhf.net/)

### 6.2. Vương Quốc Anh (United Kingdom - GB)
1. **Bộ Môi Trường, Thực Phẩm & Nông Thôn (Defra) & APHA**:
   - Hướng dẫn Xuất khẩu Ngựa sang EU: [GOV.UK Export horses and ponies from Great Britain](https://www.gov.uk/guidance/export-horses-and-ponies-from-great-britain)
   - Hướng dẫn Nhập khẩu Ngựa vào Anh: [GOV.UK Import horses and ponies](https://www.gov.uk/guidance/import-horses-and-ponies)
   - Tra cứu Mẫu Chứng thư EHC 8438: [GOV.UK Find an Export Health Certificate (Form 8438)](https://www.gov.uk/find-an-export-health-certificate/export-equidae-to-the-european-union-8438)
   - Cổng Khai báo Trước Nhập khẩu IPAFFS: [IPAFFS Service Guide](https://www.gov.uk/guidance/import-goods-into-the-uk-using-ipaffs)
   - Mô hình Vận hành Biên giới BTOM: [The Border Target Operating Model (BTOM)](https://www.gov.uk/government/publications/the-border-target-operating-model-august-2023)
   - Mẫu Đơn Đăng ký Journey Log (WIT07): [APHA Welfare of Animals in Transport Journey Log](https://www.gov.uk/government/publications/welfare-of-animals-in-transport-journey-log)
   - Hướng dẫn Kiểm định Xe Chở Động vật: [APHA Animal Transport Vehicle Approval](https://www.gov.uk/guidance/animal-transport-vehicle-approval)
2. **Hải Quan Anh (HMRC) & Thương Mại**:
   - Dịch vụ Khai báo Hải quan CDS: [HMRC Customs Declaration Service](https://www.gov.uk/guidance/using-the-customs-declaration-service)
   - Hướng dẫn Sổ ATA Carnet: [HMRC Notice 104](https://www.gov.uk/government/publications/notice-104-ata-and-cpd-carnets)
   - Phòng Thương mại Luân Đôn (LCCI): [LCCI ATA Carnet Service](https://www.londonchamber.co.uk/international-trade/ata-carnet/)
3. **Cửa Khẩu Cửa Ngõ & Tổ Chức Thể Thao**:
   - Trạm Kiểm soát Biên giới Sevington: [Sevington Inland Border Facility](https://www.gov.uk/government/publications/attending-an-inland-border-facility/attending-sevington-inland-border-facility)
   - Cảng Dover: [Port of Dover Operations](https://www.doverport.co.uk/)
   - Đường hầm Eurotunnel: [Eurotunnel Freight Le Shuttle](https://www.eurotunnelfreight.com/)
   - Cơ quan Đua ngựa Anh: [British Horseracing Authority (BHA)](https://www.britishhorseracing.com/)
   - Sổ Phả hệ Ngựa Thuần chủng Weatherbys: [Weatherbys Official Portal](https://www.weatherbys.co.uk)

### 6.3. Cộng Hòa Ireland (Republic of Ireland - IE) & Bắc Ireland (NI)
1. **Bộ Nông Nghiệp, Thực Phẩm & Hàng Hải Ireland (DAFM)**:
   - Cổng Di chuyển Động vật Họ Ngựa: [DAFM Movement of Equidae](https://www.gov.ie/en/publication/0fa6a-movement-of-equidae/)
   - Hướng dẫn Nhập khẩu Ngựa sau Brexit: [DAFM Brexit Equine Information](https://www.gov.ie/en/publication/dafm-brexit-information/)
2. **Hải Quan Ireland (Revenue Commissioners)**:
   - Hệ thống Hải quan AIS: [Revenue Customs AIS System](https://www.revenue.ie/en/customs/businesses/electronic-systems/ais.aspx)
3. **Cửa Khẩu Biển & Tổ Chức Đua**:
   - Cảng Dublin BCP: [Dublin Port Company](https://www.dublinport.ie/)
   - Cảng Rosslare Europort BCP: [Rosslare Europort](https://www.rosslareeuroport.ie/)
   - Đua ngựa Ireland: [Horse Racing Ireland (HRI)](https://www.hri.ie/) & [Irish Horseracing Regulatory Board (IHRB)](https://www.ihrb.ie)
4. **Bắc Ireland (DAERA)**:
   - [DAERA Northern Ireland Equine Movement Regulations](https://www.daera-ni.gov.uk/articles/movement-horses)

### 6.4. Cộng Hòa Pháp (France - FR)
1. **Viện Ngựa và Cưỡi Ngựa Quốc Gia Pháp (IFCE)**:
   - Cổng thông tin IFCE: [IFCE France](https://www.ifce.fr)
   - Cơ sở dữ liệu định danh SIRE: [Système d'Information Relatif aux Équidés (SIRE)](https://www.ifce.fr/sire/)
   - Thủ tục kiểm dịch & xuất nhập cảnh: [IFCE Démarches Sanitaires et Douanières](https://www.ifce.fr/ifce/sire-demarches/importation-et-echange/)
2. **Bộ Nông Nghiệp Pháp (DGAL)**:
   - [DGAL Échanges d'Animaux Vivants](https://agriculture.gouv.fr/mouvements-et-echanges-danimaux-vivants)
3. **Tổng Cục Hải Quan Pháp (Douane)**:
   - Hệ thống Biên giới Thông minh SI Brexit: [Douane SI Brexit & Pass En Douane](https://www.douane.gouv.fr/fiche/le-si-brexit-le-passage-de-la-frontiere-intelligente)
   - Hướng dẫn Sổ ATA: [Douane Française Carnet ATA](https://www.douane.gouv.fr/fiche/le-carnet-ata)
4. **Trạm BCP & Hiệp Hội**:
   - Trạm Kiểm dịch Thú y SIVEP Cảng Calais: [Port Boulogne Calais SIVEP](https://www.portboulognecalais.fr/fr/sivep-veterinaire)
   - [France Galop (Đua ngựa phẳng & vượt chướng ngại)](https://www.france-galop.com)
   - [LeTrot (Đua ngựa kéo xe Trotteur)](https://www.letrot.com/)

### 6.5. Cộng Hòa Liên Bang Đức (Germany - DE)
1. **Bộ Nông Nghiệp Liên Bang Đức (BMEL)**:
   - [BMEL Tiergesundheit & Tierseuchenschutz](https://www.bmel.de/DE/themen/tiere/tiergesundheit/tiergesundheit_node.html)
2. **Viện Nghiên Cứu Thú Y Liên Bang (FLI)**:
   - [Friedrich-Loeffler-Institut (FLI)](https://www.fli.de/)
3. **Hải Quan Đức (Zoll)**:
   - [Zoll Vorübergehende Verwendung mit Carnet ATA](https://www.zoll.de/DE/Fachthemen/Zoelle/Zollverfahren/Voruebergehende-Verwendung/Verfahrensablauf/Carnet-ATA/carnet-ata_node.html)
4. **Cửa Khẩu BCP & Thể Thao**:
   - Trạm Thú y Sân bay Frankfurt: [Perishable Center Frankfurt (PCF)](https://www.pcf-frankfurt.com/)
   - Trạm Thú y Cảng Hamburg: [Veterinäramt Hamburg-Hafen](https://www.hamburg.de/hu/veterinaer-und-einfuhramt/)
   - Đua ngựa Đức: [Deutscher Galopp](https://www.deutscher-galopp.de/) & [Liên đoàn FN](https://www.pferd-aktuell.de)

### 6.6. Cộng Hòa Ý (Italy - IT)
1. **Bộ Y Tế Ý (Ministero della Salute)**:
   - [Ministero della Salute — Sanità Animale](https://www.salute.gov.it/portale/sanitaAnimale/homeSanitaAnimale.jsp)
   - Cổng Thú y Quốc gia Vetinfo: [Vetinfo Portal](https://www.vetinfo.it)
   - Cơ sở Dữ liệu Định danh BDN: [BDN Anagrafe Zootecnica — Equidi](https://www.vetinfo.it/jws_bds/)
2. **Bộ Nông Nghiệp Ý (MASAF)**:
   - [MASAF Settore Ippica](https://www.politicheagricole.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/140)
3. **Viện Thú Y Dịch Tễ & Hải Quan**:
   - [Istituto Zooprofilattico Sperimentale (IZSLT)](https://www.izslt.it/)
   - [Agenzia delle Dogane e dei Monopoli (ADM)](https://www.adm.gov.it/)

### 6.7. Các Nước Thành Viên EU Khác (Transit & Sport Hubs)
1. **Hà Lan (The Netherlands)**:
   - Cơ quan Kiểm dịch Thú y Hà Lan: [NVWA Paarden en Paardachtigen](https://www.nvwa.nl/onderwerpen/paarden-en-paardachtigen)
2. **Bỉ (Belgium)**:
   - Cơ quan Kiểm soát Thú y Bỉ: [FAVV / AFSCA Dierenwelzijn en Handel](https://www.favv-afsca.be/)
   - Trung tâm Ngựa Sân bay Liège: [Liège Airport Cargo Horse Hub](https://www.liegeairport.com/)
3. **Tây Ban Nha (Spain)**:
   - Cổng Kiểm dịch Thú y CEXGAN: [MAPA Comercio Exterior Ganadero](https://www.mapa.gob.es/es/ganaderia/temas/comercio-exterior-ganadero/)
   - [Real Federación Hípica Española (RFHE)](https://www.rfhe.com/)
4. **Thụy Điển (Sweden)**:
   - [Cơ quan Nông nghiệp Thụy Điển (Jordbruksverket)](https://jordbruksverket.se)
5. **Đan Mạch (Denmark)**:
   - [Cơ quan Thú y & Thực phẩm Đan Mạch (Fødevarestyrelsen)](https://www.foedevarestyrelsen.dk)

### 6.8. Tổ Chức Tiêu Chuẩn Quốc Tế
1. **Liên Đoàn Thể Thao Cưỡi Ngựa Quốc Tế (FEI)**:
   - [FEI Veterinary Regulations 2024](https://inside.fei.org/fei/regulations/veterinary)
   - [FEI Passports Specification](https://inside.fei.org/fei/your-role/veterinarians/passports)
   - [Ứng dụng Sức khỏe Số hóa FEI HorseApp](https://inside.fei.org/fei/horseapp)
2. **Tổ Chức Thú Y Thế Giới (WOAH - OIE)**:
   - [WOAH Terrestrial Animal Health Code](https://www.woah.org/en/what-we-do/standards/codes-and-manuals/terrestrial-code-online-access/)
   - [Tiêu chuẩn Ngựa Thể thao Cao cấp WOAH HHP Framework](https://www.woah.org/en/what-we-do/standards/standards-setting/hhp-horses/)
   - [Tiêu chuẩn Xét nghiệm EIA Coggins Test](https://www.woah.org/en/what-we-do/standards/codes-and-manuals/terrestrial-manual-online-access/?id=169&L=1&htmfile=chapitre_eia.htm)
3. **Hiệp Hội Đua Ngựa Quốc Tế (IFHA)**:
   - [International Federation of Horseracing Authorities](https://www.ifhaonline.org/)
   - [International Movement of Horses Committee (IMHC)](https://www.ifhaonline.org/default.asp?section=Resources&sub=IMHC)
4. **Vận Tải Hàng Không (IATA)**:
   - [IATA Live Animals Regulations (LAR)](https://www.iata.org/en/publications/store/live-animals-regulations/)
5. **Phòng Thương Mại Quốc Tế (ICC)**:
   - [ICC World Chambers Federation — ATA Carnet](https://iccwbo.org/business-solutions/ata-carnet/)

---

## Phần 7: Ánh Xạ Vào Kiến Trúc Cơ Sở Dữ Liệu & Quy Tắc Nghiệp Vụ (Flow 2)

Dữ liệu đặc tả trong báo cáo này cung cấp giá trị đầu vào cho cơ sở dữ liệu và mã nguồn nghiệp vụ của dự án:

1. **Bảng `RegulatoryRequirement` (Quản lý Danh mục Quy định Pháp lý & Kiểm dịch)**:
   - Khởi tạo các bản ghi quy định theo cặp quốc gia (`originCountryCode`, `destinationCountryCode`):
     - Tuyến GB sang EU: Gắn cờ `requiresBCPCheck = true`, `requiresEHC = true`, `requiresATACarnet = true`, `cogginsTestValidityDays = 90`.
     - Tuyến Nội khối EU: Gắn cờ `requiresBCPCheck = false`, `requiresIntraHealthCert = true`, `customsDutyFree = true`.
     - Tuyến Ý: Kích hoạt quy tắc phụ bắt buộc tạo `Modello 4 Informatizzato` trên Vetinfo.
2. **Bảng `DossierTemplate` (Bộ Hồ Sơ Mẫu Theo Tuyến)**:
   - `TEMPLATE_UK_DOMESTIC`: Gồm 4 chứng từ (Equine Passport, ATC, Vehicle Approval, Driver Competence).
   - `TEMPLATE_INTRA_EU`: Gồm 5 chứng từ (EU/FEI Passport, TRACES `EQUI-INTRA`, EU Journey Log, EU Transporter Auth Type 2, Driver Competence EU).
   - `TEMPLATE_UK_TO_EU_BCP`: Gồm 10 chứng từ (Registered Passport, EHC 8438, Coggins Test, CHED-A, ATA Carnet, CDS Export Declaration, Dual Transporter Authorisations, EU Journey Log).
3. **Bảng `DossierDocumentItem` (Hồ sơ Kiểm dịch Thực tế Chuyến đi)**:
   - Lưu trữ mã chứng từ, file scan/PDF đính kèm, hạn sử dụng, cơ quan cấp; liên kết theo chuyến với kết quả kiểm dịch tại BCP (`QuarantineProof`) và kết quả hải quan (`CustomsClearanceProof`). Hai kết quả tại cửa khẩu không ghi đè trạng thái `ComplianceDossier`.
