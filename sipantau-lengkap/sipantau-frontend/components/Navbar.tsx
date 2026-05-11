"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/dashboard",  label: "🏠", text: "Dashboard" },
  { href: "/scraping",   label: "🔎", text: "Pemantauan" },
  { href: "/riwayat",    label: "📁", text: "Riwayat" },
  { href: "/pengaturan", label: "⚙️", text: "Pengaturan" },
];

export default function Navbar() {
  const pathname        = usePathname();
  const router          = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ username: string; nama: string; role: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const userData = sessionStorage.getItem("sipantau_user");
    if (userData) setUser(JSON.parse(userData));
  }, []);

  function handleLogout() {
    sessionStorage.removeItem("sipantau_auth");
    sessionStorage.removeItem("sipantau_user");
    router.push("/");
  }

  const displayName = user?.nama || user?.username || "User";
  const isAdmin = user?.role === "admin";

  return (
    <>
      <div className="topbar">
        {/* Logo */}
        <Link href="/dashboard" className="t-logo">
          <Image src="/logo.png" alt="SiPantau" width={30} height={30} />
          <div className="t-logo-text">
            <span>SiPantau</span>
            <small>Kementerian Kehutanan RI</small>
          </div>
        </Link>

        {/* Nav — desktop */}
        <nav className="t-nav">
          {navItems.map(({ href, label, text }) => (
            <Link
              key={href}
              href={href}
              className={`tn ${pathname.startsWith(href) ? "active" : ""}`}
            >
              {label}&nbsp;{text}
            </Link>
          ))}
        </nav>

        {/* Right — desktop */}
        <div className="t-right" style={{ position: "relative" }}>
          <div
            className="t-user"
            style={{ cursor: "pointer", userSelect: "none" }}
            onClick={() => setShowUserMenu(!showUserMenu)}
          >
            <span className="t-user-dot" />
            {displayName}
            {isAdmin && (
              <span style={{
                fontSize: ".6rem", background: "rgba(255,255,255,.15)",
                padding: "1px 6px", borderRadius: 99, marginLeft: 4, fontWeight: 700
              }}>ADMIN</span>
            )}
            <span style={{ fontSize: ".65rem", opacity: .6, marginLeft: 3 }}>▾</span>
          </div>

          {/* Dropdown menu */}
          {showUserMenu && (
            <>
              <div style={{ position: "fixed", inset: 0, zIndex: 9 }} onClick={() => setShowUserMenu(false)} />
              <div style={{
                position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 10,
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10,
                boxShadow: "0 8px 24px rgba(0,0,0,.12)", minWidth: 180, overflow: "hidden"
              }}>
                <div style={{ padding: ".75rem 1rem", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ fontSize: ".8rem", fontWeight: 700, color: "#111827" }}>{displayName}</div>
                  <div style={{ fontSize: ".7rem", color: "#9ca3af" }}>@{user?.username}</div>
                </div>
                <Link
                  href="/ganti-password"
                  style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "#374151", textDecoration: "none" }}
                  onClick={() => setShowUserMenu(false)}
                >
                  🔐 Ganti Password
                </Link>
                {isAdmin && (
                  <Link
                    href="/kelola-user"
                    style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "#374151", textDecoration: "none" }}
                    onClick={() => setShowUserMenu(false)}
                  >
                    👥 Kelola User
                  </Link>
                )}
                <div style={{ height: 1, background: "#f3f4f6" }} />
                <button
                  onClick={handleLogout}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: ".5rem", padding: ".65rem 1rem", fontSize: ".82rem", color: "#dc2626", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}
                >
                  🚪 Keluar
                </button>
              </div>
            </>
          )}

          <button className="t-logout" onClick={handleLogout}>🚪 Keluar</button>
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <>
          <div className="doverlay on" onClick={() => setOpen(false)} />
          <div className="drawer on">
            <div className="dhead">
              <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                <Image src="/logo.png" alt="SiPantau" width={26} height={26} style={{ borderRadius: 7, background: "rgba(255,255,255,0.12)", padding: 3 }} />
                <div style={{ lineHeight: 1.2 }}>
                  <div style={{ color: "#fff", fontSize: ".84rem", fontWeight: 800 }}>SiPantau</div>
                  <div style={{ color: "rgba(255,255,255,.5)", fontSize: ".6rem" }}>KLHK RI</div>
                </div>
              </div>
              <button className="dclose" onClick={() => setOpen(false)}>✕</button>
            </div>

            <nav className="dnav">
              {navItems.map(({ href, label, text }) => (
                <div
                  key={href}
                  className={`ditem ${pathname.startsWith(href) ? "active" : ""}`}
                  onClick={() => { router.push(href); setOpen(false); }}
                >
                  {label} {text}
                </div>
              ))}

              <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: ".6rem 0" }} />

              <div className="ditem" onClick={() => { router.push("/ganti-password"); setOpen(false); }}>
                🔐 Ganti Password
              </div>

              {isAdmin && (
                <div className="ditem" onClick={() => { router.push("/kelola-user"); setOpen(false); }}>
                  👥 Kelola User
                </div>
              )}

              <div style={{ height: 1, background: "rgba(255,255,255,.1)", margin: ".6rem 0" }} />

              <div className="ditem" style={{ color: "#fca5a5" }} onClick={handleLogout}>
                🚪 Keluar
              </div>
            </nav>

            <div style={{
              padding: ".85rem 1rem", borderTop: "1px solid rgba(255,255,255,.1)",
              fontSize: ".62rem", color: "rgba(255,255,255,.4)",
              display: "flex", alignItems: "center", gap: ".4rem",
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#4ade80", flexShrink: 0, display: "inline-block" }} />
              {displayName} · SiPantau v1.0
            </div>
          </div>
        </>
      )}
    </>
  );
}