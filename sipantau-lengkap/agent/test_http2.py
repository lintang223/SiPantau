import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True, args=['--disable-http2'])
        context = await browser.new_context()
        page = await context.new_page()
        print("goto tokopedia")
        await page.goto('https://www.tokopedia.com')
        print(await page.title())
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
