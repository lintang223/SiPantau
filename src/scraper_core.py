import asyncio
import random
import os
import re
from datetime import datetime

from config import (
    PAGE_TIMEOUT, MAX_LOAD_MORE, THROTTLE_LIMIT, WAIT_DATA_TIMEOUT,
    MAX_DETAIL_RETRY, SPINNER_TIMEOUT, MIN_FIELDS_OK, TOTAL_FIELDS,
    SCREENSHOT_FOLDER, SCREENSHOT_MAHAL, SCREENSHOT_JPEG, SCREENSHOT_QUALITY,
    OUTPUT_FOLDER, USE_RESOURCE_BLOCK
)
from utils import (
    format_price, parse_rating, clean_text, sanitize_filename,
    is_expensive, notify_expensive, logger
)
from browser_manager import safe_goto, is_blocked

try:
    from playwright_stealth import stealth_async
    _STEALTH_AVAILABLE = True
except ImportError:
    _STEALTH_AVAILABLE = False

async def _apply_stealth(page):
    """Terapkan stealth pada page jika tersedia."""
    if _STEALTH_AVAILABLE:
        try:
            await stealth_async(page)
        except Exception:
            pass

# ══════════════════════════════════════════
#  EXTRACT CARDS
# ══════════════════════════════════════════
async def scroll_and_extract(page, keyword: str, seen_links: set) -> list[dict]:
    js_code = """
    () => {
        return new Promise((resolve) => {
            function cleanText(text) {
                if (!text) return "N/A";
                return text.replace(/\\s+/g, ' ').trim();
            }

            let results = new Map();
            let lastHeight = document.body.scrollHeight;
            let noChangeCount = 0;
            // 50 tick × 80ms = 4000ms menunggu sebelum menyerah
            // Ini penting agar Tokopedia punya waktu memuat produk baru setelah klik
            const MAX_NO_CHANGE = 50;
            
            function isLoading() {
                // Deteksi apakah Tokopedia sedang memuat konten baru
                const skeletons = document.querySelectorAll(
                    "[data-testid='skeleton-pdp'], [class*='Skeleton'], [class*='skeleton'], " +
                    "[class*='shimmer'], [class*='Shimmer'], [class*='loading-more'], " +
                    "[aria-label='loading'], [role='progressbar']"
                );
                return skeletons.length > 0;
            }

            let timer = setInterval(() => {
                window.scrollBy({top: 150, behavior: 'instant'});
                
                let cards = Array.from(document.querySelectorAll("div[data-testid='master-product-card']"));
                if (cards.length === 0) cards = Array.from(document.querySelectorAll("div.css-llwpbs"));
                if (cards.length === 0) cards = Array.from(document.querySelectorAll("div.css-5wh65g"));


                for (let card of cards) {
                    try {
                        let linkEl = card.querySelector("a[href*='tokopedia.com']");
                        let link = linkEl ? (linkEl.getAttribute("href") || "").split("?")[0] : "";
                        if (link && !results.has(link)) {
                            let titleEl  = card.querySelector("[data-testid='spnSRPProdName']");
                            let priceEl  = card.querySelector("[data-testid='spnSRPProdPrice']");
                            let ratingEl = card.querySelector("[data-testid='icnStarRating']");
                            let soldEl   = card.querySelector("[data-testid='txsImpSoldCount']");
                            let shopEl   = card.querySelector("[data-testid='lnkShopName']");

                            let title  = titleEl ? cleanText(titleEl.innerText) : "N/A";
                            let price  = priceEl ? cleanText(priceEl.innerText) : "";

                            let ratingRaw = ratingEl ? (ratingEl.getAttribute("aria-label") || "") : "";
                            let ratingMatch = ratingRaw.replace(/,/g, '.').match(/\\d+\\.?\\d*/);
                            let rating = ratingMatch ? ratingMatch[0] : "N/A";

                            let sold = soldEl ? cleanText(soldEl.innerText) : "N/A";
                            let shop = shopEl ? cleanText(shopEl.innerText) : "N/A";

                            results.set(link, {
                                title: title,
                                price: price,
                                rating: rating,
                                sold: sold,
                                shop: shop,
                                link: link
                            });
                        }
                    } catch (err) {}
                }

                let currentScroll = window.scrollY + window.innerHeight;
                let currentHeight = document.body.scrollHeight;
                
                if (currentScroll >= currentHeight - 100) {
                    if (currentHeight === lastHeight) {
                        // Jangan hitung sebagai "mentok" jika masih loading
                        if (!isLoading()) {
                            noChangeCount++;
                        }
                        if (noChangeCount >= MAX_NO_CHANGE) { // 50 × 80ms = 4000ms
                            clearInterval(timer);
                            resolve(Array.from(results.values()));
                        }
                    } else {
                        lastHeight = currentHeight;
                        noChangeCount = 0;
                    }
                } else {
                    noChangeCount = 0;
                }
            }, 80); // 80ms interval (lebih stabil dari 60ms)
        });
    }
    """
    
    scraped_data = []
    try:
        scraped_data = await page.evaluate(js_code)
    except Exception as e:
        print(f"      [scroll/extract error: {e}]")

    products = []
    for item in scraped_data:
        link = item.get("link", "")
        if not link or link in seen_links:
            continue

        seen_links.add(link)
        item["keyword"]      = keyword
        item["price"]        = format_price(item.get("price", ""))
        item["description"]  = ""
        item["review_count"] = "N/A"
        item["stock"]        = "N/A"

        products.append(item)

    return products


