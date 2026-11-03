-- ============================================================
-- SEAL SP2026 Track B — Warehouse PostgreSQL Schema
-- ============================================================
-- Generated from full data audit of all 8 sources
-- Run this BEFORE importing any data
-- ============================================================

-- Clean slate (uncomment for fresh reset)
-- DROP TABLE IF EXISTS customs_items CASCADE;
-- DROP TABLE IF EXISTS customs_declarations CASCADE;
-- DROP TABLE IF EXISTS manifest_packages CASCADE;
-- DROP TABLE IF EXISTS flight_manifests CASCADE;
-- DROP TABLE IF EXISTS packing_slips CASCADE;
-- DROP TABLE IF EXISTS damage_reports CASCADE;
-- DROP TABLE IF EXISTS repacking_logs CASCADE;
-- DROP TABLE IF EXISTS deliveries CASCADE;

-- ============================================================
-- TABLE 1: deliveries
-- Source: theo_doi_giao_noi_dia.csv (8,664 rows)
-- Purpose: Domestic delivery tracking — core operational data
-- ============================================================
CREATE TABLE IF NOT EXISTS deliveries (
    delivery_id           VARCHAR(10) PRIMARY KEY,         -- DEL0000001
    tracking_code         VARCHAR(10) NOT NULL,            -- TRK0000003 (FK to packing_slips, damage_reports)
    order_code            VARCHAR(10) NOT NULL,            -- ORD0000002
    customer_code         VARCHAR(7)  NOT NULL,            -- KH00006
    recipient_name        VARCHAR(50) NOT NULL,            -- Bùi Yến Bảo
    recipient_phone       VARCHAR(12) NOT NULL,            -- 988718514
    province              VARCHAR(15) NOT NULL,            -- 15 unique: TP.HCM, Hà Nội, Đà Nẵng...
    district              VARCHAR(5)  NOT NULL,            -- Q.3, H.7, Q.10...
    full_address          VARCHAR(50) NOT NULL,            -- "488 Lê Lợi, Cần Thơ"
    carrier               VARCHAR(15) NOT NULL,            -- 7 unique: GHN, SPX Express, GHTK, J&T Express, Best Express, Viettel Post, Ninja Van
    carrier_tracking_code VARCHAR(12) NOT NULL UNIQUE,     -- VV4VG6TSJC7L (carrier's own tracking)
    domestic_warehouse    VARCHAR(25) NOT NULL,            -- 6 unique: Kho HCM Tân Bình, Kho Hà Nội Hoàng Mai...
    shipping_fee_vnd      INTEGER     NOT NULL,            -- 7 tiers: 20000, 25000, 30000, 35000, 45000, 60000, 75000
    cod_amount            INTEGER     NOT NULL DEFAULT 0,  -- 4 values: 0, 100000, 200000, 500000
    delivery_status       VARCHAR(15) NOT NULL,            -- 3 values: delivered, failed_attempt, returned
    attempt_count         SMALLINT    NOT NULL DEFAULT 1,  -- 1, 2, or 3
    scheduled_date        DATE        NOT NULL,
    actual_delivery_date  DATE        NOT NULL,
    delivery_note         VARCHAR(25)                      -- NULLABLE (19% empty). 4 values: Giao thành công, Khách hẹn giao lại, Không có người nhận, Địa chỉ không đúng
);

CREATE INDEX IF NOT EXISTS idx_del_tracking    ON deliveries(tracking_code);
CREATE INDEX IF NOT EXISTS idx_del_order       ON deliveries(order_code);
CREATE INDEX IF NOT EXISTS idx_del_customer    ON deliveries(customer_code);
CREATE INDEX IF NOT EXISTS idx_del_status      ON deliveries(delivery_status);
CREATE INDEX IF NOT EXISTS idx_del_carrier     ON deliveries(carrier);
CREATE INDEX IF NOT EXISTS idx_del_warehouse   ON deliveries(domestic_warehouse);
CREATE INDEX IF NOT EXISTS idx_del_province    ON deliveries(province);
CREATE INDEX IF NOT EXISTS idx_del_sched_date  ON deliveries(scheduled_date);

COMMENT ON TABLE deliveries IS 'Domestic delivery tracking — 8,664 records from theo_doi_giao_noi_dia.csv';
COMMENT ON COLUMN deliveries.delivery_note IS 'Nullable. 19% empty. Values: Giao thành công, Khách hẹn giao lại, Không có người nhận, Địa chỉ không đúng';


-- ============================================================
-- TABLE 2: repacking_logs
-- Source: nhat_ky_dong_goi_lai.csv (600 rows)
-- Purpose: Repack history — tracking weight changes & costs
-- ============================================================
CREATE TABLE IF NOT EXISTS repacking_logs (
    repack_id          VARCHAR(9)  PRIMARY KEY,            -- RPK000001
    tracking_code      VARCHAR(10) NOT NULL,               -- TRK0009012
    order_code         VARCHAR(10) NOT NULL,               -- ORD0005995
    customer_code      VARCHAR(7)  NOT NULL,               -- KH01812
    reason             VARCHAR(35) NOT NULL,               -- 5 values: Tối ưu cước phí, Hộp gốc bị hỏng khi vận chuyển, Kiểm tra phát hiện bao bì rách, Hàng fragile cần gia cố, Khách yêu cầu gom nhiều đơn
    original_box_count SMALLINT    NOT NULL,               -- 1-4
    new_box_count      SMALLINT    NOT NULL,               -- 1-6
    original_weight_kg REAL        NOT NULL,               -- e.g. 1.61
    new_weight_kg      REAL        NOT NULL,               -- e.g. 1.53
    repack_fee_vnd     INTEGER     NOT NULL,               -- 6 tiers: 30000, 50000, 70000, 100000, 150000, 200000
    material_cost_vnd  INTEGER     NOT NULL,               -- 5 tiers: 10000, 15000, 20000, 30000, 50000
    requested_at       TIMESTAMP   NOT NULL,
    completed_at       TIMESTAMP   NOT NULL,
    repack_staff       VARCHAR(20) NOT NULL,               -- 7 staff: An Bình Lê, Cẩm Tú Phạm, Dũng Hà Trần, Kiên Trung Võ, Mỹ Linh Nguyễn, Thanh Sơn Bùi, Ý Nhi Đoàn
    approved_by        VARCHAR(25) NOT NULL,               -- 3 values: Quản lý Kho HCM, Quản lý Kho HN, Warehouse Supervisor
    status             VARCHAR(11) NOT NULL,               -- 3 values: completed, in_progress, pending
    before_photo_url   VARCHAR(50) NOT NULL,
    after_photo_url    VARCHAR(50) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rpk_tracking ON repacking_logs(tracking_code);
CREATE INDEX IF NOT EXISTS idx_rpk_order    ON repacking_logs(order_code);
CREATE INDEX IF NOT EXISTS idx_rpk_status   ON repacking_logs(status);
CREATE INDEX IF NOT EXISTS idx_rpk_staff    ON repacking_logs(repack_staff);

COMMENT ON TABLE repacking_logs IS 'Repack log — 600 records from nhat_ky_dong_goi_lai.csv';


-- ============================================================
-- TABLE 3: flight_manifests
-- Source: manifest_chuyen_bay/*.pdf (400 PDFs → header section)
-- Purpose: Flight-level cargo info, customs status, delays
-- ============================================================
CREATE TABLE IF NOT EXISTS flight_manifests (
    flight_id          VARCHAR(6)  PRIMARY KEY,            -- FL0001
    flight_number      VARCHAR(6)  NOT NULL,               -- TG202, CX608, VJ188...
    airline            VARCHAR(5)  NOT NULL,               -- TG, CX, VJ, TR...
    route              VARCHAR(25) NOT NULL,               -- "HN - Seoul", "HCM - Los Angeles"
    departure_time     TIMESTAMP   NOT NULL,
    arrival_time       TIMESTAMP   NOT NULL,
    status             VARCHAR(15) NOT NULL,               -- ARRIVED, DELAYED, etc.
    operation_cost_vnd BIGINT      NOT NULL,               -- e.g. 51000000 (51M VND)
    total_weight_kg    REAL        NOT NULL,               -- e.g. 1423.0
    total_packages     INTEGER     NOT NULL,               -- e.g. 172
    customs_date       DATE,                               -- Ngày thông quan (nullable if not yet)
    customs_status     VARCHAR(15),                        -- CLEARED, UNDER_REVIEW
    delay_hours        INTEGER     DEFAULT 0,              -- 0 = no delay
    delay_reason       VARCHAR(50),                        -- "Tắc nghẽn cảng", nullable
    confirmed_by       VARCHAR(30)                         -- NV kho xác nhận
);

COMMENT ON TABLE flight_manifests IS 'Flight cargo manifest headers — parsed from 400 PDFs';


-- ============================================================
-- TABLE 4: manifest_packages
-- Source: manifest_chuyen_bay/*.pdf (400 PDFs → package table rows)
-- Purpose: Individual package details per flight (~6,000-8,000 rows)
-- ============================================================
CREATE TABLE IF NOT EXISTS manifest_packages (
    id                    SERIAL PRIMARY KEY,
    flight_id             VARCHAR(6)  NOT NULL REFERENCES flight_manifests(flight_id),
    stt                   INTEGER     NOT NULL,            -- Row number in manifest
    tracking_code         VARCHAR(10) NOT NULL,            -- TRK0000164
    order_code            VARCHAR(10) NOT NULL,            -- ORD0000116
    product_category      VARCHAR(30) NOT NULL,            -- "Sách - Văn phòng phẩm", "Mỹ phẩm - Skincare"...
    package_status        VARCHAR(15) NOT NULL,            -- delivered, in_transit
    weight_actual_kg      REAL        NOT NULL,            -- KL Thực
    weight_volumetric_kg  REAL        NOT NULL,            -- KL Thể tích
    weight_chargeable_kg  REAL        NOT NULL,            -- KL Cước = MAX(actual, volumetric)
    is_fragile            BOOLEAN     NOT NULL DEFAULT FALSE,  -- CÓ/KHÔNG
    customs_declaration   VARCHAR(20) NOT NULL             -- "Hàng mẫu", "Hàng thương mại", "Đồ dùng cá nhân"
);

CREATE INDEX IF NOT EXISTS idx_mpkg_flight   ON manifest_packages(flight_id);
CREATE INDEX IF NOT EXISTS idx_mpkg_tracking ON manifest_packages(tracking_code);
CREATE INDEX IF NOT EXISTS idx_mpkg_order    ON manifest_packages(order_code);
CREATE INDEX IF NOT EXISTS idx_mpkg_status   ON manifest_packages(package_status);

COMMENT ON TABLE manifest_packages IS 'Individual packages per flight — parsed from manifest PDF tables';


-- ============================================================
-- TABLE 5: customs_declarations
-- Source: to_khai_hai_quan/*.pdf (60 PDFs → header)
-- Purpose: Import customs declaration header info
-- ============================================================
CREATE TABLE IF NOT EXISTS customs_declarations (
    id                 SERIAL PRIMARY KEY,
    declaration_no     VARCHAR(20) NOT NULL UNIQUE,        -- HQ-VN-393185-2024
    declaration_date   DATE        NOT NULL,
    flight_number      VARCHAR(6)  NOT NULL,               -- CX608 (airline flight code)
    route              VARCHAR(25) NOT NULL,               -- HCM - Los Angeles
    port_of_entry      VARCHAR(20) NOT NULL,               -- "Nội Bài", "Tân Sơn Nhất"
    tax_id             VARCHAR(15) NOT NULL,               -- Mã số thuế
    customs_officer    VARCHAR(10) NOT NULL,               -- HQ-880
    status             VARCHAR(15) NOT NULL,               -- CLEARED, PENDING
    total_packages     INTEGER     NOT NULL,
    total_weight_kg    REAL        NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cust_flight ON customs_declarations(flight_number);
CREATE INDEX IF NOT EXISTS idx_cust_status ON customs_declarations(status);

COMMENT ON TABLE customs_declarations IS 'Customs declaration headers — parsed from 60 PDFs';


-- ============================================================
-- TABLE 6: customs_items
-- Source: to_khai_hai_quan/*.pdf (60 PDFs → item table rows)
-- Purpose: Individual items declared at customs with tax info
-- ============================================================
CREATE TABLE IF NOT EXISTS customs_items (
    id                 SERIAL PRIMARY KEY,
    declaration_no     VARCHAR(20) NOT NULL REFERENCES customs_declarations(declaration_no),
    stt                INTEGER     NOT NULL,
    tracking_code      VARCHAR(10) NOT NULL,               -- TRK0001242
    product_category   VARCHAR(30) NOT NULL,               -- "Sách - Văn phòng phẩm"
    customs_type       VARCHAR(20) NOT NULL,               -- "Quà tặng", "Hàng thương mại", "Hàng mẫu", "Đồ dùng cá nhân"
    weight_kg          REAL        NOT NULL,
    declared_value_vnd BIGINT      NOT NULL,               -- e.g. 28327950
    tax_percent        REAL        NOT NULL,               -- 0, 5, 8, 10, 12, 15
    tax_amount_vnd     BIGINT      NOT NULL                -- calculated = value * tax%
);

CREATE INDEX IF NOT EXISTS idx_citems_decl     ON customs_items(declaration_no);
CREATE INDEX IF NOT EXISTS idx_citems_tracking ON customs_items(tracking_code);

COMMENT ON TABLE customs_items IS 'Individual items on customs declarations with tax info';


-- ============================================================
-- TABLE 7: damage_reports  
-- Source: bien_ban_hu_hong/*.jpg (120 files → Gemini OCR)
-- Purpose: Damage inspection reports with compensation details
-- ============================================================
CREATE TABLE IF NOT EXISTS damage_reports (
    damage_report_id           VARCHAR(15) PRIMARY KEY,    -- DMG-0001-2026
    tracking_code              VARCHAR(10) NOT NULL,       -- TRK0003227
    order_code                 VARCHAR(10) NOT NULL,       -- ORD0002138
    product_category           VARCHAR(30) NOT NULL,       -- "Thời trang - Quần áo"
    product_name               VARCHAR(50) NOT NULL,       -- "Áo khoác Zara trench"
    warehouse                  VARCHAR(25) NOT NULL,       -- "Kho HN Hoàng Mai"
    detected_at                TIMESTAMP   NOT NULL,
    weight_actual_kg           REAL        NOT NULL,
    weight_volumetric_kg       REAL        NOT NULL,
    weight_chargeable_kg       REAL        NOT NULL,
    dimensions_cm              VARCHAR(15) NOT NULL,       -- "34x23x24"
    has_insurance              BOOLEAN     NOT NULL DEFAULT FALSE,
    declared_value_vnd         BIGINT      NOT NULL,       -- 37933750
    damage_type                VARCHAR(50) NOT NULL,       -- "Bao bì bị ẩm ướt"
    severity                   VARCHAR(50) NOT NULL,       -- "Nhẹ — hàng vẫn nguyên vẹn"
    damage_location            VARCHAR(30) NOT NULL,       -- "Góc trái dưới"
    cause                      VARCHAR(50) NOT NULL,       -- "Ép đè nặng"
    has_photo                  BOOLEAN     NOT NULL DEFAULT TRUE,
    recommended_action         VARCHAR(50) NOT NULL,       -- "Giao hàng kèm biên bản"
    estimated_compensation_vnd BIGINT      NOT NULL,       -- 12957136
    compensation_condition     VARCHAR(100) NOT NULL       -- "Không có bảo hiểm → bồi thường 50% thiệt hại"
);

CREATE INDEX IF NOT EXISTS idx_dmg_tracking ON damage_reports(tracking_code);
CREATE INDEX IF NOT EXISTS idx_dmg_order    ON damage_reports(order_code);
CREATE INDEX IF NOT EXISTS idx_dmg_type     ON damage_reports(damage_type);

COMMENT ON TABLE damage_reports IS 'Damage inspection reports — OCR from 120 JPG images via Gemini Vision';


-- ============================================================
-- TABLE 8: packing_slips
-- Source: phieu_dong_goi/*.jpg (500 files → Gemini OCR)
-- Purpose: Packing details with weight formula & QC status
-- ============================================================
CREATE TABLE IF NOT EXISTS packing_slips (
    packing_slip_id     VARCHAR(12) PRIMARY KEY,           -- PCK0001257 (from footer)
    tracking_code       VARCHAR(10) NOT NULL,              -- TRK0001617
    order_code          VARCHAR(10) NOT NULL,              -- ORD0001079
    customer_code       VARCHAR(7)  NOT NULL,              -- KH01015
    product_name        VARCHAR(50) NOT NULL,              -- "ASUS ZenBook 14"
    product_category    VARCHAR(30) NOT NULL,              -- "Điện tử - Laptop"
    overseas_warehouse  VARCHAR(25) NOT NULL,              -- "Warehouse Tokyo", "Warehouse Seoul"
    domestic_warehouse  VARCHAR(25) NOT NULL,              -- "Kho Hà Nội Long Biên"
    flight_code         VARCHAR(6)  NOT NULL,              -- FL0295
    weight_actual_kg    REAL        NOT NULL,
    weight_volumetric_kg REAL       NOT NULL,
    weight_chargeable_kg REAL       NOT NULL,              -- MAX(actual, volumetric)
    dimensions_cm       VARCHAR(15) NOT NULL,              -- "19x24x21"
    box_size            VARCHAR(15) NOT NULL,              -- "XL(50x45x30)"
    material            VARCHAR(25) NOT NULL,              -- "Thùng carton đơn", "Túi zip chống nước"
    is_fragile          BOOLEAN     NOT NULL DEFAULT FALSE,
    customs_declaration VARCHAR(20) NOT NULL,              -- "Hàng mẫu", "Hàng thương mại"
    declared_value_vnd  BIGINT      NOT NULL,
    has_insurance       BOOLEAN     NOT NULL DEFAULT FALSE,
    volumetric_formula  VARCHAR(50),                       -- "(19x24x21) / 6000 = 1.6 kg"
    packing_staff       VARCHAR(20) NOT NULL,
    qc_staff            VARCHAR(20) NOT NULL,
    packing_date        TIMESTAMP   NOT NULL,
    qc_status           VARCHAR(10) NOT NULL,              -- PASSED, FAILED
    notes               VARCHAR(50)                        -- Nullable. "Hút chân không", "Dán thêm nhãn Fragile"
);

CREATE INDEX IF NOT EXISTS idx_pck_tracking  ON packing_slips(tracking_code);
CREATE INDEX IF NOT EXISTS idx_pck_order     ON packing_slips(order_code);
CREATE INDEX IF NOT EXISTS idx_pck_customer  ON packing_slips(customer_code);
CREATE INDEX IF NOT EXISTS idx_pck_flight    ON packing_slips(flight_code);
CREATE INDEX IF NOT EXISTS idx_pck_qc        ON packing_slips(qc_status);
CREATE INDEX IF NOT EXISTS idx_pck_warehouse ON packing_slips(domestic_warehouse);

COMMENT ON TABLE packing_slips IS 'Packing slips with QC — OCR from 500 JPG images via Gemini Vision';


-- ============================================================
-- USEFUL VIEWS for AI Agent Text-to-SQL
-- ============================================================

-- Full shipment journey: packing → flight → customs → delivery
CREATE OR REPLACE VIEW v_shipment_journey AS
SELECT
    ps.tracking_code,
    ps.order_code,
    ps.customer_code,
    ps.product_name,
    ps.product_category,
    ps.overseas_warehouse,
    ps.flight_code,
    fm.route                AS flight_route,
    fm.departure_time       AS flight_departure,
    fm.arrival_time         AS flight_arrival,
    fm.status               AS flight_status,
    fm.customs_status,
    ps.domestic_warehouse,
    ps.weight_chargeable_kg,
    ps.declared_value_vnd,
    ps.has_insurance,
    ps.qc_status,
    d.carrier,
    d.delivery_status,
    d.scheduled_date,
    d.actual_delivery_date,
    d.delivery_note,
    d.shipping_fee_vnd,
    d.attempt_count
FROM packing_slips ps
LEFT JOIN flight_manifests fm ON ps.flight_code = fm.flight_id
LEFT JOIN deliveries d ON ps.tracking_code = d.tracking_code;

COMMENT ON VIEW v_shipment_journey IS 'Full shipment lifecycle: packing → flight → delivery';


-- Damaged packages with compensation summary
CREATE OR REPLACE VIEW v_damage_summary AS
SELECT
    dr.tracking_code,
    dr.order_code,
    dr.product_name,
    dr.damage_type,
    dr.severity,
    dr.cause,
    dr.has_insurance,
    dr.declared_value_vnd,
    dr.estimated_compensation_vnd,
    dr.compensation_condition,
    d.delivery_status,
    d.carrier
FROM damage_reports dr
LEFT JOIN deliveries d ON dr.tracking_code = d.tracking_code;

COMMENT ON VIEW v_damage_summary IS 'Damage reports joined with delivery status';


-- Weight discrepancy check (actual vs chargeable)
CREATE OR REPLACE VIEW v_weight_discrepancy AS
SELECT
    tracking_code,
    order_code,
    product_name,
    weight_actual_kg,
    weight_volumetric_kg,
    weight_chargeable_kg,
    volumetric_formula,
    CASE
        WHEN weight_chargeable_kg > weight_actual_kg
        THEN 'Tính theo thể tích (nặng hơn thực tế)'
        ELSE 'Tính theo thực tế'
    END AS charge_basis,
    ROUND(CAST((weight_chargeable_kg - weight_actual_kg) AS NUMERIC), 2) AS weight_diff_kg
FROM packing_slips
ORDER BY weight_diff_kg DESC;

COMMENT ON VIEW v_weight_discrepancy IS 'Explains why chargeable weight differs from actual weight';
