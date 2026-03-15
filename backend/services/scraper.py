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
    You are an expert coding assistant. Extract the coding problem from the text below and format it into a clean, structured JSON format. 
    The source website is {source_url}.
    
    Required JSON structure:
    {{
        "title": "String - the problem title",
        "description": "String - strict markdown formatted problem description. CRITICAL: Do NOT use excessive newlines. Keep formatting compact. Use single newlines for line breaks and do not double-space paragraphs.",
        "difficulty": "String - Easy, Medium, or Hard",
        "tags": ["Array of Strings - e.g. 'Array', 'Hash Table', 'Dynamic Programming'"]
    }}
    
    Raw Text:
    {raw_text[:8000]} # Limit text length to avoid token limits
    
    Return ONLY valid JSON.
    """
    
    logger.debug(f"Querying LLM (llama3-8b-8192) to parse problem from text ({len(raw_text[:8000])} bytes)...")
    try:
        response = await client.chat.completions.create(
            messages=[
                {"role": "system", "content": "You are a helpful assistant that strictly outputs JSON."},
                {"role": "user", "content": prompt}
            ],
            model="openai/gpt-oss-120b", # or whichever fast model is available via groq
            response_format={"type": "json_object"}
        )
        
        result_json = response.choices[0].message.content
        logger.debug("Successfully received structured JSON response from LLM.")
        return json.loads(result_json)
    except Exception as e:
        logger.error(f"LLM formatting operation failed: {str(e)}")
        traceback.print_exc()
        raise Exception(f"Failed to format problem with LLM: {str(e)}")
