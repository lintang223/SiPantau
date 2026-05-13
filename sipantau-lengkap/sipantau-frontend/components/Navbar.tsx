"use client";
import { LayoutDashboard, Search, FolderClock, Settings, Menu, X, LogOut, ChevronDown, Lock, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard",  icon: <LayoutDashboard size={16} />, text: "Dashboard" },
  { href: "/scraping",   icon: <Search size={16} />, text: "Pemantauan" },
  { href: "/riwayat",    icon: <FolderClock size={16} />, text: "Riwayat" },
  { href: "/pengaturan", icon: <Settings size={16} />, text: "Pengaturan" },
];

export type UserSession = {
  username: string;
  nama: string;
  divisi: string;
  level: number;
  can_export: boolean;
  can_manage_users: boolean;
  accessible_divisi: string[];
  divisi_color?: string;
};

const DIVISI_LABEL: Record<string, string> = {
  superadmin: "Admin",
  sekdit:     "Sekditjen",
  pengawasan: "Pengawasan",
  pengaduan:  "Pengaduan",
};

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]           = useState(false);
  const [user, setUser]           = useState<UserSession | null>(null);
  const [showMenu, setShowMenu]   = useState(false);

  const API = "http://localhost:8000";

  useEffect(() => {
    const raw = sessionStorage.getItem("sipantau_user");
    if (!raw) return;

    // Tampilkan data lama dulu agar tidak terasa kosong
    const cached: UserSession = JSON.parse(raw);
    setUser(cached);

    // Refresh data terbaru dari backend (silent, no loader)
    fetch(`${API}/api/auth/me?username=${encodeURIComponent(cached.username)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success && data.user) {
          sessionStorage.setItem("sipantau_user", JSON.stringify(data.user));
          setUser(data.user);
        }
      })
      .catch(() => {/* gagal refresh, tetap pakai cache */});
  }, []);

  function handleLogout() {
    sessionStorage.removeItem("sipantau_auth");
    sessionStorage.removeItem("sipantau_user");
    router.push("/");
  }

  const divisiColor = user?.divisi_color || "#374151";
  const divisiLabel = DIVISI_LABEL[user?.divisi || "umum"] || user?.divisi || "";
  const canManage   = user?.can_manage_users === true;
  const navItemsFiltered = navItems.filter(item => {
    if (item.text === "Pengaturan") {
      return user?.divisi === "superadmin" || user?.divisi === "sekdit";
    }
    return true;
  });

  return (
    <>
      <div className="topbar">
        <Link href="/dashboard" className="t-logo">
          <Image src="/logo.png" alt="SiPantau" width={34} height={34} />
          <div className="t-logo-text">
            <span>SiPantau</span>
            <small>Kementrian Kehutanan RI</small>
          </div>
        </Link>

        <nav className="t-nav">
          {navItemsFiltered.map(({ href, icon, text }) => (
            <Link key={href} href={href} className={`tn ${pathname.startsWith(href) ? "active" : ""}`}>
              <span>{icon}</span>{text}
            </Link>
          ))}
        </nav>

        <div className="t-right" style={{ position: "relative" }}>
          <div className="t-user" onClick={() => setShowMenu(!showMenu)}>
            <span className="t-user-dot" />
            <div style={{ lineHeight: 1.25 }}>
              <div style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                {user?.nama || user?.username || "User"}
                <span style={{
                  display: "inline-block", padding: ".15rem .6rem", borderRadius: 999,
                  fontSize: ".63rem", fontWeight: 800, letterSpacing: ".3px",
                  background: divisiColor, color: "#fff",
                }}>
                  {divisiLabel}
                </span>
                <ChevronDown size={14} style={{ opacity: .6 }} />
              </div>
              {user?.username && (
                <div style={{ fontSize: ".6rem", color: "rgba(255,255,255,.45)", fontWeight: 400 }}>
                  @{user.username}
                </div>
              )}
            </div>
          </div>

          {showMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setShowMenu(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 10px)", right: 0, zIndex: 10,
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12,
                boxShadow: "0 8px 28px rgba(0,0,0,.12)", minWidth: 210, overflow: "hidden",
              }}>
                <div style={{ padding: ".8rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontWeight: 700, fontSize: ".85rem", color: "#111" }}>{user?.nama}</div>
                  <div style={{ fontSize: ".7rem", color: "#9ca3af" }}>@{user?.username}</div>
                  <div style={{ marginTop: ".4rem", display: "inline-block", padding: ".15rem .65rem", borderRadius: 999, fontSize: ".68rem", fontWeight: 700, background: divisiColor, color: "#fff" }}>
                    {divisiLabel}
                  </div>
                </div>
                <Link href="/ganti-password" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "#374151" }} onClick={() => setShowMenu(false)}>
                  <Lock size={15} /> Ganti Password
                </Link>
                {canManage && (
                  <Link href="/kelola-user" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "#374151" }} onClick={() => setShowMenu(false)}>
                    <Users size={15} /> Kelola User
                  </Link>
                )}
                <div style={{ height: 1, background: "#f3f4f6" }} />
                <button onClick={handleLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer" }}>
                  <LogOut size={15} /> Keluar
                </button>
              </div>
            </>
          )}

          <button className="t-logout" onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><LogOut size={14} /> Keluar</button>
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">{open ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </div>

      {open && (
        <>
          <div className="doverlay" onClick={() => setOpen(false)} />
          <div className="drawer">
            <div className="dhead">
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                <Image src="/logo.png" alt="SiPantau" width={28} height={28} style={{ borderRadius: 7, background: "rgba(255,255,255,0.12)", padding: 3 }} />
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ color: "#fff", fontSize: ".88rem", fontWeight: 800 }}>SiPantau</div>
                  <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".6rem" }}>Kementrian Kehutanan RI</div>
                </div>
              </div>
              <button className="dclose" onClick={() => setOpen(false)}><X size={18} /></button>
            </div>
            <nav className="dnav">
              {navItemsFiltered.map(({ href, icon, text }) => (
                <div key={href} className={`ditem ${pathname.startsWith(href) ? "active" : ""}`} onClick={() => { router.push(href); setOpen(false); }}>
                  <span style={{ fontSize: "1.1rem" }}>{icon}</span> {text}
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: ".6rem 0" }} />
              <div className="ditem" onClick={() => { router.push("/ganti-password"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Lock size={16} /> Ganti Password</div>
              {canManage && <div className="ditem" onClick={() => { router.push("/kelola-user"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Users size={16} /> Kelola User</div>}
              <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: ".6rem 0" }} />
              <div className="ditem" style={{ color: "#fca5a5", display: "flex", alignItems: "center", gap: ".5rem" }} onClick={handleLogout}><LogOut size={16} /> Keluar</div>
            </nav>
            <div style={{ padding: ".85rem 1rem", borderTop: "1px solid rgba(255,255,255,.1)", fontSize: ".62rem", color: "rgba(255,255,255,.4)", display: "flex", alignItems: "center", gap: ".4rem" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", display: "inline-block" }} />
              {user?.nama} · {divisiLabel}
            </div>
          </div>
        </>
      )}
    </>
  );
}