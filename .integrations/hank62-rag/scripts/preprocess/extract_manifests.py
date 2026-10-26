"""Phase 1b: Extract Manifest PDFs → JSON.

Sources: manifest_chuyen_bay/*.pdf (400 files)
Output:
  - data/extracted/flight_manifests.json     (~400 records)
  - data/extracted/manifest_packages.json    (~6,000-8,000 records)
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

# Header key mapping (Vietnamese label → JSON field)
HEADER_MAP = {
    "Mã chuyến bay": "flight_id",
    "Số hiệu": "flight_number",
    "Hãng hàng không": "airline",
    "Tuyến bay": "route",
    "Ngày khởi hành": "departure_time",
    "Ngày đến": "arrival_time",
    "Trạng thái": "status",
    "Chi phí vận hành": "operation_cost_vnd",
    "Tổng KL hàng": "total_weight_kg",
    "Số kiện": "total_packages",
    "Ngày thông quan": "customs_date",
    "Tình trạng TQ": "customs_status",
    "Delay": "delay_hours",
    "Lý do delay": "delay_reason",
}


def parse_cost(val: str) -> int:
    """'51,000,000 VND' → 51000000"""
    return int(re.sub(r"[^\d]", "", val))


def parse_weight(val: str) -> float:
    """'1423.0 kg' → 1423.0"""
    return float(re.sub(r"[^\d.]", "", val))


def parse_delay(val: str) -> int:
    """'24 giờ' → 24"""
    match = re.search(r"(\d+)", val)
    return int(match.group(1)) if match else 0


def parse_manifest_pdf(pdf_path: str):
    """Parse one manifest PDF into header dict + list of package dicts."""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text("text")
    doc.close()

    lines = [line.strip() for line in text.split("\n") if line.strip()]

    # --- Parse header (key-value pairs) ---
    header = {}
    i = 0
    while i < len(lines):
        line = lines[i]

        # Check if line matches a header key
        matched_key = None
        for vn_label, field in HEADER_MAP.items():
            if line.startswith(vn_label):
                matched_key = field
                break

        if matched_key and i + 1 < len(lines):
            raw_val = lines[i + 1]

            if matched_key == "operation_cost_vnd":
                header[matched_key] = parse_cost(raw_val)
            elif matched_key == "total_weight_kg":
                header[matched_key] = parse_weight(raw_val)
            elif matched_key == "total_packages":
                header[matched_key] = int(re.sub(r"[^\d]", "", raw_val))
            elif matched_key == "delay_hours":
                header[matched_key] = parse_delay(raw_val)
            else:
                header[matched_key] = raw_val

            i += 2
            continue

        # Stop header parsing when we hit the package list section
        if "DANH SÁCH KIỆN HÀNG" in line:
            i += 1
            break

        i += 1

    # --- Parse package table ---
    # Skip table header row (STT, Mã Tracking, Mã Đơn, ...)
    # Find where the table data starts (lines with TRK pattern)
    packages = []
    pkg_lines = lines[i:]

    # Skip header line(s)
    start_idx = 0
    for j, line in enumerate(pkg_lines):
        if line == "STT" or line.startswith("Mã Tracking"):
            start_idx = j + 1
            continue
        if re.match(r"^\d+$", line) and j >= start_idx:
            start_idx = j
            break

    # Parse packages: each package = sequence of values
    # Pattern: STT, TRK, ORD, Category, Status, actual_kg, vol_kg, charge_kg, fragile, customs_decl
    idx = start_idx
    while idx < len(pkg_lines):
        line = pkg_lines[idx]

        # Stop at summary section
        if "TỔNG KẾT" in line or "Xác nhận" in line:
            break

        # STT (just a number)
        if re.match(r"^\d+$", line):
            stt = int(line)

            # Collect next values
            vals = []
            idx += 1
            while idx < len(pkg_lines) and len(vals) < 9:
                val = pkg_lines[idx]
                if "TỔNG KẾT" in val or "Xác nhận" in val:
                    break
                # Check if this is the next STT (new package)
                if re.match(r"^\d+$", val) and len(vals) >= 7:
                    break
                vals.append(val)
                idx += 1

            if len(vals) >= 7:
                # Parse values
                tracking = vals[0]
                order = vals[1]
                category = vals[2]
                status = vals[3]
                actual_kg = float(vals[4])

                # vol_kg and charge_kg might be on same line separated by space
                vol_charge = vals[5].split()
                if len(vol_charge) >= 2:
                    vol_kg = float(vol_charge[0])
                    charge_kg = float(vol_charge[1])
                    fragile_idx = 6
                else:
                    vol_kg = float(vals[5])
                    charge_kg = float(vals[6])
                    fragile_idx = 7

                is_fragile = vals[fragile_idx] == "CÓ" if fragile_idx < len(vals) else False
                customs_decl = vals[fragile_idx + 1] if fragile_idx + 1 < len(vals) else ""

                pkg = {
                    "flight_id": header.get("flight_id", ""),
                    "stt": stt,
                    "tracking_code": tracking,
                    "order_code": order,
                    "product_category": category,
                    "package_status": status,
                    "weight_actual_kg": actual_kg,
                    "weight_volumetric_kg": vol_kg,
                    "weight_chargeable_kg": charge_kg,
                    "is_fragile": is_fragile,
                    "customs_declaration": customs_decl,
                }
                packages.append(pkg)
            continue

        idx += 1

    # Extract confirmed_by from footer
    confirmed_by = None
    for line in lines:
        if "Xác nhận:" in line or "NV Kho" in line:
            match = re.search(r"NV Kho\s+(.+?)(?:\s*\||\s*$)", line)
            if match:
                confirmed_by = match.group(1).strip()
    header["confirmed_by"] = confirmed_by

    return header, packages


def main():
    print("=" * 60)
    print("Phase 1b: Extract Manifest PDFs → JSON")
    print("=" * 60)

    manifest_dir = os.path.join(DATA_DIR, "manifest_chuyen_bay")
    pdf_files = sorted(glob.glob(os.path.join(manifest_dir, "*.pdf")))
    print(f"Found {len(pdf_files)} PDF files\n")

    all_flights = []
    all_packages = []
    errors = []

    for i, pdf_path in enumerate(pdf_files):
        fname = os.path.basename(pdf_path)
        try:
            header, packages = parse_manifest_pdf(pdf_path)

            if not header.get("flight_id"):
                errors.append((fname, "Missing flight_id"))
                continue

            all_flights.append(header)
            all_packages.extend(packages)

            if (i + 1) % 100 == 0:
                print(f"  ✅ {i+1}/{len(pdf_files)} parsed... ({len(all_packages)} packages so far)")

        except Exception as e:
            errors.append((fname, str(e)))

    # Save JSONs
    flights_path = os.path.join(OUT_DIR, "flight_manifests.json")
    with open(flights_path, "w", encoding="utf-8") as f:
        json.dump(all_flights, f, ensure_ascii=False, indent=2)

    packages_path = os.path.join(OUT_DIR, "manifest_packages.json")
    with open(packages_path, "w", encoding="utf-8") as f:
        json.dump(all_packages, f, ensure_ascii=False, indent=2)

    # Validation
    flight_ids = {fl["flight_id"] for fl in all_flights}
    pkg_flight_ids = {p["flight_id"] for p in all_packages}
    orphan_pkgs = pkg_flight_ids - flight_ids

    print(f"\n✅ flight_manifests.json: {len(all_flights)} flights")
    print(f"   Unique flight_ids: {len(flight_ids)}")
    print(f"   Statuses: {sorted({fl.get('status', '?') for fl in all_flights})}")
    print(f"   Customs: {sorted({fl.get('customs_status', '?') for fl in all_flights})}")
    print(f"   Routes: {sorted({fl.get('route', '?') for fl in all_flights})[:10]}...")

    print(f"\n✅ manifest_packages.json: {len(all_packages)} packages")
    print(f"   Unique tracking_codes: {len({p['tracking_code'] for p in all_packages})}")
    print(f"   Package statuses: {sorted({p['package_status'] for p in all_packages})}")
    print(f"   Orphaned packages (no matching flight): {len(orphan_pkgs)}")

    if errors:
        print(f"\n⚠️  {len(errors)} errors:")
        for fname, err in errors[:5]:
            print(f"   {fname}: {err}")

    # Sample records
    print(f"\n   Sample flight:")
    print(f"   {json.dumps(all_flights[0], ensure_ascii=False, indent=4)}")
    print(f"\n   Sample package:")
    print(f"   {json.dumps(all_packages[0], ensure_ascii=False, indent=4)}")

    print("\n" + "=" * 60)
    if not errors and len(all_flights) == 400:
        print("✅ ALL PASS — Manifest extraction complete")
    else:
        print(f"⚠️  {len(all_flights)}/400 flights, {len(errors)} errors")
    print("=" * 60)


if __name__ == "__main__":
    main()
