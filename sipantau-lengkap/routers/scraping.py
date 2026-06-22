import os
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse
import pandas as pd

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
    # Agent lokal (localhost) tidak butuh token JWT
    client_host = (request.client.host if request.client else "")
    is_local    = client_host in ("127.0.0.1", "::1", "localhost")
    if not is_local:
        # Jika dari luar, kita validasi token secara manual
        get_current_user(request)

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
            urls = [row[0] for row in cur.fetchall()]
            cur.close()
            return {"urls": urls}
    except Exception as e:
        print("Error fetch scraped-urls:", e)
        return {"urls": []}

@router.post("/export")
def export_excel(req: ExportRequest, current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        df = pd.read_sql("SELECT * FROM hasil_scraping WHERE session_id = %s", conn, params=(req.session_id,))
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
