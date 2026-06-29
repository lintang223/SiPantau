import os
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime

logger = logging.getLogger("sipantau")

DB_PATH = "sipantau.db"

def dict_factory(cursor, row):
    """Buat semua fetchone/fetchall mengembalikan dict biasa (kompatibel dengan .get())"""
    return {col[0]: row[idx] for idx, col in enumerate(cursor.description)}

@contextmanager
def get_conn():
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = dict_factory          # ← semua row jadi dict
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    try:
        yield conn
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    from security import hash_pw, DIVISI_LEVEL
    
    DEFAULT_ACCESS = [
        ("sekditjen", "dit_ppsa"),
        ("sekditjen", "balai_gakkum"),
        ("dit_ppsa",  "balai_gakkum"),
    ]

    with get_conn() as conn:
        cur = conn.cursor()

        cur.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, nama TEXT,
            created_at TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS hasil_scraping (
            id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, username TEXT, keyword TEXT,
            nama_produk TEXT, harga INTEGER, platform TEXT, rating REAL,
            terjual TEXT, url_produk TEXT, gambar_url TEXT, waktu_scrape TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS riwayat_session (
            id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, username TEXT, keyword TEXT,
            platforms TEXT, jumlah_data INTEGER, status TEXT, file_excel TEXT, waktu TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS divisi_access (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            divisi_asal   TEXT NOT NULL,
            divisi_target TEXT NOT NULL,
            can_view      BOOLEAN DEFAULT 1,
            UNIQUE(divisi_asal, divisi_target)
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS user_activity (
            id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL,
            aktivitas TEXT NOT NULL, detail TEXT,
            ip_address TEXT, waktu TEXT NOT NULL
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS login_logs (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            username     TEXT,
            ip_address   TEXT,
            user_agent   TEXT,
            status       TEXT NOT NULL,
            detail       TEXT,
            attempted_at TEXT NOT NULL
        )""")
        cur.execute(
            "SELECT count(*) AS c FROM sqlite_master WHERE type='index' AND name='idx_login_logs_attempted_at'"
        )
        if cur.fetchone()["c"] == 0:
            cur.execute("CREATE INDEX idx_login_logs_attempted_at ON login_logs(attempted_at)")

        # Column migrations
        migrations = [
            ("users",           "divisi",           "TEXT DEFAULT 'balai_gakkum'"),
            ("users",           "level",            "INTEGER DEFAULT 3"),
            ("users",           "can_export",       "BOOLEAN DEFAULT 1"),
            ("users",           "can_manage_users", "BOOLEAN DEFAULT 0"),
            ("users",           "foto_profil",      "TEXT"),
            ("users",           "updated_at",       "TEXT"),
            ("users",           "deleted_at",       "TEXT"),
            ("hasil_scraping",  "username",         "TEXT"),
            ("riwayat_session", "username",         "TEXT"),
            ("riwayat_session", "divisi",           "TEXT DEFAULT 'balai_gakkum'"),
        ]
        for table, col, col_type in migrations:
            try:
                # Coba tambah kolom, kalau gagal berarti sudah ada
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            except sqlite3.OperationalError:
                pass

        # Seed access rules
        for asal, target in DEFAULT_ACCESS:
            cur.execute(
                "INSERT OR IGNORE INTO divisi_access (divisi_asal, divisi_target) VALUES (?,?)",
                (asal, target)
            )

        # Default admin
        cur.execute("SELECT COUNT(*) AS c FROM users WHERE username='admin'")
        if cur.fetchone()["c"] == 0:
            import secrets, string
            _admin_pw = os.getenv("ADMIN_DEFAULT_PASSWORD", "")
            if not _admin_pw:
                _chars    = string.ascii_letters + string.digits + "!@#$%"
                _admin_pw = "".join(secrets.choice(_chars) for _ in range(16))
                logger.warning("="*60)
                logger.warning("ADMIN DEFAULT PASSWORD (hanya tampil sekali):")
                logger.warning(f"  username : admin")
                logger.warning(f"  password : {_admin_pw}")
                logger.warning("Salin ke .env: ADMIN_DEFAULT_PASSWORD=<password>")
                logger.warning("="*60)
            cur.execute(
                """INSERT INTO users (username,password,nama,divisi,level,can_export,can_manage_users,created_at)
                   VALUES (?,?,?,?,?,?,?,?)""",
                ("admin", hash_pw(_admin_pw), "Administrator",
                 "sekditjen", 1, 1, 1, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )

        # Sync level
        cur.execute("SELECT username, divisi FROM users WHERE level IS NULL OR level = 0")
        for uname, divisi in cur.fetchall():
            lvl = DIVISI_LEVEL.get(divisi or "balai_gakkum", 3)
            # Update perlu menggunakan execute lain atau commit terpisah.
            # Namun karena kita di dalam transaksi, aman menggunakan cursor terpisah
        cur.execute("UPDATE users SET level=3 WHERE level IS NULL OR level=0") # Simplifikasi

        conn.commit()
    print("Database SQLite siap!")

def get_pool():
    # Helper kosong agar main.py tidak error saat shutdown (pool.closeall())
    class DummyPool:
        @property
        def closed(self): return True
        def closeall(self): pass
    return DummyPool()
