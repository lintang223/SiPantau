"use client";
// app/pengaturan/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CheckCircle, AlertTriangle, Plug, Server, RefreshCw } from "lucide-react";

export default function PengaturanPage() {
  const router = useRouter();
  useEffect(() => {
    if (!sessionStorage.getItem("sipantau_auth")) {
      router.push("/");
      return;
    }
    const userStr = sessionStorage.getItem("sipantau_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.divisi !== "superadmin" && user.divisi !== "sekdit") {
        router.push("/akses-ditolak");
      }
    }
  }, [router]);

  const [apiUrl, setApiUrl]       = useState("http://localhost:8000");
  const [status, setStatus]       = useState<"idle" | "checking" | "ok" | "err">("idle");
  const [statusTxt, setStatusTxt] = useState("");

  async function cekKoneksi() {
    setStatus("checking");
    setStatusTxt("Mengecek koneksi...");
    try {
      const res  = await fetch(`${apiUrl}/health`);
      const data = await res.json();
      if (data.status === "ok") {
        setStatus("ok");
        setStatusTxt(<>Terhubung <CheckCircle size={14} style={{ display: "inline", verticalAlign: "middle", marginLeft: 4 }} /> — {data.app ?? "SiPantau Backend"} v{data.versi ?? "1.0"}</>);
      } else {
        throw new Error();
      }
    } catch {
      setStatus("err");
      setStatusTxt("Tidak terhubung — pastikan main.py berjalan");
    }
  }

  const dotColor = status === "ok" ? "#22c55e" : status === "err" ? "#dc2626" : status === "checking" ? "#f59e0b" : "#d1d5db";
  const txtColor = status === "ok" ? "#15803d" : status === "err" ? "#dc2626" : status === "checking" ? "#92400e" : "var(--ink3)";

  return (
    <>
      <Navbar />
      <div className="wrap">

        <div className="phead">
          <div className="bc">Sipantau / <span>Pengaturan</span></div>
          <h1>Pengaturan</h1>
          <p>Konfigurasi koneksi backend dan preferensi sistem</p>
        </div>

        {/* Koneksi card */}
        <div className="card" style={{ marginBottom: ".85rem" }}>
          <div className="card-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Plug size={20} /> Koneksi API Backend</h2>
            {status === "ok" && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: ".4rem",
                fontSize: ".7rem", color: "#15803d", fontWeight: 600,
                background: "#f0fdf4", border: "1px solid #86efac",
                padding: ".2rem .6rem", borderRadius: 99,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
                Online
              </span>
            )}
          </div>
          <div className="card-body">

            <div className="frow" style={{ alignItems: "flex-end" }}>
              <div className="fgroup">
                <label>URL Backend (main.py)</label>
                <input
                  className="finput"
                  value={apiUrl}
                  onChange={e => setApiUrl(e.target.value)}
                  placeholder="http://localhost:8000"
                />
              </div>
              <button
                className="btn-green"
                onClick={cekKoneksi}
                disabled={status === "checking"}
                style={{ flexShrink: 0, minWidth: 140 }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
                  {status === "checking" ? <RefreshCw size={14} className="animate-spin" /> : <Plug size={14} />}
                  {status === "checking" ? "Mengecek..." : "Cek Koneksi"}
                </span>
              </button>
            </div>

            {/* Status output */}
            {statusTxt && (
              <div style={{
                display: "flex", alignItems: "center", gap: ".6rem",
                marginTop: ".85rem",
                padding: ".65rem 1rem",
                borderRadius: "var(--r-sm)",
                background: status === "ok" ? "#f0fdf4" : status === "err" ? "#fef2f2" : "#fffbeb",
                border: `1px solid ${status === "ok" ? "#86efac" : status === "err" ? "#fecaca" : "#fde68a"}`,
                fontSize: ".82rem",
                fontWeight: 500,
                color: txtColor,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: dotColor, flexShrink: 0, display: "inline-block" }} />
                {statusTxt}
              </div>
            )}

            {/* Info box */}
            <div className="info-card">
              <div className="info-card-title" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><Server size={18} /> Cara Menjalankan Backend</div>
              <div className="info-card-body">
                <div>1. Buka terminal di folder project</div>
                <code className="code-block">$ python main.py</code>
                <div>2. Backend akan berjalan di <code style={{ fontFamily: "DM Mono, monospace", background: "var(--green-light)", padding: "1px 6px", borderRadius: 4, fontSize: ".75rem" }}>http://localhost:8000</code></div>
                <div>3. Klik <strong>Cek Koneksi</strong> untuk memverifikasi</div>
              </div>
            </div>

          </div>
        </div>

        {/* Info sistem */}
        <div className="card">
          <div className="card-head">
            <h2>ℹ️ Informasi Sistem</h2>
          </div>
          <div className="card-body">
            <div className="sys-grid">
              {[
                { lbl: "Aplikasi",  val: "SiPantau",               cls: "green"  },
                { lbl: "Versi",     val: "1.0.0",                   cls: "blue"   },
                { lbl: "Instansi",  val: "KLHK RI",                 cls: "green"  },
                { lbl: "Framework", val: "Next.js 14",              cls: "purple" },
                { lbl: "Platform",  val: "Tokopedia · Shopee · Lazada", cls: "orange" },
                { lbl: "Tahun",     val: "2025",                    cls: "blue"   },
              ].map(({ lbl, val, cls }) => (
                <div key={lbl} className={`sys-badge ${cls}`}>
                  <div className="sys-badge-lbl">{lbl}</div>
                  <div className="sys-badge-val">{val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
