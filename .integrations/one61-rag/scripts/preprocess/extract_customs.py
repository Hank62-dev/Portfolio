"""Phase 1c: Extract Customs PDFs → JSON.

Sources: to_khai_hai_quan/*.pdf (60 files)
Output:
  - data/extracted/customs_declarations.json  (~60 records)
  - data/extracted/customs_items.json         (~1,000 records)
"""

import json
import os
import re
import sys
import glob

import fitz  # PyMuPDF

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "..", "SEAL SP2026 FOR STUDENTS", "warehouse", "WAREHOUSE")
OUT_DIR = os.path.join(BASE_DIR, "..", "..", "data", "extracted")
os.makedirs(OUT_DIR, exist_ok=True)

HEADER_MAP = {
    "Số tờ khai / Declaration No.": "declaration_no",
    "Ngày / Date": "declaration_date",
    "Chuyến bay / Flight": "flight_number",
    "Tuyến / Route": "route",
    "Cảng nhập / Port of Entry": "port_of_entry",
    "Mã số thuế": "tax_id",
    "NV Hải quan": "customs_officer",
    "Trạng thái": "status",
    "Tổng kiện": "total_packages",
    "Tổng KL": "total_weight_kg",
}


def parse_customs_pdf(pdf_path: str):
    """Parse one customs declaration PDF."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text")
    doc.close()

    lines = [line.strip() for line in text.split("\n") if line.strip()]

    # --- Parse header ---
    header = {}
    i = 0
    while i < len(lines):
        line = lines[i]

        matched_key = None
        for vn_label, field in HEADER_MAP.items():
            if line.startswith(vn_label) or line == vn_label:
                matched_key = field
                break

        if matched_key and i + 1 < len(lines):
            raw_val = lines[i + 1]

            if matched_key == "total_packages":
                header[matched_key] = int(re.sub(r"[^\d]", "", raw_val))
            elif matched_key == "total_weight_kg":
                header[matched_key] = float(re.sub(r"[^\d.]", "", raw_val))
            else:
                header[matched_key] = raw_val.strip()

            i += 2
            continue

        if "DANH MỤC HÀNG HÓA" in line:
            i += 1
            break

        i += 1

    # --- Parse items table ---
    # Fixed pattern per item (7 lines):
    # STT → TRK → Category → CustomsType → Weight → Value → Tax% → TaxAmount
    items = []
    item_lines = lines[i:]

    # Skip header rows (STT, Mã Tracking, Loại Hàng, ...)
    start_idx = 0
    for j, line in enumerate(item_lines):
        if line == "STT" or "Mã Tracking" in line or "Loại Hàng" in line:
            continue
        if line == "Khai Báo" or "KL (kg)" in line or "Giá Trị" in line or "Tiền Thuế" in line:
            continue
        if re.match(r"^\d+$", line):
            start_idx = j
            break

    idx = start_idx
    while idx < len(item_lines):
        line = item_lines[idx]

        # Stop at footer
        if "Xác nhận" in line or "thông quan" in line.lower():
            break

        # Each item starts with a number (STT)
        if re.match(r"^\d+$", line):
            stt = int(line)

            # Read next 7 values: TRK, Category, Type, Weight, Value, Tax%, TaxAmt
            if idx + 7 < len(item_lines):
                tracking = item_lines[idx + 1].strip()
                category = item_lines[idx + 2].strip()
                customs_type = item_lines[idx + 3].strip()
                weight_str = item_lines[idx + 4].strip()
                value_str = item_lines[idx + 5].strip()
                tax_pct_str = item_lines[idx + 6].strip()
                tax_amt_str = item_lines[idx + 7].strip()

                # Validate: tracking should start with TRK
                if not tracking.startswith("TRK"):
                    idx += 1
                    continue

                weight_kg = float(weight_str)
                declared_value = int(re.sub(r"[^\d]", "", value_str))
                tax_match = re.search(r"(\d+)%", tax_pct_str)
                tax_pct = float(tax_match.group(1)) if tax_match else 0.0
                tax_amt = int(re.sub(r"[^\d]", "", tax_amt_str))

                item = {
                    "declaration_no": header.get("declaration_no", ""),
                    "stt": stt,
                    "tracking_code": tracking,
                    "product_category": category,
                    "customs_type": customs_type,
                    "weight_kg": weight_kg,
                    "declared_value_vnd": declared_value,
                    "tax_percent": tax_pct,
                    "tax_amount_vnd": tax_amt,
                }
                items.append(item)
                idx += 8
                continue

        idx += 1

    return header, items


def main():
    print("=" * 60)
    print("Phase 1c: Extract Customs PDFs → JSON")
    print("=" * 60)

    customs_dir = os.path.join(DATA_DIR, "to_khai_hai_quan")
    pdf_files = sorted(glob.glob(os.path.join(customs_dir, "*.pdf")))
    print(f"Found {len(pdf_files)} PDF files\n")

    all_declarations = []
    all_items = []
    errors = []

    for i, pdf_path in enumerate(pdf_files):
        fname = os.path.basename(pdf_path)
        try:
            header, items = parse_customs_pdf(pdf_path)

            if not header.get("declaration_no"):
                errors.append((fname, "Missing declaration_no"))
                continue

            all_declarations.append(header)
            all_items.extend(items)

        except Exception as e:
            errors.append((fname, str(e)))

    # Save
    decl_path = os.path.join(OUT_DIR, "customs_declarations.json")
    with open(decl_path, "w", encoding="utf-8") as f:
        json.dump(all_declarations, f, ensure_ascii=False, indent=2)

    items_path = os.path.join(OUT_DIR, "customs_items.json")
    with open(items_path, "w", encoding="utf-8") as f:
        json.dump(all_items, f, ensure_ascii=False, indent=2)

    # Validation
    decl_nos = {d["declaration_no"] for d in all_declarations}
    item_decl_nos = {it["declaration_no"] for it in all_items}
    orphans = item_decl_nos - decl_nos

    print(f"✅ customs_declarations.json: {len(all_declarations)} declarations")
    print(f"   Unique declaration_nos: {len(decl_nos)}")
    print(f"   Statuses: {sorted({d.get('status', '?') for d in all_declarations})}")
    print(f"   Ports: {sorted({d.get('port_of_entry', '?') for d in all_declarations})}")
    print(f"   Routes: {sorted({d.get('route', '?') for d in all_declarations})}")

    print(f"\n✅ customs_items.json: {len(all_items)} items")
    print(f"   Unique tracking_codes: {len({it['tracking_code'] for it in all_items})}")
    print(f"   Customs types: {sorted({it['customs_type'] for it in all_items})}")
    print(f"   Tax rates: {sorted({it['tax_percent'] for it in all_items})}")
    print(f"   Orphaned items: {len(orphans)}")

    if errors:
        print(f"\n⚠️  {len(errors)} errors:")
        for fname, err in errors[:5]:
            print(f"   {fname}: {err}")

    print(f"\n   Sample declaration:")
    print(f"   {json.dumps(all_declarations[0], ensure_ascii=False, indent=4)}")
    print(f"\n   Sample item:")
    print(f"   {json.dumps(all_items[0], ensure_ascii=False, indent=4)}")

    print("\n" + "=" * 60)
    if not errors and len(all_declarations) == 60:
        print("✅ ALL PASS — Customs extraction complete")
    else:
        print(f"⚠️  {len(all_declarations)}/60 declarations, {len(errors)} errors")
    print("=" * 60)


if __name__ == "__main__":
    main()
