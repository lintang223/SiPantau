import os
import io
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse, FileResponse
from psycopg2.extras import RealDictCursor

from database import get_conn
from security import get_current_user
from schemas import ScrapeRequest, ScrapeResultsRequest, ExportRequest
from utils import save_to_db, export_to_excel_file, export_to_excel_buffer

router = APIRouter(prefix="/api", tags=["scraping"])

@router.post("/scrape")
async def scrape(req: ScrapeRequest, current_user: dict = Depends(get_current_user)):
    raise HTTPException(status_code=503, detail="Agent tidak aktif, pemantauan otomatis tidak tersedia. Harap jalankan SiPantau_Agent.exe")

@router.post("/scrape/results")
def receive_scrape_results(req: ScrapeResultsRequest, request: Request):
    # Agen dari komputer lokal akan langsung mengirim data ke sini.
    filename = export_to_excel_file(req.results, req.keyword, req.session_id, req.harga_threshold)
    save_to_db(req.results, req.session_id, req.keyword, req.platforms, req.username, file_excel=filename)
    return {"success": True, "message": f"{len(req.results)} data disimpan", "file_excel": filename}

@router.get("/scraped-urls")
def get_scraped_urls():
    """Mengambil daftar URL produk yang sudah pernah di-scrap, agar agent bisa skip duplicate."""
    try:
        with get_conn() as conn:
            cur = conn.cursor()
            cur.execute("SELECT url_produk FROM hasil_scraping")
            urls = [row["url_produk"] for row in cur.fetchall()]
            cur.close()
            return {"urls": urls}
    except Exception as e:
        print("Error fetch scraped-urls:", e)
        return {"urls": []}

@router.post("/export")
def export_excel(req: ExportRequest, current_user: dict = Depends(get_current_user)):
    with get_conn() as conn:
        cur = conn.cursor()
        query = "SELECT * FROM hasil_scraping"
        params = []
        if req.session_id:
            query += " WHERE session_id = %s"
            params.append(req.session_id)
        elif req.keyword:
            query += " WHERE keyword = %s"
            params.append(req.keyword)
        
        query += " ORDER BY id ASC"
        cur.execute(query, tuple(params))
        rows = [dict(r) for r in cur.fetchall()]
        cur.close()

    if not rows:
        raise HTTPException(status_code=404, detail="Data tidak ditemukan")

    buf = export_to_excel_buffer(rows, keyword=req.keyword or "", session_id=req.session_id or "")

    filename = f"export_{req.keyword or 'data'}.xlsx"
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
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
