from fastapi import APIRouter, Depends

from database import get_conn
from security import require_admin, require_superadmin

router = APIRouter(prefix="/api", tags=["logs"])

@router.get("/user-activity")
def get_user_activity(current_user: dict = Depends(require_admin)):
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT * FROM user_activity ORDER BY id DESC LIMIT 500")
        rows = cur.fetchall()
        cur.close()
    return {"activity": [dict(r) for r in rows]}

@router.get("/login-logs")
def get_login_logs(
    status: str = "",
    username: str = "",
    limit: int = 500,
    current_user: dict = Depends(require_superadmin)
):
    with get_conn() as conn:
        cur = conn.cursor()
        conditions = []
        params     = []
        if status:
            conditions.append("status = %s")
            params.append(status)
        if username:
            conditions.append("username ILIKE %s")
            params.append(f"%{username}%")
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        params.append(min(limit, 1000))
        cur.execute(f"SELECT * FROM login_logs {where} ORDER BY id DESC LIMIT %s", params)
        rows = cur.fetchall()
        cur.close()
    return {"logs": [dict(r) for r in rows]}

@router.get("/system-logs")
def get_system_logs(current_user: dict = Depends(require_admin)):
    import os
    log_path = "logs/backend.log"
    if not os.path.exists(log_path):
        return {"logs": ["Log berkas belum terbuat."]}
    try:
        with open(log_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            last_lines = [line.strip() for line in lines[-150:]]
            return {"logs": last_lines}
    except Exception as e:
        return {"logs": [f"Gagal membaca berkas log: {str(e)}"]}

