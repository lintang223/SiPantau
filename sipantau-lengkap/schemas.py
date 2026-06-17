from pydantic import BaseModel
from typing import List, Optional

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
    divisi: str = "balai_gakkum"

class ResetPasswordRequest(BaseModel):
    username: str
    password_baru: str

class UpdateProfilRequest(BaseModel):
    nama: str

class UpdateFotoRequest(BaseModel):
    foto: str

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
