import os
from fastapi import APIRouter, Depends, HTTPException
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
def receive_scrape_results(req: ScrapeResultsRequest, current_user: dict = Depends(get_current_user)):
    save_to_db(req.results, req.session_id, req.keyword, req.platforms, req.username)
    filename = export_to_excel_file(req.results, req.keyword, req.session_id, req.harga_threshold)
    return {"success": True, "message": f"{len(req.results)} data disimpan", "file_excel": filename}

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
