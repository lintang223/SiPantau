import asyncio
import random
import re
from config import PAGE_TIMEOUT, USER_AGENTS, VIEWPORTS, USE_ADAPTIVE_RL, BLOCK_PATTERNS

try:
    from playwright_stealth import stealth_async
    _STEALTH_AVAILABLE = True
except ImportError:
    _STEALTH_AVAILABLE = False
    print("   ⚠️  playwright-stealth tidak ditemukan. Jalankan: pip install playwright-stealth")

# ══════════════════════════════════════════
#  ADAPTIVE RATE LIMITER
# ══════════════════════════════════════════
class AdaptiveRateLimit:
    def __init__(self, base_min: float = 1.0, base_max: float = 2.5):
        self.base_min      = base_min
        self.base_max      = base_max
        self.factor        = 1.0
        self._streak       = 0

    async def wait(self):
        if not USE_ADAPTIVE_RL:
            return
        delay = random.uniform(self.base_min, self.base_max) * self.factor
        await asyncio.sleep(delay)

    def on_success(self):
        self._streak += 1
        if self._streak >= 5:
            self.factor = max(0.5, self.factor * 0.75)
            self._streak = 0

    def on_failure(self):
        self.factor = min(8.0, self.factor * 2.0)
        self._streak = 0
        print(f"   ⚠️  Rate limit naik — delay factor={self.factor:.1f}x")

# ══════════════════════════════════════════
#  BROWSER CONTEXT
# ══════════════════════════════════════════
async def create_context(browser, proxy: dict = None):
    ua = random.choice(USER_AGENTS)
    vp = random.choice(VIEWPORTS)
    proxy_str = proxy.get("server", "direct") if proxy else "direct"
    print(f"   🔄 Context baru — {vp['width']}x{vp['height']} | proxy={proxy_str}")
    
    ctx_opts = dict(
        user_agent=ua, viewport=vp,
        locale="id-ID", timezone_id="Asia/Jakarta",
        java_script_enabled=True, ignore_https_errors=True,
        extra_http_headers={
            "Accept"                   : "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language"          : "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
            "Accept-Encoding"          : "gzip, deflate, br",
            "Connection"               : "keep-alive",
            "Upgrade-Insecure-Requests": "1",
            "Sec-Fetch-Dest"           : "document",
            "Sec-Fetch-Mode"           : "navigate",
            "Sec-Fetch-Site"           : "none",
            "Sec-Fetch-User"           : "?1",
            "Cache-Control"            : "max-age=0",
        },
    )
    if proxy:
        ctx_opts["proxy"] = proxy

    context = await browser.new_context(**ctx_opts)

    async def block_trackers(route):
        if BLOCK_PATTERNS.search(route.request.url):
            await route.abort()
        else:
            await route.continue_()

    # [IMPROVEMENT] Jangan blokir resource di seluruh context (bahaya untuk tab lain di mode CDP)
    # Sebagai gantinya, pemblokiran di-apply pada spesifik page
    
    # Spoofing fingerprint level dalam via init_script
    await context.add_init_script("""
        // --- Webdriver ---
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
        delete window.__playwright;
        delete window.__pw_manual;
        delete window._phantom;
        delete window.callPhantom;
        delete window.__nightmare;

        // --- Plugins & Languages ---
        Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
        Object.defineProperty(navigator, 'languages', { get: () => ['id-ID', 'id', 'en-US'] });
        Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
        Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
        Object.defineProperty(navigator, 'maxTouchPoints', { get: () => 0 });

        // --- Chrome runtime ---
        window.chrome = {
            runtime: {
                onMessage: { addListener: () => {} },
                connect: () => {},
                sendMessage: () => {}
            },
            loadTimes: () => ({}),
            csi: () => ({}),
            app: {}
        };

        // --- Permissions ---
        Object.defineProperty(navigator, 'permissions', {
            get: () => ({ query: (p) => Promise.resolve({
                state: p.name === 'notifications' ? 'denied' : 'granted'
            }) })
        });

        // --- Canvas Fingerprint Noise ---
        const origToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type, ...rest) {
            const ctx = this.getContext('2d');
            if (ctx) {
                const imgData = ctx.getImageData(0, 0, this.width, this.height);
                for (let i = 0; i < imgData.data.length; i += 400) {
                    imgData.data[i] = imgData.data[i] ^ 1;
                }
                ctx.putImageData(imgData, 0, 0);
            }
            return origToDataURL.apply(this, [type, ...rest]);
        };

        // --- WebGL Fingerprint Spoof ---
        const origGetParam = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return 'Intel Inc.';
            if (param === 37446) return 'Intel Iris OpenGL Engine';
            return origGetParam.call(this, param);
        };

        // --- AudioContext Fingerprint Noise ---
        const origCreateAnalyser = AudioContext.prototype.createAnalyser;
        AudioContext.prototype.createAnalyser = function() {
            const analyser = origCreateAnalyser.call(this);
            const origGetFloat = analyser.getFloatFrequencyData.bind(analyser);
            analyser.getFloatFrequencyData = function(arr) {
                origGetFloat(arr);
                for (let i = 0; i < arr.length; i += 100) arr[i] += Math.random() * 0.0001;
            };
            return analyser;
        };
    """)
    
    page = await context.new_page()
    page.set_default_timeout(PAGE_TIMEOUT * 1000)
    
    # Terapkan playwright-stealth jika tersedia (paling efektif)
    if _STEALTH_AVAILABLE:
        await stealth_async(page)
        print("   🥷 Stealth mode aktif")
    
    # Apply resource blocker pada page ini
    await page.route("**/*", block_trackers)
    
    return context, page

# ══════════════════════════════════════════
#  NAVIGASI AMAN
# ══════════════════════════════════════════
async def is_page_hanging(page) -> bool:
    try:
        result = await asyncio.wait_for(
            page.evaluate("() => document.readyState"), timeout=5.0
        )
        return result == "loading"
    except Exception:
        return True

async def is_blocked(page) -> bool:
    try:
        title = (await page.title()).lower()
        url   = page.url.lower()
        if any(k in title for k in [
            "captcha","verify","robot","access denied","forbidden","blocked"
        ]):
            return True
        if any(k in url for k in ["cf-challenge","captcha","verify","blocked"]):
            return True
        for sel in ["iframe[src*='captcha']", "#captcha", ".g-recaptcha"]:
            if await page.query_selector(sel):
                return True
    except Exception:
        pass
    return False

async def safe_goto(page, url: str, label="halaman", retry=2) -> bool:
    for attempt in range(retry):
        print(f"   🌐 Membuka {label}{'  (retry)' if attempt > 0 else ''}...")
        try:
            await page.goto(
                url,
                wait_until="domcontentloaded",
                timeout=PAGE_TIMEOUT * 1000  # ms
            )
        except Exception as e:
            err_str = str(e).lower()
            if "timeout" in err_str or "time out" in err_str:
                print(f"   ⏰ Timeout — paksa stop...")
            else:
                print(f"   ❌ Error: {e}")
            try:
                await page.evaluate("window.stop()")
            except Exception:
                pass
            await asyncio.sleep(2)
            if attempt < retry - 1:
                continue
            return False

        await asyncio.sleep(random.uniform(1.5, 2.5))

        if await is_page_hanging(page):
            try:
                await page.evaluate("window.stop()")
            except Exception:
                pass
            await asyncio.sleep(1)
        return True
    return False
