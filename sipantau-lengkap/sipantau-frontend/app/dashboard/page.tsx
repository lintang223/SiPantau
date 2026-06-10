"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar, { UserSession } from "@/components/Navbar";
import { Package, Search, FolderClock, Settings, AlertTriangle, User, BarChart2 } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { DIVISI_LABEL_SHORT, DIVISI_COLOR } from "@/lib/constants";

type Stats = { total: number; tokopedia: number; ekspor: number };

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser]         = useState<UserSession | null>(null);
  const [stats, setStats]       = useState<Stats>({ total: 0, tokopedia: 0, ekspor: 0 });
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [mounted, setMounted]   = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("sipantau_auth")) { router.replace("/"); return; }
    const d = localStorage.getItem("sipantau_user");
    if (!d) { router.replace("/"); return; }
    const u: UserSession = JSON.parse(d);
    setUser(u); setMounted(true);

    fetch(`${API_URL}/health`)
      .then(r => r.json()).then(() => setBackendOk(true)).catch(() => setBackendOk(false));

    apiFetch(`/api/stats?username=${u.username}`)
      .then(r => r.json()).then(d => setStats(d)).catch(() => {});
  }, [router]);

  const statCards = [
    { icon: <Package size={24} color="#4ade80" />, bg: "rgba(74, 222, 128, 0.15)",  val: stats.total,     lbl: "Total Temuan"  },
    { img: "/tokopedia.png", bg: "rgba(255, 255, 255, 0.1)", val: stats.tokopedia, lbl: "Tokopedia" },
    { icon: <BarChart2 size={24} color="#facc15" />, bg: "rgba(250, 204, 21, 0.15)", val: stats.ekspor, lbl: "Total Ekspor" },
  ];

  const quickLinks = [
    { href: "/scraping",   icon: <Search size={22} />,     label: "Pemantauan", desc: "Pantau listing baru",   green: true  },
    { href: "/riwayat",    icon: <FolderClock size={22} />, label: "Riwayat",    desc: "Lihat sesi lalu",       green: false },
    { href: "/pengaturan", icon: <Settings size={22} />,   label: "Pengaturan", desc: "Konfigurasi backend",   green: false },
  ];

  const quickLinksFiltered = quickLinks.filter(item => {
    if (item.label === "Pengaturan") return user?.divisi === "sekditjen" || user?.divisi === "dit_ppsa";
    return true;
  });

  const divisiColor = user?.divisi_color || DIVISI_COLOR[user?.divisi || ""] || "#374151";
  const divisiLabel = DIVISI_LABEL_SHORT[user?.divisi || ""] || user?.divisi || "";

  // Render null selama belum mount agar tidak ada flash konten kosong
  if (!mounted) return null

  return (
    <>
      <style>{`
        .dash-header { display:flex; align-items:flex-start; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:2rem; }
        .backend-pill { display:flex; align-items:center; gap:.5rem; padding:.4rem 1rem; border-radius:999px; font-size:.75rem; font-weight:700; flex-shrink:0; letter-spacing:.3px; backdrop-filter:blur(10px); }
        
        .dash-user-card {
          background: rgba(10, 25, 15, 0.45);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 1.5rem 1.8rem;
          display: flex; align-items: center; gap: 1.25rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          position: relative; overflow: hidden;
        }
        .dash-user-card::before {
          content: ''; position: absolute; top: 0; left: 0; width: 150px; height: 100%;
          background: linear-gradient(90deg, rgba(255,255,255,0.03), transparent);
          transform: skewX(-20deg) translateX(-50px);
        }

        .dash-stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem; margin-bottom: 2rem; }
        .dash-stat-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 1.4rem 1.6rem;
          display: flex; align-items: center; gap: 1.15rem;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15);
          transition: transform 0.3s cubic-bezier(0.25,0.46,0.45,0.94), border-color 0.3s;
        }
        .dash-stat-card:hover { transform: translateY(-4px); border-color: rgba(255, 255, 255, 0.2); background: rgba(255, 255, 255, 0.05); }
        .dash-stat-icon { width: 50px; height: 50px; border-radius: 14px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border: 1px solid rgba(255,255,255,0.1); }
        .dash-stat-val { font-size: 2rem; font-weight: 800; color: #ffffff; line-height: 1; letter-spacing: -1px; margin-bottom: .25rem; text-shadow: 0 2px 10px rgba(0,0,0,0.3); }
        .dash-stat-lbl { font-size: .8rem; color: rgba(255,255,255,0.65); font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }

        .quick-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }
        .quick-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          padding: 1.4rem 1.6rem;
          display: flex; align-items: center; gap: 1.15rem;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow: 0 4px 24px rgba(0,0,0,0.1);
        }
        .quick-card:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateY(-5px);
          box-shadow: 0 12px 32px rgba(0,0,0,0.3);
        }
        .quick-card.green {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.12), rgba(21, 128, 61, 0.03));
          border-color: rgba(34, 197, 94, 0.25);
        }
        .quick-card.green:hover {
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(21, 128, 61, 0.08));
          border-color: rgba(34, 197, 94, 0.5);
          box-shadow: 0 12px 32px rgba(34, 197, 94, 0.2);
        }
        .quick-title { color: #ffffff; font-weight: 700; font-size: 1rem; margin-bottom: .2rem; }
        .quick-desc { font-size: .78rem; font-weight: 400; color: rgba(255,255,255,0.6); }
        .quick-icon-wrap { width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); color: #fff; }
        .quick-card.green .quick-icon-wrap { background: rgba(34, 197, 94, 0.2); color: #4ade80; }

        @media (max-width:900px) { .quick-row { grid-template-columns:1fr; } }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="dash-header phead" style={{ marginBottom: "2rem" }}>
          <div>
            <div className="bc" style={{ color: "rgba(255,255,255,0.6)" }}>Sipantau <span style={{ color: "rgba(255,255,255,0.3)", margin: "0 4px" }}>/</span> <span style={{ color: "#4ade80" }}>Dashboard</span></div>
            <h1 style={{ fontSize: "2.2rem", letterSpacing: "-1px", marginTop: ".2rem" }}>Dashboard Pemantauan</h1>
            <p style={{ color: "rgba(255,255,255,0.7)", fontSize: ".95rem", marginTop: ".4rem" }}>Ringkasan pemantauan otomatis marketplace</p>
          </div>
          <div className="backend-pill" style={{
            background: backendOk === true ? "rgba(20, 83, 45, 0.6)" : backendOk === false ? "rgba(127, 29, 29, 0.6)" : "rgba(255, 255, 255, 0.1)",
            border: `1px solid ${backendOk === true ? "rgba(74, 222, 128, 0.4)" : backendOk === false ? "rgba(248, 113, 113, 0.4)" : "rgba(255, 255, 255, 0.2)"}`,
            color:  backendOk === true ? "#4ade80" : backendOk === false ? "#fca5a5" : "#e5e7eb",
          }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", display: "inline-block", background: backendOk === true ? "#4ade80" : backendOk === false ? "#ef4444" : "#9ca3af", boxShadow: backendOk === true ? "0 0 10px #4ade80" : "none" }} />
            {backendOk === null ? "Mengecek..." : backendOk ? "Backend Terhubung" : "Backend Offline"}
          </div>
        </div>

        {backendOk === false && (
          <div className="alert-err" style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem" }}>
            <AlertTriangle size={16} />
            <span>Backend offline. Jalankan <code style={{ fontFamily: "DM Mono, monospace" }}>python main.py</code></span>
          </div>
        )}

        {user && (
          <div className="dash-user-card">
            <div style={{ width: 56, height: 56, borderRadius: "16px", background: divisiColor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", boxShadow: "0 4px 14px rgba(0,0,0,0.2)" }}>
              <User size={28} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#fff", letterSpacing: "-0.5px" }}>{user.nama}</div>
              <div style={{ fontSize: ".85rem", color: "rgba(255,255,255,0.6)", marginTop: ".2rem", fontFamily: "monospace" }}>@{user.username}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ display: "inline-block", padding: ".3rem 1rem", borderRadius: 999, background: divisiColor, color: "#fff", fontSize: ".75rem", fontWeight: 800, letterSpacing: "1px", textTransform: "uppercase", boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }}>
                {divisiLabel}
              </div>
              <div style={{ fontSize: ".72rem", color: "rgba(255,255,255,0.5)", marginTop: ".4rem", fontWeight: 500 }}>
                {user.divisi === "sekditjen"
                  ? "Akses: Semua Divisi"
                  : (user.accessible_divisi?.length || 0) > 0
                    ? `Akses: ${user.accessible_divisi.map(d => DIVISI_LABEL_SHORT[d] || d).join(", ")}`
                    : "Akses: Milik Sendiri"}
              </div>
            </div>
          </div>
        )}

        <div className="dash-stat-grid">
          {statCards.map(({ img, icon, bg, val, lbl }, i) => (
            <div key={i} className="dash-stat-card">
              <div className="dash-stat-icon" style={{ background: bg }}>
                {img ? <img src={img} alt={lbl} width={28} height={28} style={{ objectFit: "contain", filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.2))" }} /> : icon}
              </div>
              <div>
                <div className="dash-stat-val">{mounted ? (val ?? 0).toLocaleString("id-ID") : "—"}</div>
                <div className="dash-stat-lbl">{lbl}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="quick-row">
          {quickLinksFiltered.map(({ href, icon, label, desc, green }) => (
            <Link key={href} href={href} className={`quick-card${green ? " green" : ""}`}>
              <div className="quick-icon-wrap">{icon}</div>
              <div>
                <div className="quick-title">{label}</div>
                <div className="quick-desc">{desc}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}