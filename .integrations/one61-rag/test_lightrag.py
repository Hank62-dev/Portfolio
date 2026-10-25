import asyncio
from src.rag.engine import RAGEngine
from lightrag import QueryParam

async def main():
    engine = RAGEngine()
    await engine.initialize()
    res = await engine._rag.aquery("Chính sách nghỉ phép", param=QueryParam(mode="hybrid", only_need_context=True))
    print("=== TYPE ===")
    print(type(res))
    print("=== CONTENT ===")
    print(res[:500])

asyncio.run(main())
