import asyncio
import traceback
from services.scraper import scrape_url

async def main():
    try:
        url = 'https://www.geeksforgeeks.org/python-program-to-print-all-even-numbers-in-a-range/'
        print(f"Scraping {url}")
        content = await scrape_url(url)
        print(f"Success! Extracted {len(content)} characters.")
    except Exception as e:
        print("Scraping failed!")
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
