"""
SiPantau — Sistem Riset Informasi Market
Backend FastAPI + Auth PostgreSQL + Hierarchical RBAC + JWT
Kementerian Kehutanan RI
"""

import os
import logging
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_db, get_pool
from routers import auth, users, logs, riwayat, stats, scraping

ALLOWED_ORIGINS = [o.strip() for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")]

from logging.handlers import RotatingFileHandler

os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.StreamHandler(),
        RotatingFileHandler("logs/backend.log", maxBytes=5*1024*1024, backupCount=3, encoding="utf-8")
    ]
)
logger = logging.getLogger("sipantau")

app = FastAPI(title="SiPantau API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("exports", exist_ok=True)

@app.on_event("startup")
def on_startup():
    init_db()

@app.on_event("shutdown")
def on_shutdown():
    pool = get_pool()
    if pool and not pool.closed:
        pool.closeall()
        logger.info("Connection pool PostgreSQL ditutup.")

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"]        = "DENY"
    response.headers["X-XSS-Protection"]       = "1; mode=block"
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.url}: {exc}", exc_info=True)
    return JSONResponse(status_code=500, content={"detail": "Terjadi kesalahan internal server."})

@app.get("/health")
def health_check():
    try:
        from database import get_conn
        with get_conn() as conn:
            conn.cursor().execute("SELECT 1")
        return {"status": "ok", "app": "SiPantau", "versi": "2.0.0", "db": "PostgreSQL"}
    except Exception as e:
        logger.error(f"Health check DB error: {e}")
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(logs.router)
app.include_router(riwayat.router)
app.include_router(stats.router)
app.include_router(scraping.router)

if __name__ == "__main__":
    import uvicorn
    print("SiPantau Backend v2.0 berjalan di http://localhost:8000")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)