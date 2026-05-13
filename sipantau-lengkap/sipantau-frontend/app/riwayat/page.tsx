"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar, { UserSession } from "@/components/Navbar";
import { FolderOpen, Package, RefreshCw, Download, AlertTriangle } from "lucide-react";

type Riwayat = {
  session_id: string; keyword: string; platforms: string;
  jumlah_data: number; status: string; file_excel: string;
  waktu: string; username?: string; user_divisi?: string;
};

const API = "http://localhost:8000";

const DIVISI_LABEL: Record<string, string> = {
  superadmin: "Admin",
  sekdit:     "Sekretariat Ditjen",
  pengawasan: "Pengawasan",
  pengaduan:  "Pengaduan",
};

export default function RiwayatPage() {
  const router = useRouter();
  const [user, setUser]     = useState<UserSession | null>(null);
  const [filter, setFilter] = useState("__own__");   // "__own__" | divisi name

  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!sessionStorage.getItem("sipantau_auth")) { router.push("/"); return; }
    const d = sessionStorage.getItem("sipantau_user");
    if (d) setUser(JSON.parse(d));
  }, [router]);

  function fetchData(currentFilter: string) {
    if (!user) return;
    setLoading(true); setError(false);
    let url: string;
    if (currentFilter === "__own__") {
      url = `${API}/api/riwayat?username=${user.username}`;
    } else if (currentFilter === "__all__") {
      url = `${API}/api/riwayat?view_all=true`;
    } else {
      url = `${API}/api/riwayat?divisi=${encodeURIComponent(currentFilter)}`;
    }
    fetch(url)
      .then(r => r.json())
      .then(d => setRiwayat(d.riwayat ?? []))
      .catch(() => { setRiwayat([]); setError(true); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (user) fetchData(filter); }, [user, filter]);

  const accessible = user?.accessible_divisi ?? [];
  const canExport  = user?.can_export !== false;
  const hasAccess  = accessible.length > 0;

  const totalProduk = riwayat.reduce((s, r) => s + (r.jumlah_data || 0), 0);

  return (
    <>
      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: ".75rem" }}>
          <div>
            <div className="bc">Sipantau / <span>Riwayat</span></div>
            <h1>Riwayat Pemantauan</h1>
            <p>{filter === "__own__" ? "Sesi pemantauan milikmu" : filter === "__all__" ? "Semua sesi pemantauan" : `Divisi: ${DIVISI_LABEL[filter] || filter}`}</p>
          </div>
          <div style={{ display: "flex", gap: ".5rem", alignItems: "center", flexWrap: "wrap" }}>
            {/* Divisi filter dropdown — only if has cross-divisi access */}
            {hasAccess && (
              <select
                value={filter}
                onChange={e => setFilter(e.target.value)}
                style={{ padding: ".35rem .85rem", borderRadius: 999, border: "1.5px solid var(--border)", fontSize: ".78rem", background: "var(--surface)", color: "var(--ink2)", fontFamily: "inherit", outline: "none", cursor: "pointer" }}
              >
                <option value="__own__">Milik Saya</option>
                {accessible.map(d => (
                  <option key={d} value={d}>{DIVISI_LABEL[d] || d}</option>
                ))}
                {user?.divisi === "superadmin" && <option value="__all__">Semua User</option>}
              </select>
            )}
            <button className="btn-sm" onClick={() => fetchData(filter)} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><RefreshCw size={14} /> Refresh</button>
          </div>
        </div>

        {riwayat.length > 0 && (
          <div style={{ display: "flex", gap: ".65rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[{ icon: <FolderOpen size={20} color="#15803d" />, val: riwayat.length, lbl: "Total Sesi" }, { icon: <Package size={20} color="#15803d" />, val: totalProduk, lbl: "Total Produk" }].map(({ icon, val, lbl }, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: ".65rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: ".65rem 1rem", boxShadow: "var(--shadow-xs)" }}>
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>{icon}</span>
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
            <h2 style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><FolderOpen size={18} /> Daftar Sesi Pemantauan</h2>
            {!loading && !error && <span style={{ fontSize: ".7rem", color: "var(--ink4)", fontWeight: 500 }}>{riwayat.length} sesi</span>}
          </div>

          {loading ? (
            <div className="card-body">
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ display: "flex", gap: ".75rem", marginBottom: ".65rem" }}>
                  {[15, 25, 20, 15].map((w, j) => <div key={j} className="skel" style={{ height: 18, width: `${w}%` }} />)}
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="card-body">
              <div className="alert-err" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><AlertTriangle size={16} /><span>Tidak bisa terhubung ke Backend.</span></div>
            </div>
          ) : (
            <div className="tbl-wrap">
              <table>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: "1.15rem" }}>Waktu</th>
                    {filter !== "__own__" && <th>User</th>}
                    {filter !== "__own__" && <th>Divisi</th>}
                    <th>Kata Kunci</th>
                    <th>Platform</th>
                    <th>Jumlah Data</th>
                    <th>Status</th>
                    {canExport && <th style={{ paddingRight: "1.15rem" }}>Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {riwayat.length === 0 ? (
                    <tr><td colSpan={9}><div className="empty"><div className="empty-i"><FolderOpen size={24} /></div><p>Belum ada riwayat.</p></div></td></tr>
                  ) : riwayat.map((r, i) => (
                    <tr key={i}>
                      <td className="td-g td-m" style={{ fontSize: ".68rem", paddingLeft: "1.15rem" }}>{r.waktu}</td>
                      {filter !== "__own__" && <td style={{ fontSize: ".75rem", fontFamily: "monospace", color: "var(--ink3)" }}>{r.username || "—"}</td>}
                      {filter !== "__own__" && <td><span style={{ fontSize: ".7rem", padding: ".15rem .5rem", borderRadius: 999, background: "var(--green-pale)", color: "var(--ink2)", fontWeight: 600 }}>{DIVISI_LABEL[r.user_divisi || ""] || r.user_divisi || "—"}</span></td>}
                      <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                      <td>
                        <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                          {r.platforms.split(",").map(p => {
                            const n = p.trim();
                            return <span key={p} className={`badge ${n === "tokopedia" ? "bt" : n === "shopee" ? "bs" : "bl"}`}>{n}</span>;
                          })}
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 700 }}>{r.jumlah_data.toLocaleString("id-ID")}</span><span style={{ fontSize: ".7rem", color: "var(--ink3)", marginLeft: ".3rem" }}>produk</span></td>
                      <td><span className="badge bk">{r.status}</span></td>
                      {canExport && (
                        <td style={{ paddingRight: "1.15rem" }}>
                          {r.file_excel
                            ? <a href={`${API}/api/export/download/${r.file_excel}`} className="btn-sm" style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}><Download size={14} /> Unduh</a>
                            : <span style={{ fontSize: ".7rem", color: "var(--ink4)" }}>—</span>}
                        </td>
                      )}
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