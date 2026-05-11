"""Script build PyInstaller yang berjalan tanpa interaksi user."""
import subprocess, sys, os, shutil

os.chdir(os.path.dirname(os.path.abspath(__file__)))

cmd = [
    sys.executable, "-m", "PyInstaller",
    "--onefile",
    "--name", "SiPantau_Agent",
    "--add-data", "scraper;scraper",
    "--hidden-import", "scraper.config",
    "--hidden-import", "scraper.utils",
    "--hidden-import", "scraper.browser_manager",
    "--hidden-import", "scraper.scraper_core",
    "--hidden-import", "scraper.excel_writer",
    "--hidden-import", "scraper.proxy_manager",
    "--hidden-import", "playwright",
    "--hidden-import", "playwright.async_api",
    "--hidden-import", "fastapi",
    "--hidden-import", "uvicorn",
    "--hidden-import", "uvicorn.logging",
    "--hidden-import", "uvicorn.loops",
    "--hidden-import", "uvicorn.loops.auto",
    "--hidden-import", "uvicorn.protocols",
    "--hidden-import", "uvicorn.protocols.http",
    "--hidden-import", "uvicorn.protocols.http.auto",
    "--hidden-import", "uvicorn.lifespan",
    "--hidden-import", "uvicorn.lifespan.on",
    "--hidden-import", "starlette",
    "--hidden-import", "openpyxl",
    "--hidden-import", "requests",
    "--hidden-import", "pydantic",
    "--hidden-import", "pkg_resources",
    "--hidden-import", "setuptools",
    "--collect-all", "playwright_stealth",
    "--collect-all", "playwright",
    "--noconfirm",
    "agent.py",
]

print("Building SiPantau_Agent.exe ...")
result = subprocess.run(cmd)

if result.returncode == 0 and os.path.exists("dist/SiPantau_Agent.exe"):
    print("\nBUILD BERHASIL: dist/SiPantau_Agent.exe")
    dst = r"..\sipantau-frontend\public\downloads\SiPantau_Agent.exe"
    try:
        shutil.copy2("dist/SiPantau_Agent.exe", dst)
        print(f"Copy ke {dst}")
    except Exception as e:
        print(f"Copy gagal: {e}")
else:
    print(f"\nBUILD GAGAL (exit {result.returncode})")
