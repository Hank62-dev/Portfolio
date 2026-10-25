import asyncio
import logging
import asyncpg
from typing import List, Dict, Any

from src.config import settings

logger = logging.getLogger(__name__)

# LLM needs a concise version of the schema, not the raw DDL,
# which saves tokens and prevents hallucination.
SCHEMA_CONTEXT = """
# WAREHOUSE DATABASE SCHEMA

You have read-only access to a PostgreSQL database with 8 Tables and 3 Views.

## TABLES

1. `deliveries`: Giao hàng nội địa (Domestic delivery tracking).
   - Columns: `delivery_id`, `tracking_code` (TRK...), `order_code` (ORD...), `customer_code`, `recipient_name`, `recipient_phone`, `province`, `district`, `full_address`, `carrier`, `carrier_tracking_code`, `domestic_warehouse`, `shipping_fee_vnd`, `cod_amount`, `delivery_status` (delivered/failed_attempt/returned), `attempt_count`, `scheduled_date`, `actual_delivery_date`, `delivery_note`.

2. `repacking_logs`: Nhật ký đóng gói lại (Repack tracking).
   - Columns: `repack_id`, `tracking_code`, `order_code`, `customer_code`, `reason`, `original_box_count`, `new_box_count`, `original_weight_kg`, `new_weight_kg`, `repack_fee_vnd`, `material_cost_vnd`, `requested_at`, `completed_at`, `repack_staff`, `approved_by`, `status` (completed/in_progress/pending).

3. `flight_manifests`: Danh sách luân chuyển hàng không (Flight cargo headers).
   - Columns: `flight_id` (FL...), `flight_number` (e.g. TG202), `airline`, `route`, `departure_time`, `arrival_time`, `status`, `operation_cost_vnd`, `total_weight_kg`, `total_packages`, `customs_date`, `customs_status`, `delay_hours`, `delay_reason`, `confirmed_by`.

4. `manifest_packages`: Danh mục kiện hàng trên chuyến bay.
   - Columns: `id`, `flight_id` (FK to flight_manifests), `stt`, `tracking_code`, `order_code`, `product_category`, `package_status`, `weight_actual_kg`, `weight_volumetric_kg`, `weight_chargeable_kg`, `is_fragile` (BOOLEAN), `customs_declaration`.

5. `customs_declarations`: Tờ khai hải quan (Header).
   - Columns: `id`, `declaration_no` (HQ-VN-...), `declaration_date`, `flight_number`, `route`, `port_of_entry`, `tax_id`, `customs_officer`, `status`, `total_packages`, `total_weight_kg`.

6. `customs_items`: Chi tiết kiện hàng trong tờ khai hải quan.
   - Columns: `id`, `declaration_no` (FK), `stt`, `tracking_code`, `product_category`, `customs_type`, `weight_kg`, `declared_value_vnd`, `tax_percent`, `tax_amount_vnd`.

7. `damage_reports`: Biên bản hư hỏng (Damage inspections).
   - Columns: `damage_report_id` (DMG-...), `tracking_code`, `order_code`, `product_category`, `product_name`, `warehouse`, `detected_at`, `weight_actual_kg`, `weight_volumetric_kg`, `weight_chargeable_kg`, `dimensions_cm`, `has_insurance` (BOOLEAN), `declared_value_vnd`, `damage_type`, `severity`, `damage_location`, `cause`, `has_photo` (BOOLEAN), `recommended_action`, `estimated_compensation_vnd`, `compensation_condition`.

8. `packing_slips`: Phiếu đóng gói (Packing details & QC).
   - Columns: `packing_slip_id` (PCK...), `tracking_code`, `order_code`, `customer_code`, `product_name`, `product_category`, `overseas_warehouse`, `domestic_warehouse`, `flight_code` (FL...), `weight_actual_kg`, `weight_volumetric_kg`, `weight_chargeable_kg`, `dimensions_cm`, `box_size`, `material`, `is_fragile` (BOOLEAN), `customs_declaration`, `declared_value_vnd`, `has_insurance` (BOOLEAN), `volumetric_formula`, `packing_staff`, `qc_staff`, `packing_date`, `qc_status` (PASSED/FAILED), `notes`.

## VIEWS (Use these shortcuts for complex logic)

1. `v_shipment_journey`: Hành trình toàn diện của 1 kiện hàng (Từ đóng gói -> Bay -> Giao).
   - Columns: `tracking_code`, `order_code`, `customer_code`, `product_name`, `product_category`, `overseas_warehouse`, `flight_code`, `flight_route`, `flight_departure`, `flight_arrival`, `flight_status`, `customs_status`, `domestic_warehouse`, `weight_chargeable_kg`, `declared_value_vnd`, `has_insurance`, `qc_status`, `carrier`, `delivery_status`, `scheduled_date`, `actual_delivery_date`, `shipping_fee_vnd`.

2. `v_damage_summary`: Chi tiết hàng hư hỏng + Thông tin kết quả giao hàng.
   - Columns: `tracking_code`, `order_code`, `product_name`, `damage_type`, `severity`, `cause`, `has_insurance`, `declared_value_vnd`, `estimated_compensation_vnd`, `compensation_condition`, `delivery_status`, `carrier`.

3. `v_weight_discrepancy`: Lệch khối lượng giữa thực tế và thể tích.
   - Columns: `tracking_code`, `order_code`, `product_name`, `weight_actual_kg`, `weight_volumetric_kg`, `weight_chargeable_kg`, `volumetric_formula`, `charge_basis`, `weight_diff_kg`.
"""

class WarehouseDB:
    """Async PostgreSQL connector for the AI SQL Agent."""

    def __init__(self):
        self._pool = None
        # Use warehouse_db_url if defined, else fallback to primary database_url
        self._db_url = getattr(settings, "warehouse_db_url", None) or getattr(settings, "database_url")
        
    async def connect(self):
        if not self._pool:
            try:
                self._pool = await asyncpg.create_pool(dsn=self._db_url, min_size=1, max_size=5)
                logger.info("WarehouseDB connection pool created.")
            except Exception as e:
                logger.error(f"Failed to create connection pool: {e}")
                raise

    async def get_schema_context(self) -> str:
        """Returns the Markdown summary of the warehouse schema."""
        return SCHEMA_CONTEXT

    async def execute_query(self, query: str) -> List[Dict[str, Any]]:
        """Safely executes a read-only query and returns a list of dictionaries."""
        if not self._pool:
            await self.connect()

        # Basic guard rails for read-only access
        q_upper = query.upper()
        if any(keyword in q_upper for keyword in ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE"]):
            raise ValueError("Dangerous SQL injected. Only SELECT statements are allowed.")

        try:
            async with self._pool.acquire() as conn:
                # Setting query timeout to 5 seconds to prevent runaway queries
                records = await conn.fetch(query, timeout=5.0)
                # Convert asyncpg.Record instances to dict
                return [dict(row) for row in records]
        except asyncpg.exceptions.PostgresError as e:
            logger.error(f"PostgreSQL Execution Error: {e}")
            raise Exception(f"SQL syntax or execution error: {e}")
        except asyncio.TimeoutError:
            raise Exception("Query timed out. SQL was too complex or unbounded.")
