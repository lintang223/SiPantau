"use client";
import { LayoutDashboard, Search, FolderClock, Settings, Menu, X, LogOut, ChevronDown, Lock, Users } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { apiFetch, logout as apiLogout } from "@/lib/api";
import { DIVISI_LABEL_SHORT, DIVISI_COLOR } from "@/lib/constants";

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
  foto_profil?: string;
};

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [open, setOpen]         = useState(false);
  const [user, setUser]         = useState<UserSession | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem("sipantau_user");
    if (!raw) return;
    const cached: UserSession = JSON.parse(raw);
    setUser(cached);

    // Refresh dari backend secara silent
    apiFetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.success && data.user) {
          localStorage.setItem("sipantau_user", JSON.stringify(data.user));
          setUser(data.user);
        }
      })
      .catch(() => {/* gagal refresh, tetap pakai cache */});
  }, []);

  function handleLogout() {
    apiLogout();
  }

  const divisiColor = user?.divisi_color || DIVISI_COLOR[user?.divisi || ""] || "#374151";
  const divisiLabel = DIVISI_LABEL_SHORT[user?.divisi || ""] || user?.divisi || "";
  const canManage   = user?.can_manage_users === true;
  const navItemsFiltered = navItems.filter(item => {
    if (item.text === "Pengaturan") {
      return user?.divisi === "sekditjen" || user?.divisi === "dit_ppsa";
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
            {user?.foto_profil ? (
              <img src={user.foto_profil} alt="Avatar" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '2px solid var(--green)' }} />
            ) : (
              <span className="t-user-dot" />
            )}
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
                background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12,
                boxShadow: "0 8px 32px rgba(0,0,0,.4)", minWidth: 210, overflow: "hidden", backdropFilter: "blur(12px)"
              }}>
                <div style={{ padding: ".8rem 1rem", borderBottom: "1px solid var(--border)", display: 'flex', alignItems: 'center', gap: '.8rem' }}>
                  {user?.foto_profil && (
                    <img src={user.foto_profil} alt="Avatar" style={{ width: 42, height: 42, borderRadius: '50%', objectFit: 'cover' }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: ".85rem", color: "var(--ink)" }}>{user?.nama}</div>
                    <div style={{ fontSize: ".7rem", color: "var(--ink3)" }}>@{user?.username}</div>
                    <div style={{ marginTop: ".4rem", display: "inline-block", padding: ".15rem .65rem", borderRadius: 999, fontSize: ".68rem", fontWeight: 700, background: divisiColor, color: "#fff" }}>
                      {divisiLabel}
                    </div>
                  </div>
                </div>
                <Link href="/profil" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "var(--ink2)" }} onClick={() => setShowMenu(false)}>
                  <Lock size={15} /> Profil & Keamanan
                </Link>
                {canManage && (
                  <>
                    <Link href="/kelola-user" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "var(--ink2)" }} onClick={() => setShowMenu(false)}>
                      <Users size={15} /> Kelola User
                    </Link>
                    <Link href="/riwayat-aktivitas" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "var(--ink2)" }} onClick={() => setShowMenu(false)}>
                      <FolderClock size={15} /> Riwayat Aktivitas User
                    </Link>
                    {user?.divisi === "sekditjen" && (
                      <Link href="/riwayat-login" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "var(--ink2)" }} onClick={() => setShowMenu(false)}>
                        <Search size={15} /> Log Login
                      </Link>
                    )}
                  </>
                )}
                <div style={{ height: 1, background: "var(--border)" }} />
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
              <div className="ditem" onClick={() => { router.push("/profil"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Lock size={16} /> Profil & Keamanan</div>
              {canManage && (
                <>
                  <div className="ditem" onClick={() => { router.push("/kelola-user"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Users size={16} /> Kelola User</div>
                  <div className="ditem" onClick={() => { router.push("/riwayat-aktivitas"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><FolderClock size={16} /> Riwayat Aktivitas</div>
                  {user?.divisi === "sekditjen" && (
                    <div className="ditem" onClick={() => { router.push("/riwayat-login"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Search size={16} /> Log Login</div>
                  )}
                </>
              )}
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