import asyncio
import random
import os
import re
import json
from datetime import datetime

try:
    from scraper.config import (
        PAGE_TIMEOUT, MAX_LOAD_MORE, THROTTLE_LIMIT, WAIT_DATA_TIMEOUT,
        MAX_DETAIL_RETRY, SPINNER_TIMEOUT, MIN_FIELDS_OK, TOTAL_FIELDS,
        SCREENSHOT_FOLDER, SCREENSHOT_MAHAL, SCREENSHOT_JPEG, SCREENSHOT_QUALITY,
        OUTPUT_FOLDER, USE_RESOURCE_BLOCK, SCRAPER_PLATFORM
    )
except ImportError:
    from config import (
        PAGE_TIMEOUT, MAX_LOAD_MORE, THROTTLE_LIMIT, WAIT_DATA_TIMEOUT,
        MAX_DETAIL_RETRY, SPINNER_TIMEOUT, MIN_FIELDS_OK, TOTAL_FIELDS,
        SCREENSHOT_FOLDER, SCREENSHOT_MAHAL, SCREENSHOT_JPEG, SCREENSHOT_QUALITY,
        OUTPUT_FOLDER, USE_RESOURCE_BLOCK, SCRAPER_PLATFORM
    )
try:
    from scraper.utils import (
        format_price, parse_rating, clean_text, sanitize_filename,
        is_expensive, notify_expensive, logger, extract_price_number
    )
except ImportError:
    from utils import (
        format_price, parse_rating, clean_text, sanitize_filename,
        is_expensive, notify_expensive, logger, extract_price_number
    )
try:
    from scraper.browser_manager import safe_goto, is_blocked, is_shopee_login_wall
except ImportError:
    from browser_manager import safe_goto, is_blocked, is_shopee_login_wall

try:
    from scraper.session_manager import capture_shopee_session, save_shopee_session, clear_shopee_session
    _SESSION_MGR_OK = True
except ImportError:
    try:
        from session_manager import capture_shopee_session, save_shopee_session, clear_shopee_session
        _SESSION_MGR_OK = True
    except ImportError:
        _SESSION_MGR_OK = False

try:
    from playwright_stealth import stealth as stealth_async
    _STEALTH_AVAILABLE = True
except ImportError:
    try:
        from playwright_stealth import stealth_async
        _STEALTH_AVAILABLE = True
    except ImportError:
        _STEALTH_AVAILABLE = False

