from pymongo import MongoClient
import os
from dotenv import load_dotenv

load_dotenv()
uri = os.getenv("MONGO_URI", "mongodb://localhost:27017")
client = MongoClient(uri)
db = client[os.getenv("MONGO_DB_NAME", "coderlab")]

problem = {
    "title": "Two Sum",
    "description": "Given an array of integers `nums` and an integer `target`, return indices of the two numbers such that they add up to `target`.\n\nYou may assume that each input would have exactly one solution, and you may not use the same element twice.\n\nYou can return the answer in any order.\n\n**Example 1:**\n```\nInput: nums = [2,7,11,15], target = 9\nOutput: [0,1]\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\n```",
    "difficulty": "Easy",
    "tags": ["Array", "Hash Table"],
    "status": "Unsolved"
}

db.problems.insert_one(problem)
print("Seeded database with 'Two Sum' problem.")
