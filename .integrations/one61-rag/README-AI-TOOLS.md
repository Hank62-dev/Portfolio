# Hướng Dẫn Cài Đặt & Sử Dụng Hệ Thống Tối Ưu Hóa Token Cho AI Agent
### (Bộ Tứ Token: RTK + Headroom + Caveman + Ponytail)

Tài liệu hướng dẫn cài đặt và thiết lập bộ 4 công cụ tối ưu hóa chi phí token, tốc độ phản hồi và chất lượng sinh code cho AI Coding Agents (Google Antigravity, Codex, Claude Code, Cursor, v.v.) trong dự án **one61-rag**.

---

## Mô Tả Tổng Quan (Description)

Khi làm việc với các AI Coding Agent (như Google Antigravity, Codex, Claude Code, Cursor), chi phí, độ trễ và tỷ lệ lỗi thường bị đội lên gấp nhiều lần do **4 lỗ rò rỉ token kinh điển**:

1. **Rò rỉ Terminal (Terminal Noise)**: Lệnh test, git, build xả hàng nghìn dòng log rác vào context của agent.
2. **Rò rỉ Context (Bloated Context)**: File dài, RAG lặp lại và lịch sử hội thoại chiếm sạch cửa sổ ngữ cảnh (context window).
3. **Rò rỉ Văn bản (Conversational Fluff)**: Model mở đầu dài dòng ("Chắc chắn rồi!", "Tôi rất sẵn lòng giúp bạn..."), tốn token xuất (output token vốn đắt gấp 3-5 lần input token).
4. **Rò rỉ Kiến trúc (Over-engineering)**: Model tự ý cài thêm package, viết hàng tá class/component bọc ngoài thay vì dùng tính năng có sẵn của ngôn ngữ/nền tảng.

### Giải Pháp: Bộ Tứ Tối Ưu Token (The Token Optimization Quad)

Hệ thống 4 công cụ kết hợp tạo thành **phòng tuyến tối ưu token 360 độ**:
- **Đầu vào (Input)**: `RTK` dọn sạch log terminal + `Headroom` nén context và prompt cục bộ.
- **Xử lý (Logic & Code)**: `Ponytail` ép agent dùng giải pháp tối thiểu (YAGNI), không vẽ vời code thừa.
- **Đầu ra (Output)**: `Caveman` cắt bỏ toàn bộ từ ngữ thừa, chỉ giữ lại code chuẩn và kết luận cốt lõi.

> **Kết quả**: Tiết kiệm **50% - 80%** chi phí token, tăng tốc phản hồi **~27%**, giữ nguyên chất lượng code và an toàn logic.

---

## Bảng Phân Vai (Token Architecture Matrix)

| Công cụ | Nhiệm vụ chính | Vị trí can thiệp | Mức tiết kiệm / Giá trị cốt lõi |
| :--- | :--- | :--- | :--- |
| **1. RTK** | Nén output lệnh shell / bash (git, npm, uv, pytest) | Terminal / Shell Output | Đến 90% bash output |
| **2. Headroom** | Nén toàn bộ context (logs, files, RAG, history) | Context Input & Prompt Proxy | 50% - 80% prompt tokens |
| **3. Caveman** | Nén câu chữ trả lời của model (bỏ văn hoa, rườm rà) | Model Response (Prose) | 1.4× đến 3× output cost |
| **4. Ponytail** | Nén code sinh ra, ngăn over-engineering thừa thãi | Code Generation Logic | ~54% Lines of Code (LOC) |

```mermaid
flowchart TD
    User([User Prompt / Task]) --> Headroom[Headroom: Nén Context & History]
    Headroom --> LLM([LLM Engine])
    LLM --> Ponytail[Ponytail: Ngăn Code Thừa / Dùng Native API]
    Ponytail --> Caveman[Caveman: Cắt Văn Hoa Khỏi Lời Đáp]
    Caveman --> Response([Câu Trả Lời Gọn & Chuẩn])
    Response -. Thực thi lệnh Terminal .-> RTK[RTK: Nén Output Lệnh Shell]
    RTK -. Nạp lại làm Context .-> Headroom
```

