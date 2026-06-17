from fastapi import APIRouter, Depends
from database import get_conn
from security import get_current_user

router = APIRouter(prefix="/api/stats", tags=["stats"])

@router.get("/")
def get_stats(
    username: str = "", divisi: str = "",
    current_user: dict = Depends(get_current_user)
):
    with get_conn() as conn:
        cur = conn.cursor()

        def count(sql, params=()):
            cur.execute(sql, params)
            return cur.fetchone()[0]

        if divisi:
            cur.execute("SELECT username FROM users WHERE divisi=%s", (divisi,))
            unames = tuple(r[0] for r in cur.fetchall())
            if not unames:
                cur.close()
                return {"total": 0, "tokopedia": 0, "ekspor": 0}
            ph = ",".join(["%s"] * len(unames))
            total  = count(f"SELECT COUNT(*) FROM hasil_scraping WHERE username IN ({ph})", unames)
            tokped = count(f"SELECT COUNT(*) FROM hasil_scraping WHERE username IN ({ph}) AND LOWER(platform)='tokopedia'", unames)
            ekspor = count(f"SELECT COUNT(*) FROM riwayat_session WHERE username IN ({ph})", unames)
        elif username:
            total  = count("SELECT COUNT(*) FROM hasil_scraping WHERE username=%s", (username,))
            tokped = count("SELECT COUNT(*) FROM hasil_scraping WHERE username=%s AND LOWER(platform)='tokopedia'", (username,))
            ekspor = count("SELECT COUNT(*) FROM riwayat_session WHERE username=%s", (username,))
        else:
            total  = count("SELECT COUNT(*) FROM hasil_scraping")
            tokped = count("SELECT COUNT(*) FROM hasil_scraping WHERE LOWER(platform)='tokopedia'")
            ekspor = count("SELECT COUNT(*) FROM riwayat_session")
        cur.close()
    return {"total": total, "tokopedia": tokped, "ekspor": ekspor}
