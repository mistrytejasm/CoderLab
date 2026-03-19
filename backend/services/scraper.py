import os
from bs4 import BeautifulSoup
import httpx
from playwright.sync_api import sync_playwright
from fastapi.concurrency import run_in_threadpool
from groq import AsyncGroq
from models import ProblemCreate
import json
import traceback
from utils.logger import setup_logger

logger = setup_logger("services.scraper")

def scrape_with_playwright(url: str) -> str:
    """Synchronous Playwright scraper to be run in a thread"""
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # domcontentloaded is much safer than networkidle to avoid fake timeouts
        page.goto(url, wait_until="domcontentloaded", timeout=20000)
        content = page.content()
        browser.close()
        return content

async def scrape_url(url: str) -> str:
    """Scrape the content of a URL."""
    try:
        # A simple check for domains that usually require JavaScript
        if "leetcode.com" in url or "geeksforgeeks" in url:
            logger.debug(f"Using Playwright headless browser for dynamic site: {url}")
            content = await run_in_threadpool(scrape_with_playwright, url)
        else:
            logger.debug(f"Using standard HTTP GET for static site: {url}")
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                content = response.text

        soup = BeautifulSoup(content, 'html.parser')
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.extract()
            
        text = soup.get_text(separator='\n', strip=True)
        logger.debug(f"Extracted string of length {len(text)} from DOM.")
        return text
    except Exception as e:
        logger.error(f"Playwright/HTTP Scraping crashed: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to scrape URL: {str(e)}")

async def format_problem_with_llm(raw_text: str, source_url: str) -> dict:
    """Use Groq LLM to format the scraped text into a standard Problem structure."""
    
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        logger.error("Groq API Key missing. Aborting LLM request.")
        raise Exception("GROQ_API_KEY is not set in the .env. Cannot use LLM to import problem.")
        
    client = AsyncGroq(api_key=api_key)
    
    prompt = f"""
You are an expert coding problem formatter. Extract the problem from the raw text and return ONLY a JSON object.

CRITICAL FORMATTING RULES for the "description" markdown field:
1. Keep variable names INLINE in sentences. NEVER put a variable name on its own line.
   WRONG: "Given integers\\ns\\nand\\ne"
   CORRECT: "Given integers `s` and `e`"
2. Use `##` headers to separate major sections: Problem Statement, Input Format, Output Format, Examples, Constraints.
3. Each Example must have a fenced code block with Input and Output labeled inside.
4. Use backticks for inline code (variable names, values, data types).
5. Use bullet points `-` for constraints and multiple items.
6. Be concise. Do not repeat information.

Required JSON structure:
{{
    "title": "Problem title as a string",
    "description": "## Problem Statement\\n\\nGiven two integers `s` and `e`...\\n\\n## Input Format\\n\\n- Two integers `s` and `e` where `s <= e`\\n\\n## Output Format\\n\\n- Print all even numbers from `s` to `e`, each on a new line.\\n\\n## Examples\\n\\n**Example 1:**\\n```\\nInput: s = 1, e = 10\\nOutput: 2 4 6 8 10\\n```\\n\\n## Constraints\\n\\n- `1 <= s <= e <= 10^6`",
    "difficulty": "Easy, Medium or Hard",
    "tags": ["Python", "Loops", "Arrays"]
}}

Source website: {source_url}

Raw Text to extract from:
{raw_text[:8000]}

Return ONLY the JSON object. No preamble, no explanation.
"""
    
    logger.debug(f"Querying LLM (llama3-8b-8192) to parse problem from text ({len(raw_text[:8000])} bytes)...")
    try:
        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that strictly outputs JSON."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile",
            response_format={"type": "json_object"}
        )
        
        result_json = response.choices[0].message.content
        logger.debug("Successfully received structured JSON response from LLM.")
        return json.loads(result_json)
    except Exception as e:
        logger.error(f"LLM formatting operation failed: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to format problem with LLM: {str(e)}")
