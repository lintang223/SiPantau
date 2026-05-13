"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar, { UserSession } from "@/components/Navbar";
import { Package, Search, FolderClock, Settings, AlertTriangle, User, BarChart2 } from "lucide-react";

const API = "http://localhost:8000";

const DIVISI_LABEL: Record<string, string> = {
  superadmin: "Admin", 
  sekdit:     "Sekditjen",
  pengawasan: "Pengawasan",  
  pengaduan:  "Pengaduan",
};

type Stats = { total: number; tokopedia: number; shopee: number; lazada: number; ekspor: number };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]       = useState<UserSession | null>(null);
  const [stats, setStats]     = useState<Stats>({ total: 0, tokopedia: 0, shopee: 0, lazada: 0, ekspor: 0 });
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("sipantau_auth")) { router.push("/"); return; }
    const d = sessionStorage.getItem("sipantau_user");
    if (!d) return;
    const u: UserSession = JSON.parse(d);
    setUser(u); setMounted(true);

    fetch(`${API}/health`).then(r => r.json()).then(() => setBackendOk(true)).catch(() => setBackendOk(false));
    fetch(`${API}/api/stats?username=${u.username}`).then(r => r.json()).then(setStats).catch(() => {});
  }, [router]);

  const statCards = [
    { icon: <Package size={22} color="#15803d" />, bg: "#f0fdf4", val: stats.total,     lbl: "Total Temuan"  },
    { img: "/tokopedia.png", bg: "#e8f7e9", val: stats.tokopedia, lbl: "Tokopedia" },
    { img: "/shopee.png",    bg: "#fff1ee", val: stats.shopee,    lbl: "Shopee"    },
    { img: "/lazada.png",    bg: "#eef0ff", val: stats.lazada,    lbl: "Lazada"    },
    { icon: <BarChart2 size={22} color="#854d0e" />, bg: "#fefce8", val: stats.ekspor, lbl: "Total Ekspor" },
  ];

  const quickLinks = [
    { href: "/scraping",   icon: <Search size={22} />, label: "Pemantauan", desc: "Pantau listing baru",  green: true  },
    { href: "/riwayat",    icon: <FolderClock size={22} />, label: "Riwayat",    desc: "Lihat sesi lalu",      green: false },
    { href: "/pengaturan", icon: <Settings size={22} />, label: "Pengaturan", desc: "Konfigurasi backend",  green: false },
  ];

  const quickLinksFiltered = quickLinks.filter(item => {
    if (item.label === "Pengaturan") {
      return user?.divisi === "superadmin" || user?.divisi === "sekdit";
    }
    return true;
  });

  const divisiColor = user?.divisi_color || "#374151";
  const divisiLabel = DIVISI_LABEL[user?.divisi || "umum"] || user?.divisi || "";

  return (
    <>
      <style>{`
        .dash-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:.75rem; margin-bottom:1.35rem; }
        .backend-pill { display:flex; align-items:center; gap:.45rem; padding:.32rem .85rem; border-radius:999px; font-size:.73rem; font-weight:600; flex-shrink:0; }
        .quick-row { display:grid; grid-template-columns:repeat(3,1fr); gap:.85rem; margin-top:1rem; }
        .quick-card { display:flex; align-items:center; gap:.75rem; padding:1rem 1.2rem; border-radius:12px; font-size:.88rem; font-weight:600; text-decoration:none; transition:transform .15s,box-shadow .15s; border:1.5px solid var(--border); background:var(--surface); color:var(--ink2); box-shadow:var(--shadow-xs); }
        .quick-card:hover { transform:translateY(-2px); box-shadow:var(--shadow-sm); }
        .quick-card.green { background:var(--green); color:#fff; border-color:transparent; box-shadow:var(--shadow-green); }
        .quick-card.green:hover { background:var(--green-mid); }
        .quick-desc { font-size:.72rem; font-weight:400; opacity:.7; margin-top:2px; }
        .info-card-user { background:var(--surface); border:1px solid var(--border); border-radius:var(--r-md); padding:.9rem 1.1rem; display:flex; align-items:center; gap:.85rem; margin-bottom:1.15rem; box-shadow:var(--shadow-xs); }
        @media (max-width:640px) { .quick-row { grid-template-columns:1fr; } }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="dash-header phead">
          <div>
            <div className="bc">Sipantau / <span>Dashboard</span></div>
            <h1>Dashboard</h1>
            <p>Ringkasan pemantauan listing marketplace</p>
          </div>
          <div className="backend-pill" style={{
            background: backendOk === true ? "#f0fdf4" : backendOk === false ? "#fef2f2" : "#f9fafb",
            border: `1px solid ${backendOk === true ? "#86efac" : backendOk === false ? "#fecaca" : "#e5e7eb"}`,
            color:  backendOk === true ? "#15803d" : backendOk === false ? "#dc2626" : "#9ca3af",
          }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", display: "inline-block", background: backendOk === true ? "#22c55e" : backendOk === false ? "#dc2626" : "#d1d5db" }} />
            {backendOk === null ? "Mengecek..." : backendOk ? "Backend Terhubung" : "Backend Offline"}
          </div>
        </div>

        {backendOk === false && (
          <div className="alert-err" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <AlertTriangle size={16} />
            <span>Backend offline. Jalankan <code style={{ fontFamily: "DM Mono, monospace" }}>python main.py</code></span>
          </div>
        )}

        {/* User info card */}
        {user && (
          <div className="info-card-user">
            <div style={{ width: 42, height: 42, borderRadius: "50%", background: divisiColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff" }}>
              <User size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: ".92rem", color: "var(--ink)" }}>{user.nama}</div>
              <div style={{ fontSize: ".75rem", color: "var(--ink3)", marginTop: ".15rem" }}>
                @{user.username}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", padding: ".22rem .8rem", borderRadius: 999, background: divisiColor, color: "#fff", fontSize: ".72rem", fontWeight: 800 }}>
                {divisiLabel}
              </div>
              <div style={{ fontSize: ".67rem", color: "var(--ink4)", marginTop: ".3rem" }}>
                {user.divisi === "superadmin"
                  ? "Akses: Semua Divisi"
                  : (user.accessible_divisi?.length || 0) > 0
                    ? `Akses: ${user.accessible_divisi.map(d => DIVISI_LABEL[d] || d).join(", ")}`
                    : "Akses: Milik Sendiri"}
              </div>
            </div>
          </div>
        )}

        {/* Stat cards */}
        <div className="stat-grid">
          {statCards.map(({ img, icon, bg, val, lbl }, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {img ? <img src={img} alt={lbl} width={26} height={26} style={{ objectFit: "contain" }} /> : icon}
              </div>
              <div>
                <div className="stat-val">{mounted ? val.toLocaleString("id-ID") : "—"}</div>
                <div className="stat-lbl">{lbl}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="quick-row">
          {quickLinksFiltered.map(({ href, icon, label, desc, green }) => (
            <Link key={href} href={href} className={`quick-card${green ? " green" : ""}`}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", color: green ? "#fff" : "var(--ink2)" }}>{icon}</div>
              <div><div>{label}</div><div className="quick-desc">{desc}</div></div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}