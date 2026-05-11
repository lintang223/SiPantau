import asyncio
import os
import random
from playwright.async_api import async_playwright

async def main():
    user_data_dir = os.path.join(os.path.expanduser("~"), "AppData", "Local", "ms-playwright", "sipantau_profile")
    os.makedirs(user_data_dir, exist_ok=True)
    async with async_playwright() as pw:
        context = await pw.chromium.launch_persistent_context(
            user_data_dir=user_data_dir,
            headless=False,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={"width": 1366, "height": 768},
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
        page = context.pages[0] if context.pages else await context.new_page()
        await page.goto("https://www.tokopedia.com")
        print("Judul:", await page.title())
        await context.close()

if __name__ == "__main__":
    asyncio.run(main())
