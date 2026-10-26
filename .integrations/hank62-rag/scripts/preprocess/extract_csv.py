"""Phase 1a: Extract CSV → JSON.

Sources:
  - theo_doi_giao_noi_dia.csv → deliveries.json (8,664 rows)
  - nhat_ky_dong_goi_lai.csv  → repacking_logs.json (600 rows)

Output: data/extracted/*.json
"""

import csv
import json
import os
import sys
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "..", "SEAL SP2026 FOR STUDENTS", "warehouse", "WAREHOUSE")
OUT_DIR = os.path.join(BASE_DIR, "..", "..", "data", "extracted")
os.makedirs(OUT_DIR, exist_ok=True)


def parse_date(val: str) -> str | None:
    """Parse date string, return ISO format or None."""
    val = val.strip()
    if not val:
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d").strftime("%Y-%m-%d")
    except ValueError:
        return val


def parse_timestamp(val: str) -> str | None:
    """Parse timestamp string, return ISO format or None."""
    val = val.strip()
    if not val:
        return None
    try:
        return datetime.strptime(val, "%Y-%m-%d %H:%M:%S").isoformat()
    except ValueError:
        return val


def parse_int(val: str) -> int | None:
    val = val.strip()
    if not val:
        return None
    return int(val)


def parse_float(val: str) -> float | None:
    val = val.strip()
    if not val:
        return None
    return float(val)


def extract_deliveries():
    """Extract theo_doi_giao_noi_dia.csv → deliveries.json."""
    src = os.path.join(DATA_DIR, "theo_doi_giao_noi_dia.csv")
    if not os.path.exists(src):
        print(f"❌ File not found: {src}")
        return False

    records = []
    with open(src, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            record = {
                "delivery_id": row["delivery_id"].strip(),
                "tracking_code": row["tracking_code"].strip(),
                "order_code": row["order_code"].strip(),
                "customer_code": row["customer_code"].strip(),
                "recipient_name": row["recipient_name"].strip(),
                "recipient_phone": row["recipient_phone"].strip(),
                "province": row["province"].strip(),
                "district": row["district"].strip(),
                "full_address": row["full_address"].strip(),
                "carrier": row["carrier"].strip(),
                "carrier_tracking_code": row["carrier_tracking_code"].strip(),
                "domestic_warehouse": row["domestic_warehouse"].strip(),
                "shipping_fee_vnd": parse_int(row["shipping_fee_vnd"]),
                "cod_amount": parse_int(row["cod_amount"]),
                "delivery_status": row["delivery_status"].strip(),
                "attempt_count": parse_int(row["attempt_count"]),
                "scheduled_date": parse_date(row["scheduled_date"]),
                "actual_delivery_date": parse_date(row["actual_delivery_date"]),
                "delivery_note": row["delivery_note"].strip() or None,
            }
            records.append(record)

    out_path = os.path.join(OUT_DIR, "deliveries.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    # Validation
    valid_statuses = {"delivered", "failed_attempt", "returned"}
    invalid = [r for r in records if r["delivery_status"] not in valid_statuses]
    null_tracking = [r for r in records if not r["tracking_code"]]
    dup_delivery_ids = len(records) - len({r["delivery_id"] for r in records})

    print(f"✅ deliveries.json: {len(records)} records")
    print(f"   Unique delivery_ids: {len({r['delivery_id'] for r in records})}")
    print(f"   Unique tracking_codes: {len({r['tracking_code'] for r in records})}")
    print(f"   Statuses: {sorted({r['delivery_status'] for r in records})}")
    print(f"   Carriers: {sorted({r['carrier'] for r in records})}")
    print(f"   Warehouses: {sorted({r['domestic_warehouse'] for r in records})}")
    print(f"   Date range: {min(r['scheduled_date'] for r in records)} → {max(r['scheduled_date'] for r in records)}")
    print(f"   Null delivery_notes: {sum(1 for r in records if r['delivery_note'] is None)}")
    if invalid:
        print(f"   ⚠️  Invalid statuses: {invalid[:3]}")
    if null_tracking:
        print(f"   ⚠️  Null tracking codes: {len(null_tracking)}")
    if dup_delivery_ids:
        print(f"   ⚠️  Duplicate delivery_ids: {dup_delivery_ids}")

    # Sample record
    print(f"\n   Sample record:")
    print(f"   {json.dumps(records[0], ensure_ascii=False, indent=4)}")

    return len(records) == 8664


def extract_repacking():
    """Extract nhat_ky_dong_goi_lai.csv → repacking_logs.json."""
    src = os.path.join(DATA_DIR, "nhat_ky_dong_goi_lai.csv")
    if not os.path.exists(src):
        print(f"❌ File not found: {src}")
        return False

    records = []
    with open(src, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for row in reader:
            record = {
                "repack_id": row["repack_id"].strip(),
                "tracking_code": row["tracking_code"].strip(),
                "order_code": row["order_code"].strip(),
                "customer_code": row["customer_code"].strip(),
                "reason": row["reason"].strip(),
                "original_box_count": parse_int(row["original_box_count"]),
                "new_box_count": parse_int(row["new_box_count"]),
                "original_weight_kg": parse_float(row["original_weight_kg"]),
                "new_weight_kg": parse_float(row["new_weight_kg"]),
                "repack_fee_vnd": parse_int(row["repack_fee_vnd"]),
                "material_cost_vnd": parse_int(row["material_cost_vnd"]),
                "requested_at": parse_timestamp(row["requested_at"]),
                "completed_at": parse_timestamp(row["completed_at"]),
                "repack_staff": row["repack_staff"].strip(),
                "approved_by": row["approved_by"].strip(),
                "status": row["status"].strip(),
                "before_photo_url": row["before_photo_url"].strip(),
                "after_photo_url": row["after_photo_url"].strip(),
            }
            records.append(record)

    out_path = os.path.join(OUT_DIR, "repacking_logs.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    # Validation
    valid_statuses = {"completed", "in_progress", "pending"}
    invalid = [r for r in records if r["status"] not in valid_statuses]
    dup_ids = len(records) - len({r["repack_id"] for r in records})

    print(f"\n✅ repacking_logs.json: {len(records)} records")
    print(f"   Unique repack_ids: {len({r['repack_id'] for r in records})}")
    print(f"   Unique tracking_codes: {len({r['tracking_code'] for r in records})}")
    print(f"   Statuses: {sorted({r['status'] for r in records})}")
    print(f"   Reasons: {sorted({r['reason'] for r in records})}")
    print(f"   Staff: {sorted({r['repack_staff'] for r in records})}")
    print(f"   Approved by: {sorted({r['approved_by'] for r in records})}")
    print(f"   Fee range: {min(r['repack_fee_vnd'] for r in records)} → {max(r['repack_fee_vnd'] for r in records)}")
    if invalid:
        print(f"   ⚠️  Invalid statuses: {invalid[:3]}")
    if dup_ids:
        print(f"   ⚠️  Duplicate repack_ids: {dup_ids}")

    print(f"\n   Sample record:")
    print(f"   {json.dumps(records[0], ensure_ascii=False, indent=4)}")

    return len(records) == 600


if __name__ == "__main__":
    print("=" * 60)
    print("Phase 1a: Extract CSV → JSON")
    print("=" * 60)

    ok1 = extract_deliveries()
    ok2 = extract_repacking()

    print("\n" + "=" * 60)
    if ok1 and ok2:
        print("✅ ALL PASS — CSV extraction complete")
    else:
        print("❌ ISSUES FOUND")
        sys.exit(1)
    print("=" * 60)
