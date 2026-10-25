"""Import extracted warehouse JSON data into PostgreSQL one61_rag database."""

import asyncio
import json
import logging
import os
from pathlib import Path

import asyncpg

from src.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
logger = logging.getLogger(__name__)

EXTRACTED_DIR = Path(__file__).resolve().parent.parent / "data" / "extracted"

TABLE_FILES = [
    ("deliveries", "deliveries.json"),
    ("repacking_logs", "repacking_logs.json"),
    ("flight_manifests", "flight_manifests.json"),
    ("manifest_packages", "manifest_packages.json"),
    ("customs_declarations", "customs_declarations.json"),
    ("customs_items", "customs_items.json"),
    ("damage_reports", "damage_reports.json"),
    ("packing_slips", "packing_slips.json"),
]


import datetime

def parse_val(v):
    if v is None or v == "" or v == "nan" or v == "NaN":
        return None
    if isinstance(v, str):
        v_str = v.strip()
        if v_str in ("Chưa", "null", "None", "nan", "NaN"):
            return None
        # Date only: YYYY-MM-DD
        if len(v_str) == 10 and v_str[4] == "-" and v_str[7] == "-":
            try:
                return datetime.date.fromisoformat(v_str)
            except Exception:
                return None
        # Timestamp ISO or space: YYYY-MM-DD HH:MM...
        if len(v_str) >= 16 and v_str[4] == "-" and v_str[7] == "-":
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M"):
                try:
                    return datetime.datetime.strptime(v_str[:19], fmt)
                except Exception:
                    pass
    return v

async def import_data():
    conn = await asyncpg.connect(settings.database_url)
    logger.info("Connected to database: %s", settings.database_url)

    for table, filename in TABLE_FILES:
        filepath = EXTRACTED_DIR / filename
        if not filepath.exists():
            logger.warning("File not found: %s, skipping %s", filepath, table)
            continue

        with open(filepath, "r", encoding="utf-8") as f:
            records = json.load(f)

        if not records:
            logger.info("Table %s has 0 records in %s", table, filename)
            continue

        columns = list(records[0].keys())
        col_names = ", ".join(columns)
        placeholders = ", ".join(f"${i+1}" for i in range(len(columns)))

        query = f"INSERT INTO {table} ({col_names}) VALUES ({placeholders}) ON CONFLICT DO NOTHING"

        batch_values = []
        for r in records:
            vals = [parse_val(r.get(col)) for col in columns]
            batch_values.append(vals)

        try:
            await conn.executemany(query, batch_values)
            count = await conn.fetchval(f"SELECT count(*) FROM {table}")
            logger.info("Imported %s: %d total rows in DB", table, count)
        except Exception as e:
            logger.error("Error importing table %s: %s", table, e)

    await conn.close()
    logger.info("Warehouse data import finished successfully!")


if __name__ == "__main__":
    asyncio.run(import_data())
