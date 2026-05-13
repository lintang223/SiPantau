"""
SiPantau — Sistem Riset Informasi Market
Backend FastAPI + Auth PostgreSQL + Hierarchical RBAC
Kementerian Lingkungan Hidup dan Kehutanan RI
"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import pandas as pd
import psycopg2, psycopg2.extras
import hashlib, os
from collections import defaultdict
import time

app = FastAPI(title="SiPantau API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
os.makedirs("exports", exist_ok=True)

# ── Rate limiting ─────────────────────────────────────────────────────────────
login_attempts: dict = defaultdict(list)

def check_rate_limit(ip: str, max_attempts: int = 5, window: int = 60):
    now = time.time()
    attempts = [t for t in login_attempts[ip] if now - t < window]
    login_attempts[ip] = attempts
    if len(attempts) >= max_attempts:
        raise HTTPException(status_code=429, detail="Terlalu banyak percobaan login. Coba lagi dalam 1 menit.")
    login_attempts[ip].append(now)

def validate_input(value: str, field_name: str, max_length: int = 100):
    if not value or not value.strip():
        raise HTTPException(status_code=400, detail=f"{field_name} tidak boleh kosong")
    if len(value) > max_length:
        raise HTTPException(status_code=400, detail=f"{field_name} terlalu panjang")
    for d in ["'", '"', ";", "--", "/*", "*/", "xp_", "exec", "drop", "truncate"]:
        if d.lower() in value.lower():
            raise HTTPException(status_code=400, detail=f"{field_name} mengandung karakter tidak valid")
    return value.strip()

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response

# ── DB Config ─────────────────────────────────────────────────────────────────
DB_CONFIG = {"host": "localhost", "port": 5050, "dbname": "sipantau", "user": "postgres", "password": "bola"}

def get_conn():
    return psycopg2.connect(**DB_CONFIG)

def hash_pw(p: str) -> str:
    return hashlib.sha256(p.encode()).hexdigest()

# ── Hierarchical RBAC ─────────────────────────────────────────────────────────
# level: 1=superadmin, 2=sekdit, 3=pengawasan/pengaduan
DIVISI_LEVEL = {
    "superadmin": 1,
    "sekdit":     2,
    "pengawasan": 3,
    "pengaduan":  3,
}

DIVISI_COLOR = {
    "superadmin": "#7c3aed",
    "sekdit":     "#1B4332",
    "pengawasan": "#1d4ed8",
    "pengaduan":  "#c2410c",
}

# Default cross-divisi access rules (divisi_asal -> list divisi_target that can be viewed)
DEFAULT_ACCESS = [
    ("superadmin", "sekdit"),
    ("superadmin", "pengawasan"),
    ("superadmin", "pengaduan"),
    ("sekdit",     "pengawasan"),
    ("sekdit",     "pengaduan"),
]

def get_accessible_divisi(conn, user_divisi: str) -> List[str]:
    """Returns list of divisi_target that this user's divisi can view.
    Superadmin (level 1) always gets access to ALL divisi.
    """
    # Superadmin mendapat akses ke semua divisi
    if DIVISI_LEVEL.get(user_divisi, 99) == 1:
        return list(DIVISI_LEVEL.keys())  # ['superadmin', 'sekdit', 'pengawasan', 'pengaduan']
    cur = conn.cursor()
    cur.execute("SELECT divisi_target FROM divisi_access WHERE divisi_asal = %s AND can_view = true", (user_divisi,))
    result = [r[0] for r in cur.fetchall()]
    cur.close()
    return result

# ── Init DB ───────────────────────────────────────────────────────────────────
def init_db():
    conn = get_conn()
    cur = conn.cursor()

    # Core tables
    cur.execute("""CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL, password_plain TEXT, nama TEXT,
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

    # divisi_access table
    cur.execute("""CREATE TABLE IF NOT EXISTS divisi_access (
        id SERIAL PRIMARY KEY,
        divisi_asal   TEXT NOT NULL,
        divisi_target TEXT NOT NULL,
        can_view      BOOLEAN DEFAULT true,
        UNIQUE(divisi_asal, divisi_target)
    )""")

    # Column migrations — safe IF NOT EXISTS via SELECT check
    migrations = [
        ("users",           "password_plain",   "TEXT"),
        ("users",           "divisi",           "TEXT DEFAULT 'pengawasan'"),
        ("users",           "level",            "INTEGER DEFAULT 3"),
        ("users",           "can_export",       "BOOLEAN DEFAULT true"),
        ("users",           "can_manage_users", "BOOLEAN DEFAULT false"),
        ("hasil_scraping",  "username",         "TEXT"),
        ("riwayat_session", "username",         "TEXT"),
        ("riwayat_session", "divisi",           "TEXT DEFAULT 'pengawasan'"),
    ]
    for table, col, col_type in migrations:
        cur.execute("SELECT COUNT(*) FROM information_schema.columns WHERE table_name=%s AND column_name=%s", (table, col))
        if cur.fetchone()[0] == 0:
            cur.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")

    # Seed default access rules
    for asal, target in DEFAULT_ACCESS:
        cur.execute("INSERT INTO divisi_access (divisi_asal, divisi_target) VALUES (%s,%s) ON CONFLICT DO NOTHING", (asal, target))

    # Default admin
    cur.execute("SELECT COUNT(*) FROM users WHERE username='admin'")
    if cur.fetchone()[0] == 0:
        cur.execute("""INSERT INTO users (username,password,password_plain,nama,divisi,level,can_export,can_manage_users,created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            ("admin", hash_pw("klhk2025"), "klhk2025", "Administrator",
             "superadmin", 1, True, True, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        print("Akun admin default dibuat (admin / klhk2025)")

    # Sync level for existing users that have no level yet
    cur.execute("SELECT username, divisi FROM users WHERE level IS NULL OR level = 0")
    for uname, divisi in cur.fetchall():
        lvl = DIVISI_LEVEL.get(divisi or "pengawasan", 3)
        cur.execute("UPDATE users SET level=%s WHERE username=%s", (lvl, uname))

    conn.commit(); cur.close(); conn.close()
    print("Database PostgreSQL siap!")

init_db()

# ── Models ────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    username: str
    password: str

class ChangePasswordRequest(BaseModel):
    username: str
    password_lama: str
    password_baru: str

class TambahUserRequest(BaseModel):
    username: str
    password: str
    nama: str
    divisi: str = "pengawasan"

class ResetPasswordRequest(BaseModel):
    username: str
    password_baru: str

class ScrapeRequest(BaseModel):
    keyword: str
    platforms: List[str]
    max_pages: int = 3
    max_load_more: int = 5
    harga_threshold: int = 350000
    min_price: Optional[int] = 0
    max_price: Optional[int] = 999999999
    sort_by: Optional[str] = "relevance"
    username: Optional[str] = None

class ScrapeResultsRequest(BaseModel):
    session_id: str
    keyword: str
    username: str
    platforms: List[str]
    results: List[dict]
    harga_threshold: int = 350000

class ExportRequest(BaseModel):
    session_id: str
    keyword: str

# ── Health ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health_check():
    try:
        conn = get_conn(); conn.close()
        return {"status": "ok", "app": "SiPantau", "versi": "1.0.0", "db": "PostgreSQL"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

# ── Auth ──────────────────────────────────────────────────────────────────────
@app.post("/api/auth/login")
def login(req: LoginRequest, request: Request):
    ip = request.client.host if request.client else "unknown"
    check_rate_limit(ip)
    validate_input(req.username, "Username", max_length=50)
    if not (1 <= len(req.password) <= 100):
        raise HTTPException(status_code=400, detail="Password tidak valid")

    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM users WHERE username = %s", (req.username,))
    user = cur.fetchone()

    if not user or user["password"] != hash_pw(req.password):
        cur.close(); conn.close()
        raise HTTPException(status_code=401, detail="Username atau password salah")

    divisi = user.get("divisi") or "pengawasan"
    level  = user.get("level") or DIVISI_LEVEL.get(divisi, 3)
    accessible = get_accessible_divisi(conn, divisi)
    cur.close(); conn.close()

    return {
        "success": True,
        "user": {
            "username":          user["username"],
            "nama":              user["nama"],
            "divisi":            divisi,
            "level":             level,
            "can_export":        bool(user.get("can_export", True)),
            "can_manage_users":  bool(user.get("can_manage_users", False)),
            "accessible_divisi": accessible,
            "divisi_color":      DIVISI_COLOR.get(divisi, "#374151"),
        }
    }

@app.get("/api/auth/me")
def get_me(username: str):
    """Refresh data user terbaru dari DB (accessible_divisi, divisi, dll)."""
    if not username:
        raise HTTPException(status_code=400, detail="Username diperlukan")
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM users WHERE username = %s", (username,))
    user = cur.fetchone()
    if not user:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    divisi = user.get("divisi") or "pengawasan"
    level  = user.get("level") or DIVISI_LEVEL.get(divisi, 3)
    accessible = get_accessible_divisi(conn, divisi)
    cur.close(); conn.close()
    return {
        "success": True,
        "user": {
            "username":          user["username"],
            "nama":              user["nama"],
            "divisi":            divisi,
            "level":             level,
            "can_export":        bool(user.get("can_export", True)),
            "can_manage_users":  bool(user.get("can_manage_users", False)),
            "accessible_divisi": accessible,
            "divisi_color":      DIVISI_COLOR.get(divisi, "#374151"),
        }
    }

@app.post("/api/auth/ganti-password")
def ganti_password(req: ChangePasswordRequest):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT * FROM users WHERE username = %s", (req.username,))
    user = cur.fetchone()
    if not user or user["password"] != hash_pw(req.password_lama):
        cur.close(); conn.close()
        raise HTTPException(status_code=401, detail="Password lama salah")
    cur.execute(
        "UPDATE users SET password=%s, password_plain=NULL WHERE username=%s",
        (hash_pw(req.password_baru), req.username)
    )
    conn.commit(); cur.close(); conn.close()
    return {"success": True, "message": "Password berhasil diubah"}

# ── User Management ───────────────────────────────────────────────────────────
@app.get("/api/users")
def get_users():
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    cur.execute("SELECT id,username,password_plain,nama,divisi,level,can_export,can_manage_users,created_at FROM users ORDER BY id")
    rows = cur.fetchall(); cur.close(); conn.close()
    return {"users": [dict(r) for r in rows]}

@app.post("/api/users")
def tambah_user(req: TambahUserRequest):
    level = DIVISI_LEVEL.get(req.divisi, 3)
    can_manage = req.divisi in ("superadmin",)
    conn = get_conn(); cur = conn.cursor()
    try:
        cur.execute("""INSERT INTO users (username,password,password_plain,nama,divisi,level,can_export,can_manage_users,created_at)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (req.username, hash_pw(req.password), None, req.nama,
             req.divisi, level, True, can_manage, datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback(); cur.close(); conn.close()
        raise HTTPException(status_code=400, detail="Username sudah digunakan")
    cur.close(); conn.close()
    return {"success": True, "message": f"User '{req.username}' berhasil ditambahkan"}

@app.delete("/api/users/{username}")
def hapus_user(username: str):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Akun admin tidak bisa dihapus")
    conn = get_conn(); cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE username=%s", (username,))
    if cur.rowcount == 0:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    conn.commit(); cur.close(); conn.close()
    return {"success": True, "message": f"User '{username}' berhasil dihapus"}

@app.post("/api/users/reset-password")
def reset_password_user(req: ResetPasswordRequest):
    if len(req.password_baru) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    conn = get_conn(); cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM users WHERE username=%s", (req.username,))
    if cur.fetchone()[0] == 0:
        cur.close(); conn.close()
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    # Simpan password_plain sementara agar admin bisa lihat, lalu backend clear setelah 24 jam
    cur.execute("UPDATE users SET password=%s, password_plain=%s WHERE username=%s",
                (hash_pw(req.password_baru), req.password_baru, req.username))
    conn.commit(); cur.close(); conn.close()
    return {"success": True, "message": f"Password '{req.username}' berhasil direset"}

# ── Riwayat ───────────────────────────────────────────────────────────────────
@app.get("/api/riwayat")
def get_riwayat(username: str = "", divisi: str = "", view_all: bool = False):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

    if view_all:
        cur.execute("SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username ORDER BY rs.id DESC LIMIT 200")
    elif divisi:
        # Get all usernames in that divisi
        cur.execute("SELECT username FROM users WHERE divisi=%s", (divisi,))
        unames = [r["username"] for r in cur.fetchall()]
        if not unames:
            cur.close(); conn.close()
            return {"riwayat": []}
        ph = ",".join(["%s"] * len(unames))
        cur.execute(f"SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username WHERE rs.username IN ({ph}) ORDER BY rs.id DESC LIMIT 100", unames)
    elif username:
        cur.execute("SELECT * FROM riwayat_session WHERE username=%s ORDER BY id DESC LIMIT 50", (username,))
    else:
        cur.execute("SELECT * FROM riwayat_session ORDER BY id DESC LIMIT 50")

    rows = cur.fetchall(); cur.close(); conn.close()
    return {"riwayat": [dict(r) for r in rows]}

@app.get("/api/riwayat/divisi-list")
def get_divisi_list(user_divisi: str = "umum"):
    """Returns the list of divisi this user can access."""
    conn = get_conn()
    accessible = get_accessible_divisi(conn, user_divisi)
    conn.close()
    return {"divisi_list": accessible}

# ── Stats ─────────────────────────────────────────────────────────────────────
@app.get("/api/stats")
def get_stats(username: str = "", divisi: str = ""):
    conn = get_conn(); cur = conn.cursor()

    def count(sql, params=()):
        cur.execute(sql, params); return cur.fetchone()[0]

    if divisi:
        cur.execute("SELECT username FROM users WHERE divisi=%s", (divisi,))
        unames = tuple(r[0] for r in cur.fetchall())
        if not unames:
            cur.close(); conn.close()
            return {"total": 0, "tokopedia": 0, "shopee": 0, "lazada": 0, "ekspor": 0}
        ph = ",".join(["%s"] * len(unames))
        total  = count(f"SELECT COUNT(*) FROM hasil_scraping WHERE username IN ({ph})", unames)
        tokped = count(f"SELECT COUNT(*) FROM hasil_scraping WHERE username IN ({ph}) AND LOWER(platform)='tokopedia'", unames)
        shopee = count(f"SELECT COUNT(*) FROM hasil_scraping WHERE username IN ({ph}) AND LOWER(platform)='shopee'", unames)
        lazada = count(f"SELECT COUNT(*) FROM hasil_scraping WHERE username IN ({ph}) AND LOWER(platform)='lazada'", unames)
        ekspor = count(f"SELECT COUNT(*) FROM riwayat_session WHERE username IN ({ph})", unames)
    elif username:
        total  = count("SELECT COUNT(*) FROM hasil_scraping WHERE username=%s", (username,))
        tokped = count("SELECT COUNT(*) FROM hasil_scraping WHERE username=%s AND LOWER(platform)='tokopedia'", (username,))
        shopee = count("SELECT COUNT(*) FROM hasil_scraping WHERE username=%s AND LOWER(platform)='shopee'", (username,))
        lazada = count("SELECT COUNT(*) FROM hasil_scraping WHERE username=%s AND LOWER(platform)='lazada'", (username,))
        ekspor = count("SELECT COUNT(*) FROM riwayat_session WHERE username=%s", (username,))
    else:
        total  = count("SELECT COUNT(*) FROM hasil_scraping")
        tokped = count("SELECT COUNT(*) FROM hasil_scraping WHERE LOWER(platform)='tokopedia'")
        shopee = count("SELECT COUNT(*) FROM hasil_scraping WHERE LOWER(platform)='shopee'")
        lazada = count("SELECT COUNT(*) FROM hasil_scraping WHERE LOWER(platform)='lazada'")
        ekspor = count("SELECT COUNT(*) FROM riwayat_session")

    cur.close(); conn.close()
    return {"total": total, "tokopedia": tokped, "shopee": shopee, "lazada": lazada, "ekspor": ekspor}

# ── Scraping ──────────────────────────────────────────────────────────────────
@app.post("/api/scrape")
async def scrape(req: ScrapeRequest):
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    username   = req.username or "unknown"
    all_results = []
    for platform in req.platforms:
        try:
            results = generate_placeholder(platform, req.keyword, req.max_pages)
            waktu = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            for r in results:
                r["waktu_scrape"] = waktu; r["session_id"] = session_id
            all_results.extend(results)
        except Exception as e:
            print(f"Error scraping {platform}: {e}")
    save_to_db(all_results, session_id, req.keyword, req.platforms, username)
    filename = export_to_excel_file(all_results, req.keyword, session_id, req.harga_threshold)
    return {"session_id": session_id, "keyword": req.keyword, "total": len(all_results), "results": all_results, "file_excel": filename}

@app.post("/api/scrape/results")
def receive_scrape_results(req: ScrapeResultsRequest):
    save_to_db(req.results, req.session_id, req.keyword, req.platforms, req.username)
    filename = export_to_excel_file(req.results, req.keyword, req.session_id, req.harga_threshold)
    return {"success": True, "message": f"{len(req.results)} data disimpan", "file_excel": filename}

# ── Export ────────────────────────────────────────────────────────────────────
@app.post("/api/export")
def export_excel(req: ExportRequest):
    conn = get_conn()
    df = pd.read_sql("SELECT * FROM hasil_scraping WHERE session_id = %s", conn, params=(req.session_id,))
    conn.close()
    if df.empty:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    filename = export_to_excel_file(df.to_dict("records"), req.keyword, req.session_id)
    return FileResponse(path=f"exports/{filename}", filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

@app.get("/api/export/download/{filename}")
def download_excel(filename: str):
    filepath = f"exports/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    return FileResponse(path=filepath, filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")

# ── Helpers ───────────────────────────────────────────────────────────────────
def save_to_db(results, session_id, keyword, platforms, username="unknown"):
    conn = get_conn(); cur = conn.cursor()
    for r in results:
        cur.execute("""INSERT INTO hasil_scraping
            (session_id,username,keyword,nama_produk,harga,platform,rating,terjual,url_produk,gambar_url,waktu_scrape)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)""",
            (session_id, username, keyword, r.get("nama_produk",""), r.get("harga",0),
             r.get("platform",""), r.get("rating",0), r.get("terjual",""),
             r.get("url_produk",""), r.get("gambar_url",""), r.get("waktu_scrape","")))
    cur.execute("""INSERT INTO riwayat_session (session_id,username,keyword,platforms,jumlah_data,status,waktu)
        VALUES (%s,%s,%s,%s,%s,%s,%s)""",
        (session_id, username, keyword, ", ".join(platforms), len(results),
         "Selesai", datetime.now().strftime("%Y-%m-%d %H:%M:%S")))
    conn.commit(); cur.close(); conn.close()

def export_to_excel_file(results, keyword, session_id, harga_threshold=350000):
    import openpyxl
    from openpyxl.styles import Font, PatternFill, Alignment
    from openpyxl.utils import get_column_letter
    tanggal = datetime.now().strftime("%Y-%m-%d")
    filename = f"hasil_scraping_{keyword.replace(' ','_')}_{tanggal}_{session_id}.xlsx"
    filepath = f"exports/{filename}"
    wb = openpyxl.Workbook(); ws = wb.active; ws.title = "Data Scraping"
    ws.merge_cells("A1:I1")
    ws["A1"] = "KEMENTERIAN LINGKUNGAN HIDUP DAN KEHUTANAN REPUBLIK INDONESIA"
    ws["A1"].font = Font(bold=True, size=13, color="FFFFFF")
    ws["A1"].fill = PatternFill("solid", fgColor="1B4332")
    ws["A1"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[1].height = 30
    ws.merge_cells("A2:I2")
    ws["A2"] = f"SiPantau — Hasil Scraping: '{keyword}' | Tanggal: {tanggal}"
    ws["A2"].font = Font(bold=True, size=11, color="1B4332")
    ws["A2"].fill = PatternFill("solid", fgColor="D8F3DC")
    ws["A2"].alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[2].height = 22
    headers = ["No","Nama Produk","Harga (Rp)","Platform","Rating","Terjual","URL Produk","Waktu Scrape"]
    for col, h in enumerate(headers, 1):
        cell = ws.cell(row=4, column=col, value=h)
        cell.font = Font(bold=True, color="FFFFFF", size=10)
        cell.fill = PatternFill("solid", fgColor="2D6A4F")
        cell.alignment = Alignment(horizontal="center", vertical="center")
    ws.row_dimensions[4].height = 20
    for i, r in enumerate(results):
        row = 5 + i
        is_exp = r.get("harga", 0) >= 1000000
        fill = PatternFill("solid", fgColor="FFCCCC") if is_exp else PatternFill("solid", fgColor="F0F7F4" if i%2==0 else "FFFFFF")
        data = [i+1, r.get("nama_produk",""), r.get("harga",0), r.get("platform",""),
                r.get("rating",0), r.get("terjual",""), r.get("url_produk",""), r.get("waktu_scrape","")]
        for col, val in enumerate(data, 1):
            cell = ws.cell(row=row, column=col, value=val)
            cell.fill = fill
            cell.font = Font(size=9, color="990000" if is_exp else "000000")
            if col == 3: cell.number_format = "#,##0"; cell.alignment = Alignment(horizontal="right")
            elif col == 5: cell.number_format = "0.0"
    for i, w in enumerate([6,45,18,15,10,12,50,22], 1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = "A5"
    wb.save(filepath)
    return filename

def generate_placeholder(platform, keyword, max_pages):
    import random
    produk = [f"Kayu Jati {keyword}", f"Bambu {keyword}", f"Rotan {keyword}",
              f"Madu Hutan {keyword}", f"Gaharu {keyword}", f"Kayu Sengon {keyword}"]
    return [{"nama_produk": random.choice(produk)+f" #{random.randint(1,99)}",
             "harga": random.randint(10000,500000), "platform": platform.capitalize(),
             "rating": round(random.uniform(3.0,5.0),1), "terjual": f"{random.randint(1,500)}rb+",
             "url_produk": f"https://{platform}.co.id/produk/{keyword.replace(' ','-')}",
             "gambar_url": ""} for _ in range(max_pages*10)]

if __name__ == "__main__":
    import uvicorn
    print("SiPantau Backend berjalan di http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)