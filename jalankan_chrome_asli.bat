@echo off
echo ===================================================
echo   MEMBUKA CHROME ASLI DALAM MODE DEBUGGING (ANTI-BOT)
echo ===================================================
echo.
echo Pastikan semua jendela Chrome sudah ditutup terlebih dahulu!
echo Jika script gagal tersambung, tutup semua Chrome di Task Manager lalu jalankan ulang.
echo.
pause

start chrome.exe --remote-debugging-port=9222 --user-data-dir="%TEMP%\chrome_scraping_profile"
echo.
echo Chrome sudah terbuka. Sekarang Anda bisa menjalankan "python main.py"
pause
