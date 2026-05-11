"use client";
// app/riwayat/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

type Riwayat = {
  session_id: string;
  keyword: string;
  platforms: string;
  jumlah_data: number;
  status: string;
  file_excel: string;
  waktu: string;
};

const API_URL = "http://localhost:8000";

export default function RiwayatPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin]   = useState(false);
  const [showAll, setShowAll]   = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("sipantau_auth")) { router.push("/"); return; }
    const userData = sessionStorage.getItem("sipantau_user");
    if (userData) {
      const u = JSON.parse(userData);
      setUsername(u.username);
      setIsAdmin(u.role === "admin");
    }
  }, [router]);

  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  function fetchData(all = false) {
    if (!username) return;
    setLoading(true); setError(false);
    const url = all
      ? `${API_URL}/api/riwayat`
      : `${API_URL}/api/riwayat?username=${username}`;
    fetch(url)
      .then(r => r.json())
      .then(data => setRiwayat(data.riwayat ?? []))
      .catch(() => { setRiwayat([]); setError(true); })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (username) fetchData(showAll);
  }, [username, showAll]);

  const totalProduk = riwayat.reduce((s, r) => s + (r.jumlah_data || 0), 0);

  return (
    <>
      <Navbar />
      <div className="wrap">

        <div className="phead" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: ".75rem" }}>
          <div>
            <div className="bc">SiPantau / <span>Riwayat</span></div>
            <h1>Riwayat Pemantauan</h1>
            <p>{showAll ? "Semua sesi pemantauan" : "Sesi pemantauan milikmu"}</p>
          </div>
          <div style={{ display: "flex", gap: ".5rem", flexShrink: 0, marginTop: ".2rem" }}>
            {isAdmin && (
              <button className="btn-sm" onClick={() => setShowAll(!showAll)}>
                {showAll ? "👤 Milikku" : "👥 Semua User"}
              </button>
            )}
            <button className="btn-sm" onClick={() => fetchData(showAll)}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {riwayat.length > 0 && (
          <div style={{ display: "flex", gap: ".65rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[
              { icon: "📁", val: riwayat.length, lbl: "Total Sesi" },
              { icon: "📦", val: totalProduk,     lbl: "Total Produk" },
            ].map(({ icon, val, lbl }) => (
              <div key={lbl} style={{
                display: "flex", alignItems: "center", gap: ".65rem",
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-sm)", padding: ".65rem 1rem",
                boxShadow: "var(--shadow-xs)",
              }}>
                <span style={{ fontSize: "1.05rem" }}>{icon}</span>
                <div>
                  <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--ink)", lineHeight: 1 }}>{val.toLocaleString("id-ID")}</div>
                  <div style={{ fontSize: ".67rem", color: "var(--ink3)", marginTop: ".15rem", fontWeight: 500 }}>{lbl}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="card">
          <div className="card-head">
            <h2>📁 Daftar Sesi Pemantauan</h2>
            {!loading && !error && (
              <span style={{ fontSize: ".7rem", color: "var(--ink4)", fontWeight: 500 }}>
                {riwayat.length} sesi tersimpan
              </span>
            )}
          </div>

          {loading ? (
            <div className="card-body">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: ".75rem", marginBottom: ".65rem" }}>
                  <div className="skel" style={{ height: 18, width: "15%" }} />
                  <div className="skel" style={{ height: 18, width: "25%" }} />
                  <div className="skel" style={{ height: 18, width: "20%" }} />
                  <div className="skel" style={{ height: 18, width: "15%" }} />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="card-body">
              <div className="alert-err">
                <span>⚠️</span>
                <span>Tidak bisa terhubung ke backend. Pastikan <code style={{ fontFamily: "DM Mono, monospace" }}>main.py</code> berjalan.</span>
              </div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: "1.15rem" }}>Waktu</th>
                    <th>Kata Kunci</th>
                    <th>Platform</th>
                    <th>Jumlah Data</th>
                    <th>Status</th>
                    <th style={{ paddingRight: "1.15rem" }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayat.length === 0 ? (
                    <tr>
                      <td colSpan={6}>
                        <div className="empty">
                          <div className="empty-i">📂</div>
                          <p>Belum ada riwayat pemantauan.</p>
                          <p style={{ marginTop: ".3rem", fontSize: ".75rem" }}>Mulai dari menu <strong>Pemantauan</strong>.</p>
                        </div>
                      </td>
                    </tr>
                  ) : riwayat.map((r, i) => (
                    <tr key={i}>
                      <td className="td-g td-m" style={{ fontSize: ".68rem", paddingLeft: "1.15rem" }}>{r.waktu}</td>
                      <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                      <td>
                        <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                          {r.platforms.split(",").map(p => {
                            const name = p.trim();
                            const cls = name === "tokopedia" ? "bt" : name === "shopee" ? "bs" : "bl";
                            return <span key={p} className={`badge ${cls}`}>{name}</span>;
                          })}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 700, color: "var(--ink)" }}>{r.jumlah_data.toLocaleString("id-ID")}</span>
                        <span style={{ fontSize: ".7rem", color: "var(--ink3)", marginLeft: ".3rem" }}>produk</span>
                      </td>
                      <td><span className="badge bk">{r.status}</span></td>
                      <td style={{ paddingRight: "1.15rem" }}>
                        {r.file_excel ? (
                          <a href={`${API_URL}/api/export/download/${r.file_excel}`} className="btn-sm"
                            style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                            ⬇ Unduh Excel
                          </a>
                        ) : <span style={{ fontSize: ".7rem", color: "var(--ink4)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </>
  );
}