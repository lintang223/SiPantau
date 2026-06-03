@echo off
title SiPantau Scraper — Tokopedia & Shopee (KLHK Edition)
color 0A

echo ==================================================
echo  SIPANTAU SCRAPER — Tokopedia ^& Shopee Edition
echo ==================================================
echo.

:: --- PENGATURAN INTERAKTIF ---

:: Pilihan Platform
set SCRAPER_PLATFORM=tokopedia
set /p USER_PLATFORM="[?] Platform mana? (tokopedia / shopee, Enter = tokopedia): "
if /i "%USER_PLATFORM%"=="shopee" set SCRAPER_PLATFORM=shopee
if /i "%USER_PLATFORM%"=="s" set SCRAPER_PLATFORM=shopee

set SCRAPER_THRESHOLD=350000
set /p USER_THRESHOLD="[?] Masukkan batas harga 'mahal' (contoh: 500000, atau Enter untuk default Rp 350.000): "
if not "%USER_THRESHOLD%"=="" set SCRAPER_THRESHOLD=%USER_THRESHOLD%

set SCRAPER_SCROLL=5
set /p USER_SCROLL="[?] Berapa halaman yang ingin di-scrape? (0 = semua, atau Enter untuk 5): "
if not "%USER_SCROLL%"=="" set SCRAPER_SCROLL=%USER_SCROLL%

echo.
echo  Platform yang dipilih: %SCRAPER_PLATFORM%
echo.
echo  [!] PENTING — Sebelum melanjutkan:
echo      Pastikan SEMUA jendela Chrome sudah DITUTUP.
echo      Jika Chrome masih berjalan, koneksi CDP akan GAGAL!
echo      (Cek Task Manager jika perlu)
echo.
if /i "%SCRAPER_PLATFORM%"=="shopee" (
    echo  [SHOPEE] Tips untuk bypass login wall:
    echo.
    echo   * Jika PERTAMA KALI menggunakan Shopee, atau session expired:
    echo     Jalankan dulu: env_klhk\Scripts\python.exe shopee_login.py
    echo     Login manual di browser, lalu jalankan run.bat ini kembali.
    echo.
    if exist "%CD%\output\shopee_session.json" (
        echo   [OK] Session Shopee tersimpan ditemukan ^(output\shopee_session.json^)
        echo        Login otomatis akan digunakan.
    ) else (
        echo   [!] BELUM ADA session tersimpan. Scraper akan mencoba tanpa login.
        echo       Jika terkena login wall, jalankan: shopee_login.py
    )
    echo.
)
pause

echo.
echo ==================================================
echo  MEMBUKA CHROME (MODE ANTI-BOT / CDP)
echo ==================================================

:: Mencari lokasi Google Chrome
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME_PATH%" set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe

:: Menggunakan profil yang sama dengan jalankan_chrome_asli.bat
:: Profil ini sudah punya cookies/histori → PENTING untuk bypass bot!
echo  Membuka Chrome dengan profil scraping...

if /i "%SCRAPER_PLATFORM%"=="shopee" (
    start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome_scraping_profile" "https://shopee.co.id"
) else (
    start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome_scraping_profile" "https://www.tokopedia.com"
)

echo.
echo  Menunggu Chrome siap... (5 detik)
timeout /t 5 /nobreak >nul

echo.
echo ==================================================
echo  MENJALANKAN SCRAPER PYTHON
echo ==================================================
echo.

:: Menggunakan environment virtual klhk
set PYTHON_CMD=%CD%\env_klhk\Scripts\python.exe
if not exist "%PYTHON_CMD%" set PYTHON_CMD=python

"%PYTHON_CMD%" src\main.py

echo.
echo ==================================================
echo  PROSES SELESAI
echo ==================================================
pause
