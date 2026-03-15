from fastapi import APIRouter
from services.executor import execute_python_code, ExecutionRequest, ExecutionResponse

router = APIRouter()

@router.post("/", response_model=ExecutionResponse)
async def run_code(request: ExecutionRequest):
    """
    Accepts Python code, executes it, and returns the output.
    """
    response = await execute_python_code(request)
    return response
