from fastapi import APIRouter, Depends, HTTPException
import psycopg2.extras

from database import get_conn
from security import get_current_user, get_accessible_divisi

router = APIRouter(prefix="/api/riwayat", tags=["riwayat"])

@router.get("/")
def get_riwayat(
    username: str = "", divisi: str = "", view_all: bool = False,
    current_user: dict = Depends(get_current_user)
):
    with get_conn() as conn:
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        if view_all:
            if current_user.get("level", 99) > 2:
                raise HTTPException(status_code=403, detail="Akses ditolak")
            cur.execute(
                "SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username ORDER BY rs.id DESC LIMIT 200"
            )
        elif divisi:
            user_divisi = current_user.get("divisi", "balai_gakkum")
            accessible = get_accessible_divisi(conn, user_divisi)
            if divisi not in accessible:
                raise HTTPException(status_code=403, detail="Akses ditolak")
            cur.execute("SELECT username FROM users WHERE divisi=%s", (divisi,))
            unames = [r["username"] for r in cur.fetchall()]
            if not unames:
                cur.close()
                return {"riwayat": []}
            ph = ",".join(["%s"] * len(unames))
            cur.execute(
                f"SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username WHERE rs.username IN ({ph}) ORDER BY rs.id DESC LIMIT 100",
                unames
            )
        elif username:
            if current_user.get("level", 99) > 2 and username != current_user["sub"]:
                raise HTTPException(status_code=403, detail="Akses ditolak")
            cur.execute(
                "SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username WHERE rs.username=%s ORDER BY rs.id DESC LIMIT 50", (username,)
            )
        else:
            if current_user.get("level", 99) > 2:
                cur.execute(
                    "SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username WHERE rs.username=%s ORDER BY rs.id DESC LIMIT 50",
                    (current_user["sub"],)
                )
            else:
                cur.execute("SELECT rs.*, u.divisi as user_divisi FROM riwayat_session rs LEFT JOIN users u ON rs.username=u.username ORDER BY rs.id DESC LIMIT 50")
        rows = cur.fetchall()
        cur.close()
    return {"riwayat": [dict(r) for r in rows]}

@router.get("/divisi-list")
def get_divisi_list(current_user: dict = Depends(get_current_user)):
    user_divisi = current_user.get("divisi", "balai_gakkum")
    with get_conn() as conn:
        accessible = get_accessible_divisi(conn, user_divisi)
    return {"divisi_list": accessible}
