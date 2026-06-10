import psycopg2

DB = dict(host='localhost', port=5050, dbname='sipantau', user='postgres', password='bola')

print("=" * 60)
print("  SiPantau — Database Migration V2 (RBAC & Divisi Baru)")
print("=" * 60)

try:
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    # 1. Update tabel users
    print("[1/5] Memetakan ulang divisi pada tabel `users`...")
    cur.execute("""
        UPDATE users SET divisi = CASE 
            WHEN divisi = 'superadmin' THEN 'sekditjen'
            WHEN divisi = 'sekdit' THEN 'sekditjen'
            WHEN divisi = 'pengawasan' THEN 'dit_ppsa'
            WHEN divisi = 'pengaduan' THEN 'dit_ppsa'
            ELSE 'balai_gakkum'
        END
    """)
    print(f"      -> Berhasil mengupdate {cur.rowcount} user.")

    # 2. Update level user sesuai divisi baru
    print("[2/5] Mengatur ulang level user...")
    cur.execute("""
        UPDATE users SET level = CASE 
            WHEN divisi = 'sekditjen' THEN 1
            WHEN divisi = 'dit_ppsa' THEN 2
            ELSE 3
        END,
        can_manage_users = (divisi = 'sekditjen')
    """)
    print(f"      -> Berhasil mengatur ulang level {cur.rowcount} user.")

    # 3. Update tabel riwayat_session
    print("[3/5] Memetakan ulang divisi pada tabel `riwayat_session`...")
    cur.execute("""
        UPDATE riwayat_session SET divisi = CASE 
            WHEN divisi = 'superadmin' THEN 'sekditjen'
            WHEN divisi = 'sekdit' THEN 'sekditjen'
            WHEN divisi = 'pengawasan' THEN 'dit_ppsa'
            WHEN divisi = 'pengaduan' THEN 'dit_ppsa'
            ELSE 'balai_gakkum'
        END
    """)
    print(f"      -> Berhasil mengupdate {cur.rowcount} riwayat session.")

    # 4. Hapus aturan akses lama
    print("[4/5] Menghapus aturan divisi_access lama...")
    cur.execute("TRUNCATE TABLE divisi_access")
    print("      -> Tabel divisi_access dikosongkan.")

    # 5. Seed aturan akses baru
    print("[5/5] Menyisipkan aturan divisi_access baru...")
    access_rules = [
        ('sekditjen', 'dit_ppsa'),
        ('sekditjen', 'balai_gakkum'),
        ('dit_ppsa',  'balai_gakkum'),
    ]
    for asal, target in access_rules:
        cur.execute(
            "INSERT INTO divisi_access (divisi_asal, divisi_target, can_view) "
            "VALUES (%s,%s,true) ON CONFLICT DO NOTHING",
            (asal, target)
        )
    print(f"      -> Berhasil menyisipkan {len(access_rules)} aturan baru.")

    conn.commit()
    print("\n[SELESAI] Migrasi database berhasil dijalankan!")

except Exception as e:
    print(f"\n[ERROR] Terjadi kesalahan: {e}")
    if 'conn' in locals() and conn:
        conn.rollback()
finally:
    if 'cur' in locals() and cur:
        cur.close()
    if 'conn' in locals() and conn:
        conn.close()
