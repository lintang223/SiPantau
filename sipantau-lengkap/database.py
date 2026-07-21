import os
import logging
from contextlib import contextmanager
from typing import Optional
import psycopg2
from psycopg2 import pool as pg_pool
from psycopg2.extras import RealDictCursor
from datetime import datetime

logger = logging.getLogger("sipantau")

DB_CONFIG = {
    "host":   os.getenv("DB_HOST", "localhost"),
    "port":   int(os.getenv("DB_PORT", "5432")),
    "dbname": os.getenv("DB_NAME", "sipantau"),
    "user":   os.getenv("DB_USER", "postgres"),
    "password": os.getenv("DB_PASSWORD", ""),
}

sslmode = os.getenv("DB_SSLMODE")
if sslmode:
    DB_CONFIG["sslmode"] = sslmode

_pool: Optional[pg_pool.ThreadedConnectionPool] = None

def get_pool() -> pg_pool.ThreadedConnectionPool:
    global _pool
    if _pool is None or _pool.closed:
        _pool = pg_pool.ThreadedConnectionPool(2, 10, **DB_CONFIG)
        logger.info("Connection pool PostgreSQL dibuat.")
    return _pool

class DictConnectionWrapper:
    def __init__(self, conn):
        self._conn = conn

    def cursor(self, *args, **kwargs):
        if 'cursor_factory' not in kwargs:
            kwargs['cursor_factory'] = RealDictCursor
        return self._conn.cursor(*args, **kwargs)

    def commit(self):
        return self._conn.commit()

    def rollback(self):
        return self._conn.rollback()

    def close(self):
        return self._conn.close()

    def __getattr__(self, name):
        return getattr(self._conn, name)

@contextmanager
def get_conn():
    conn = get_pool().getconn()
    wrapped_conn = DictConnectionWrapper(conn)
    try:
        yield wrapped_conn
    except Exception:
        conn.rollback()
        raise
    finally:
        get_pool().putconn(conn)

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
            id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL, nama TEXT,
            created_at TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS hasil_scraping (
            id SERIAL PRIMARY KEY, session_id TEXT, username TEXT, keyword TEXT,
            nama_produk TEXT, harga BIGINT, platform TEXT, rating REAL,
            terjual TEXT, url_produk TEXT, gambar_url TEXT, waktu_scrape TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS riwayat_session (
            id SERIAL PRIMARY KEY, session_id TEXT, username TEXT, keyword TEXT,
            platforms TEXT, jumlah_data INTEGER, status TEXT, file_excel TEXT, waktu TEXT
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS divisi_access (
            id SERIAL PRIMARY KEY,
            divisi_asal   TEXT NOT NULL,
            divisi_target TEXT NOT NULL,
            can_view      BOOLEAN DEFAULT true,
            UNIQUE(divisi_asal, divisi_target)
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS user_activity (
            id SERIAL PRIMARY KEY, username TEXT NOT NULL,
            aktivitas TEXT NOT NULL, detail TEXT,
            ip_address TEXT, waktu TEXT NOT NULL
        )""")
        cur.execute("""CREATE TABLE IF NOT EXISTS login_logs (
            id           SERIAL PRIMARY KEY,
            username     TEXT,
            ip_address   TEXT,
            user_agent   TEXT,
            status       TEXT NOT NULL,
            detail       TEXT,
            attempted_at TEXT NOT NULL
        )""")
        cur.execute(
            "SELECT COUNT(*) AS c FROM pg_indexes "
            "WHERE tablename='login_logs' AND indexname='idx_login_logs_attempted_at'"
        )
        if cur.fetchone()["c"] == 0:
            cur.execute("CREATE INDEX idx_login_logs_attempted_at ON login_logs(attempted_at)")

        # Column migrations
        migrations = [
            ("users",           "divisi",           "TEXT DEFAULT 'balai_gakkum'"),
            ("users",           "level",            "INTEGER DEFAULT 3"),
            ("users",           "can_export",       "BOOLEAN DEFAULT true"),
            ("users",           "can_manage_users", "BOOLEAN DEFAULT false"),
            ("users",           "foto_profil",      "TEXT"),
            ("users",           "updated_at",       "TEXT"),
            ("users",           "deleted_at",       "TEXT"),
            ("hasil_scraping",  "username",         "TEXT"),
            ("riwayat_session", "username",         "TEXT"),
            ("riwayat_session", "divisi",           "TEXT DEFAULT 'balai_gakkum'"),
        ]
        for table, col, col_type in migrations:
            cur.execute(
                "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_name=%s AND column_name=%s",
                (table, col)
            )
            if cur.fetchone()["c"] == 0:
                cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")

        # Hapus kolom password_plain jika masih ada (cleanup legacy)
        cur.execute(
            "SELECT COUNT(*) AS c FROM information_schema.columns WHERE table_name='users' AND column_name='password_plain'"
        )
        if cur.fetchone()["c"] > 0:
            cur.execute("ALTER TABLE users DROP COLUMN password_plain")
            logger.info("Kolom password_plain dihapus dari tabel users.")

        # Seed access rules
        for asal, target in DEFAULT_ACCESS:
            cur.execute(
                "INSERT INTO divisi_access (divisi_asal, divisi_target) VALUES (%s,%s) ON CONFLICT DO NOTHING",
                (asal, target)
            )

        # Default admin — password dari env var
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
                   VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                ("admin", hash_pw(_admin_pw), "Administrator",
                 "sekditjen", 1, True, True, datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
            )

        # Sync level
        cur.execute("SELECT username, divisi FROM users WHERE level IS NULL OR level = 0")
        for r in cur.fetchall():
            uname, divisi = r["username"], r["divisi"]
            lvl = DIVISI_LEVEL.get(divisi or "balai_gakkum", 3)
            cur.execute("UPDATE users SET level=%s WHERE username=%s", (lvl, uname))

        conn.commit()
        cur.close()
    print("Database PostgreSQL siap!")
