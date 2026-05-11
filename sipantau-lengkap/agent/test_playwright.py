import asyncio
from playwright.async_api import async_playwright

async def main():
    print("Memulai playwright...")
    async with async_playwright() as pw:
        print("Playwright siap. Launching browser...")
        browser = await pw.chromium.launch(headless=True)
        print("Browser diluncurkan. Membuat context...")
        context = await browser.new_context()
        print("Context dibuat. Membuat page...")
        page = await context.new_page()
        print("Page dibuat. Goto tokopedia...")
        await page.goto("https://www.tokopedia.com/search?q=pipa+gading", timeout=30000)
        print("Goto selesai! Title:", await page.title())
        await browser.close()
    print("Selesai")

if __name__ == "__main__":
    asyncio.run(main())
