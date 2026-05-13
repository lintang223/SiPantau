"""
db_migrate.py — Script migrasi database SiPantau
Menyelaraskan PostgreSQL dengan ERD
Jalankan: python db_migrate.py
"""
import psycopg2

DB = dict(host='localhost', port=5050, dbname='sipantau', user='postgres', password='bola')

print("=" * 55)
print("  SiPantau — Database Migration (ERD Alignment)")
print("=" * 55)

conn = psycopg2.connect(**DB)
cur  = conn.cursor()

# ── 1. Hapus kolom-kolom legacy ──────────────────────────────────────────────
legacy_drops = [
    ('users', 'can_view_all'),  # digantikan oleh tabel divisi_access
    ('users', 'role'),          # digantikan oleh kolom divisi
]
for table, col in legacy_drops:
    cur.execute(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_name=%s AND column_name=%s",
        (table, col)
    )
    if cur.fetchone()[0] > 0:
        cur.execute(f'ALTER TABLE {table} DROP COLUMN {col}')
        print(f'[OK] DROPPED  : {table}.{col}')
    else:
        print(f'[SKIP] {table}.{col} sudah tidak ada')

# ── 2. Pastikan kolom RBAC penting ada (idempotent) ───────────────────────────
rbac_cols = [
    ('password_plain',  'TEXT'),
    ('divisi',          "TEXT DEFAULT 'pengawasan'"),
    ('level',           'INTEGER DEFAULT 3'),
    ('can_export',      'BOOLEAN DEFAULT true'),
    ('can_manage_users','BOOLEAN DEFAULT false'),
]
for col, col_type in rbac_cols:
    cur.execute(
        "SELECT COUNT(*) FROM information_schema.columns "
        "WHERE table_name=%s AND column_name=%s",
        ('users', col)
    )
    if cur.fetchone()[0] == 0:
        cur.execute(f'ALTER TABLE users ADD COLUMN {col} {col_type}')
        print(f'[OK] ADDED    : users.{col}')
    else:
        print(f'[OK] EXISTS   : users.{col}')

# ── 3. Sync level & can_manage_users dari divisi ───────────────────────────────
cur.execute("""
    UPDATE users SET
        level = CASE divisi
            WHEN 'superadmin' THEN 1
            WHEN 'sekdit'     THEN 2
            ELSE 3
        END,
        can_manage_users = (divisi = 'superadmin')
    WHERE divisi IS NOT NULL
""")
print(f'[OK] SYNCED   : level & can_manage_users ({cur.rowcount} rows)')

# ── 4. FK constraint hasil_scraping.username → users.username ─────────────────
cur.execute(
    "SELECT COUNT(*) FROM information_schema.table_constraints "
    "WHERE constraint_name='fk_hasil_scraping_username'"
)
if cur.fetchone()[0] == 0:
    # Hapus referensi orphan dulu
    cur.execute("""
        UPDATE hasil_scraping SET username = NULL
        WHERE username IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.username = hasil_scraping.username)
    """)
    cur.execute("""
        ALTER TABLE hasil_scraping
            ADD CONSTRAINT fk_hasil_scraping_username
            FOREIGN KEY (username) REFERENCES users(username)
            ON DELETE SET NULL ON UPDATE CASCADE
    """)
    print('[OK] FK ADDED : fk_hasil_scraping_username')
else:
    print('[SKIP] FK sudah ada: fk_hasil_scraping_username')

# ── 5. FK constraint riwayat_session.username → users.username ────────────────
cur.execute(
    "SELECT COUNT(*) FROM information_schema.table_constraints "
    "WHERE constraint_name='fk_riwayat_session_username'"
)
if cur.fetchone()[0] == 0:
    cur.execute("""
        UPDATE riwayat_session SET username = NULL
        WHERE username IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM users u WHERE u.username = riwayat_session.username)
    """)
    cur.execute("""
        ALTER TABLE riwayat_session
            ADD CONSTRAINT fk_riwayat_session_username
            FOREIGN KEY (username) REFERENCES users(username)
            ON DELETE SET NULL ON UPDATE CASCADE
    """)
    print('[OK] FK ADDED : fk_riwayat_session_username')
else:
    print('[SKIP] FK sudah ada: fk_riwayat_session_username')

# ── 6. Seed divisi_access (idempotent) ────────────────────────────────────────
access_rules = [
    ('superadmin', 'sekdit'),
    ('superadmin', 'pengawasan'),
    ('superadmin', 'pengaduan'),
    ('sekdit',     'pengawasan'),
    ('sekdit',     'pengaduan'),
]
inserted = 0
for asal, target in access_rules:
    cur.execute(
        "INSERT INTO divisi_access (divisi_asal, divisi_target, can_view) "
        "VALUES (%s,%s,true) ON CONFLICT DO NOTHING",
        (asal, target)
    )
    inserted += cur.rowcount
print(f'[OK] SEEDED   : divisi_access ({inserted} rules inserted, rest already exist)')

conn.commit()

# ── 7. Tampilkan struktur akhir ────────────────────────────────────────────────
print()
print("=== STRUKTUR TABEL users SETELAH MIGRASI ===")
cur.execute("""
    SELECT column_name, data_type, column_default, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'users'
    ORDER BY ordinal_position
""")
rows = cur.fetchall()
for col_name, data_type, col_default, nullable in rows:
    null_flag = "NULL" if nullable == "YES" else "NOT NULL"
    default   = f" DEFAULT {col_default}" if col_default else ""
    print(f"  {col_name:25s} {data_type:12s} {null_flag}{default}")

print()
print("=== FK CONSTRAINTS ===")
cur.execute("""
    SELECT tc.constraint_name, tc.table_name, kcu.column_name,
           ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name IN ('users','hasil_scraping','riwayat_session')
""")
fks = cur.fetchall()
if fks:
    for row in fks:
        print(f"  {row[1]}.{row[2]} -> {row[3]}.{row[4]}")
else:
    print("  (tidak ada FK constraints)")

cur.close()
conn.close()
print()
print("[SELESAI] Database berhasil diselaraskan dengan ERD!")
print("          Silakan restart backend: python main.py")
