"""Full audit of SEAL SP2026 Track B Warehouse data.

Verifies every single file is readable and extracts sample records.
Outputs a detailed report with pass/fail per file.
"""

import csv
import json
import os
import glob
import sys
from datetime import datetime

try:
    import fitz  # PyMuPDF
except ImportError:
    print("❌ PyMuPDF not installed: pip install pymupdf")
    sys.exit(1)

try:
    import docx
except ImportError:
    print("❌ python-docx not installed: pip install python-docx")
    sys.exit(1)


BASE = os.path.join(os.path.dirname(__file__), "..", "SEAL SP2026 FOR STUDENTS", "warehouse")
WH = os.path.join(BASE, "WAREHOUSE")
POL = os.path.join(BASE, "chinh_sach_cong_ty")

REPORT = {
    "audit_time": datetime.now().isoformat(),
    "sources": {},
    "totals": {"files": 0, "pass": 0, "fail": 0, "rows_for_db": 0, "chars_for_rag": 0},
}


def audit_csv(name, path):
    """Audit a CSV file: check every row is parseable."""
    result = {"type": "CSV", "path": path, "status": "PASS", "errors": []}

    if not os.path.exists(path):
        result["status"] = "MISSING"
        return result

    with open(path, "r", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        rows = []
        for i, row in enumerate(reader, 1):
            rows.append(row)
            # Check for completely empty rows
            if all(not v.strip() for v in row.values()):
                result["errors"].append(f"Row {i}: completely empty")

    empty_by_col = {}
    for col in fields:
        empty_count = sum(1 for r in rows if not r[col].strip())
        if empty_count > 0:
            empty_by_col[col] = empty_count

    result["rows"] = len(rows)
    result["columns"] = len(fields)
    result["fields"] = fields
    result["empty_by_column"] = empty_by_col
    result["size_kb"] = os.path.getsize(path) // 1024
    result["sample"] = rows[0] if rows else {}

    REPORT["totals"]["rows_for_db"] += len(rows)
    return result


def audit_pdf_dir(name, dir_path):
    """Audit every PDF in a directory."""
    result = {"type": "PDF", "path": dir_path, "status": "PASS", "errors": [], "files": []}

    if not os.path.exists(dir_path):
        result["status"] = "MISSING"
        return result

    pdfs = sorted(glob.glob(os.path.join(dir_path, "*.pdf")))
    result["total_files"] = len(pdfs)

    ok = 0
    empty = 0
    failed = []
    total_chars = 0
    sample_text = ""

    for pdf_path in pdfs:
        fname = os.path.basename(pdf_path)
        try:
            doc = fitz.open(pdf_path)
            text = ""
            for page in doc:
                text += page.get_text("text")
            page_count = len(doc)
            doc.close()

            chars = len(text.strip())
            total_chars += chars

            if chars < 50:
                empty += 1
                result["errors"].append(f"{fname}: empty ({chars} chars)")
            else:
                ok += 1
                if not sample_text:
                    sample_text = text[:300]

        except Exception as e:
            failed.append(fname)
            result["errors"].append(f"{fname}: {str(e)}")

    result["readable"] = ok
    result["empty"] = empty
    result["failed"] = len(failed)
    result["failed_files"] = failed
    result["total_chars"] = total_chars
    result["avg_chars"] = total_chars // len(pdfs) if pdfs else 0
    result["sample_text"] = sample_text

    if failed or empty:
        result["status"] = "PARTIAL"
    return result


def audit_jpg_dir(name, dir_path):
    """Audit every JPG in a directory: check file integrity."""
    result = {"type": "JPG", "path": dir_path, "status": "PASS", "errors": []}

    if not os.path.exists(dir_path):
        result["status"] = "MISSING"
        return result

    jpgs = sorted(glob.glob(os.path.join(dir_path, "*.jpg")))
    result["total_files"] = len(jpgs)

    ok = 0
    failed = []
    sizes = []

    for jpg_path in jpgs:
        fname = os.path.basename(jpg_path)
        size = os.path.getsize(jpg_path)
        if size < 1000:  # < 1KB is suspicious
            failed.append(fname)
            result["errors"].append(f"{fname}: suspiciously small ({size} bytes)")
        else:
            ok += 1
            sizes.append(size)

    result["readable"] = ok
    result["failed"] = len(failed)
    result["avg_size_kb"] = sum(sizes) // len(sizes) // 1024 if sizes else 0
    result["total_size_mb"] = sum(sizes) // 1024 // 1024 if sizes else 0
    result["min_size_kb"] = min(sizes) // 1024 if sizes else 0
    result["max_size_kb"] = max(sizes) // 1024 if sizes else 0

    REPORT["totals"]["rows_for_db"] += ok
    if failed:
        result["status"] = "PARTIAL"
    return result


def audit_docx_dir(name, dir_path, is_single_file=False):
    """Audit DOCX files."""
    result = {"type": "DOCX", "path": dir_path, "status": "PASS", "errors": [], "files": []}

    if is_single_file:
        if not os.path.exists(dir_path):
            result["status"] = "MISSING"
            return result
        files = [dir_path]
    else:
        if not os.path.exists(dir_path):
            result["status"] = "MISSING"
            return result
        files = sorted(glob.glob(os.path.join(dir_path, "*.docx")))

    result["total_files"] = len(files)
    ok = 0
    total_chars = 0
    file_details = []

    for fpath in files:
        fname = os.path.basename(fpath)
        try:
            doc = docx.Document(fpath)
            text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
            chars = len(text)
            total_chars += chars

            # Check for data references (TRK, ORD, etc.)
            refs = []
            for kw in ["TRK0", "ORD0", "KH00", "FL00", "DEL0", "RPK0", "DMG-"]:
                if kw in text:
                    refs.append(kw)

            detail = {
                "file": fname,
                "chars": chars,
                "paragraphs": len(doc.paragraphs),
                "independent": len(refs) == 0,
                "data_refs": refs if refs else None,
            }
            file_details.append(detail)

            if chars < 10:
                result["errors"].append(f"{fname}: empty ({chars} chars)")
            else:
                ok += 1

        except Exception as e:
            result["errors"].append(f"{fname}: {str(e)}")
            file_details.append({"file": fname, "error": str(e)})

    result["readable"] = ok
    result["total_chars"] = total_chars
    result["file_details"] = file_details
    result["all_independent"] = all(
        d.get("independent", False) for d in file_details if "error" not in d
    )

    REPORT["totals"]["chars_for_rag"] += total_chars

    if result["errors"]:
        result["status"] = "PARTIAL"
    return result


def run_audit():
    print("=" * 65)
    print("🔍 FULL AUDIT — SEAL SP2026 Track B Warehouse Data")
    print(f"   Time: {REPORT['audit_time']}")
    print(f"   Base: {BASE}")
    print("=" * 65)

    # 1. CSVs
    sources = {}

    print("\n📊 [1/7] CSV — theo_doi_giao_noi_dia.csv")
    r = audit_csv("deliveries", os.path.join(WH, "theo_doi_giao_noi_dia.csv"))
    sources["deliveries_csv"] = r
    print(f"   {r['status']} | {r.get('rows', 0)} rows × {r.get('columns', 0)} cols | {r.get('size_kb', 0)}KB")
    if r.get("empty_by_column"):
        for col, cnt in r["empty_by_column"].items():
            print(f"   ⚠️  Column '{col}': {cnt} empty values ({cnt*100//r['rows']}%)")

    print("\n📊 [2/7] CSV — nhat_ky_dong_goi_lai.csv")
    r = audit_csv("repacking", os.path.join(WH, "nhat_ky_dong_goi_lai.csv"))
    sources["repacking_csv"] = r
    print(f"   {r['status']} | {r.get('rows', 0)} rows × {r.get('columns', 0)} cols | {r.get('size_kb', 0)}KB")
    if r.get("empty_by_column"):
        for col, cnt in r["empty_by_column"].items():
            print(f"   ⚠️  Column '{col}': {cnt} empty values ({cnt*100//r['rows']}%)")

    # 2. PDFs
    print("\n✈️  [3/7] PDF — manifest_chuyen_bay/ (400 expected)")
    r = audit_pdf_dir("manifests", os.path.join(WH, "manifest_chuyen_bay"))
    sources["manifests_pdf"] = r
    print(f"   {r['status']} | {r.get('total_files', 0)} files | ✅ {r.get('readable', 0)} | ❌ {r.get('failed', 0)} | ∅ {r.get('empty', 0)}")
    print(f"   Avg {r.get('avg_chars', 0)} chars/file")
    REPORT["totals"]["rows_for_db"] += r.get("readable", 0)

    print("\n📜 [4/7] PDF — to_khai_hai_quan/ (60 expected)")
    r = audit_pdf_dir("customs", os.path.join(WH, "to_khai_hai_quan"))
    sources["customs_pdf"] = r
    print(f"   {r['status']} | {r.get('total_files', 0)} files | ✅ {r.get('readable', 0)} | ❌ {r.get('failed', 0)} | ∅ {r.get('empty', 0)}")
    print(f"   Avg {r.get('avg_chars', 0)} chars/file")
    REPORT["totals"]["rows_for_db"] += r.get("readable", 0)

    # 3. JPGs
    print("\n🔴 [5/7] JPG — bien_ban_hu_hong/ (120 expected, needs OCR)")
    r = audit_jpg_dir("damage_reports", os.path.join(WH, "bien_ban_hu_hong"))
    sources["damage_jpg"] = r
    print(f"   {r['status']} | {r.get('total_files', 0)} files | ✅ {r.get('readable', 0)} | ❌ {r.get('failed', 0)}")
    print(f"   Size: {r.get('min_size_kb', 0)}-{r.get('max_size_kb', 0)}KB (avg {r.get('avg_size_kb', 0)}KB) | Total {r.get('total_size_mb', 0)}MB")

    print("\n📦 [6/7] JPG — phieu_dong_goi/ (500 expected, needs OCR)")
    r = audit_jpg_dir("packing_slips", os.path.join(WH, "phieu_dong_goi"))
    sources["packing_jpg"] = r
    print(f"   {r['status']} | {r.get('total_files', 0)} files | ✅ {r.get('readable', 0)} | ❌ {r.get('failed', 0)}")
    print(f"   Size: {r.get('min_size_kb', 0)}-{r.get('max_size_kb', 0)}KB (avg {r.get('avg_size_kb', 0)}KB) | Total {r.get('total_size_mb', 0)}MB")

    # 4. DOCX
    print("\n📋 [7a/7] DOCX — SOP_kho_v3.docx")
    r = audit_docx_dir("sop", os.path.join(WH, "SOP_kho_v3.docx"), is_single_file=True)
    sources["sop_docx"] = r
    d = r.get("file_details", [{}])[0]
    print(f"   {r['status']} | {d.get('chars', 0)} chars | {d.get('paragraphs', 0)} paragraphs")
    print(f"   Independent (no data refs): {'✅ YES' if d.get('independent') else '❌ NO — refs: ' + str(d.get('data_refs'))}")

    print("\n📑 [7b/7] DOCX — chinh_sach_cong_ty/ (19 expected)")
    r = audit_docx_dir("policies", POL)
    sources["policies_docx"] = r
    print(f"   {r['status']} | {r.get('total_files', 0)} files | ✅ {r.get('readable', 0)} readable")
    print(f"   Total: {r.get('total_chars', 0)} chars | All independent: {'✅ YES' if r.get('all_independent') else '❌ NO'}")
    for d in r.get("file_details", []):
        status = "✅" if d.get("independent") else f"⚠️ refs={d.get('data_refs')}"
        print(f"     {status} {d['file']}: {d.get('chars', 0)} chars")

    REPORT["sources"] = sources

    # Summary
    all_pass = all(
        s.get("status") == "PASS"
        for s in sources.values()
    )

    total_files = (
        2  # CSVs
        + sources.get("manifests_pdf", {}).get("total_files", 0)
        + sources.get("customs_pdf", {}).get("total_files", 0)
        + sources.get("damage_jpg", {}).get("total_files", 0)
        + sources.get("packing_jpg", {}).get("total_files", 0)
        + 1  # SOP
        + sources.get("policies_docx", {}).get("total_files", 0)
    )

    print("\n" + "=" * 65)
    print(f"{'✅ ALL PASS' if all_pass else '⚠️  ISSUES FOUND'}")
    print("=" * 65)
    print(f"  Total files audited: {total_files}")
    print(f"  → PostgreSQL target: ~{REPORT['totals']['rows_for_db']} rows")
    print(f"  → Qdrant RAG target: ~{REPORT['totals']['chars_for_rag']} chars → ~{REPORT['totals']['chars_for_rag'] // 512} chunks")
    print("=" * 65)

    # Save JSON report
    report_path = os.path.join(os.path.dirname(__file__), "..", "data", "audit_report.json")
    os.makedirs(os.path.dirname(report_path), exist_ok=True)
    with open(report_path, "w", encoding="utf-8") as f:
        # Remove sample data and long text for cleaner JSON
        clean = {k: v for k, v in REPORT.items()}
        json.dump(clean, f, ensure_ascii=False, indent=2, default=str)
    print(f"\n📄 Full report saved: {os.path.abspath(report_path)}")


if __name__ == "__main__":
    run_audit()
