from fastapi import APIRouter, HTTPException, Depends
from typing import List
from models import ProblemCreate, ProblemResponse, ProblemStatusUpdate, ProblemImportRequest, ProblemGenerateRequest, TagSuggestRequest
from fastapi import Request
from bson import ObjectId
from services.scraper import scrape_url, format_problem_with_llm
from services.generator import generate_problem_with_llm as llm_generate, suggest_tags_with_llm
from services.counter import next_sequence
from utils.logger import setup_logger
from datetime import datetime

logger = setup_logger("routes.problems")

router = APIRouter()

def get_db(request: Request):
    return request.app.state.db

async def _assign_sequence(db) -> int:
    """Get the next sequence number from the counter collection."""
    return await next_sequence(db, "problems")

async def _finalize_problem(db, data: dict) -> dict:
    """Add sequence number, timestamps, insert into DB, return cleaned doc."""
    data["sequence_number"] = await _assign_sequence(db)
    data["created_at"] = datetime.utcnow()
    result = await db.problems.insert_one(data)
    doc = await db.problems.find_one({"_id": result.inserted_id})
    doc["id"] = str(doc.pop("_id"))
    return doc

# ── POST preview (generate without saving) ────────────────────────────────────
@router.post("/preview")
async def preview_problem(request: ProblemGenerateRequest):
    """Generate problem content via LLM but do NOT save. Returns title/description/difficulty."""
    logger.info(f"Preview request for topic: '{request.topic}'")
    try:
        generated = await llm_generate(request.topic)
        return {"title": generated["title"], "description": generated["description"], "difficulty": generated["difficulty"]}
    except Exception as e:
        logger.error(f"Preview failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ── GET all problems ──────────────────────────────────────────────────────────
@router.get("/", response_model=List[ProblemResponse])
async def get_all_problems(db = Depends(get_db)):
    logger.info("Fetching all problems from database...")
    problems_cursor = db.problems.find().sort("sequence_number", 1)
    problems = await problems_cursor.to_list(length=1000)
    result = []
    for p in problems:
        p["id"] = str(p.pop("_id"))
        result.append(p)
    logger.info(f"Retrieved {len(result)} problems.")
    return result

# ── GET single problem ────────────────────────────────────────────────────────
@router.get("/{id}", response_model=ProblemResponse)
async def get_problem(id: str, db = Depends(get_db)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    problem = await db.problems.find_one({"_id": ObjectId(id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    problem["id"] = str(problem.pop("_id"))
    return problem

# ── POST create problem manually ──────────────────────────────────────────────
@router.post("/", response_model=ProblemResponse, status_code=201)
async def create_problem(problem: ProblemCreate, db = Depends(get_db)):
    logger.info(f"Manual problem creation: '{problem.title}'")
    existing = await db.problems.find_one({"title": {"$regex": f"^{problem.title}$", "$options": "i"}})
    if existing:
        raise HTTPException(status_code=409, detail=f"A problem titled '{problem.title}' already exists.")
    problem_dict = problem.dict()
    created = await _finalize_problem(db, problem_dict)
    logger.info(f"Manual problem saved #{created['sequence_number']}: {created['id']}")
    return created

# ── PUT update status ─────────────────────────────────────────────────────────
@router.put("/{id}/status", response_model=ProblemResponse)
async def update_problem_status(id: str, status_update: ProblemStatusUpdate, db = Depends(get_db)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.problems.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": status_update.status}}
    )
    if result.modified_count == 0:
        existing = await db.problems.find_one({"_id": ObjectId(id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Problem not found")
    updated = await db.problems.find_one({"_id": ObjectId(id)})
    updated["id"] = str(updated.pop("_id"))
    return updated

# ── DELETE problem ────────────────────────────────────────────────────────────
@router.delete("/{id}", status_code=204)
async def delete_problem(id: str, db = Depends(get_db)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
    result = await db.problems.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Problem not found")

# ── POST import from URL ──────────────────────────────────────────────────────
@router.post("/import", response_model=ProblemResponse, status_code=201)
async def import_problem(request: ProblemImportRequest, db = Depends(get_db)):
    logger.info(f"Import started for URL: {request.url}")
    try:
        raw_text = await scrape_url(request.url)
        formatted_data = await format_problem_with_llm(raw_text, request.url)
        formatted_data["status"] = "Unsolved"

        title = formatted_data.get("title", "")
        existing = await db.problems.find_one({"title": {"$regex": f"^{title}$", "$options": "i"}})
        if existing:
            raise HTTPException(status_code=409, detail=f"'{title}' is already in your library.")

        problem_create = ProblemCreate(**formatted_data)
        created = await _finalize_problem(db, problem_create.dict())
        logger.info(f"Imported problem #{created['sequence_number']}: {created['id']}")
        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Import failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ── POST AI generate + save ───────────────────────────────────────────────────
@router.post("/generate", response_model=ProblemResponse, status_code=201)
async def generate_problem(request: ProblemGenerateRequest, db = Depends(get_db)):
    """Generate a problem from a topic, with user-supplied tags."""
    logger.info(f"AI generate request: '{request.topic}'")
    try:
        generated = await llm_generate(request.topic)
        generated["status"]  = "Unsolved"
        generated["tags"]    = request.tags   # user chose the tags

        title = generated.get("title", "")
        existing = await db.problems.find_one({"title": {"$regex": f"^{title}$", "$options": "i"}})
        if existing:
            raise HTTPException(status_code=409, detail=f"'{title}' is already in your library.")

        problem_create = ProblemCreate(**generated)
        created = await _finalize_problem(db, problem_create.dict())
        logger.info(f"AI problem saved #{created['sequence_number']}: {created['id']}")
        return created
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Generation route failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# ── POST suggest tags for a problem ──────────────────────────────────────────
@router.post("/suggest-tags")
async def suggest_tags(request: TagSuggestRequest):
    """Use LLM to suggest specific tags based on the problem title and description."""
    logger.info(f"Tag suggestion request for: '{request.title}'")
    try:
        tags = await suggest_tags_with_llm(request.title, request.description)
        return {"tags": tags}
    except Exception as e:
        logger.error(f"Tag suggestion failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
