import os
import re
import asyncio
import aiohttp
from config import PROXY_FILE, USE_PROXY

class ProxyManager:
    def __init__(self, path: str = PROXY_FILE):
        self.proxies: list[str] = []
        self.dead: set[str]    = set()
        self._idx: int         = 0
        if not USE_PROXY:
            return
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                self.proxies = [l.strip() for l in f if l.strip() and not l.startswith("#")]
            print(f"   🌐 Proxy dimuat: {len(self.proxies)} entri")
        else:
            open(path, "w").close()
            print(f"   ℹ️  {path} tidak ditemukan — buat file kosong, mode direct")

    def next_proxy(self) -> dict | None:
        if not self.proxies:
            return None
        available = [p for p in self.proxies if p not in self.dead]
        if not available:
            print("   ⚠️  Semua proxy mati — fallback direct")
            return None
        raw = available[self._idx % len(available)]
        self._idx += 1
        m = re.match(r'(https?|socks5?)://(?:([^:@]+):([^@]+)@)?([^:/]+):(\d+)', raw)
        if not m:
            return {"server": raw}
        proto, user, pw, host, port = m.groups()
        proxy: dict = {"server": f"{proto}://{host}:{port}"}
        if user:
            proxy["username"] = user
            proxy["password"] = pw
        return proxy

    def mark_dead(self, proxy: dict | None):
        if proxy:
            srv = proxy.get("server", "")
            if srv:
                self.dead.add(srv)
                print(f"   💀 Proxy mati: {srv}")

    async def check_proxy(self, proxy: dict | None) -> bool:
        """ [IMPROVEMENT] Validasi proxy secara asinkronus """
        if not proxy:
            return True # Direct connection (no proxy) is considered valid
            
        proxy_url = proxy.get("server", "")
        # Format for aiohttp: http://user:pass@host:port
        if "username" in proxy:
            host_port = proxy_url.split("://")[-1]
            proto = proxy_url.split("://")[0]
            auth_str = f"{proxy['username']}:{proxy['password']}@"
            aio_proxy_url = f"{proto}://{auth_str}{host_port}"
        else:
            aio_proxy_url = proxy_url
            
        print(f"   🔍 Menguji proxy: {proxy_url}...")
        try:
            # We use a short timeout (5 seconds) to avoid wasting time
            timeout = aiohttp.ClientTimeout(total=5)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                async with session.get("http://ip-api.com/json", proxy=aio_proxy_url) as resp:
                    if resp.status == 200:
                        print(f"   ✅ Proxy aktif!")
                        return True
                    else:
                        print(f"   ❌ Proxy mengembalikan status {resp.status}")
                        self.mark_dead(proxy)
                        return False
        except Exception as e:
            print(f"   ❌ Proxy timeout/gagal: {e}")
            self.mark_dead(proxy)
            return False

    async def get_valid_proxy(self) -> dict | None:
        """ Mendapatkan proxy yang dipastikan jalan """
        if not self.proxies or not USE_PROXY:
            return None
        
        for _ in range(len(self.proxies)):
            p = self.next_proxy()
            if not p:
                return None
            if await self.check_proxy(p):
                return p
        return None
