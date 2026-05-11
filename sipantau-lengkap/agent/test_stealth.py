import sys, asyncio
from playwright.async_api import async_playwright
try:
    from playwright_stealth import stealth_async
    print('playwright_stealth imported')
    async def main():
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await stealth_async(page)
            print('stealth_async applied successfully')
            await browser.close()
    asyncio.run(main())
except Exception as e:
    print('Error:', e)
