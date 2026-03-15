import subprocess
import tempfile
import os

from pydantic import BaseModel
from utils.logger import setup_logger

logger = setup_logger("services.executor")

class ExecutionRequest(BaseModel):
    code: str

class ExecutionResponse(BaseModel):
    stdout: str
    stderr: str
    exit_code: int

async def execute_python_code(request: ExecutionRequest) -> ExecutionResponse:
    """
    Executes Python code in a temporary file and returns stdout and stderr.
    Uses a timeout to prevent infinite loops.
    """
    with tempfile.NamedTemporaryFile(mode="w", suffix=".py", delete=False) as temp_file:
        temp_file.write(request.code)
        temp_file_name = temp_file.name

    logger.info(f"Executing arbitrary python code in temporary file: {temp_file_name}")

    try:
        # Run the python script with a 5 second timeout
        result = subprocess.run(
            ["python", temp_file_name],
            capture_output=True,
            text=True,
            timeout=5.0
        )
        logger.info(f"Execution completed. Exit code: {result.returncode}")
        return ExecutionResponse(
            stdout=result.stdout,
            stderr=result.stderr,
            exit_code=result.returncode
        )
    except subprocess.TimeoutExpired:
        logger.warning(f"Execution timed out in file {temp_file_name} (Infinite loop possible)")
        return ExecutionResponse(
            stdout="",
            stderr="Execution timed out after 5 seconds.\nInfinite loop or long computation detected.",
            exit_code=124
        )
    finally:
        # Clean up the temporary file
        if os.path.exists(temp_file_name):
            os.remove(temp_file_name)