# ══════════════════════════════════════════
#  KLIK TOMBOL MUAT LEBIH BANYAK
# ══════════════════════════════════════════
async def click_load_more(page) -> bool:
    # Scroll ke paling bawah dulu agar tombol muncul di viewport
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
    await asyncio.sleep(random.uniform(1.2, 1.8))

    try:
        btn_locator = page.locator("button", has_text="Muat Lebih Banyak").first
        count = await btn_locator.count()
        if count == 0:
            btn_locator = page.locator("button[data-unify='Button']").filter(
                has_text="Muat Lebih Banyak"
            ).first
            count = await btn_locator.count()
        if count == 0:
            # Coba fallback selector lain jika teks berubah sedikit
            btn_locator = page.locator("button").filter(has_text="lebih banyak").first
            count = await btn_locator.count()
        if count == 0:
            return False
    except Exception:
        return False

    try:
        await btn_locator.scroll_into_view_if_needed()
        await asyncio.sleep(random.uniform(0.8, 1.3))

        box = await btn_locator.bounding_box()
        if box is None: 
            return False

        tx = box["x"] + box["width"]  / 2 + random.uniform(-5, 5)
        ty = box["y"] + box["height"] / 2 + random.uniform(-3, 3)

        vp = page.viewport_size or {"width": 1280, "height": 800}
        start_x = random.uniform(vp["width"] * 0.1, vp["width"] * 0.4)
        start_y = random.uniform(vp["height"] * 0.3, vp["height"] * 0.6)
        await page.mouse.move(start_x, start_y, steps=8)
        await asyncio.sleep(random.uniform(0.1, 0.2))
        await page.mouse.move(tx, ty, steps=15)
        await asyncio.sleep(random.uniform(0.3, 0.6))

        await page.mouse.down()
        await asyncio.sleep(random.uniform(0.08, 0.18))
        await page.mouse.up()

        print(f"      Klik tombol 'Muat Lebih Banyak' di ({tx:.0f}, {ty:.0f})")

        await asyncio.sleep(random.uniform(1.5, 2.5))
        return True

    except Exception as e:
        print(f"      Gagal klik: {e}")
        return False

async def count_cards_on_page(page) -> int:
    cards = await page.query_selector_all("div[data-testid='master-product-card']")
    if cards:
        return len(cards)
    cards = await page.query_selector_all("div.css-llwpbs")
    if cards:
        return len(cards)
    cards = await page.query_selector_all("div.css-5wh65g")
    return len(cards)


