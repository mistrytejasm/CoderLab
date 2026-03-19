import os
from groq import AsyncGroq
import json
import traceback
from utils.logger import setup_logger

logger = setup_logger("services.generator")

SYSTEM_PROMPT = """You are an expert competitive programming problem designer who writes problems
exactly like LeetCode does — clear prose, well-chosen examples with explanations, and precise constraints.
You ALWAYS return valid JSON and nothing else."""

# ─── Problem generation (NO tags — user assigns them separately) ──────────────
PROBLEM_PROMPT = """Create a complete Python coding problem based on this topic, formatted EXACTLY like LeetCode.

TOPIC: "{topic}"

━━━ LEETCODE FORMAT RULES ━━━

1. PROBLEM STATEMENT — Write 2-4 natural prose paragraphs (NO section headers like "## Problem Statement").
   - Use inline backticks for variable/parameter names: `nums`, `target`, `n`
   - Use **bold** for key terms, *italics* for emphasis
   - State the task clearly, mention edge-case assumptions (e.g. "You may assume exactly one solution exists.")

2. EXAMPLES — At least 2 examples (3 if possible). Format EXACTLY like this:
   **Example 1:**
   ```
   Input: nums = [2,7,11,15], target = 9
   Output: [0,1]
   Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
   ```
   - ALWAYS include an Explanation for Example 1. Add for others where helpful.
   - Show concrete values, not generic placeholders.

3. CONSTRAINTS — End with a "**Constraints:**" bullet list:
   - `1 <= nums.length <= 10^4`
   - Use backtick-wrapped math expressions.

4. CRITICAL FORMATTING:
   - Variable names stay INLINE — NEVER put `n` or `k` on their own line
   - WRONG: "Given an integer\\nn" | CORRECT: "Given an integer `n`"
   - Newlines in the description JSON field must use literal \\n

Return this EXACT JSON (no extra keys, no markdown fences around the JSON):
{{
  "title": "Short clear title like LeetCode uses, e.g. 'Two Sum'",
  "description": "Given an array of integers `nums` and an integer `target`, return *indices* of the two numbers such that they add up to `target`.\\n\\nYou may assume that each input has **exactly one solution**, and you may not use the *same* element twice. You can return the answer in any order.\\n\\n**Example 1:**\\n```\\nInput: nums = [2,7,11,15], target = 9\\nOutput: [0,1]\\nExplanation: Because nums[0] + nums[1] == 9, we return [0, 1].\\n```\\n\\n**Example 2:**\\n```\\nInput: nums = [3,2,4], target = 6\\nOutput: [1,2]\\nExplanation: nums[1] + nums[2] == 6, so return [1, 2].\\n```\\n\\n**Constraints:**\\n- `2 <= nums.length <= 10^4`\\n- `-10^9 <= nums[i] <= 10^9`",
  "difficulty": "Easy"
}}

Rules for difficulty:
- Easy: basic loops, simple math, list traversal, string ops
- Medium: sorting, two pointers, hashing, basic recursion, sliding window
- Hard: dynamic programming, graphs, advanced data structures

Now generate for topic: "{topic}"
"""

# ─── Tag suggestion (called separately after problem is generated) ────────────
TAG_PROMPT = """You are a coding problem taxonomy expert. Given a problem title and description,
suggest the most specific and accurate tags that represent the core concepts.

PROBLEM TITLE: {title}

PROBLEM DESCRIPTION (first 600 chars):
{description}

Return ONLY a JSON object with one key "tags" whose value is a list of 3-6 specific tags.

Choose from these tags ONLY — pick the most relevant ones:
Arrays, Strings, Loops, Math, Recursion, Sorting, Hash Table, Two Pointers,
Stack, Queue, Linked List, Binary Search, Dynamic Programming, Greedy, Graphs,
Trees, Bit Manipulation, List Comprehension, Sliding Window, Sets, Dictionaries,
Matrix, Heap, Backtracking, Divide and Conquer, String Manipulation, Modular Arithmetic

Example output:
{{"tags": ["Arrays", "Hash Table", "Two Pointers"]}}

Return ONLY the JSON. No explanation."""


async def _groq_client() -> AsyncGroq:
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise Exception("GROQ_API_KEY is not set in .env file.")
    return AsyncGroq(api_key=api_key)


async def generate_problem_with_llm(topic: str) -> dict:
    """Generate a LeetCode-style problem from a short topic. Returns title, description, difficulty ONLY (no tags)."""
    client = await _groq_client()
    prompt = PROBLEM_PROMPT.format(topic=topic)

    logger.info(f"Generating problem for topic: '{topic}'")
    try:
        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user",   "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            temperature=0.7,
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)

        required = {"title", "description", "difficulty"}
        if not required.issubset(result.keys()):
            raise ValueError(f"LLM response missing keys: {required - result.keys()}")

        diff = result.get("difficulty", "Easy").strip().capitalize()
        if diff not in ("Easy", "Medium", "Hard"):
            diff = "Easy"
        result["difficulty"] = diff
        result.pop("tags", None)   # strip any auto-tags the LLM adds anyway

        logger.info(f"✅ Generated: '{result['title']}' [{result['difficulty']}]")
        return result

    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON from LLM: {e}")
        raise Exception("AI returned malformed data. Please try again.")
    except Exception as e:
        logger.error(f"Generation failed: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Generation failed: {str(e)}")


async def suggest_tags_with_llm(title: str, description: str) -> list[str]:
    """Suggest specific, accurate tags for a problem based on its title and description."""
    client = await _groq_client()
    prompt = TAG_PROMPT.format(title=title, description=description[:600])

    logger.info(f"Suggesting tags for: '{title}'")
    try:
        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that strictly outputs JSON."},
                {"role": "user",   "content": prompt}
            ],
            model="openai/gpt-oss-120b",
            response_format={"type": "json_object"},
            temperature=0.3,   # low temp = more consistent taxonomy
        )

        raw = response.choices[0].message.content
        result = json.loads(raw)
        tags = result.get("tags", [])
        if not isinstance(tags, list):
            tags = []
        logger.info(f"✅ Suggested tags: {tags}")
        return tags

    except Exception as e:
        logger.error(f"Tag suggestion failed: {str(e)}")
        raise Exception(f"Tag suggestion failed: {str(e)}")
