from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from bson import ObjectId

class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v, handler=None):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        if isinstance(v, ObjectId):
            return str(v)
        return str(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema, handler):
        return {"type": "string"}

class ProblemBase(BaseModel):
    title: str
    description: str
    difficulty: str = Field(default="Easy", pattern="^(Easy|Medium|Hard)$")
    tags: List[str] = []
    status: str = Field(default="Unsolved", pattern="^(Unsolved|Solved)$")
    sequence_number: Optional[int] = None   # auto-assigned on create

class ProblemCreate(ProblemBase):
    pass

class ProblemInDB(ProblemBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}

class ProblemResponse(ProblemBase):
    id: str
    created_at: datetime

    class Config:
        populate_by_name = True

class ProblemStatusUpdate(BaseModel):
    status: str = Field(pattern="^(Unsolved|Solved)$")

class ProblemImportRequest(BaseModel):
    url: str

class ProblemGenerateRequest(BaseModel):
    topic: str
    tags: List[str] = []      # user-supplied tags passed in with the save

class TagSuggestRequest(BaseModel):
    title: str
    description: str
