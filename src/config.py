import re
import os

# ══════════════════════════════════════════
#  KONFIGURASI UMUM
# ══════════════════════════════════════════
OUTPUT_FOLDER       = "output"
KEYWORDS_FILE       = "keywords.txt"
PAGE_TIMEOUT        = 25
# Restart sesi setiap N produk. Lebih besar = lebih sedikit jeda, lebih cepat,
# tapi lebih berisiko diblok. Nilai 20 = balance kecepatan vs stealth.
RESTART_EVERY       = 20
# Durasi cooldown (detik) saat restart sesi. Lebih lama = lebih aman.
# Karena stealth kini aktif, kita bisa pakai nilai lebih moderat.
COOLDOWN_ON_HANG    = 25

# --- Diambil dari run.bat ---
MAX_LOAD_MORE       = int(os.environ.get("SCRAPER_SCROLL", 5))
HARGA_THRESHOLD     = int(os.environ.get("SCRAPER_THRESHOLD", 350000))

# Kurangi tab paralel: 3 tab = lebih natural, lebih sedikit terdeteksi
# dibanding 5 tab yang agresif. Trade-off: ~40% lebih lambat tapi ~3x lebih tahan.
MAX_CONCURRENT_TABS = 2

# Validasi data sebelum screenshot
WAIT_DATA_TIMEOUT   = 15        # detik — batas tunggu elemen produk muncul
MAX_DETAIL_RETRY    = 2         # berapa kali coba reload sebelum skip
SPINNER_TIMEOUT     = 8         # detik — berapa lama spinner boleh hidup

# Threshold field — berapa field minimum yang harus berhasil diekstrak
# sebelum screenshot diambil. Total field yang dicek ada 8.
MIN_FIELDS_OK       = 5         # ubah ke angka lain sesuai kebutuhan (1–8)
TOTAL_FIELDS        = 8         # jumlah total field yang diekstrak (jangan diubah)

# Throttle detection
THROTTLE_LIMIT      = 3

# Paths
CHECKPOINT_FILE     = "output/checkpoint.json"
LOG_FILE            = "output/scraper.log"
SCREENSHOT_FOLDER   = "output/screenshots"
SCREENSHOT_MAHAL    = "output/screenshots/mahal"
SUMMARY_FILE        = "output/ringkasan.xlsx"
PROXY_FILE          = "proxies.txt" 

# Toggle fitur — set False untuk disable
USE_PROXY           = True   # Proxy rotation dari proxies.txt
USE_ADAPTIVE_RL     = True   # Adaptive rate limiting
USE_RESOURCE_BLOCK  = True   # Block image/CSS di halaman search
USE_JSON_BACKUP     = True   # JSON Lines backup per keyword
USE_RETRY_QUEUE     = True   # Retry produk gagal di akhir sesi
USE_PROGRESS_DASH   = True   # Progress dashboard real-time
SCREENSHOT_JPEG     = True   # Simpan JPEG bukan PNG (hemat 80% disk)
SCREENSHOT_QUALITY  = 80     # Kualitas JPEG (1-100)


# ══════════════════════════════════════════
#  BROWSER & NETWORK SETTINGS
# ══════════════════════════════════════════
BLOCK_PATTERNS = re.compile(
    r"(google-analytics|googletagmanager|doubleclick|facebook\.net"
    r"|fbcdn|gtm\.js|analytics|tracker|hotjar|mixpanel"
    r"|amplitude|segment\.io|newrelic|sentry\.io|ads\."
    r"|\.woff|\.woff2|\.ttf|\.otf|youtube\.com/embed"
    r"|player\.vimeo\.com|\.mp4|\.webm|tiktok\.com|js/yt)"
)

USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0",
]

VIEWPORTS = [
    {"width": 1366, "height": 768},
    {"width": 1440, "height": 900},
    {"width": 1280, "height": 800},
    {"width": 1920, "height": 1080},
]
