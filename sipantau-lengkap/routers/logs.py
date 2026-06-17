from fastapi import APIRouter, Depends
import psycopg2.extras

from database import get_conn
from security import require_admin, require_superadmin

router = APIRouter(prefix="/api", tags=["logs"])

@router.get("/user-activity")
def get_user_activity(current_user: dict = Depends(require_admin)):
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
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
