from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
import logging
import psycopg2.errors

from database import get_conn
from security import require_admin, require_superadmin, hash_pw, DIVISI_LEVEL, validate_password_complexity
from schemas import TambahUserRequest, ResetPasswordRequest
from utils import validate_input

router = APIRouter(prefix="/api/users", tags=["users"])
logger = logging.getLogger("sipantau")

@router.get("/")
def get_users(
    include_deleted: bool = False,
    current_user: dict = Depends(require_admin)
):
    with get_conn() as conn:
        cur = conn.cursor()
        where = "" if (include_deleted and current_user.get("level", 99) == 1) else "WHERE deleted_at IS NULL"
        cur.execute(
            f"SELECT id,username,nama,divisi,level,can_export,can_manage_users,created_at,updated_at,deleted_at FROM users {where} ORDER BY id"
        )
        rows = cur.fetchall()
        cur.close()
    return {"users": [dict(r) for r in rows]}

@router.post("/")
def tambah_user(req: TambahUserRequest, current_user: dict = Depends(require_admin)):
    validate_input(req.username, "Username", max_length=50)
    validate_input(req.nama, "Nama", max_length=100)
    if req.divisi not in DIVISI_LEVEL:
        raise HTTPException(status_code=400, detail=f"Divisi tidak valid. Pilih: {list(DIVISI_LEVEL.keys())}")
    pw_err = validate_password_complexity(req.password, req.username)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    level      = DIVISI_LEVEL.get(req.divisi, 3)
    can_manage = req.divisi in ("sekditjen",)
    now        = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    with get_conn() as conn:
        cur = conn.cursor()
        try:
            cur.execute("SELECT id, deleted_at FROM users WHERE username = %s", (req.username,))
            existing = cur.fetchone()
            if existing and existing["deleted_at"] is not None:
                cur.execute(
                    """UPDATE users SET password=%s, nama=%s, divisi=%s, level=%s,
                       can_export=%s, can_manage_users=%s, updated_at=%s, deleted_at=NULL
                       WHERE username=%s""",
                    (hash_pw(req.password), req.nama, req.divisi, level, True, can_manage, now, req.username)
                )
            elif existing:
                raise HTTPException(status_code=400, detail="Username sudah digunakan")
            else:
                cur.execute(
                    """INSERT INTO users (username,password,nama,divisi,level,can_export,can_manage_users,created_at)
                       VALUES (%s,%s,%s,%s,%s,%s,%s,%s)""",
                    (req.username, hash_pw(req.password), req.nama,
                     req.divisi, level, True, can_manage, now)
                )
            conn.commit()
        except HTTPException:
            conn.rollback(); raise
        except psycopg2.errors.UniqueViolation:
            conn.rollback()
            raise HTTPException(status_code=400, detail="Username sudah digunakan")
        finally:
            cur.close()
    logger.info(f"User baru dibuat: {req.username} (divisi: {req.divisi}) oleh {current_user['sub']}")
    return {"success": True, "message": f"User '{req.username}' berhasil ditambahkan"}

@router.delete("/{username}")
def hapus_user(username: str, current_user: dict = Depends(require_admin)):
    if username == "admin":
        raise HTTPException(status_code=400, detail="Akun admin utama tidak bisa dihapus")
    if username == current_user["sub"]:
        raise HTTPException(status_code=400, detail="Tidak bisa menghapus akun sendiri")

    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET deleted_at=%s, updated_at=%s WHERE username=%s AND deleted_at IS NULL",
            (now, now, username)
        )
        if cur.rowcount == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="User tidak ditemukan atau sudah dinonaktifkan")
        conn.commit()
        cur.close()
    logger.info(f"User dinonaktifkan (soft delete): {username} oleh {current_user['sub']}")
    return {"success": True, "message": f"User '{username}' berhasil dinonaktifkan"}

@router.put("/{username}/restore")
def restore_user(username: str, current_user: dict = Depends(require_superadmin)):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute(
            "UPDATE users SET deleted_at=NULL, updated_at=%s WHERE username=%s AND deleted_at IS NOT NULL",
            (now, username)
        )
        if cur.rowcount == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="User tidak ditemukan atau masih aktif")
        conn.commit()
        cur.close()
    logger.info(f"User dipulihkan: {username} oleh {current_user['sub']}")
    return {"success": True, "message": f"User '{username}' berhasil dipulihkan"}

@router.post("/reset-password")
def reset_password_user(req: ResetPasswordRequest, current_user: dict = Depends(require_admin)):
    pw_err = validate_password_complexity(req.password_baru, req.username)
    if pw_err:
        raise HTTPException(status_code=400, detail=pw_err)

    with get_conn() as conn:
        cur = conn.cursor()
        cur.execute("SELECT COUNT(*) FROM users WHERE username=%s", (req.username,))
        if list(cur.fetchone().values())[0] == 0:
            cur.close()
            raise HTTPException(status_code=404, detail="User tidak ditemukan")
        cur.execute(
            "UPDATE users SET password=%s WHERE username=%s",
            (hash_pw(req.password_baru), req.username)
        )
        conn.commit()
        cur.close()
    logger.info(f"Password direset untuk: {req.username} oleh {current_user['sub']}")
    return {"success": True, "message": f"Password '{req.username}' berhasil direset"}