# ══════════════════════════════════════════
#  SCRAPE SEMUA PRODUK — LOAD MORE + FALLBACK PAGINATION
# ══════════════════════════════════════════
async def scrape_all_pages(
    page, keyword: str,
    browser=None, context_ref: list = None,
    is_cdp: bool = False
) -> tuple[list[dict], object, object]:

    all_products   = []
    seen_links     = set()
    load_count     = 0
    throttle_count = 0
    page_num       = 1
    use_pagination = False

    base_url = f"https://www.tokopedia.com/search?q={keyword.replace(' ', '+')}&navsource=home"

    print(f"\n   🌐 Membuka halaman search...")
    if not await safe_goto(page, base_url, label="search"):
        return all_products, context_ref[0] if context_ref else None, page

    if await is_blocked(page):
        print(f"   ⛔ Diblokir saat membuka search")
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)
        await page.screenshot(
            path=f"{OUTPUT_FOLDER}/blocked_{sanitize_filename(keyword)}.png"
        )
        return all_products, context_ref[0] if context_ref else None, page

    if USE_RESOURCE_BLOCK:
        _SEARCH_BLOCK = re.compile(
            r'\.(png|jpe?g|gif|webp|svg|ico|mp4|webm|css|woff2?|ttf|otf)(\?|$)',
            re.IGNORECASE
        )
        async def _block_search_res(route):
            if _SEARCH_BLOCK.search(route.request.url):
                await route.abort()
            else:
                await route.continue_()
        await page.route("**/*", _block_search_res)

    await asyncio.sleep(2)
    for sel in [
        "button[aria-label='close']",
        "button[class*='CloseButton']",
        "[data-testid='btnClosePromo']",
    ]:
        try:
            btn = await page.query_selector(sel)
            if btn and await btn.is_visible():
                await btn.click()
                await asyncio.sleep(1)
                break
        except Exception:
            pass

    await page.evaluate("window.scrollTo(0, 0)")
    await asyncio.sleep(1.0)

    while True:
        load_count += 1
        if MAX_LOAD_MORE > 0 and load_count > MAX_LOAD_MORE:
            print(f"   🏁 Batas {MAX_LOAD_MORE} klik tercapai.")
            break

        print(f"\n   🔄 Putaran {load_count} — scroll & ambil produk...")

        before    = len(all_products)
        new_prods = await scroll_and_extract(page, keyword, seen_links)
        all_products.extend(new_prods)
        new_this  = len(all_products) - before

        print(f"      ✅ +{new_this} produk baru | Total: {len(all_products)}")
        logger.info(f"[{keyword}] putaran={load_count} baru={new_this} total={len(all_products)}")

        if not use_pagination:
            clicked = await click_load_more(page)

            if not clicked:
                if load_count == 1:
                    print(f"   ℹ️  Tidak ada tombol 'Muat lebih banyak' — fallback ke pagination URL")
                    use_pagination = True
                    page_num = 2
                    continue
                else:
                    print(f"   🏁 Tombol tidak ada lagi — semua produk sudah diambil.")
                    break

            print(f"      ⏳ Menunggu produk baru ter-load...")
            await asyncio.sleep(random.uniform(2.5, 4.0))

            print(f"      ⬇️  Melanjutkan scroll ke bawah...")
            await asyncio.sleep(1.5)

            if new_this == 0:
                throttle_count += 1
                print(f"      ⚠️  Tidak ada produk baru di putaran ini ({throttle_count}/{THROTTLE_LIMIT})")
                if throttle_count >= THROTTLE_LIMIT:
                    print(f"      🔄 Throttle limit tercapai — restart sesi")
                    if context_ref and browser:
                        if is_cdp:
                            try:
                                await page.close()
                            except Exception:
                                pass
                            await asyncio.sleep(random.uniform(5, 10))
                            page = await context_ref[0].new_page()
                        else:
                            try:
                                await context_ref[0].close()
                            except Exception:
                                pass
                            await asyncio.sleep(random.uniform(12, 20))
                            from browser_manager import create_context
                            new_ctx, new_page = await create_context(browser)
                            context_ref[0] = new_ctx
                            page            = new_page

                        await safe_goto(page, base_url, label="search (setelah restart)")
                        await page.evaluate("window.scrollTo(0, 0)")
                        await asyncio.sleep(2.0)
                    throttle_count = 0
                    continue
            else:
                if throttle_count > 0:
                    print(f"      ✅ Produk kembali bertambah — reset throttle counter")
                throttle_count = 0

        else:
            next_url = (
                f"https://www.tokopedia.com/search"
                f"?q={keyword.replace(' ', '+')}&navsource=home&page={page_num}"
            )
            print(f"      ➡️  Buka halaman {page_num} via URL...")
            if not await safe_goto(page, next_url, label=f"hal.{page_num}"):
                break
            if await is_blocked(page):
                break

            await page.evaluate("window.scrollTo(0, 0)")
            await asyncio.sleep(1.5)

            cards_here = await count_cards_on_page(page)
            if cards_here == 0:
                print(f"      🏁 Halaman {page_num} kosong — selesai.")
                break

            if new_this == 0 and load_count > 1:
                throttle_count += 1
                if throttle_count >= THROTTLE_LIMIT:
                    break
            else:
                throttle_count = 0

            page_num += 1
            await asyncio.sleep(random.uniform(2.0, 4.0))

    current_context = context_ref[0] if context_ref else None
    print(f"\n   📦 Total: {len(all_products)} produk dari {load_count} putaran")
    return all_products, current_context, page


