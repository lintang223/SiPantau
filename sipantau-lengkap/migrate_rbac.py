"""
migrate_rbac.py — Migrasi data divisi lama ke 4 divisi resmi SiPantau
Divisi resmi: superadmin, sekdit, pengawasan, pengaduan

Jalankan sekali: python migrate_rbac.py
"""

import psycopg2

DB = dict(host='localhost', port=5050, dbname='sipantau', user='postgres', password='bola')
conn = psycopg2.connect(**DB)
cur = conn.cursor()

# ── Mapping divisi lama → divisi baru ─────────────────────────────────────────
# Sesuaikan mapping ini jika ada konvensi berbeda di data Anda
DIVISI_MAP = {
    'operator':  'pengawasan',   # operator → pengawasan
    'umum':      'pengawasan',   # umum → pengawasan
    'sekditjen': 'sekdit',       # typo/alias → sekdit
    'sekdijen':  'sekdit',       # typo/alias → sekdit
    'pengawas':  'pengawasan',   # alias → pengawasan
    'admin':     'superadmin',   # alias → superadmin
}

VALID_DIVISI = {'superadmin', 'sekdit', 'pengawasan', 'pengaduan'}

DIVISI_LEVEL = {
    'superadmin': 1,
    'sekdit':     2,
    'pengawasan': 3,
    'pengaduan':  3,
}

# ── 1. Tambah kolom yang mungkin belum ada ────────────────────────────────────
print("\n[1] Cek/tambah kolom RBAC...")
migrations = [
    ('users',           'divisi',           "TEXT DEFAULT 'pengawasan'"),
    ('users',           'level',            'INTEGER DEFAULT 3'),
    ('users',           'can_view_all',     'BOOLEAN DEFAULT false'),
    ('users',           'can_export',       'BOOLEAN DEFAULT true'),
    ('users',           'can_manage_users', 'BOOLEAN DEFAULT false'),
    ('riwayat_session', 'username',         'TEXT'),
    ('riwayat_session', 'divisi',           "TEXT DEFAULT 'pengawasan'"),
]
for table, col, col_type in migrations:
    cur.execute("""
        SELECT COUNT(*) FROM information_schema.columns
        WHERE table_name=%s AND column_name=%s
    """, (table, col))
    if cur.fetchone()[0] == 0:
        cur.execute(f'ALTER TABLE {table} ADD COLUMN {col} {col_type}')
        print(f'  ADDED  : {table}.{col}')
    else:
        print(f'  EXISTS : {table}.{col}')

# ── 2. Migrasi divisi lama di tabel users ─────────────────────────────────────
print("\n[2] Migrasi divisi users...")
cur.execute('SELECT id, username, divisi FROM users')
users = cur.fetchall()
migrated = 0
for uid, uname, divisi in users:
    new_divisi = DIVISI_MAP.get(divisi or '', divisi or 'pengawasan')
    if new_divisi not in VALID_DIVISI:
        new_divisi = 'pengawasan'  # fallback aman
    new_level  = DIVISI_LEVEL.get(new_divisi, 3)
    new_manage = new_divisi == 'superadmin'
    cur.execute(
        'UPDATE users SET divisi=%s, level=%s, can_manage_users=%s WHERE id=%s',
        (new_divisi, new_level, new_manage, uid)
    )
    status = f'{divisi} → {new_divisi}' if divisi != new_divisi else f'{new_divisi} (oke)'
    print(f'  {uname:20s} | {status}')
    if divisi != new_divisi:
        migrated += 1

# ── 3. Bersihkan divisi_access — hapus entri operator & umum ──────────────────
print("\n[3] Membersihkan divisi_access lama...")
cur.execute("DELETE FROM divisi_access WHERE divisi_asal IN ('operator','umum','sekdijen','sekditjen','pengawas')")
cur.execute("DELETE FROM divisi_access WHERE divisi_target IN ('operator','umum','sekdijen','sekditjen','pengawas')")
print(f'  Dihapus {cur.rowcount} baris lama dari divisi_access')

# ── 4. Seed ulang default access ──────────────────────────────────────────────
print("\n[4] Seed ulang default access rules...")
DEFAULT_ACCESS = [
    ('superadmin', 'sekdit'),
    ('superadmin', 'pengawasan'),
    ('superadmin', 'pengaduan'),
    ('sekdit',     'pengawasan'),
    ('sekdit',     'pengaduan'),
]
for asal, target in DEFAULT_ACCESS:
    cur.execute(
        'INSERT INTO divisi_access (divisi_asal, divisi_target, can_view) VALUES (%s,%s,true) ON CONFLICT DO NOTHING',
        (asal, target)
    )
print(f'  {len(DEFAULT_ACCESS)} rules di-seed (ON CONFLICT DO NOTHING)')

# ── 5. Commit ─────────────────────────────────────────────────────────────────
conn.commit()
cur.close()
conn.close()

print(f'\n[OK] SELESAI -- {migrated} user dimigrasikan, divisi_access dibersihkan.')
print('     Silakan restart backend: python main.py')
