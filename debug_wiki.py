"""
Debug extract produk dari divSRPContentProducts
Jalankan: python debug_extract.py
"""
import asyncio
from playwright.async_api import async_playwright

KEYWORD = "pipa gading"

async def debug():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page    = await browser.new_page()

        await page.goto(
            f"https://www.tokopedia.com/search?q={KEYWORD.replace(' ','+')}&navsource=home",
            wait_until="domcontentloaded", timeout=30000
        )
        await asyncio.sleep(4)

        for sel in ["button[aria-label='close']", "[data-testid='btnClosePromo']"]:
            try:
                btn = await page.query_selector(sel)
                if btn and await btn.is_visible():
                    await btn.click()
                    await asyncio.sleep(1)
                    break
            except Exception:
                pass

        for i in range(6):
            await page.evaluate(f"window.scrollTo(0, {(i+1)*800})")
            await asyncio.sleep(0.7)
        await asyncio.sleep(3)

        # ── Ambil 3 produk pertama via link ──
        print("="*60)
        print("STEP 1: Ambil data produk via link tokopedia")
        print("="*60)
        products = await page.evaluate("""
            () => {
                const container = document.querySelector(
                    "[data-testid='divSRPContentProducts']"
                );
                if (!container) return [{error: 'container tidak ditemukan'}];

                const seen  = new Set();
                const results = [];

                // Ambil semua <a> yang mengarah ke produk
                const links = container.querySelectorAll('a[href]');
                for (const a of links) {
                    const href = (a.href||'').split('?')[0];
                    // Filter hanya link produk (bukan toko, bukan kategori)
                    if (!href.includes('tokopedia.com/')) continue;
                    if (href.includes('/search')) continue;
                    if (seen.has(href)) continue;
                    seen.add(href);

                    // Kumpulkan SEMUA teks dari dalam <a> ini
                    const allText = [];
                    const walker = document.createTreeWalker(
                        a, NodeFilter.SHOW_TEXT, null
                    );
                    let node;
                    while (node = walker.nextNode()) {
                        const t = node.textContent.trim();
                        if (t.length > 0) allText.push(t);
                    }

                    // Ambil semua img src di dalam <a>
                    const imgs = Array.from(a.querySelectorAll('img'))
                        .map(i => i.src||i.getAttribute('src')||'')
                        .filter(s => s.startsWith('http'));

                    results.push({
                        href   : href.substring(0, 80),
                        texts  : allText,
                        imgSrc : imgs[0] || '',
                    });

                    if (results.length >= 3) break;
                }
                return results;
            }
        """)

        for i, p in enumerate(products):
            print(f"\n[Produk {i+1}]")
            print(f"  link : {p.get('href','')}")
            print(f"  img  : {p.get('imgSrc','')[:60]}")
            texts = p.get('texts', [])
            for j, t in enumerate(texts):
                print(f"  [{j:02d}] '{t}'")

        # ── Cek jumlah produk setelah klik load more ──
        print("\n" + "="*60)
        print("STEP 2: Klik Muat Lebih Banyak & cek produk bertambah")
        print("="*60)

        before = len(await page.query_selector_all(
            "[data-testid='divSRPContentProducts'] a[href*='tokopedia.com/']"
        ))
        print(f"  Link produk sebelum klik: {before}")

        # Klik tombol
        clicked = await page.evaluate("""
            () => {
                const btns = Array.from(document.querySelectorAll('button'));
                for (const btn of btns) {
                    const text = (btn.innerText||btn.textContent||'').trim().toLowerCase();
                    if (text.includes('muat') && text.includes('banyak')) {
                        btn.click();
                        return true;
                    }
                }
                return false;
            }
        """)
        print(f"  Klik tombol: {'berhasil' if clicked else 'GAGAL'}")

        if clicked:
            await asyncio.sleep(5)
            after = len(await page.query_selector_all(
                "[data-testid='divSRPContentProducts'] a[href*='tokopedia.com/']"
            ))
            print(f"  Link produk setelah klik: {after}")
            print(f"  Bertambah: {after - before}")

        print("\n⏸️  Browser terbuka 20 detik")
        await asyncio.sleep(20)
        await browser.close()

asyncio.run(debug())