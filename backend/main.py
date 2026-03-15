from fastapi import FastAPI
from contextlib import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
import os
import sys
import asyncio
from dotenv import load_dotenv

# Load env variables BEFORE importing local packages that rely on them
load_dotenv()

from routes import problems
from utils.logger import setup_logger

logger = setup_logger("main")

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB_NAME", "coderlab")

class DBContext:
    client: AsyncMongoMockClient = None
    db = None

db_context = DBContext()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup using an in-memory mock MongoDB so the user can test the app right now
    logger.info("Initializing in-memory Mock MongoDB client...")
    db_context.client = AsyncMongoMockClient()
    db_context.db = db_context.client[DB_NAME]
    logger.info(f"Successfully connected to IN-MEMORY MOCK MongoDB, database: {DB_NAME}")
    
    # Store db in app state so routes can access it
    app.state.db = db_context.db
    
    yield
    
    # Shutdown
    if db_context.client:
        logger.info("Shutting down MongoDB client connection...")
        db_context.client.close()
        logger.info("Disconnected from MongoDB")


app = FastAPI(
    title="CoderLab API",
    description="Backend API for the Python Practice Platform",
    version="0.1.0",
    lifespan=lifespan
)

# CORS
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For v0.1 dev/prod it's easier, allow specific in prod later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problems.router, prefix="/api/problems", tags=["Problems"])

# Add execution route
from routes import execute
app.include_router(execute.router, prefix="/api/execute", tags=["Execution"])

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "CoderLab API API"}
