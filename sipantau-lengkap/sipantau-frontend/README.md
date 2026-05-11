# SiPantau — Frontend Next.js
### Kementerian Lingkungan Hidup dan Kehutanan RI

---

## 📁 Struktur

```
sipantau-frontend/     ← Folder ini (Next.js)
├── app/
│   ├── page.tsx           → Halaman Login
│   ├── dashboard/page.tsx → Dashboard
│   ├── scraping/page.tsx  → Form Pemantauan
│   ├── riwayat/page.tsx   → Riwayat
│   └── pengaturan/page.tsx→ Pengaturan & cek koneksi
├── components/
│   └── Navbar.tsx         → Navigasi atas
└── public/
    └── logo.png           → Logo KLHK

main.py                ← Backend Python (jalankan terpisah)
```

---

## 🚀 Cara Menjalankan

### Terminal 1 — Backend Python
```bash
python main.py
# Berjalan di http://localhost:8000
```

### Terminal 2 — Frontend Next.js
```bash
cd sipantau-frontend
npm install
npm run dev
# Buka http://localhost:3000
```

### Login
- Username: `admin`
- Password: `klhk2025`

---

*SiPantau v1.0 — © 2025 KLHK RI*
