import os
import json
import logging
import re
import time
import random
import asyncio
from datetime import datetime
from scraper.config import *

# ══════════════════════════════════════════
#  LOGGING
# ══════════════════════════════════════════
def setup_logger() -> logging.Logger:
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    logger = logging.getLogger("scraper")
    logger.setLevel(logging.INFO)
    if logger.handlers:
        return logger
    fmt = logging.Formatter(
        "%(asctime)s | %(levelname)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    fh = logging.FileHandler(LOG_FILE, encoding="utf-8")
    fh.setFormatter(fmt)
    logger.addHandler(fh)
    return logger

logger = setup_logger()

# ══════════════════════════════════════════
#  CHECKPOINT & BACKUP
# ══════════════════════════════════════════
def checkpoint_load() -> dict:
    if os.path.exists(CHECKPOINT_FILE):
        try:
            with open(CHECKPOINT_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {}

def checkpoint_save(data: dict):
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    with open(CHECKPOINT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def checkpoint_clear():
    if os.path.exists(CHECKPOINT_FILE):
        os.remove(CHECKPOINT_FILE)
        print("   🗑️  Checkpoint dihapus.")

def _backup_path(keyword: str) -> str:
    return os.path.join(OUTPUT_FOLDER, f"backup_{sanitize_filename(keyword.lower())}.jsonl")

def backup_load_done_links(keyword: str) -> set:
    path = _backup_path(keyword)
    done: set = set()
    if not USE_JSON_BACKUP or not os.path.exists(path):
        return done
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
                if obj.get("link"):
                    done.add(obj["link"])
            except Exception:
                pass
    return done

def backup_load_all_products(keyword: str) -> list:
    """Muat semua produk yang pernah di-scraping sebelumnya untuk digabung ke Excel baru."""
    path = _backup_path(keyword)
    products = []
    if not USE_JSON_BACKUP or not os.path.exists(path):
        return products
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            try:
                obj = json.loads(line)
                if obj.get("link"):
                    products.append(obj)
            except Exception:
                pass
    return products

def backup_append(keyword: str, product: dict):
    if not USE_JSON_BACKUP:
        return
    os.makedirs(OUTPUT_FOLDER, exist_ok=True)
    try:
        with open(_backup_path(keyword), "a", encoding="utf-8") as f:
            f.write(json.dumps(product, ensure_ascii=False) + "\n")
    except Exception:
        pass

def _unique_path(base: str) -> str:
    if not os.path.exists(base):
        return base
    root, ext = os.path.splitext(base)
    c = 1
    while os.path.exists(f"{root}_{c}{ext}"):
        c += 1
    return f"{root}_{c}{ext}"

# ══════════════════════════════════════════
#  STRING UTILS
# ══════════════════════════════════════════
def load_keywords(path: str) -> list[str]:
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as f:
            f.write("gading gajah\ntaring harimau\nsisik trenggiling\n")
        print(f"⚠️  '{path}' tidak ditemukan. File contoh telah dibuat.")
        return ["gading gajah", "taring harimau", "sisik trenggiling"]
    with open(path, "r", encoding="utf-8") as f:
        kws = [line.strip() for line in f if line.strip()]
    if not kws:
        print("⚠️  keywords.txt kosong!")
        return []
    return kws

def clean_text(text: str) -> str:
    return re.sub(r'\s+', ' ', text).strip()

def sanitize_filename(name: str) -> str:
    return re.sub(r'[\\/*?:"<>|]', "_", name)

def parse_rating(raw: str) -> str:
    raw = clean_text(raw).replace(',', '.')
    match = re.search(r'\d+\.?\d*', raw)
    return match.group() if match else "N/A"

def extract_price_number(price_str: str) -> int:
    digits = re.sub(r'[^0-9]', '', str(price_str))
    return int(digits) if digits else 0

def format_price(raw: str) -> str:
    raw = raw.strip()
    if not raw:
        return "N/A"
    if not raw.startswith("Rp"):
        raw = "Rp" + raw
    return raw

def is_expensive(product: dict, threshold: int = 0) -> bool:
    return extract_price_number(product.get("price", "0")) >= 1000000

async def human_delay(min_sec=2.0, max_sec=5.0):
    if random.random() < 0.12:
        extra = random.uniform(5, 12)
        print(f"   💤 Jeda {extra:.1f}s...")
        await asyncio.sleep(extra)
    else:
        await asyncio.sleep(random.uniform(min_sec, max_sec))

# ══════════════════════════════════════════
#  NOTIFIKASI OS
# ══════════════════════════════════════════
def notify_expensive(product: dict):
    title = product.get("title", "")[:60]
    price = product.get("price", "N/A")
    try:
        import winsound
        winsound.Beep(800, 400)
    except Exception:
        pass
    try:
        import subprocess
        safe_msg = f"Harga {price} | {title}".replace("'","").replace('"',"")
        ps = f"""
Add-Type -AssemblyName System.Windows.Forms
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.SystemIcons]::Warning
$n.Visible = $true
$n.ShowBalloonTip(6000, '⚠️ Perhatian!', '{safe_msg}', [System.Windows.Forms.ToolTipIcon]::Warning)
Start-Sleep 7
$n.Dispose()"""
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
        subprocess.Popen(
            ["powershell", "-WindowStyle", "Hidden", "-Command", ps],
            creationflags=flags
        )
    except Exception:
        pass

# ══════════════════════════════════════════
#  PROGRESS TRACKER
# ══════════════════════════════════════════
class ProgressTracker:
    def __init__(self, total: int):
        self.total      = total
        self.done       = 0
        self.ok         = 0
        self.partial    = 0
        self.blocked    = 0
        self.no_data    = 0
        self._t0        = time.time()

    def update(self, status: str):
        if not USE_PROGRESS_DASH:
            return
        self.done += 1
        if   status == "ok":      self.ok      += 1
        elif status == "partial": self.partial  += 1
        elif status == "blocked": self.blocked  += 1
        else:                     self.no_data  += 1
        if self.done % 10 == 0 or self.done == self.total:
            elapsed = time.time() - self._t0
            speed   = (self.done / elapsed * 60) if elapsed > 0 else 0
            eta     = ((self.total - self.done) / (speed / 60)) if speed > 0 else 0
            pct     = self.done / self.total * 100
            print(
                f"\r   📊 [{self.done}/{self.total}] {pct:.1f}% | "
                f"⚡{speed:.1f}/min | ⏱️ETA {eta:.0f}m | "
                f"✅{self.ok} 🟡{self.partial} ⛔{self.blocked} ❌{self.no_data}   ",
                end="", flush=True
            )
            if self.done == self.total:
                print()