# ══════════════════════════════════════════
#  TUNGGU DATA PRODUK & DETEKSI LOADING
# ══════════════════════════════════════════
async def wait_for_product_data(page, timeout: int = WAIT_DATA_TIMEOUT) -> bool:
    critical_selectors = [
        "h1[data-testid='lblPDPDetailProductName']",
        "div[data-testid='lblPDPDetailProductPrice']",
        "[data-testid='pdp_comp-product_content']",
    ]

    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        for sel in critical_selectors:
            try:
                el = await page.query_selector(sel)
                if el and await el.is_visible():
                    return True
            except Exception:
                pass
        await asyncio.sleep(0.8)

    return False

async def detect_infinite_loading(page, timeout: int = SPINNER_TIMEOUT) -> bool:
    spinner_selectors = [
        "[data-testid='skeleton-pdp']",
        ".skeleton-loading",
        "[class*='Skeleton']",
        "[class*='skeleton']",
        "[class*='shimmer']",
        "[class*='Shimmer']",
        "[class*='spinner']",
        "[class*='Spinner']",
        "[class*='loading']",
        "[role='progressbar']",
        "svg[class*='animate']",
    ]

    spinner_found = False
    for sel in spinner_selectors:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                spinner_found = True
                break
        except Exception:
            pass

    if not spinner_found:
        return False

    await asyncio.sleep(timeout)
    for sel in spinner_selectors:
        try:
            el = await page.query_selector(sel)
            if el and await el.is_visible():
                return True
        except Exception:
            pass

    return False

# ══════════════════════════════════════════
#  HELPER — Ekstrak semua field
# ══════════════════════════════════════════
async def _extract_detail_fields(page, product: dict) -> int:
    selectors = {
        "title"       : "h1[data-testid='lblPDPDetailProductName']",
        "price"       : "div[data-testid='lblPDPDetailProductPrice']",
        "rating"      : "span.main[data-testid='lblPDPDetailProductRatingNumber']",
        "review_count": "span[data-testid='lblPDPDetailProductRatingCounter']",
        "sold"        : "span[data-testid='lblPDPDetailProductSoldCounter']",
        "stock"       : "[data-testid='stock-label']",
        "description" : "[data-testid='lblPDPDescriptionProduk']",
        "shop"        : "[data-testid='llbPDPFooterShopName']",
    }

    extracted_count = 0
    for field, sel in selectors.items():
        try:
            el = await page.query_selector(sel)
            if el:
                raw = clean_text(await el.inner_text())
                if field == "price":
                    product[field] = format_price(raw)
                elif field == "rating":
                    product[field] = parse_rating(raw)
                elif field == "description":
                    product[field] = raw[:800] + "..." if len(raw) > 800 else raw
                elif field == "stock":
                    product[field] = re.sub(r'[^0-9.,]', '', raw) or raw
                else:
                    product[field] = raw
                extracted_count += 1
        except Exception:
            pass

    return extracted_count

# ══════════════════════════════════════════
#  SCREENSHOT
# ══════════════════════════════════════════
async def take_screenshot(page, product: dict, folder: str) -> str | None:
    try:
        os.makedirs(folder, exist_ok=True)
        keyword  = sanitize_filename(product.get("keyword", "unknown").lower())
        title    = sanitize_filename(product.get("title", "produk")[:40])
        price    = re.sub(r'[^0-9]', '', product.get("price", "0"))
        ts       = datetime.now().strftime("%Y%m%d_%H%M%S")
        ext      = ".jpg" if SCREENSHOT_JPEG else ".png"
        filename = f"{ts}_{keyword}_{price}_{title}{ext}"
        filepath = os.path.join(folder, filename)
        if SCREENSHOT_JPEG:
            await page.screenshot(
                path=filepath, full_page=False,
                type="jpeg", quality=SCREENSHOT_QUALITY
            )
        else:
            await page.screenshot(path=filepath, full_page=True)
        print(f"      📷 Screenshot: {filepath}")
        logger.info(f"Screenshot: {filepath}")
        return filepath
    except Exception as e:
        print(f"      ⚠️  Screenshot gagal: {e}")
        return None

