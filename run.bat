@echo off
title Tokopedia Wildlife Scraper (KLHK Edition)
color 0A

echo ==================================================
echo  TOKOPEDIA WILDLIFE SCRAPER — KLHK Edition
echo ==================================================
echo.

:: --- PENGATURAN INTERAKTIF ---
set SCRAPER_THRESHOLD=350000
set /p USER_THRESHOLD="[?] Masukkan batas harga 'mahal' (contoh: 500000, atau Enter untuk default Rp 350.000): "
if not "%USER_THRESHOLD%"=="" set SCRAPER_THRESHOLD=%USER_THRESHOLD%

set SCRAPER_SCROLL=5
set /p USER_SCROLL="[?] Berapa kali ingin scroll 'Muat Lebih Banyak'? (0 = sampai habis, atau Enter untuk 5x): "
if not "%USER_SCROLL%"=="" set SCRAPER_SCROLL=%USER_SCROLL%

echo.
echo  [!] PENTING — Sebelum melanjutkan:
echo      Pastikan SEMUA jendela Chrome sudah DITUTUP.
echo      Jika Chrome masih berjalan, koneksi CDP akan GAGAL!
echo      (Cek Task Manager jika perlu)
echo.
pause

echo.
echo ==================================================
echo  MEMBUKA CHROME (MODE ANTI-BOT / CDP)
echo ==================================================

:: Mencari lokasi Google Chrome
set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME_PATH%" set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe

:: Menggunakan profil yang sama dengan jalankan_chrome_asli.bat
:: Profil ini sudah punya cookies/histori Tokopedia → PENTING untuk bypass bot!
echo  Membuka Chrome dengan profil scraping...
start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome_scraping_profile" "https://www.tokopedia.com"

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
