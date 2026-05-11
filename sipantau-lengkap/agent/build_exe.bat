@echo off
title Build SiPantau Agent EXE
color 0B
cls

echo =======================================================
echo    Build SiPantau Agent ke file .exe (PyInstaller)
echo =======================================================
echo.

cd /d "%~dp0"

echo [1/4] Install/upgrade PyInstaller...
pip install pyinstaller --quiet
echo.

echo [2/4] Install dependensi agent...
pip install -r requirements_agent.txt --quiet
echo.

echo [3/4] Install Playwright Chromium (untuk build saja)...
playwright install chromium
echo.

echo [4/4] Build agent.exe ...
pyinstaller ^
  --onefile ^
  --name "SiPantau_Agent" ^
  --icon NONE ^
  --add-data "scraper;scraper" ^
  --hidden-import "playwright" ^
  --hidden-import "playwright.async_api" ^
  --hidden-import "fastapi" ^
  --hidden-import "uvicorn" ^
  --hidden-import "uvicorn.logging" ^
  --hidden-import "uvicorn.loops" ^
  --hidden-import "uvicorn.loops.auto" ^
  --hidden-import "uvicorn.protocols" ^
  --hidden-import "uvicorn.protocols.http" ^
  --hidden-import "uvicorn.protocols.http.auto" ^
  --hidden-import "uvicorn.lifespan" ^
  --hidden-import "uvicorn.lifespan.on" ^
  --hidden-import "starlette" ^
  --hidden-import "openpyxl" ^
  --hidden-import "requests" ^
  --hidden-import "pydantic" ^
  --hidden-import "pkg_resources" ^
  --hidden-import "setuptools" ^
  --hidden-import "scraper.config" ^
  --hidden-import "scraper.utils" ^
  --hidden-import "scraper.browser_manager" ^
  --hidden-import "scraper.scraper_core" ^
  --hidden-import "scraper.excel_writer" ^
  --hidden-import "scraper.proxy_manager" ^
  --collect-all "playwright_stealth" ^
  --collect-all "playwright" ^
  --noconfirm ^
  agent.py

echo.
if exist "dist\SiPantau_Agent.exe" (
    echo =======================================================
    echo    BUILD BERHASIL!
    echo    File: dist\SiPantau_Agent.exe
    echo.
    echo    Cara distribusi ke pengguna:
    echo      1. Bagikan file dist\SiPantau_Agent.exe
    echo      2. Pengguna cukup double-click file tersebut
    echo      3. Browser akan terbuka otomatis (siap pakai!)
    echo =======================================================
    :: Copy ke public/downloads otomatis
    if exist "..\sipantau-frontend\public\downloads\" (
        copy /Y "dist\SiPantau_Agent.exe" "..\sipantau-frontend\public\downloads\SiPantau_Agent.exe" >nul
        echo    Sudah di-copy ke frontend/public/downloads/
    )
) else (
    echo BUILD GAGAL. Periksa error di atas.
)

echo.
pause
