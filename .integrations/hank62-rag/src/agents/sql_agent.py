import re
import logging
from typing import Dict, Any

from src.llm.gemini_client import GeminiClient
from src.db.warehouse_db import WarehouseDB
from src.agents.prompts import SQL_AGENT_SYSTEM_PROMPT
from src.schemas.internal import GuardResult, SQLResult

logger = logging.getLogger(__name__)

class SQLAgent:
    """Agent that handles Text-to-SQL conversions for the Warehouse Logistics Domain."""

    def __init__(self):
        # We can use get_fast_model for straightforward text-to-sql,
        # Use GeminiClient for both structured text and sql string generation
        self.llm = GeminiClient()
        self.db = WarehouseDB()

    async def _extract_sql(self, text: str) -> str:
        """Extracts SQL wrapped in markdown block: ```sql ... ```"""
        match = re.search(r"```sql\s*(.*?)\s*```", text, re.DOTALL | re.IGNORECASE)
        if match:
            return match.group(1).strip()
        
        # Fallback if the whole thing is just SQL (often happens if LLM ignores formatting)
        if text.strip().upper().startswith("SELECT"):
            return text.strip()
            
        raise ValueError("No SQL statement found in the model response.")

    async def run(self, user_query: str, guard_info: GuardResult) -> SQLResult:
        """Runs the entire SQL generation -> Execution -> Response pipeline."""
        
        # 1. Prepare context & prompt
        schema_context = await self.db.get_schema_context()
        sys_prompt = SQL_AGENT_SYSTEM_PROMPT.format(schema_context=schema_context)
        
        # Enrich the query with extracted entities from the Guard info (to ensure correct IDs)
        enriched_query = user_query
        if guard_info.extracted_entities.get("tracking_code"):
            trks = ", ".join(guard_info.extracted_entities["tracking_code"])
            enriched_query += f" (Note: tracking code detected: {trks})"
        if guard_info.extracted_entities.get("delivery_code"):
            dels = ", ".join(guard_info.extracted_entities["delivery_code"])
            enriched_query += f" (Note: delivery code detected: {dels})"
            
        logger.info(f"SQL Agent starting for query: '{enriched_query}'")
        
        messages = [
            {"role": "system", "content": sys_prompt},
            {"role": "user", "content": enriched_query}
        ]
        
        # Generate SQL (up to 3 retries for syntax errors)
        max_retries = 3
        sql_query = ""
        raw_results = []
        sql_generation_reply = ""
        
        for attempt in range(max_retries):
            try:
                # Ask LLM to generate SQL using fast_chat (or generate)
                response_dict = await self.llm.fast_chat(messages, temperature=0.0)
                response_text = response_dict["content"]
                sql_generation_reply = response_text
                
                # Parse SQL
                sql_query = await self._extract_sql(response_text)
                logger.info(f"Generated SQL (attempt {attempt+1}): {sql_query}")
                
                # Execute SQL
                raw_results = await self.db.execute_query(sql_query)
                logger.info(f"DB execute success, row count: {len(raw_results)}")
                logger.info(f"Raw results snippet: {str(raw_results)[:200]}")
                break # Success!
                
            except ValueError as ve:
                logger.warning(f"SQL Extraction Error: {ve}")
                messages.append({"role": "assistant", "content": sql_generation_reply})
                messages.append({"role": "user", "content": f"Lỗi: {ve}. Vui lòng gói lệnh SQL trong ```sql...```."})
            except Exception as e:
                logger.warning(f"SQL Execution Error: {e}")
                error_str = str(e)
                messages.append({"role": "assistant", "content": sql_generation_reply})
                messages.append({"role": "user", "content": f"Lỗi PostgreSQL: {error_str}. Vui lòng sửa lại truy vấn."})
                
        else:
            # If we exhausted retries
            return SQLResult(
                generated_sql=sql_query,
                raw_results=[],
                row_count=0,
                response_text="Xin lỗi, tôi gặp khó khăn khi truy xuất dữ liệu từ hệ thống. Hãy thử diễn đạt lại yêu cầu rõ ràng hơn nhé.",
                model_used="groq-model"
            )

        # 2. Feed results back to get a natural language response
        # Only inject a limited amount of raw data to avoid token overflow
        restricted_results = raw_results[:20] 
        result_msg = (
            f"Hệ thống báo: RAW_RESULTS = {restricted_results}\n"
            f"(Total rows: {len(raw_results)}. If > 20, only 20 are shown).\n"
            "Hãy tổng hợp và diễn đạt kết quả một cách trôi chảy, thân thiện."
        )
        
        messages.append({"role": "assistant", "content": sql_generation_reply})
        messages.append({"role": "user", "content": result_msg})
        
        final_answer_dict = await self.llm.fast_chat(messages, temperature=0.5)
        final_answer = final_answer_dict["content"]
        
        logger.info(f"LLM Final Answer generated: {final_answer}")
        
        return SQLResult(
            generated_sql=sql_query,
            raw_results=raw_results,
            row_count=len(raw_results),
            response_text=final_answer,
            model_used=final_answer_dict.get("model", "groq-model")
        )
