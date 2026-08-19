# SiPantau — Konteks Proyek untuk AI

## Gambaran Proyek
SiPantau adalah aplikasi web monitoring harga produk di marketplace (Tokopedia & Shopee) untuk Kementerian Kehutanan RI. Digunakan untuk mendeteksi potensi mark-up harga pada pengadaan barang.

## Struktur Repositori
```
sipantau-lengkap/
├── main.py                  # Entry point FastAPI backend
├── database.py              # Koneksi PostgreSQL (psycopg2 + DictConnectionWrapper)
├── security.py              # JWT auth, bcrypt, RBAC
├── utils.py                 # Helper: logging aktivitas, login, simpan ke DB
├── schemas.py               # Pydantic models
├── routers/
│   ├── auth.py              # Login, logout, profil, ganti password
│   ├── users.py             # Kelola user (CRUD)
│   ├── scraping.py          # Trigger scraping, download Excel
│   ├── riwayat.py           # Riwayat sesi scraping
│   ├── stats.py             # Statistik dashboard
│   └── logs.py              # Log aktivitas user, login, dan system logs
├── agent/
│   ├── agent.py             # Orchestrator scraping (asyncio + playwright)
│   └── scraper/
│       ├── scraper_core.py  # Logic scroll, load more, extract data
│       ├── config.py        # Konstanta: timeout, concurrent tabs, delay
│       └── utils.py         # Helper format harga, sanitize filename
├── sipantau-frontend/       # Next.js 14 frontend (App Router)
│   ├── app/
│   │   ├── dashboard/       # Halaman dashboard statistik
│   │   ├── scraping/        # Halaman utama pemantauan / trigger scraping
│   │   ├── riwayat/         # Riwayat sesi
│   │   ├── kelola-user/     # Manajemen user (admin only)
│   │   ├── riwayat-aktivitas/ # Log aktivitas user
│   │   ├── riwayat-login/   # Log percobaan login
│   │   ├── riwayat-system/  # Log sistem server (konsol-style, admin only)
│   │   ├── profil/          # Profil & ganti password user
│   │   └── pengaturan/      # Pengaturan akses divisi
│   ├── components/
│   │   └── Navbar.tsx       # Navigasi utama + dropdown user
│   └── lib/
│       ├── api.ts           # apiFetch wrapper
│       └── constants.ts     # Label divisi, warna
└── .env                     # Kredensial (TIDAK di git)
```

## Stack Teknologi
- **Backend**: FastAPI + Python 3.12, uvicorn (port 8000)
- **Database**: PostgreSQL via Neon (cloud) — psycopg2 + DictConnectionWrapper + RealDictCursor
- **Frontend**: Next.js 14 (App Router), Vanilla CSS, Lucide Icons (port 3000)
- **Scraping**: Playwright (asyncio), browser Chromium
- **Auth**: JWT (python-jose), bcrypt password hashing

## Konfigurasi Database (.env)
```env
DB_HOST=ep-still-water-azuvbvrg.c-3.ap-southeast-1.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=neondb_owner
DB_PASSWORD=npg_KBHUMlr0D9AC
DB_SSLMODE=require
ADMIN_DEFAULT_PASSWORD=Admin@123
JWT_SECRET=8cf3be12b50937a0753068e16cc56b85e05a8bda2e31e51df52b41f6e2b17a10
JWT_EXPIRE_HOURS=12
ALLOWED_ORIGINS=http://localhost:3000
```
> ⚠️ File `.env` tidak masuk git. Teman harus mengisi `.env` sendiri dengan kredensial di atas.

## RBAC (Role-Based Access Control)
| Divisi | Level | Hak Akses |
|--------|-------|-----------|
| `sekditjen` | 1 | Full access — bisa lihat semua divisi, kelola user, lihat system logs |
| `dit_ppsa` | 2 | Bisa lihat data balai_gakkum |
| `balai_gakkum` | 3 | Hanya bisa lihat data milik sendiri |

## Cara Menjalankan

### Backend
```bash
cd sipantau-lengkap
python main.py
# Berjalan di http://localhost:8000
```

### Frontend
```bash
cd sipantau-lengkap/sipantau-frontend
npm run dev
# Berjalan di http://localhost:3000
```

## Akun Login Default
- **Username**: `admin`
- **Password**: `Admin@123`

## Catatan Penting untuk AI
- **SQL Placeholder**: Gunakan `%s` (PostgreSQL), BUKAN `?` (SQLite).
- **Row Access**: Semua `fetchone()` dan `fetchall()` mengembalikan `dict` (RealDictCursor). Gunakan `row["nama_kolom"]`, BUKAN `row[0]`.
- **Scraper Concurrency**: `MAX_CONCURRENT_TABS = 3`, `RESTART_EVERY = 25`. Task dibuat paralel setelah stagger kecil, bukan serial.
- **Frontend API calls**: Gunakan `apiFetch()` dari `@/lib/api` untuk semua request ke backend.
- **Credential Security**: Jangan pernah hardcode password di source code. Semua kredensial dari `.env`.
- **Log System**: Backend menulis ke `logs/backend.log`. Endpoint `/api/system-logs` membaca 150 baris terakhir.

## Riwayat Perubahan Penting
1. Migrasi database: SQLite → PostgreSQL (Neon cloud)
2. Perbaikan `dict_factory`: semua akses row diubah dari index (`[0]`) ke key (`["column"]`)
3. Optimasi scraper: kecepatan scan +40%, fix 2 item pertama tidak load
4. Halaman admin: System Logs (`/riwayat-system`) — log server realtime di browser
5. Pembersihan repo: hapus SQLite file, skrip migrasi lama, dan hardcoded credentials

## GitHub
- **Repo**: https://github.com/lintang223/SiPantau
- **Branch aktif**: `main`
- **Commit terakhir**: `26fbfad` — feat: Migrate to PostgreSQL (Neon), optimize scraper, add System Logs page
