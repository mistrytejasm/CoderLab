"""
Route: /api/solutions
Stores and retrieves a user's code solution for each problem.
Collection: user_solutions  { problem_id, code, last_saved }
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime
from utils.logger import setup_logger

logger = setup_logger("routes.solutions")
router = APIRouter()

def get_db(request: Request):
    return request.app.state.db

class SolutionUpsert(BaseModel):
    problem_id: str
    code: str

class SolutionResponse(BaseModel):
    problem_id: str
    code: str
    last_saved: datetime

@router.put("/", response_model=SolutionResponse)
async def save_solution(payload: SolutionUpsert, db = Depends(get_db)):
    """Save (upsert) the user's code for a given problem."""
    if not ObjectId.is_valid(payload.problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem_id")

    now = datetime.utcnow()
    await db.user_solutions.update_one(
        {"problem_id": payload.problem_id},
        {"$set": {"code": payload.code, "last_saved": now}},
        upsert=True,
    )
    logger.info(f"Solution saved for problem {payload.problem_id} ({len(payload.code)} chars)")
    return {"problem_id": payload.problem_id, "code": payload.code, "last_saved": now}

@router.get("/{problem_id}", response_model=SolutionResponse)
async def get_solution(problem_id: str, db = Depends(get_db)):
    """Fetch the saved code for a problem. Returns 404 if nothing saved yet."""
    if not ObjectId.is_valid(problem_id):
        raise HTTPException(status_code=400, detail="Invalid problem_id")

    doc = await db.user_solutions.find_one({"problem_id": problem_id})
    if not doc:
        raise HTTPException(status_code=404, detail="No saved solution found")

    return {"problem_id": doc["problem_id"], "code": doc["code"], "last_saved": doc["last_saved"]}
