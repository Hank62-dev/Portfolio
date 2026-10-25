"""Phase 1e: OCR Packing Slips → JSON.

Source: phieu_dong_goi/*.jpg (500 full images, no cropping to preserve footer IDs)
Output: data/extracted/packing_slips.json
Method: Gemini 2.5 Flash Vision → structured JSON
"""

import base64
import json
import os
import glob
import sys
import time

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from google import genai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
IMG_DIR = os.path.join(
    BASE_DIR, "..", "..", "SEAL SP2026 FOR STUDENTS", "warehouse", "WAREHOUSE", "phieu_dong_goi"
)
OUT_DIR = os.path.join(BASE_DIR, "..", "..", "data", "extracted")
PROGRESS_FILE = os.path.join(OUT_DIR, "packing_slips_progress.json")
FINAL_FILE = os.path.join(OUT_DIR, "packing_slips.json")
os.makedirs(OUT_DIR, exist_ok=True)

OCR_PROMPT = """Extract ALL data from this Vietnamese packing slip image into JSON.
Return ONLY valid JSON with exactly these fields (no markdown, no explanation):
{
  "packing_slip_id": "EXTRACT FROM THE FOOTER LINE (PCK followed by digits)",
  "tracking_code": "TRK...",
  "order_code": "ORD...",
  "customer_code": "",
  "product_name": "",
  "product_category": "",
  "overseas_warehouse": "",
  "domestic_warehouse": "",
  "flight_code": "FL...",
  "weight_actual_kg": 0.0,
  "weight_volumetric_kg": 0.0,
  "weight_chargeable_kg": 0.0,
  "dimensions_cm": "LxWxH (e.g. 19x24x21)",
  "box_size": "",
  "material": "",
  "is_fragile": false,
  "customs_declaration": "",
  "declared_value_vnd": 0,
  "has_insurance": false,
  "volumetric_formula": "",
  "packing_staff": "",
  "qc_staff": "",
  "packing_date": "YYYY-MM-DD HH:MM",
  "qc_status": "Passed/Failed",
  "notes": ""
}

Rules:
- CRITICAL: "packing_slip_id" MUST be found. Look at the very bottom/footer text. Format is "PCK" followed by digits (e.g. PCK0001257).
- For boolean fields: CÓ/Đồng ý → true, KHÔNG → false.
- For VND amounts: remove dots/commas, return integer.
- Return raw JSON only, no markdown fences."""

# Rate limit config
BATCH_SIZE = 10
SLEEP_BETWEEN_BATCHES = 5  # seconds
MAX_RETRIES = 3


def load_progress():
    """Load previously saved progress for resume."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {"completed": {}, "errors": {}}


def save_progress(progress):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, ensure_ascii=False, indent=2)


def ocr_single_image(client, img_path: str) -> dict:
    """OCR one image via Gemini Vision, return parsed JSON dict."""
    with open(img_path, "rb") as f:
        img_bytes = f.read()

    response = client.models.generate_content(
        model="gemini-3.8-flash",
        contents=[{
            "role": "user",
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": base64.b64encode(img_bytes).decode()}},
                {"text": OCR_PROMPT},
            ],
        }],
    )

    raw = response.text.strip()
    # Strip markdown fences if present
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()
    if raw.startswith("json"):
        raw = raw[4:].strip()

    return json.loads(raw)


def main():
    print("=" * 60)
    print("Phase 1e: OCR Packing Slips → JSON")
    print(f"Source: {IMG_DIR}")
    print("=" * 60)

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        print("❌ GEMINI_API_KEY not found in .env")
        sys.exit(1)

    client = genai.Client(api_key=api_key)

    jpg_files = sorted(glob.glob(os.path.join(IMG_DIR, "*.jpg")))
    print(f"Found {len(jpg_files)} images\n")

    progress = load_progress()
    completed = progress["completed"]
    errors = progress["errors"]

    # Filter out already completed
    remaining = [f for f in jpg_files if os.path.basename(f) not in completed]
    print(f"Already completed: {len(completed)}, remaining: {len(remaining)}")

    if not remaining:
        print("All images already processed! Generating final JSON...")
    else:
        # Process in batches
        total_batches = (len(remaining) + BATCH_SIZE - 1) // BATCH_SIZE

        for batch_idx in range(total_batches):
            batch_start = batch_idx * BATCH_SIZE
            batch_end = min(batch_start + BATCH_SIZE, len(remaining))
            batch = remaining[batch_start:batch_end]

            print(f"\n📦 Batch {batch_idx + 1}/{total_batches} ({len(batch)} images)")

            for img_path in batch:
                fname = os.path.basename(img_path)
                attempt = 0
                success = False

                while attempt < MAX_RETRIES and not success:
                    attempt += 1
                    try:
                        result = ocr_single_image(client, img_path)
                        completed[fname] = result
                        success = True
                        print(f"  ✅ {fname} → {result.get('packing_slip_id', '?')} ({result.get('tracking_code', '?')})")
                    except Exception as e:
                        if attempt < MAX_RETRIES:
                            print(f"  ⚠️  {fname} attempt {attempt} failed: {e}, retrying...")
                            time.sleep(2)
                        else:
                            errors[fname] = str(e)
                            print(f"  ❌ {fname} FAILED after {MAX_RETRIES} attempts: {e}")

            # Save progress after each batch
            progress["completed"] = completed
            progress["errors"] = errors
            save_progress(progress)
            print(f"  💾 Progress saved: {len(completed)}/{len(jpg_files)} done")

            # Rate limit sleep (skip after last batch)
            if batch_idx < total_batches - 1:
                print(f"  ⏳ Sleeping {SLEEP_BETWEEN_BATCHES}s (rate limit)...")
                time.sleep(SLEEP_BETWEEN_BATCHES)

    # Generate final JSON
    records = list(completed.values())

    with open(FINAL_FILE, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    # Validation
    packing_slip_ids = {r.get("packing_slip_id") for r in records}
    tracking_codes = {r.get("tracking_code") for r in records}

    missing_ids = sum(1 for r in records if not r.get("packing_slip_id"))

    print(f"\n{'=' * 60}")
    print(f"✅ packing_slips.json: {len(records)} records")
    print(f"   Unique packing_slip_ids: {len(packing_slip_ids)}")
    print(f"   Unique tracking_codes: {len(tracking_codes)}")
    print(f"   QC Statuses: {sorted({r.get('qc_status', '?') for r in records})}")
    print(f"   Fragile items: {sum(1 for r in records if r.get('is_fragile'))} / {len(records)}")

    if missing_ids > 0:
        print(f"   ⚠️  WARNING: {missing_ids} records are missing packing_slip_id!")

    if errors:
        print(f"\n⚠️  {len(errors)} errors:")
        for fname, err in list(errors.items())[:5]:
            print(f"   {fname}: {err}")

    print(f"\n   Sample record:")
    if records:
        print(f"   {json.dumps(records[0], ensure_ascii=False, indent=4)}")

    print(f"\n{'=' * 60}")
    if len(records) == 500 and not errors:
        print("✅ ALL PASS — Packing Slip OCR complete")
    else:
        print(f"⚠️  {len(records)}/500 done, {len(errors)} errors")
    print("=" * 60)


if __name__ == "__main__":
    main()
