import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from src.agents.pipeline import AgentPipeline
from src.schemas.request import ChatRequest
from src.schemas.internal import GuardResult
from src.db.warehouse_db import SCHEMA_CONTEXT

# Create a mock for PostgreSQL execute_query
class MockWarehouseDB:
    async def get_schema_context(self):
        return SCHEMA_CONTEXT
        
    async def execute_query(self, query: str):
        print(f"\n[MOCK DB] Executing: {query}\n")
        # Provide specialized mock returns based on the query pattern
        query_up = query.upper()
        if "REPACKING_LOGS" in query_up and "REASON" in query_up:
            return [
                {"reason": "Hộp gốc bị hỏng khi vận chuyển", "total_cost": 4500000, "count": 150},
                {"reason": "Khách yêu cầu gom nhiều đơn", "total_cost": 3000000, "count": 100},
                {"reason": "Hàng fragile cần gia cố", "total_cost": 2100000, "count": 70}
            ]
        elif "TRK0009012" in query_up:
            return [
                {"tracking_code": "TRK0009012", "damage_type": "Bao bì bị rách", "severity": "Nặng", "delivery_status": "returned", "estimated_compensation_vnd": 3000000}
            ]
        return [{"mock_data": "unknown context"}]

async def main():
    print("# BÁO CÁO KIỂM TOÁN HỆ THỐNG AGENT (WAREHOUSE AI AUDIT)\n")
    
    # Initialize pipeline
    pipeline = AgentPipeline()
    # Inject mock DB into SQL agent
    pipeline.sql_agent.db = MockWarehouseDB()
    
    test_cases = [
        {
            "name": "1. NORMAL CHAT (Direct Strategy)",
            "query": "Chào trợ lý, hôm nay bạn thấy thế nào? Tôi là quản lý kho kho mới đây."
        },
        {
            "name": "2. RAG ONLY (Complex Policy Query)",
            "query": "Trường hợp kho bị ngập lụt do thiên tai thì hạn mức đền bù tối đa của công ty là bao nhiêu? Liệt kê 3 điều kiện loại trừ trách nhiệm."
        },
        {
            "name": "3. SQL ONLY (Complex Aggregation)",
            "query": "Thống kê cho tôi 3 lý do phổ biến nhất khiến hàng bị đóng gói lại trên hệ thống và tổng số tiền tiêu tốn cho từng lý do."
        },
        {
            "name": "4. HYBRID MODE (Cross-referencing DB and Policy)",
            "query": "Kiểm tra tình trạng hàng hư hỏng mã TRK0009012. Theo chính sách công ty, lỗi bao bì rách nát loại nặng như đơn này thì kho bồi thường bao nhiêu phần trăm?"
        }
    ]
    
    for idx, tc in enumerate(test_cases):
        print(f"## {tc['name']}")
        print(f"**🗣️ User:** `{tc['query']}`\n")
        
        req = ChatRequest(request_id=f"TEST_{idx}", message=tc['query'], session_id="test_sess_01", user_id="test_user")
        
        # We manually hook directly using internal logic to capture intermediate traces
        guard_result = await pipeline.guard.run({
            "raw_message": tc['query'],
            "memory_context": ""
        })
        print(f"**🔍 Guard Classification:**")
        print(f"- Domain: {'`In-Domain`' if guard_result.is_in_domain else '`Out-Domain`'}")
        print(f"- Detected Route: **`{guard_result.route_to.upper()}`**")
        print(f"- Entities: `{guard_result.extracted_entities}`\n")
        
        # Execute fully through process mapped logic for simplicity
        response = await pipeline._process_traced(req)
        
        if guard_result.route_to == "sql":
            # Just grab the last generated sql from our Mock injection manually since ChatResponse doesn't hold it natively
            # The DB mock prints the SQL, but let's visually show the raw text
            pass
            
        print(f"**🤖 AI Response:**\n> {response.response.message.replace(chr(10), chr(10)+'> ')}\n")
        print(f"**📊 Metadata Trace:** `{response.metadata.agents_trace}`")
        print("-" * 60 + "\n")

if __name__ == "__main__":
    asyncio.run(main())
