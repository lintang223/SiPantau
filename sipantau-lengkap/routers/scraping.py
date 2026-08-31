import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
import pandas as pd
from psycopg2.extras import RealDictCursor

from database import get_conn
from security import get_current_user
from schemas import ScrapeRequest, ScrapeResultsRequest, ExportRequest
from utils import save_to_db, export_to_excel_file

router = APIRouter(prefix="/api", tags=["scraping"])

@router.post("/scrape")
async def scrape(req: ScrapeRequest, current_user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=503, detail="Agent tidak aktif, pemantauan otomatis tidak tersedia. Harap jalankan SiPantau_Agent.exe")

@router.post("/scrape/results")
def receive_scrape_results(req: ScrapeResultsRequest, request: Request):
    import os
    from jose import jwt, JWTError
    from security import JWT_SECRET, JWT_ALGORITHM

    # Ambil token dari header Authorization
    auth_header = request.headers.get("Authorization", "")
    token = auth_header.replace("Bearer ", "").strip() if auth_header.startswith("Bearer ") else ""

    # Cek apakah dari localhost (agen lokal)
    client_host = (request.client.host if request.client else "")
    is_local = client_host in ("127.0.0.1", "::1", "localhost")

    if not is_local:
        # Validasi token JWT jika dari luar (misalnya agen yang mengirim ke Render)
        if not token:
            raise HTTPException(status_code=401, detail="Token tidak ada")
        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
            if not payload.get("sub"):
                raise HTTPException(status_code=401, detail="Token tidak valid")
        except JWTError:
            raise HTTPException(status_code=401, detail="Token tidak valid atau kadaluarsa")

    filename = export_to_excel_file(req.results, req.keyword, req.session_id, req.harga_threshold)
    save_to_db(req.results, req.session_id, req.keyword, req.platforms, req.username, file_excel=filename)
    return {"success": True, "message": f"{len(req.results)} data disimpan", "file_excel": filename}


@router.get("/scraped-urls")
def get_scraped_urls():
    """Mengambil daftar URL produk yang sudah pernah di-scrap, agar agent bisa skip duplicate."""
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            # Ambil semua URL produk yang ada di database
            cur.execute("SELECT url_produk FROM hasil_scraping")
            urls = [row["url_produk"] for row in cur.fetchall()]
            cur.close()
            return {"urls": urls}
    except Exception as e:
        print("Error fetch scraped-urls:", e)
        return {"urls": []}

@router.post("/export")
def export_excel(req: ExportRequest, current_user: dict = Depends(get_current_user)):
    from database import get_pool
    # Gunakan koneksi psycopg2 asli (bukan DictConnectionWrapper) agar kompatibel dengan pd.read_sql
    conn_raw = get_pool().getconn()
    try:
        df = pd.read_sql(
            "SELECT * FROM hasil_scraping WHERE session_id = %s",
            conn_raw,
            params=(req.session_id,)
        )
    finally:
        get_pool().putconn(conn_raw)
    if df.empty:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")
    filename = export_to_excel_file(df.to_dict("records"), req.keyword, req.session_id)
    return FileResponse(
        path=f"exports/{filename}", filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@router.get("/export/download/{filename}")
def download_excel(filename: str, current_user: dict = Depends(get_current_user)):
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(status_code=400, detail="Nama file tidak valid")
    filepath = f"exports/{filename}"
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="File tidak ditemukan")
    return FileResponse(
        path=filepath, filename=filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )
