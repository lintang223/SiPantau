@echo off
title SiPantau Local Agent
color 0A
cls

echo =======================================================
echo    SiPantau Local Agent - Sistem Pemantauan Marketplace
echo =======================================================
echo.
echo    Memulai agent scraper...
echo    Biarkan jendela ini tetap terbuka saat Anda menggunakan
echo    website SiPantau untuk melakukan pemantauan.
echo.
echo    Untuk menghentikan: tutup jendela ini atau tekan Ctrl+C
echo =======================================================
echo.

cd /d "%~dp0"
python agent.py

echo.
echo    Agent berhenti. Tekan tombol apa saja untuk keluar.
pause >nul