# ══════════════════════════════════════════
#  SCRAPE DETAIL PRODUK + SCREENSHOT
# ══════════════════════════════════════════
async def scrape_product_detail(page, product: dict) -> dict:
    if not product.get("link"):
        product["scraped_at"]   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        product["status"]       = "no_link"
        product["screenshot"]   = ""
        product["harga_tinggi"] = "TIDAK"
        return product

    best_extracted = 0

    for attempt in range(1, MAX_DETAIL_RETRY + 1):
        label = f"detail (percobaan {attempt}/{MAX_DETAIL_RETRY})"

        if not await safe_goto(page, product["link"], label=label):
            print(f"      ⚠️  Gagal buka halaman")
            await asyncio.sleep(3)
            continue

        if await is_blocked(page):
            print(f"      ⛔ Halaman di-block")
            product["scraped_at"]   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            product["status"]       = "blocked"
            product["screenshot"]   = ""
            product["harga_tinggi"] = "TIDAK"
            return product

        print(f"      🔍 Cek loading state...")
        is_hanging = await detect_infinite_loading(page, timeout=2)
        if is_hanging:
            print(f"      ♾️  Infinite loading — paksa stop...")
            try:
                await page.evaluate("window.stop()")
            except Exception:
                pass
            await asyncio.sleep(1.5)
            await page.evaluate("window.scrollTo(0, 300)")
            await asyncio.sleep(0.5)

        print(f"      ⏳ Tunggu elemen produk ({WAIT_DATA_TIMEOUT}s maks)...")
        await page.evaluate("window.scrollTo(0, 400)")
        await asyncio.sleep(random.uniform(1.0, 1.8))
        await wait_for_product_data(page, timeout=WAIT_DATA_TIMEOUT)

        extracted = await _extract_detail_fields(page, product)
        best_extracted = max(best_extracted, extracted)

        print(
            f"      📋 {extracted}/{TOTAL_FIELDS} field diambil "
            f"(threshold: {MIN_FIELDS_OK}/{TOTAL_FIELDS})"
        )

        if extracted >= MIN_FIELDS_OK:
            print(f"      ✅ Data cukup ({extracted}/{TOTAL_FIELDS}) — lanjut screenshot")
            product["status"] = "ok"
            break

        print(
            f"      ⚠️  Data kurang ({extracted}/{TOTAL_FIELDS} < {MIN_FIELDS_OK}) "
            f"— {'reload & coba lagi' if attempt < MAX_DETAIL_RETRY else 'retry habis'}"
        )
        logger.warning(
            f"LOW_FIELDS attempt={attempt} got={extracted}/{TOTAL_FIELDS} | "
            f"{product.get('link','')[:80]}"
        )

        if attempt < MAX_DETAIL_RETRY:
            try:
                await page.reload(wait_until="domcontentloaded", timeout=15000)
            except Exception:
                pass
            await asyncio.sleep(random.uniform(2.5, 4.0))
            continue

        if best_extracted == 0:
            print(f"      ⏭️  0 field berhasil — skip screenshot, status=no_data")
            logger.warning(
                f"NO_DATA | {product.get('link','')[:80]} | "
                f"keyword={product.get('keyword','')}"
            )
            product["scraped_at"]   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            product["status"]       = "no_data"
            product["screenshot"]   = ""
            product["harga_tinggi"] = "TIDAK"
            return product
        else:
            print(
                f"      🟡 Data parsial ({best_extracted}/{TOTAL_FIELDS}) "
                f"— screenshot dengan status=partial"
            )
            product["status"] = "partial"
            break

    mahal     = is_expensive(product)
    ss_folder = SCREENSHOT_MAHAL if mahal else SCREENSHOT_FOLDER
    ss_path   = await take_screenshot(page, product, ss_folder)

    product["screenshot"]   = ss_path or ""
    product["harga_tinggi"] = "YA" if mahal else "TIDAK"
    product["scraped_at"]   = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    if mahal:
        print(f"      💰 Harga TINGGI ({product.get('price','?')}) → folder mahal/")
        notify_expensive(product)
        logger.warning(
            f"HARGA TINGGI | {product.get('price','?')} | "
            f"{product.get('title','')[:60]}"
        )

    return product
