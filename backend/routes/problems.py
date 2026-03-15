from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from typing import List
from models import ProblemCreate, ProblemResponse, ProblemStatusUpdate, ProblemImportRequest
from fastapi import Request
from bson import ObjectId
from services.scraper import scrape_url, format_problem_with_llm
from utils.logger import setup_logger

logger = setup_logger("routes.problems")

router = APIRouter()

def get_db(request: Request):
    return request.app.state.db

@router.get("/", response_model=List[ProblemResponse])
async def get_all_problems(db = Depends(get_db)):
    logger.info("Fetching all problems from database...")
    problems_cursor = db.problems.find()
    problems = await problems_cursor.to_list(length=1000)
    
    # Map _id to id
    result = []
    for p in problems:
        p["id"] = str(p.pop("_id"))
        result.append(p)
    logger.info(f"Retrieved {len(result)} problems.")
    return result

@router.get("/{id}", response_model=ProblemResponse)
async def get_problem(id: str, db = Depends(get_db)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    problem = await db.problems.find_one({"_id": ObjectId(id)})
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
        
    problem["id"] = str(problem.pop("_id"))
    return problem

@router.post("/", response_model=ProblemResponse, status_code=201)
async def create_problem(problem: ProblemCreate, db = Depends(get_db)):
    logger.info(f"Manual problem creation request for title: '{problem.title}'")
    problem_dict = problem.dict()
    from datetime import datetime
    problem_dict["created_at"] = datetime.utcnow()
    
    result = await db.problems.insert_one(problem_dict)
    
    created_problem = await db.problems.find_one({"_id": result.inserted_id})
    created_problem["id"] = str(created_problem.pop("_id"))
    
    logger.info(f"Successfully created manual problem with ID: {created_problem['id']}")
    return created_problem

@router.put("/{id}/status", response_model=ProblemResponse)
async def update_problem_status(id: str, status_update: ProblemStatusUpdate, db = Depends(get_db)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    result = await db.problems.update_one(
        {"_id": ObjectId(id)},
        {"$set": {"status": status_update.status}}
    )
    
    if result.modified_count == 0:
        # Check if exists
        existing = await db.problems.find_one({"_id": ObjectId(id)})
        if not existing:
            raise HTTPException(status_code=404, detail="Problem not found")
            
    updated_problem = await db.problems.find_one({"_id": ObjectId(id)})
    updated_problem["id"] = str(updated_problem.pop("_id"))
    return updated_problem

@router.delete("/{id}", status_code=204)
async def delete_problem(id: str, db = Depends(get_db)):
    if not ObjectId.is_valid(id):
        raise HTTPException(status_code=400, detail="Invalid ID format")
        
    result = await db.problems.delete_one({"_id": ObjectId(id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Problem not found")

@router.post("/import", response_model=ProblemResponse, status_code=201)
async def import_problem(request: ProblemImportRequest, db = Depends(get_db)):
    logger.info(f"Import process started for URL: {request.url}")
    try:
        logger.debug("Step 1: Scraping URL...")
        raw_text = await scrape_url(request.url)
        
        logger.debug("Step 2: Formatting text via LLM...")
        formatted_data = await format_problem_with_llm(raw_text, request.url)
        
        # Default status for imported problems
        formatted_data["status"] = "Unsolved"
        logger.debug(f"LLM extraction successful. Title: '{formatted_data.get('title')}'")
        
        # Validate using Pydantic
        problem_create = ProblemCreate(**formatted_data)
        
        # Save to DB
        logger.debug("Step 3: Saving to database...")
        problem_dict = problem_create.dict()
        from datetime import datetime
        problem_dict["created_at"] = datetime.utcnow()
        
        result = await db.problems.insert_one(problem_dict)
        
        created_problem = await db.problems.find_one({"_id": result.inserted_id})
        created_problem["id"] = str(created_problem.pop("_id"))
        
        logger.info(f"Successfully imported problem. Assiged ID: {created_problem['id']}")
        return created_problem
        
    except Exception as e:
        logger.error(f"Failed to import problem from {request.url}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