---

## Cơ Chế Tự Động Hóa 100% (Không Cần Gõ Thủ Công)

Hệ thống được thiết kế để **tự động kích hoạt toàn bộ 4 công cụ** mỗi khi bạn mở và làm việc với AI:

### Cách Hoạt Động Ngầm (Under the Hood):

1. **Headroom (Tự động bọc Proxy)**:
   - Khi chạy script [`start-agent.ps1`](file:///d:/my-project/one61-rag/start-agent.ps1), Headroom khởi động proxy ngầm tại cổng `8787` và dẫn luồng API qua proxy trước khi gửi đi.
2. **RTK (Tự động Rewrite lệnh Shell)**:
   - Đã cài hook toàn cục (`rtk init -g --auto-patch`).
   - Mọi lệnh terminal mà AI thực thi (`git status`, `uv run pytest`, `docker compose`) được hệ thống tự động nén.
3. **Caveman & Ponytail (Tự động nạp Rule)**:
   - Được khai báo cố định trong file định tuyến context [`AGENTS.md`](file:///d:/my-project/one61-rag/AGENTS.md) và thư mục rule [`.agents/rules/`](file:///d:/my-project/one61-rag/.agents/rules/).
   - Mọi phiên làm việc của AI (Google Antigravity, Codex, Cursor) mở thư mục này sẽ tự động nạp luật:
     - **Caveman**: Tự động trả lời cộc lốc, súc tích, lược bỏ rườm rà.
     - **Ponytail**: Tự động chặn over-engineering, ưu tiên native API và YAGNI.

---

### Cách Khởi Động Cho Codex & Google Antigravity

1. **Khi dùng Google Antigravity (IDE hoặc CLI)**:
   - **Tự động 100%**: Mọi lượt chat và lệnh Antigravity chạy trong thư mục này đã tự động nạp toàn bộ luật từ `.agents/rules/` và `AGENTS.md` (Caveman cộc lốc + Ponytail code gọn + RTK nén shell).
   - Không cần bật gì thêm.

2. **Khi dùng Codex CLI**:
   - Chạy kịch bản 1 lệnh đã tích hợp Headroom + RTK + Caveman + Ponytail:
     ```powershell
     .\start-agent.ps1
     # Hoặc:
     .\codex-headroom.ps1
     ```
   - Codex sẽ khởi động bọc qua Headroom proxy, tự động đọc cấu hình `AGENTS.md` của thư mục.

---

## 1. RTK (Rust Token Killer)

> **Mục tiêu**: Nén output terminal trước khi nạp vào context LLM. Viết bằng Rust, overhead < 10ms.

### Cài đặt
- **Windows (Winget)**:
  ```powershell
  winget install rtk-ai.rtk
  ```
- **Cargo (Rust)**:
  ```bash
  cargo install --git https://github.com/rtk-ai/rtk
  ```

### Kiểm tra hoạt động
```bash
rtk --version       # Kiểm tra phiên bản (VD: rtk 0.47.0)
rtk gain            # Xem bảng thống kê số lượng token đã tiết kiệm
rtk gain --history  # Xem lịch sử các lệnh đã nén
```

---

## 2. Headroom

> **Mục tiêu**: Proxy cục bộ nén logs, files, RAG chunks và lịch sử chat trước khi tới LLM. Dữ liệu chạy 100% trên máy nội bộ.

### Cài đặt
- **Dùng `uv`**:
  ```bash
  uv tool install --python 3.13 "headroom-ai[all]"
  ```
- **Dùng `pip` (Python 3.10+)**:
  ```bash
  pip install "headroom-ai[all]"
  ```

### Sử dụng & Chạy Proxy
1. **Khởi chạy Local Proxy**:
   ```bash
   headroom proxy --port 8787
   ```
2. **Bọc Agent tự động (Wrap Agent)**:
   ```bash
   headroom wrap codex --code-memory none
   headroom wrap claude
   ```
3. **Chạy qua PowerShell Script (Dành cho Codex)**:
   ```powershell
   .\codex-headroom.ps1
   ```
4. **Tự động học phong cách ngắn gọn (Output Shaper)**:
   ```bash
   headroom learn --verbosity --apply
   ```

### Kiểm tra hoạt động
```bash
headroom --version
headroom doctor        # Kiểm tra trạng thái proxy và các agent kết nối
headroom output-savings # Xem phần trăm output token đã cắt giảm
```

---

## 3. Caveman

> **Mục tiêu**: Ép AI trả lời cộc lốc, súc tích như "người tiền sử". Giữ nguyên 100% code, lệnh CLI, file path, lỗi và cảnh báo bảo mật.

### Cài đặt & Tích hợp
- Cục bộ: Đã cấu hình tại [`.agents/skills/caveman/SKILL.md`](file:///d:/my-project/one61-rag/.agents/skills/caveman/SKILL.md)
- Khai báo trong [`AGENTS.md`](file:///d:/my-project/one61-rag/AGENTS.md):
  ```markdown
  @.agents/skills/caveman/SKILL.md
  ```

### Các lệnh điều khiển
| Lệnh | Cấp độ | Ý nghĩa |
| :--- | :--- | :--- |
| `/caveman` | `full` (Mặc định) | Bỏ mạo từ, bỏ từ đệm, nói ngắn gọn, fragment OK. |
| `/caveman lite` | `lite` | Giữ câu hoàn chỉnh, bỏ từ thừa, giọng chuyên nghiệp. |
| `/caveman ultra` | `ultra` | Nén cực hạn, chỉ đưa kết luận và hành động. |
| `/caveman off` hoặc `stop caveman` | Bình thường | Trở lại phong cách mặc định. |

---

## 4. Ponytail

> **Mục tiêu**: Ngăn chặn over-engineering. Chỉ viết lượng code tối thiểu cần thiết để giải quyết vấn đề. Tận dụng Stdlib và Native API.

### Cài đặt & Tích hợp
- Đã cài đặt rule luôn bật tại: [`.agents/rules/ponytail.md`](file:///d:/my-project/one61-rag/.agents/rules/ponytail.md)
- Khai báo trong [`AGENTS.md`](file:///d:/my-project/one61-rag/AGENTS.md):
  ```markdown
  @PONYTAIL.md
  ```

### Quy Tắc Cốt Lõi: Nấc Thang Ponytail (The Ladder)
1. **Có nhất thiết phải tồn tại không?** -> Không: Bỏ qua (YAGNI).
2. **Đã có sẵn trong codebase chưa?** -> Có: Tái sử dụng, không viết lại.
3. **Thư viện chuẩn (Stdlib) có sẵn chưa?** -> Dùng Stdlib.
4. **Tính năng Native Platform có hỗ trợ không?** -> Dùng Native API.
5. **Dependency đã cài có hỗ trợ không?** -> Tận dụng package hiện có.
6. **Viết 1 dòng được không?** -> Viết đúng 1 dòng.
7. **Chỉ khi không còn cách nào khác:** Mới viết code tối thiểu cần thiết.

> **Bất khả xâm phạm**: Không bao giờ cắt bớt khâu kiểm tra dữ liệu đầu vào (validation), xử lý lỗi (error handling), bảo mật hoặc accessibility (a11y).

---

## Cấu Hình Định Tuyến Dự Án ([AGENTS.md](file:///d:/my-project/one61-rag/AGENTS.md))

```markdown
@RTK.md
@HEADROOM.md
@CAVEMAN.md
@PONYTAIL.md

@.agents/skills/caveman/SKILL.md
```

Mọi agent Codex / Antigravity mở thư mục này sẽ tự động nạp đầy đủ ngữ cảnh và tuân thủ tuyệt đối bộ 4 công cụ tối ưu hóa token trên.