async def _apply_stealth(page):
    """Terapkan stealth pada page jika tersedia."""
    try:
        # Spoofing webdriver di level page (sangat berguna untuk CDP)
        await page.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
            delete window.__playwright;
            delete window.__pw_manual;
            delete window._phantom;
            delete window.callPhantom;
            delete window.__nightmare;
            Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
            Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US'] });
        """)
    except Exception:
        pass
    if _STEALTH_AVAILABLE:
        try:
            await stealth_async(page)
        except Exception:
            pass

async def wait_for_user_bypass(page, platform="shopee", timeout=120,
                               context=None) -> bool:
    """
    Tunggu hingga user menyelesaikan verifikasi/login di browser secara manual.
    Jika platform=shopee dan context tersedia, auto-save cookie setelah login.
    """
    try:
        import sys
        sys.stdout.write('\a')
        sys.stdout.flush()
    except Exception:
        pass
        
    print(f"\n   ⚠️  [{platform.upper()}] Terdeteksi halaman verifikasi/login wall!")
    print(f"      Silakan lakukan verifikasi atau login di jendela Chrome yang terbuka.")
    print(f"      Menunggu user menyelesaikan verifikasi (maks {timeout} detik)...")
    print(f"      💡 Tip: Setelah selesai, cookies akan OTOMATIS disimpan untuk sesi berikutnya.")
    
    deadline = asyncio.get_event_loop().time() + timeout
    while asyncio.get_event_loop().time() < deadline:
        await asyncio.sleep(2.0)
        try:
            blocked = await is_blocked(page)
            url = page.url.lower()
            if not blocked and "login" not in url and "verify" not in url and "captcha" not in url:
                print(f"   ✅ Verifikasi terlewati! Melanjutkan scraping...")
                # ── Auto-save cookies setelah login berhasil ─────────────────
                if platform == "shopee" and _SESSION_MGR_OK and context is not None:
                    await asyncio.sleep(2)  # Beri waktu cookie terbentuk
                    cookies = await capture_shopee_session(context)
                    if cookies:
                        save_shopee_session(cookies)
                        print(f"   💾 Session Shopee disimpan — sesi berikutnya tidak perlu login lagi!")
                    else:
                        print(f"   ⚠️  Tidak ada cookie Shopee ditemukan setelah login.")
                return True
        except Exception:
            pass
    return False

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
    is_cdp: bool = False,
    target_product_count: int = 0,
    harga_threshold: int = 0
) -> tuple[list[dict], object, object]:

    all_products   = []
    seen_links     = set()
    load_count     = 0
    throttle_count = 0
    page_num       = 1
    use_pagination = False

    base_url = f"https://www.tokopedia.com/search?q={keyword.replace(' ', '+')}&navsource=home"

    print(f"\n   🌐 Membuka halaman search Tokopedia...")
    await _apply_stealth(page)
    if not await safe_goto(page, base_url, label="search"):
        return all_products, context_ref[0] if context_ref else None, page

    if await is_blocked(page):
        resolved = await wait_for_user_bypass(page, platform="tokopedia")
        if not resolved:
            print(f"   ⛔ Diblokir saat membuka search")
            os.makedirs(OUTPUT_FOLDER, exist_ok=True)
            await page.screenshot(
                path=f"{OUTPUT_FOLDER}/blocked_{sanitize_filename(keyword)}.png"
            )
            return all_products, context_ref[0] if context_ref else None, page

    if USE_RESOURCE_BLOCK and SCRAPER_PLATFORM != "shopee":
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
        if target_product_count and len(all_products) >= target_product_count:
            print(f"   🎯 Target {target_product_count} produk tercapai.")
            break

        load_count += 1
        if MAX_LOAD_MORE > 0 and load_count > MAX_LOAD_MORE:
            print(f"   🏁 Batas {MAX_LOAD_MORE} klik tercapai.")
            break

        print(f"\n   🔄 Putaran {load_count} — scroll & ambil produk...")

        before    = len(all_products)
        new_prods = await scroll_and_extract(page, keyword, seen_links)

        if harga_threshold and harga_threshold > 0:
            before_filter = len(new_prods)
            new_prods = [
                p for p in new_prods
                if extract_price_number(p.get("price", "0")) >= harga_threshold
            ]
            skipped = before_filter - len(new_prods)
            if skipped:
                print(f"      🚫 {skipped} produk di-skip (harga < Rp{harga_threshold:,})")

        if target_product_count and target_product_count > 0:
            remaining = target_product_count - len(all_products)
            if remaining <= 0:
                print(f"   🎯 Target {target_product_count} produk tercapai.")
                break
            new_prods = new_prods[:remaining]

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
                resolved = await wait_for_user_bypass(page, platform="tokopedia")
                if not resolved:
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
#  SHOPEE IMPLEMENTATION — API INTERCEPT (Tanpa Login)
# ══════════════════════════════════════════
# Shopee memanggil endpoint internal saat halaman search dimuat:
#   GET /api/v4/search/search_items?by=relevancy&keyword=X&limit=60&newest=N
# Kita intercept response JSON tersebut — tidak butuh selector HTML sama sekali.

def _parse_shopee_api_items(items: list, keyword: str, seen_links: set) -> list:
    """Parse daftar item dari respons JSON API Shopee."""
    products = []
    for item in items:
        try:
            ib = item.get("item_basic") or item  # struktur bisa berbeda per versi API

            shopid  = ib.get("shopid") or ib.get("shop_id") or 0
            itemid  = ib.get("itemid") or ib.get("item_id") or ib.get("id") or 0

            # Harga: Shopee simpan dalam sen (dibagi 100000 untuk Rupiah)
            raw_price = ib.get("price") or ib.get("price_min") or 0
            try:
                price_rp = int(raw_price) // 100000
                price_str = f"Rp{price_rp:,}".replace(",", ".")
            except Exception:
                price_str = str(raw_price)

            # Rating
            rating_data = ib.get("item_rating") or {}
            rating = rating_data.get("rating_star") or ib.get("rating_star") or "N/A"
            review_count = sum(rating_data.get("rating_count", []) or []) or "N/A"

            # Sold
            sold_raw = ib.get("sold") or ib.get("historical_sold") or "N/A"

            # Shop name
            shop = ib.get("shop_name") or ib.get("shopName") or "N/A"

            # Link produk
            name_slug = re.sub(r'[^a-z0-9]+', '-', str(ib.get("name", "produk")).lower()).strip('-')
            link = f"https://shopee.co.id/{name_slug}-i.{shopid}.{itemid}"

            if link in seen_links:
                continue
            seen_links.add(link)

            products.append({
                "keyword"      : keyword,
                "title"        : clean_text(str(ib.get("name", "N/A"))),
                "price"        : price_str,
                "rating"       : str(rating) if rating != "N/A" else "N/A",
                "review_count" : str(review_count),
                "sold"         : str(sold_raw),
                "shop"         : shop,
                "link"         : link,
                "description"  : "",
                "stock"        : "N/A",
                "_shopid"      : shopid,
                "_itemid"      : itemid,
            })
        except Exception as e:
            logger.warning(f"[Shopee parse item error] {e}")
            continue
    return products



async def scrape_all_pages_shopee(
    page, keyword: str,
    browser=None, context_ref: list = None,
    is_cdp: bool = False,
    target_product_count: int = 0,
    harga_threshold: int = 0
) -> tuple[list[dict], object, object]:
    """Scrape Shopee menggunakan Network Response Interception.
    
    Alur:
    1. Pasang listener response sebelum page.goto()
    2. Buka URL search Shopee — Shopee JS otomatis panggil /api/v4/search/search_items
    3. Listener tangkap JSON response
    4. Parse langsung, tidak butuh scroll atau selector HTML
    """
    all_products   = []
    seen_links     = set()
    page_num       = 0   # Shopee page index mulai dari 0
    limit          = 60  # Shopee default 60 item per halaman
    max_p          = MAX_LOAD_MORE if MAX_LOAD_MORE > 0 else 5
    SHOPEE_API_PAT = re.compile(r'search_items|search/search')

    while page_num < max_p:
        if target_product_count and len(all_products) >= target_product_count:
            print(f"   🎯 Target {target_product_count} produk tercapai.")
            break

        newest   = page_num * limit
        base_url = (
            f"https://shopee.co.id/search"
            f"?keyword={keyword.replace(' ', '%20')}"
            f"&by=relevancy&limit={limit}&newest={newest}&page={page_num}"
        )
        print(f"\n   🌐 Shopee — Halaman {page_num + 1} (newest={newest})...")

        # --- Setup intercept untuk halaman ini ---
        api_data: list = []
        api_received   = asyncio.Event()

        async def _on_response(response):
            try:
                if SHOPEE_API_PAT.search(response.url) and response.status == 200:
                    content_type = response.headers.get("content-type", "")
                    if "json" in content_type or "javascript" in content_type:
                        try:
                            body = await response.json()
                        except Exception:
                            raw  = await response.text()
                            body = json.loads(raw)

                        items = (
                            body.get("items")
                            or body.get("data", {}).get("items")
                            or []
                        )
                        if items:
                            api_data.extend(items)
                            print(f"      📡 [Shopee API] {len(items)} item diterima dari {response.url.split('?')[0]}")
                            api_received.set()
            except Exception as ex:
                logger.debug(f"[Shopee response listener] {ex}")

        page.on("response", _on_response)

        try:
            await _apply_stealth(page)
            nav_ok = await safe_goto(page, base_url, label=f"shopee.hal.{page_num+1}")
        except Exception:
            nav_ok = False

        if not nav_ok:
            print(f"   ⛔ Gagal membuka halaman Shopee {page_num+1} — berhenti")
            break

        if await is_blocked(page):
            # Cek apakah ini login wall (session expired)
            is_login_wall = await is_shopee_login_wall(page)
            if is_login_wall and _SESSION_MGR_OK:
                print("   🔄 Session Shopee expired — menghapus session lama...")
                clear_shopee_session()

            # Ambil context dari context_ref jika ada
            ctx_for_bypass = context_ref[0] if context_ref else None
            resolved = await wait_for_user_bypass(
                page, platform="shopee",
                timeout=120, context=ctx_for_bypass
            )
            if not resolved:
                print(f"   ⛔ Shopee Diblokir (Captcha/Login wall) di halaman {page_num+1}")
                break

        # Tutup pop-up jika ada
        await asyncio.sleep(random.uniform(1.5, 2.5))
        for sel in [
            "div.shopee-popup__close-btn",
            "div.shopee-modal__close",
            "button[class*='close']",
            "[aria-label='Close']",
        ]:
            try:
                btn = await page.query_selector(sel)
                if btn and await btn.is_visible():
                    await btn.click()
                    await asyncio.sleep(0.8)
                    break
            except Exception:
                pass

        # Tunggu API dipanggil (maks 12 detik)
        # Shopee memanggil API segera setelah halaman dimuat
        try:
            await asyncio.wait_for(api_received.wait(), timeout=12.0)
        except asyncio.TimeoutError:
            print(f"      ⚠️  API Shopee tidak merespons dalam 12s — coba scroll untuk trigger...")
            # Scroll sedikit untuk trigger lazy-load API
            await page.evaluate("window.scrollBy(0, 300)")
            await asyncio.sleep(3.0)

        # Lepas listener sebelum lanjut ke halaman berikutnya
        page.remove_listener("response", _on_response)

        if not api_data:
            print(f"      ⚠️  Tidak ada data dari API Shopee di halaman {page_num+1}")
            # Fallback: coba ambil via halaman HTML jika API tidak tertangkap
            print(f"      🔄 Fallback ke scraping DOM...")
            fallback = await _shopee_dom_fallback(page, keyword, seen_links)

            # Filter fallback
            if harga_threshold and harga_threshold > 0:
                before_filter = len(fallback)
                fallback = [
                    p for p in fallback
                    if extract_price_number(p.get("price", "0")) >= harga_threshold
                ]
                skipped = before_filter - len(fallback)
                if skipped:
                    print(f"      🚫 {skipped} produk fallback di-skip (harga < Rp{harga_threshold:,})")

            # Slice fallback
            if target_product_count and target_product_count > 0:
                remaining = target_product_count - len(all_products)
                if remaining <= 0:
                    print(f"   🎯 Target {target_product_count} produk tercapai.")
                    break
                fallback = fallback[:remaining]

            all_products.extend(fallback)
            print(f"      Fallback DOM: {len(fallback)} produk")
            if len(fallback) == 0:
                break
            page_num += 1
            await asyncio.sleep(random.uniform(2.0, 3.5))
            continue

        before    = len(all_products)
        new_prods = _parse_shopee_api_items(api_data, keyword, seen_links)

        # Filter new_prods
        if harga_threshold and harga_threshold > 0:
            before_filter = len(new_prods)
            new_prods = [
                p for p in new_prods
                if extract_price_number(p.get("price", "0")) >= harga_threshold
            ]
            skipped = before_filter - len(new_prods)
            if skipped:
                print(f"      🚫 {skipped} produk di-skip (harga < Rp{harga_threshold:,})")

        # Slice new_prods
        if target_product_count and target_product_count > 0:
            remaining = target_product_count - len(all_products)
            if remaining <= 0:
                print(f"   🎯 Target {target_product_count} produk tercapai.")
                break
            new_prods = new_prods[:remaining]

        all_products.extend(new_prods)
        new_this  = len(all_products) - before

        print(f"      ✅ +{new_this} produk baru | Total: {len(all_products)}")

        if new_this == 0:
            print(f"      🏁 Tidak ada produk baru — selesai")
            break

        page_num += 1
        await asyncio.sleep(random.uniform(2.5, 4.0))

    current_context = context_ref[0] if context_ref else None
    print(f"\n   \U0001f4e6 Total Shopee: {len(all_products)} produk dari {page_num} halaman")
    return all_products, current_context, page


async def _shopee_dom_fallback(page, keyword: str, seen_links: set) -> list:
    """Fallback scraping DOM untuk Shopee jika API intercept gagal.
    Menggunakan pendekatan heuristik berbasis struktur, bukan class name."""
    products = []
    try:
        # Scroll perlahan untuk memuat semua produk
        for _ in range(5):
            await page.evaluate("window.scrollBy(0, 600)")
            await asyncio.sleep(0.8)

        scraped = await page.evaluate("""
        () => {
            const results = [];
            // Cari semua anchor yang mengarah ke produk Shopee
            const anchors = Array.from(document.querySelectorAll('a[href*="-i."]'));
            const seen = new Set();
            for (const a of anchors) {
                try {
                    const link = (a.href || '').split('?')[0];
                    if (!link || seen.has(link)) continue;
                    seen.add(link);

                    // Cari teks harga (heuristik: ada 'Rp' dan angka)
                    const allText = Array.from(a.querySelectorAll('*'))
                        .map(el => el.childNodes)
                        .reduce((arr, nodes) => [...arr, ...nodes], [])
                        .filter(n => n.nodeType === 3)
                        .map(n => n.textContent.trim())
                        .filter(Boolean);

                    const priceText = allText.find(t => t.includes('Rp') && /[0-9]/.test(t)) || '';

                    // Cari judul: elemen teks terpanjang dalam card
                    const titleEl = Array.from(a.querySelectorAll('[class]'))
                        .filter(el => el.children.length === 0 && el.textContent.trim().length > 5)
                        .sort((a, b) => b.textContent.length - a.textContent.length)[0];
                    const title = titleEl ? titleEl.textContent.trim() : 'N/A';

                    results.push({ link, title, price: priceText,
                                   rating: 'N/A', sold: 'N/A',
                                   shop: 'N/A', review_count: 'N/A' });
                } catch(e) {}
            }
            return results;
        }
        """)
        for item in (scraped or []):
            link = item.get("link", "")
            if not link or link in seen_links:
                continue
            seen_links.add(link)
            item["keyword"]     = keyword
            item["price"]       = format_price(item.get("price", ""))
            item["description"] = ""
            item["stock"]       = "N/A"
            products.append(item)
    except Exception as e:
        print(f"      [DOM fallback error: {e}]")
    return products

async def _extract_detail_fields_shopee(page, product: dict) -> int:
    # Selector Shopee sangat volatile, gunakan pendekatan broad
    selectors = {
        "title"       : ["div.attM6M", "div._2r0796", "h1", "div.pdp-product-title"],
        "price"       : ["div.pm569B", "div._3n5NQx", "div[class*='price']", "span[class*='price']"],
        "rating"      : ["div._3u_u6i", "div.Xm3YNo", "div[class*='rating']"],
        "review_count": ["div.O7uC_d", "div[class*='rating-count']"],
        "sold"        : ["div.aca9EV", "div[class*='sold']"],
        "stock"       : ["div[class*='stock']", "label:has-text('stok') + div"],
        "description" : ["div.p-b-10", "div[class*='description']", "p._2u0jt9"],
        "shop"        : ["div._3ad_S2", "div.Vp_yS3", "div[class*='shop-name']"],
    }

    extracted_count = 0
    for field, sel_list in selectors.items():
        try:
            for sel in sel_list:
                el = await page.query_selector(sel)
                if el and await el.is_visible():
                    raw = clean_text(await el.inner_text())
                    if not raw or raw == "N/A": continue
                    
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
                    break
        except Exception:
            pass

    return extracted_count


# ══════════════════════════════════════════
#  TUNGGU DATA PRODUK & DETEKSI LOADING
# ══════════════════════════════════════════
async def wait_for_product_data(page, timeout: int = WAIT_DATA_TIMEOUT) -> bool:
    critical_selectors = [
        "h1[data-testid='lblPDPDetailProductName']",
        "div[data-testid='lblPDPDetailProductPrice']",
        "[data-testid='pdp_comp-product_content']",
        # Shopee fallback
        "div.attM6M", "div.pm569B", "div._2r0796"
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
async def scrape_product_detail(page, product: dict, harga_threshold: int = 0) -> dict:
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

        if "shopee.co.id" in product["link"]:
            extracted = await _extract_detail_fields_shopee(page, product)
        else:
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

    mahal     = is_expensive(product, harga_threshold)
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
