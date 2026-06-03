"""
session_manager.py — Manajemen sesi/cookie Shopee agar tidak perlu login berulang.

Cara kerja:
1. Saat login pertama (manual), cookies disimpan ke output/shopee_session.json
2. Setiap sesi berikutnya, cookies di-inject otomatis ke browser context
3. Jika session expired / invalid → user diminta login ulang → disimpan lagi

Gunakan shopee_login.py untuk login pertama kali.
"""
import json
import os
import asyncio
from datetime import datetime

SESSION_FILE         = "output/shopee_session.json"
SESSION_EXPIRY_HOURS = 18   # Shopee session biasanya valid 24–72 jam

# ══════════════════════════════════════════
#  LOAD SESSION
# ══════════════════════════════════════════
def load_shopee_session() -> list:
    """
    Baca cookies Shopee dari file.
    Return [] jika tidak ada / kedaluwarsa.
    """
    path = SESSION_FILE
    if not os.path.exists(path):
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        saved_at   = datetime.fromisoformat(data.get("saved_at", "2000-01-01"))
        age_hours  = (datetime.now() - saved_at).total_seconds() / 3600
        if age_hours > SESSION_EXPIRY_HOURS:
            print(f"   ⚠️  Session Shopee kedaluwarsa ({age_hours:.1f}j > {SESSION_EXPIRY_HOURS}j)")
            try:
                os.remove(path)
            except Exception:
                pass
            return []
        cookies = data.get("cookies", [])
        if not cookies:
            return []
        print(f"   🍪 Session Shopee dimuat: {len(cookies)} cookie (usia {age_hours:.1f}j)")
        return cookies
    except Exception as e:
        print(f"   ⚠️  Gagal baca session: {e}")
        return []


# ══════════════════════════════════════════
#  SAVE SESSION
# ══════════════════════════════════════════
def save_shopee_session(cookies: list):
    """Simpan cookies Shopee ke file JSON."""
    try:
        os.makedirs("output", exist_ok=True)
        # Hanya simpan cookie domain shopee.co.id
        shopee_cookies = [
            c for c in cookies
            if "shopee" in str(c.get("domain", "")).lower()
        ]
        if not shopee_cookies:
            print("   ⚠️  Tidak ada cookie Shopee ditemukan untuk disimpan.")
            return
        data = {
            "saved_at" : datetime.now().isoformat(),
            "cookies"  : shopee_cookies,
        }
        with open(SESSION_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"   💾 Session Shopee tersimpan: {len(shopee_cookies)} cookie → {SESSION_FILE}")
    except Exception as e:
        print(f"   ⚠️  Gagal simpan session: {e}")


# ══════════════════════════════════════════
#  HAPUS SESSION
# ══════════════════════════════════════════
def clear_shopee_session():
    """Hapus session file (paksa login ulang)."""
    if os.path.exists(SESSION_FILE):
        try:
            os.remove(SESSION_FILE)
            print("   🗑️  Session Shopee dihapus.")
        except Exception as e:
            print(f"   ⚠️  Gagal hapus session: {e}")
    else:
        print("   ℹ️  Tidak ada session tersimpan.")


# ══════════════════════════════════════════
#  INJECT KE CONTEXT
# ══════════════════════════════════════════
async def apply_shopee_session(context) -> bool:
    """
    Inject cookies tersimpan ke Playwright context.
    Return True jika ada cookie yang berhasil di-inject.
    """
    cookies = load_shopee_session()
    if not cookies:
        return False
    try:
        await context.add_cookies(cookies)
        print(f"   ✅ {len(cookies)} cookie Shopee di-inject ke browser context")
        return True
    except Exception as e:
        print(f"   ⚠️  Gagal inject cookie ke context: {e}")
        return False


# ══════════════════════════════════════════
#  CAPTURE DARI CONTEXT
# ══════════════════════════════════════════
async def capture_shopee_session(context) -> list:
    """
    Ambil semua cookie domain Shopee dari context aktif.
    Biasanya dipanggil setelah user berhasil login manual.
    """
    try:
        all_cookies = await context.cookies()
        shopee_cookies = [
            c for c in all_cookies
            if "shopee" in str(c.get("domain", "")).lower()
        ]
        return shopee_cookies
    except Exception as e:
        print(f"   ⚠️  Gagal capture cookie dari context: {e}")
        return []


# ══════════════════════════════════════════
#  CEK APAKAH SESSION VALID (TANPA BUKA BROWSER)
# ══════════════════════════════════════════
def has_valid_session() -> bool:
    """Return True jika file session ada dan belum kedaluwarsa."""
    return len(load_shopee_session()) > 0
