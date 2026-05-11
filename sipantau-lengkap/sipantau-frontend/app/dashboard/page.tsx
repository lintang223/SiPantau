"use client";
// app/dashboard/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const API_URL = "http://localhost:8000";

type StatCard = {
  img?: string;
  emoji?: string;
  bg: string;
  val: number;
  lbl: string;
};

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    if (!sessionStorage.getItem("sipantau_auth")) router.push("/");
  }, [router]);

  const [stats, setStats]         = useState({ total: 0, tokopedia: 0, shopee: 0, lazada: 0, ekspor: 0 });
  const [backendOk, setBackendOk] = useState<boolean | null>(null);
  const [mounted, setMounted]     = useState(false);

 useEffect(() => {
    setMounted(true);
    const userData = sessionStorage.getItem("sipantau_user");
    const username = userData ? JSON.parse(userData).username : "";
    fetch(`${API_URL}/health`)
      .then(r => r.json()).then(() => setBackendOk(true)).catch(() => setBackendOk(false));
    fetch(`${API_URL}/api/stats?username=${username}`)
      .then(r => r.json()).then(data => setStats(data)).catch(() => {});
  }, []);

  const statCards: StatCard[] = [
    { emoji: "📦",              bg: "var(--green-light)", val: stats.total,     lbl: "Total Temuan"  },
    { img: "/tokopedia.png",    bg: "#e8f7e9",            val: stats.tokopedia, lbl: "Tokopedia"     },
    { img: "/shopee.png",       bg: "#fef0ed",            val: stats.shopee,    lbl: "Shopee"        },
    { img: "/lazada.png",       bg: "#eaebf9",            val: stats.lazada,    lbl: "Lazada"        },
    { emoji: "📊",              bg: "var(--green-light)", val: stats.ekspor,    lbl: "Total Ekspor"  },
  ];

  const quickLinks = [
    { href: "/scraping",   icon: "🔎", label: "Mulai Pemantauan", desc: "Pantau listing baru", green: true  },
    { href: "/riwayat",    icon: "📁", label: "Riwayat",          desc: "Sesi sebelumnya",      green: false },
    { href: "/pengaturan", icon: "⚙️", label: "Pengaturan",       desc: "Konfigurasi backend",  green: false },
  ];

  return (
    <>
      <style>{`
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: .75rem;
          margin-bottom: 1.25rem;
        }
        .backend-pill {
          display: flex;
          align-items: center;
          gap: .45rem;
          padding: .35rem .85rem;
          border-radius: 99px;
          font-size: .72rem;
          font-weight: 600;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .quick-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: .75rem;
          margin-top: 1rem;
        }
        .quick-card {
          display: flex;
          align-items: center;
          gap: .75rem;
          padding: .9rem 1.1rem;
          border-radius: var(--r-sm);
          font-size: .85rem;
          font-weight: 600;
          text-decoration: none;
          transition: transform .15s, box-shadow .15s;
          border: 1.5px solid var(--border);
          background: var(--surface);
          color: var(--ink2);
          box-shadow: var(--shadow-xs);
        }
        .quick-card:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
        }
        .quick-card.green {
          background: linear-gradient(135deg, #163f24, var(--green));
          color: #fff;
          border-color: transparent;
          box-shadow: var(--shadow-green);
        }
        .quick-icon { font-size: 1.2rem; flex-shrink: 0; }
        .quick-desc { font-size: .7rem; font-weight: 400; opacity: .7; margin-top: 2px; }

        @media (max-width: 640px) {
          .quick-row { grid-template-columns: 1fr; }
          .backend-pill span.pill-txt { display: none; }
        }
      `}</style>

      <Navbar />
      <div className="wrap">

        {/* Header */}
        <div className="dash-header phead">
          <div>
            <div className="bc">SiPantau / <span>Dashboard</span></div>
            <h1>Dashboard</h1>
            <p>Ringkasan pemantauan listing marketplace</p>
          </div>
          <div className="backend-pill" style={{
            background: backendOk === true ? "#f0fdf4" : backendOk === false ? "#fef2f2" : "#f9fafb",
            border: `1px solid ${backendOk === true ? "#86efac" : backendOk === false ? "#fecaca" : "#e5e7eb"}`,
            color:  backendOk === true ? "#15803d" : backendOk === false ? "#dc2626" : "#9ca3af",
          }}>
            <span style={{
              width: 7, height: 7, borderRadius: "50%", display: "inline-block", flexShrink: 0,
              background: backendOk === true ? "#22c55e" : backendOk === false ? "#dc2626" : "#d1d5db",
            }} />
            <span className="pill-txt">
              {backendOk === null ? "Mengecek..." : backendOk ? "Backend Terhubung" : "Backend Offline"}
            </span>
          </div>
        </div>

        {/* Backend offline warning */}
        {backendOk === false && (
          <div className="alert-err" style={{ marginBottom: "1rem" }}>
            <span>⚠️</span>
            <span>Backend offline. Jalankan <code style={{ fontFamily: "DM Mono, monospace", background: "rgba(220,38,38,0.08)", padding: "1px 6px", borderRadius: 4 }}>python main.py</code></span>
          </div>
        )}

        {/* Stat cards */}
        <div className="stat-grid">
          {statCards.map(({ img, emoji, bg, val, lbl }, i) => (
            <div key={i} className="stat-card">
              <div className="stat-icon" style={{ background: bg }}>
                {img
                  ? <img src={img} alt={lbl} width={28} height={28} style={{ objectFit: "contain" }} />
                  : <span style={{ fontSize: "1.2rem" }}>{emoji}</span>
                }
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
          {quickLinks.map(({ href, icon, label, desc, green }) => (
            <Link key={href} href={href} className={`quick-card${green ? " green" : ""}`}>
              <span className="quick-icon">{icon}</span>
              <div>
                <div>{label}</div>
                <div className="quick-desc">{desc}</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </>
  );
}