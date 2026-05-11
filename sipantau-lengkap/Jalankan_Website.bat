@echo off
title SiPantau Web Launcher
color 0A
cls

echo =======================================================
echo    Menyiapkan Website SiPantau...
echo =======================================================
echo.

echo [1/3] Memeriksa dependensi Backend (Python)...
pip install fastapi uvicorn pandas openpyxl pydantic --quiet
echo.

echo [2/3] Menjalankan Backend (API)...
start "SiPantau Backend" cmd /c "title SiPantau Backend && python main_sqlite.py"
echo Backend berjalan di background.
echo.

echo [3/3] Memeriksa dependensi Frontend (Node.js)...
cd sipantau-frontend
if not exist "node_modules\" (
    echo Menginstal module website Hanya 1x...
    call npm install
)

echo Menjalankan Frontend...
start "SiPantau Frontend" cmd /k "title SiPantau Frontend && npm run dev"

echo.
echo =======================================================
echo    Selesai!
echo    Tunggu beberapa detik, lalu buka browser Anda ke:
echo    http://localhost:3000
echo.
echo    PENTING: Jangan tutup 2 jendela hitam lainnya!
echo =======================================================
pause >nul
