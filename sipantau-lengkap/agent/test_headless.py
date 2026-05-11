import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(
            headless=False,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-infobars",
                "--disable-dev-shm-usage",
                "--ignore-certificate-errors",
                "--disable-gpu",
                "--window-size=1366,768",
            ]
        )
        context = await browser.new_context()
        page = await context.new_page()
        print("goto tokopedia...")
        await page.goto("https://www.tokopedia.com/search?q=pipa+gading")
        print("Selesai load! Title:", await page.title())
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
