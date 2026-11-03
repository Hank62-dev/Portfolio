-- ============================================================
-- Hank RAG: bảng Postgres cho trò chuyện và tài liệu
-- ============================================================
-- Chạy file này MỘT LẦN trên database Postgres của RAG (Neon: SQL Editor -> dán toàn bộ -> Run).
-- Chạy lại nhiều lần vẫn an toàn: mọi lệnh đều là IF NOT EXISTS / OR REPLACE, không xoá dữ liệu.
--
-- Các bảng khớp với những gì code RAG đọc (src/db/postgres.py):
--   * messages   -> get_conversation_history(): N tin nhắn gần nhất của một cuộc trò chuyện
--   * documents  -> get_conversation_documents(): tài liệu gắn với một cuộc trò chuyện
--
-- Lưu ý:
--   * Kiến thức của Hank, vector tài liệu (Qdrant) và bộ nhớ ngắn hạn (Redis) KHÔNG nằm ở đây.
--   * Chuỗi `conversation_id` là TEXT (không phải UUID) vì client đặt id dạng "hank62-<mã>".
--   * File cũ về kho vận (deliveries, flight_manifests, customs...) được giữ ở logistics_demo_schema.sql.
-- ============================================================


-- ============================================================
-- BẢNG 1: conversations
-- Mỗi dòng là một cuộc trò chuyện (một "kênh") giữa bạn và Hank.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversations (
    id              TEXT        PRIMARY KEY,                 -- ví dụ: hank62-private, hank62-ab12cd
    title           TEXT        NOT NULL DEFAULT '',         -- tên hiển thị, để trống thì client tự đặt
    owner           TEXT        NOT NULL DEFAULT 'hank62',   -- ai sở hữu (hiện chỉ có chủ app)
    archived        BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_message_at TIMESTAMPTZ                              -- tự cập nhật khi có tin mới (xem trigger bên dưới)
);

CREATE INDEX IF NOT EXISTS idx_conversations_owner_recent
    ON conversations (owner, last_message_at DESC NULLS LAST)
    WHERE NOT archived;

COMMENT ON TABLE conversations IS 'Một cuộc trò chuyện với Hank. messages và documents trỏ về đây bằng conversation_id.';


-- ============================================================
-- BẢNG 2: messages
-- Tin nhắn của cuộc trò chuyện. RAG đọc N tin gần nhất để Hank nhớ ngữ cảnh.
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    conversation_id TEXT        NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
    author          TEXT        NOT NULL CHECK (author IN ('user', 'assistant', 'system')),
    content_type    TEXT        NOT NULL DEFAULT 'text',      -- 'text' hoặc 'multimodal_text'
    -- {"contentType": "text", "text": "..."}  hoặc  {"contentType": "multimodal_text", "parts": [{"type": "text", "text": "..."}]}
    content         JSONB       NOT NULL,
    status          TEXT        NOT NULL DEFAULT 'sent',      -- 'sending' bị bỏ qua khi nạp lịch sử
    model           TEXT,                                     -- model đã trả lời (cho tin của assistant)
    sources         JSONB       NOT NULL DEFAULT '[]'::jsonb, -- nguồn đã dùng: tài liệu, web
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- đúng với truy vấn của RAG: WHERE conversation_id = $1 AND status != 'sending' ORDER BY created_at DESC LIMIT n
CREATE INDEX IF NOT EXISTS idx_messages_conversation_recent
    ON messages (conversation_id, created_at DESC);

COMMENT ON TABLE messages IS 'Tin nhắn. Cột author, content_type, content, status, created_at là phần RAG đọc.';
COMMENT ON COLUMN messages.content IS 'JSON: {"contentType":"text","text":"..."} hoặc multimodal_text với parts.';


-- ============================================================
-- BẢNG 3: documents
-- Tài liệu (PDF, DOCX, TXT...) bạn đã thêm. conversation_id để trống nghĩa là tài liệu thuộc
-- thư viện chung (mọi cuộc trò chuyện đều đọc được). Nội dung đã tách đoạn nằm ở Qdrant, ở đây chỉ giữ hồ sơ.
-- ============================================================
CREATE TABLE IF NOT EXISTS documents (
    id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::text,
    conversation_id TEXT        REFERENCES conversations (id) ON DELETE CASCADE,  -- NULL = thư viện chung
    name            TEXT        NOT NULL,
    url             TEXT        NOT NULL DEFAULT '',          -- nơi lưu file (nếu có), có thể để trống
    "mimeType"      TEXT        NOT NULL DEFAULT 'text/plain', -- tên cột viết hoa chữ M vì code RAG truy vấn đúng tên này
    size_bytes      BIGINT      CHECK (size_bytes IS NULL OR size_bytes >= 0),
    chunk_count     INTEGER     NOT NULL DEFAULT 0,           -- số đoạn đã đưa vào Qdrant
    status          TEXT        NOT NULL DEFAULT 'ready' CHECK (status IN ('processing', 'ready', 'failed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_conversation ON documents (conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_documents_library      ON documents (created_at) WHERE conversation_id IS NULL;

COMMENT ON TABLE documents IS 'Hồ sơ tài liệu đã nạp. Vector nằm ở Qdrant, không nằm trong bảng này.';
COMMENT ON COLUMN documents."mimeType" IS 'Giữ nguyên chữ M hoa: src/db/postgres.py chọn cột này theo tên.';


-- ============================================================
-- Tự cập nhật conversations.last_message_at mỗi khi có tin nhắn mới
-- ============================================================
CREATE OR REPLACE FUNCTION touch_conversation() RETURNS trigger AS $$
BEGIN
    UPDATE conversations SET last_message_at = NEW.created_at WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_messages_touch_conversation ON messages;
CREATE TRIGGER trg_messages_touch_conversation
    AFTER INSERT ON messages
    FOR EACH ROW EXECUTE FUNCTION touch_conversation();


-- ============================================================
-- Kiểm tra nhanh sau khi chạy (bỏ comment để xem):
--   SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY 1;
--   -> phải thấy: conversations, documents, messages
-- ============================================================
