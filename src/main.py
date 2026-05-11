import asyncio
import os
import signal
import random
from playwright.async_api import async_playwright

from config import (
    KEYWORDS_FILE, MAX_LOAD_MORE, HARGA_THRESHOLD, MIN_FIELDS_OK, TOTAL_FIELDS,
    WAIT_DATA_TIMEOUT, MAX_DETAIL_RETRY, SPINNER_TIMEOUT, USE_PROXY, USE_JSON_BACKUP,
    SCREENSHOT_JPEG, LOG_FILE, SCREENSHOT_FOLDER, SCREENSHOT_MAHAL, RESTART_EVERY,
    COOLDOWN_ON_HANG, PAGE_TIMEOUT, MAX_CONCURRENT_TABS, USE_RETRY_QUEUE,
    SUMMARY_FILE
)
from utils import (
    load_keywords, checkpoint_load, checkpoint_save, checkpoint_clear,
    human_delay, ProgressTracker, backup_append, notify_expensive, logger
)
from proxy_manager import ProxyManager
from browser_manager import AdaptiveRateLimit, create_context, safe_goto
from excel_writer import save_report, save_summary
from scraper_core import scrape_all_pages, scrape_product_detail, _apply_stealth

# ══════════════════════════════════════════
#  GRACEFUL SHUTDOWN
# ══════════════════════════════════════════
_shutdown_requested = False

def _setup_signal_handler():
    def _handler(sig, frame):
        global _shutdown_requested
        _shutdown_requested = True
        print("\n\n   🛑 Ctrl+C — menyimpan data & keluar setelah batch ini selesai...")
    signal.signal(signal.SIGINT, _handler)
    try:
        signal.signal(signal.SIGTERM, _handler)
    except Exception:
        pass

