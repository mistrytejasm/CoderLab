"""
Atomic sequence counter using a 'counters' collection.
Each call increments and returns the next number for a given name.
"""
from utils.logger import setup_logger

logger = setup_logger("services.counter")

async def next_sequence(db, name: str = "problems") -> int:
    """Atomically increment and return the next sequence number."""
    result = await db.counters.find_one_and_update(
        {"_id": name},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True,   # return the updated doc
    )
    num = result["seq"]
    logger.debug(f"Sequence '{name}' → {num}")
    return num
