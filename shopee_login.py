"""
shopee_login.py — Helper login Shopee SEKALI PAKAI.

Cara pakai:
    python shopee_login.py

Script ini akan:
1. Buka Chrome dengan tampilan normal (tidak headless)
2. Navigasi ke halaman login Shopee
3. Tunggu sampai Anda berhasil login (maks 5 menit)
4. Simpan cookies ke output/shopee_session.json
5. Keluar otomatis

Setelah ini, scraper utama (run.bat / main.py) akan otomatis
memakai cookies tersimpan dan tidak akan terkena login wall lagi
selama ±18 jam.
"""

import asyncio
import os
import sys

# Pastikan folder src ada di path (jika dijalankan dari root project)
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "src"))

from playwright.async_api import async_playwright
from session_manager import save_shopee_session, clear_shopee_session, SESSION_FILE


SHOPEE_LOGIN_URL = "https://shopee.co.id/buyer/login"
SHOPEE_HOME_URL  = "https://shopee.co.id"
MAX_WAIT_SECONDS = 300  # 5 menit timeout


async def run_login():
    print("=" * 60)
    print("  🔐 SiPantau — Shopee Login Helper")
    print("=" * 60)
    print()

    # Hapus session lama dulu
    if os.path.exists(SESSION_FILE):
        print("  [INFO] Session lama ditemukan — akan ditimpa dengan yang baru.")
        clear_shopee_session()

    async with async_playwright() as p:
        # Buka Chrome dengan profil baru (bukan profil asli user)
        # user_data_dir = None agar incognito-like tapi tetap bisa menyimpan cookie
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--start-maximized",
                "--disable-blink-features=AutomationControlled",
                "--no-sandbox",
            ],
        )

        context = await browser.new_context(
            viewport={"width": 1366, "height": 768},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            locale="id-ID",
            timezone_id="Asia/Jakarta",
        )

        # Hapus tanda otomasi
        await context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            delete window.__playwright;
        """)

        page = await context.new_page()

        print("  [1/3] Membuka halaman login Shopee...")
        try:
            await page.goto(SHOPEE_LOGIN_URL, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            print(f"  ❌ Gagal buka halaman: {e}")
            await browser.close()
            return

        print()
        print("  ┌─────────────────────────────────────────────────────────┐")
        print("  │  👆 Silakan LOGIN di jendela Chrome yang terbuka.       │")
        print("  │     Anda bisa login dengan:                             │")
        print("  │     • Email / No. HP + Password                        │")
        print("  │     • Google / Facebook                                 │")
        print("  │     • OTP via HP                                       │")
        print("  │                                                         │")
        print("  │  Script akan otomatis lanjut setelah login berhasil.   │")
        print(f"  │  Timeout: {MAX_WAIT_SECONDS // 60} menit                                   │")
        print("  └─────────────────────────────────────────────────────────┘")
        print()

        # Tunggu redirect dari /buyer/login ke halaman utama
        deadline = asyncio.get_event_loop().time() + MAX_WAIT_SECONDS
        logged_in = False
        while asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(2)
            current_url = page.url.lower()

            # Jika sudah tidak di halaman login → berhasil
            if (
                "buyer/login" not in current_url
                and "login" not in current_url
                and "shopee.co.id" in current_url
            ):
                print("  ✅ Login berhasil terdeteksi!")
                logged_in = True
                break

            sisa = int(deadline - asyncio.get_event_loop().time())
            print(f"  ⏳ Menunggu login... (sisa {sisa}s) | URL: {current_url[:60]}", end="\r")

        print()

        if not logged_in:
            print("  ⏰ Timeout! Anda tidak login dalam waktu yang diberikan.")
            await browser.close()
            return

        # Tunggu sebentar agar cookie session terbentuk sempurna
        print("  [2/3] Menunggu cookies Shopee terbentuk (5 detik)...")
        await asyncio.sleep(5)

        # Navigasi ke halaman utama untuk memastikan semua cookie ter-set
        try:
            await page.goto(SHOPEE_HOME_URL, wait_until="domcontentloaded", timeout=20000)
            await asyncio.sleep(3)
        except Exception:
            pass

        # Ambil semua cookies dari context
        print("  [3/3] Mengambil dan menyimpan cookies...")
        all_cookies = await context.cookies()
        shopee_cookies = [
            c for c in all_cookies
            if "shopee" in str(c.get("domain", "")).lower()
        ]

        await browser.close()

        if not shopee_cookies:
            print("  ❌ Tidak ada cookie Shopee ditemukan. Pastikan login berhasil.")
            return

        save_shopee_session(all_cookies)

        print()
        print("=" * 60)
        print(f"  🎉 Selesai! {len(shopee_cookies)} cookie Shopee tersimpan.")
        print(f"  📁 File: {os.path.abspath(SESSION_FILE)}")
        print()
        print("  ✅ Sekarang Anda bisa jalankan scraper seperti biasa:")
        print("     → run.bat   atau   python main.py")
        print()
        print("  Cookies valid ±18 jam. Jika terkena login wall lagi,")
        print("  jalankan shopee_login.py ini sekali lagi.")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(run_login())
