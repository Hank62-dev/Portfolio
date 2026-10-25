import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.agents.guard_agent import GuardAgent
from src.agents.sql_agent import SQLAgent
from src.llm.groq_client import GroqClient
from src.schemas.internal import GuardResult

# MOCK the DB so it doesn't really connect to asyncpg
class MockWarehouseDB:
    async def get_schema_context(self):
        from src.db.warehouse_db import SCHEMA_CONTEXT
        return SCHEMA_CONTEXT
        
    async def execute_query(self, query: str):
        # Print out the SQL so we can inspect it during the test
        print(f"\n[MOCK DB] Executing SQL: {query}")
        
        if "TRK" in query.upper() or "DELIVERIES" in query.upper():
            return [{"tracking_code": "TRK0001007", "delivery_status": "delivered", "driver": "Minh", "shipping_fee_vnd": 30000}]
        return [{"status": "unknown"}]

async def main():
    print("="*60)
    print("TESTING PHASE 4: AGENT PIPELINE ROUTING & SQL AGENT")
    print("="*60)
    
    # Init LLM and Agents
    llm = GroqClient()
    guard = GuardAgent(llm)
    
    # Test case 1: Data Query (SQL Route)
    q1 = "Đơn hàng TRK0001007 trạng thái hiện tại là gì và cước phí bao nhiêu?"
    print(f"\n💬 USER: {q1}")
    print("-" * 40)
    
    print("🤖 1. GUARD CLASSIFICATION...")
    g_res = await guard.run({"raw_message": q1, "memory_context": ""})
    print(f"Domain: {'In-domain' if g_res.is_in_domain else 'Out-domain'}")
    print(f"Task Type: {g_res.task_type}")
    print(f"Extracted Entities: {g_res.extracted_entities}")
    print(f"Route Selected: 👉 {g_res.route_to.upper()} 👈")
    
    if g_res.route_to == "sql":
        print("\n🤖 2. SQL AGENT GENERATING & EXECUTING...")
        sql_agent = SQLAgent()
        # Patch the DB with our mock
        sql_agent.db = MockWarehouseDB()
        
        result = await sql_agent.run(q1, g_res)
        print(f"\n✅ GENERATED SQL:\n{result.generated_sql}")
        print(f"\n✅ FINAL LLM RESPONSE:\n{result.response_text}")

    print("\n\n" + "="*60)
    
    # Test case 2: Policy Query (RAG Route)
    q2 = "Quy định đền bù cho hàng hóa dễ vỡ bị nhân viên làm rách hộp như thế nào?"
    print(f"\n💬 USER: {q2}")
    print("-" * 40)
    
    print("🤖 1. GUARD CLASSIFICATION...")
    g_res2 = await guard.run({"raw_message": q2, "memory_context": ""})
    print(f"Domain: {'In-domain' if g_res2.is_in_domain else 'Out-domain'}")
    print(f"Task Type: {g_res2.task_type}")
    print(f"Route Selected: 👉 {g_res2.route_to.upper()} 👈")

if __name__ == "__main__":
    asyncio.run(main())