# ══════════════════════════════════════════
#  MAIN SCRAPER
# ══════════════════════════════════════════
async def run_scraper():
    global _shutdown_requested
    
    keywords = load_keywords(KEYWORDS_FILE)
    if not keywords:
        return

    _setup_signal_handler()
    proxy_mgr = ProxyManager()
    rate_rl   = AdaptiveRateLimit()

    mode = (
        f"maks {MAX_LOAD_MORE}x klik" if MAX_LOAD_MORE > 0
        else "klik semua tombol + fallback pagination"
    )
    print(f"📋 {len(keywords)} keyword dimuat.")
    print(f"⚙️  Mode         : {mode}")
    print(f"   💰 Threshold  : Rp{HARGA_THRESHOLD:,}")
    print(f"   ✅ Min field  : {MIN_FIELDS_OK}/{TOTAL_FIELDS} (langsung screenshot)")
    print(f"   ⏳ Data timeout: {WAIT_DATA_TIMEOUT}s")
    print(f"   🔄 Max retry  : {MAX_DETAIL_RETRY}x (jika field < {MIN_FIELDS_OK})")
    print(f"   ♾️  Spinner    : {SPINNER_TIMEOUT}s")
    print(f"   🌐 Proxy      : {'aktif' if USE_PROXY and proxy_mgr.proxies else 'direct'}")
    print(f"   📊 Backup JSONL: {'aktif' if USE_JSON_BACKUP else 'off'}")
    print(f"   📷 Screenshot : {'JPEG' if SCREENSHOT_JPEG else 'PNG'}")
    print(f"   📋 Log        : {LOG_FILE}")
    print()

    logger.info(
        f"MULAI — {len(keywords)} keyword | threshold Rp{HARGA_THRESHOLD:,}"
    )

    os.makedirs(SCREENSHOT_FOLDER, exist_ok=True)
    os.makedirs(SCREENSHOT_MAHAL, exist_ok=True)

    checkpoint    = checkpoint_load()
    done_keywords = set(checkpoint.get("done_keywords", []))
    if done_keywords:
        print(f"♻️  Resume — sudah selesai: {list(done_keywords)}\n")

    async with async_playwright() as p:
        browser = None
        is_cdp  = False
        try:
            print("   🔄 Mencoba koneksi ke Chrome asli (Anti-Bot Level Maksimal)...")
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            is_cdp  = True
            print("   ✅ Berhasil terhubung ke Chrome asli!")
        except Exception:
            print("   ⚠️  Chrome asli tidak terdeteksi di port 9222.")
            print("   ⚠️  Fallback ke browser bawaan Playwright.")
            browser = await p.chromium.launch(
                headless=False,
                args=[
                    "--no-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-infobars",
                    "--disable-dev-shm-usage",
                    "--disable-http2",
                    "--ignore-certificate-errors",
                ],
            )

        if len(browser.contexts) > 0:
            context = browser.contexts[0]
            page    = await context.new_page()
            page.set_default_timeout(PAGE_TIMEOUT * 1000)
        else:
            context, page = await create_context(browser, proxy=await proxy_mgr.get_valid_proxy())

        context_ref      = [context]
        pfroduct_count    = 0
        all_saved= []
        all_keyword_data = []
    
        for keyword in keywords:
            if keyword in done_keywords:
                print(f"⏭️  Skip '{keyword}' (sudah selesai)")
                continue

            print(f"\n{'═'*62}")
            print(f"🔍 Keyword: '{keyword}'")
            print(f"{'═'*62}")

            products, context, page = await scrape_all_pages(
                page, keyword, browser=browser, context_ref=context_ref, is_cdp=is_cdp
            )

            if not products:
                print(f"   ⚠️  Tidak ada produk, restart sesi...")
                if is_cdp:
                    try:
                        await page.close()
                    except Exception:
                        pass
                    await asyncio.sleep(random.uniform(5, 10))
                    try:
                        await context_ref[0].clear_cookies()
                    except Exception:
                        pass
                    try:
                        page = await context_ref[0].new_page()
                    except Exception:
                        print("   ⚠️  Context mati, coba reconnect ke CDP...")
                        try:
                            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
                            context_ref[0] = browser.contexts[0]
                            page = await context_ref[0].new_page()
                            page.set_default_timeout(PAGE_TIMEOUT * 1000)
                        except Exception as ex:
                            print(f"   ❌ Reconnect gagal: {ex} — skip keyword ini")
                            continue
                else:
                    try:
                        await context_ref[0].close()
                    except Exception:
                        pass
                    await asyncio.sleep(random.uniform(8, 15))
                    try:
                        context, page  = await create_context(browser, proxy=await proxy_mgr.get_valid_proxy())
                        context_ref[0] = context
                    except Exception as ex:
                        print(f"   ❌ Gagal buat context baru: {ex} — skip")
                        continue
                product_count = 0
                continue

            detailed_products = []
            total = len(products)
            
            sem = asyncio.Semaphore(MAX_CONCURRENT_TABS)
            next_restart = RESTART_EVERY

            tracker = ProgressTracker(total)

            async def worker(product, p_idx):
                global _shutdown_requested
                if _shutdown_requested:
                    return product
                
                # [IMPROVEMENT] Semaphore Pacing (delay sebelum masuk diletakkan di loop luar)
                async with sem:
                    print(f"\n   [{p_idx}/{total}] {product['title'][:52]}...")
                    try:
                        detail_page = await context_ref[0].new_page()
                        detail_page.set_default_timeout(PAGE_TIMEOUT * 1000)
                        await _apply_stealth(detail_page)  # 🥷 stealth per tab
                    except Exception:
                        return product
                    try:
                        detailed = await scrape_product_detail(detail_page, product)
                        st = detailed.get("status", "ok")
                        if st in ("ok", "partial"):
                            rate_rl.on_success()
                        else:
                            rate_rl.on_failure()
                        backup_append(product.get("keyword", ""), detailed)
                        tracker.update(st)
                    except Exception as e:
                        print(f"      [Detail error: {e}]")
                        detailed = product
                        rate_rl.on_failure()
                    finally:
                        try:
                            await detail_page.close()
                        except Exception:
                            pass
                await human_delay(1.0, 2.0)
                return detailed

            for i in range(0, total, MAX_CONCURRENT_TABS):
                batch = products[i:i+MAX_CONCURRENT_TABS]
                
                if product_count >= next_restart:
                    next_restart += RESTART_EVERY
                    print(f"\n   🔄 Restart sesi (anti-throttle)...")
                    cooldown = random.uniform(COOLDOWN_ON_HANG, COOLDOWN_ON_HANG + 10)

                    if is_cdp:
                        try:
                            await page.close()
                        except Exception:
                            pass
                        escalation   = 1.0 + (product_count / 80) * 0.6
                        cooldown_eff = cooldown * min(escalation, 4.0)
                        print(f"   💤 Cooldown {cooldown_eff:.0f}s (x{min(escalation,4.0):.1f} setelah {product_count} produk)...")
                        try:
                            await context_ref[0].clear_cookies()
                            print("   🧹 Cookies di-clear")
                        except Exception:
                            pass
                        await asyncio.sleep(cooldown_eff)
                        try:
                            page = await context_ref[0].new_page()
                        except Exception:
                            print("   ⚠️  Context mati — reconnect ke CDP...")
                            try:
                                browser = await p.chromium.connect_over_cdp("http://localhost:9222")
                                context_ref[0] = browser.contexts[0]
                                page = await context_ref[0].new_page()
                                page.set_default_timeout(PAGE_TIMEOUT * 1000)
                            except Exception as ex:
                                print(f"   ❌ Reconnect gagal: {ex}")
                    else:
                        try:
                            await context_ref[0].close()
                        except Exception:
                            pass
                        escalation   = 1.0 + (product_count / 80) * 0.6
                        cooldown_eff = cooldown * min(escalation, 4.0)
                        print(f"   💤 Cooldown {cooldown_eff:.0f}s (x{min(escalation,4.0):.1f})...")
                        await asyncio.sleep(cooldown_eff)
                        context, page = await create_context(browser, proxy=await proxy_mgr.get_valid_proxy())
                        context_ref[0] = context

                    print(f"   ✅ Sesi baru siap")

                # [IMPROVEMENT] Pacing tasks for semaphore
                tasks = []
                for j, p in enumerate(batch):
                    await rate_rl.wait()
                    await asyncio.sleep(random.uniform(0.3, 1.5))
                    tasks.append(worker(p, i + j + 1))

                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                batch_results = [
                    products[i + j] if isinstance(r, Exception) else r
                    for j, r in enumerate(batch_results)
                ]
                
                # [IMPROVEMENT] Halt on High Failure Rate
                failed_in_batch = sum(1 for r in batch_results if r.get("status") in ("no_data", "failed", "blocked"))
                if failed_in_batch > 0 and failed_in_batch >= len(batch) * 0.5:
                    print(f"\n   🚨 PERINGATAN: Banyak produk gagal diekstrak dalam batch ini ({failed_in_batch}/{len(batch)}).")
                    print(f"   Mungkin selector Tokopedia berubah atau IP terblokir.")
                    notify_expensive({"title": "BANYAK GAGAL, HALTING SCRIPT", "price": "WARNING"})
                    _shutdown_requested = True

                detailed_products.extend(batch_results)
                product_count += len(batch)

                if _shutdown_requested:
                    print("   🛑 Shutdown diminta — menyimpan progress...")
                    break

            path = save_report(detailed_products, keyword)
            all_saved.append((keyword, path))
            all_keyword_data.append({
                "keyword" : keyword,
                "products": detailed_products
            })

            done_keywords.add(keyword)
            checkpoint_save({"done_keywords": list(done_keywords)})
            print(f"   💾 Checkpoint: {len(done_keywords)}/{len(keywords)} keyword")

            if _shutdown_requested:
                break
            await human_delay(5.0, 10.0)

        if USE_RETRY_QUEUE and not _shutdown_requested and all_keyword_data:
            all_failed = [
                (kw_d["keyword"], p)
                for kw_d in all_keyword_data
                for p in kw_d["products"]
                if p.get("status") in ("blocked", "no_data", "failed")
            ]
            if all_failed:
                print(f"\n{'\u2550'*62}")
                print(f"🔄 Retry Queue: {len(all_failed)} produk gagal — restart sesi dulu...")
                cooldown = random.uniform(20, 35)
                print(f"   💤 Cooldown {cooldown:.0f}s sebelum retry...")
                await asyncio.sleep(cooldown)
                if not is_cdp:
                    try:
                        await context_ref[0].close()
                    except Exception:
                        pass
                    ctx_r, page = await create_context(browser, proxy=await proxy_mgr.get_valid_proxy())
                    context_ref[0] = ctx_r
                for kw_label, p in all_failed:
                    if _shutdown_requested:
                        break
                    await asyncio.sleep(random.uniform(5, 10))
                    try:
                        rp = await context_ref[0].new_page()
                        rp.set_default_timeout(PAGE_TIMEOUT * 1000)
                        retried = await scrape_product_detail(rp, p)
                        await rp.close()
                        
                        for kd in all_keyword_data:
                            if kd["keyword"] == kw_label:
                                for idx, prod in enumerate(kd["products"]):
                                    if prod.get("link") == retried.get("link"):
                                        kd["products"][idx] = retried
                                        backup_append(kw_label, retried)
                                        break
                        st = retried.get("status", "?")
                        print(f"   🔄 Retry '{p.get('title','')[:40]}' → {st}")
                    except Exception as e:
                        print(f"   ⚠️  Retry error: {e}")
                        
                for kd in all_keyword_data:
                    save_report(kd["products"], kd["keyword"])
                print(f"💾 Laporan di-update setelah retry.")

        try:
            await context_ref[0].close()
        except Exception:
            pass
        try:
            await browser.close()
        except Exception:
            pass

    checkpoint_clear()
    save_summary(all_keyword_data)

    total_semua   = sum(len(d["products"]) for d in all_keyword_data)
    total_mahal   = sum(
        len([p for p in d["products"] if p.get("harga_tinggi") == "YA"])
        for d in all_keyword_data
    )
    total_partial = sum(
        len([p for p in d["products"] if p.get("status") == "partial"])
        for d in all_keyword_data
    )
    total_nodata  = sum(
        len([p for p in d["products"] if p.get("status", "ok") in ("no_data", "failed", "no_link", "blocked")])
        for d in all_keyword_data
    )

    print(f"\n{'═'*62}")
    print(f"🎉 Selesai!")
    print(f"   📦 Total produk     : {total_semua}")
    print(f"   💰 Harga tinggi     : {total_mahal} (> Rp{HARGA_THRESHOLD:,})")
    print(f"   ✅ Normal (ok)      : {total_semua - total_mahal - total_partial - total_nodata}")
    print(f"   🟡 Parsial          : {total_partial} (< {MIN_FIELDS_OK}/{TOTAL_FIELDS} field)")
    print(f"   ⚠️  No data/gagal   : {total_nodata}")
    print(f"   📊 Ringkasan        : {SUMMARY_FILE}")
    print(f"   📋 Log              : {LOG_FILE}")
    print(f"   📷 Screenshot semua : {SCREENSHOT_FOLDER}/")
    print(f"   📷 Screenshot mahal : {SCREENSHOT_MAHAL}/")
    print(f"\n   Laporan per keyword:")
    for kw, path in all_saved:
        print(f"      📁 '{kw}' → {path}")
    print(f"{'═'*62}")

    logger.info(
        f"SELESAI — total={total_semua} | mahal={total_mahal} | "
        f"normal={total_semua - total_mahal - total_partial - total_nodata} | "
        f"partial={total_partial} | nodata={total_nodata}"
    )

if __name__ == "__main__":
    asyncio.run(run_scraper())
    