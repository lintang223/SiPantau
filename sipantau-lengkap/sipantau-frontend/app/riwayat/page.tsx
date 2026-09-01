"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar, { UserSession } from "@/components/Navbar";
import { FolderOpen, Package, RefreshCw, Download, AlertTriangle } from "lucide-react";
import { apiFetch, API_URL } from "@/lib/api";
import { DIVISI_LABEL } from "@/lib/constants";

type Riwayat = {
  session_id: string; keyword: string; platforms: string;
  jumlah_data: number; status: string; file_excel: string;
  waktu: string; username?: string; user_divisi?: string;
};

export default function RiwayatPage() {
  const router = useRouter();
  const [user, setUser]     = useState<UserSession | null>(null);
  const [filter, setFilter] = useState("__own__");
  const [riwayat, setRiwayat] = useState<Riwayat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!localStorage.getItem("sipantau_auth")) { router.push("/"); return; }
    const d = localStorage.getItem("sipantau_user");
    if (d) setUser(JSON.parse(d));
  }, [router]);

  function fetchData(currentFilter: string) {
    if (!user) return;
    setLoading(true); setError(false);
    let path: string;
    if (currentFilter === "__own__")  path = `/api/riwayat?username=${user.username}`;
    else if (currentFilter === "__all__") path = `/api/riwayat?view_all=true`;
    else path = `/api/riwayat?divisi=${encodeURIComponent(currentFilter)}`;

    apiFetch(path)
      .then(r => r.json())
      .then(d => setRiwayat(d.riwayat ?? []))
      .catch(err => { setRiwayat([]); if (!(err instanceof Error && err.message.includes("Sesi"))) setError(true); })
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (user) fetchData(filter); }, [user, filter]);

  // Download Excel dengan token (fetch + blob) dan generate dari database
  const handleDownload = async (session_id: string, filename: string, keyword: string) => {
    setDownloadingId(filename);
    try {
      const res = await apiFetch(`/api/export`, {
        method: "POST",
        body: JSON.stringify({ session_id, keyword })
      });
      if (!res.ok) throw new Error("Gagal mengunduh file");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Gagal mengunduh file.");
    } finally {
      setDownloadingId(null);
    }
  };

  const accessible  = user?.accessible_divisi ?? [];
  const canExport   = user?.can_export !== false;
  const hasAccess   = accessible.length > 0;
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
            {hasAccess && (
              <select value={filter} onChange={e => setFilter(e.target.value)}
                style={{ padding: ".35rem .85rem", borderRadius: 999, border: "1.5px solid var(--border)", fontSize: ".78rem", background: "var(--surface)", color: "var(--ink2)", fontFamily: "inherit", outline: "none", cursor: "pointer" }}>
                <option value="__own__">Milik Saya</option>
                {accessible.map(d => <option key={d} value={d}>{DIVISI_LABEL[d] || d}</option>)}
                {user?.divisi === "sekditjen" && <option value="__all__">Semua User</option>}
              </select>
            )}
            <button className="btn-sm" onClick={() => fetchData(filter)} style={{ display: "flex", alignItems: "center", gap: ".4rem" }}>
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        {riwayat.length > 0 && (
          <div style={{ display: "flex", gap: ".65rem", marginBottom: "1rem", flexWrap: "wrap" }}>
            {[{ icon: <FolderOpen size={20} color="#15803d" />, val: riwayat.length, lbl: "Total Sesi" }, { icon: <Package size={20} color="#15803d" />, val: totalProduk, lbl: "Total Produk" }].map(({ icon, val, lbl }, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: ".65rem", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--r-sm)", padding: ".65rem 1rem", boxShadow: "var(--shadow-xs)" }}>
                <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>
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
                    <th>User</th>
                    <th>Divisi</th>
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
                      <td style={{ fontSize: ".75rem", fontFamily: "monospace", color: "var(--ink3)" }}>{r.username || "—"}</td>
                      <td><span style={{ fontSize: ".7rem", padding: ".15rem .5rem", borderRadius: 999, background: "var(--green-pale)", color: "var(--ink2)", fontWeight: 600 }}>{DIVISI_LABEL[r.user_divisi || ""] || r.user_divisi || "—"}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.keyword}</td>
                      <td>
                        <div style={{ display: "flex", gap: ".3rem", flexWrap: "wrap" }}>
                          {r.platforms.split(",").map(p => {
                            const n = p.trim().toLowerCase();
                            return <span key={p} className={`badge bt`}>{p.trim()}</span>;
                          })}
                        </div>
                      </td>
                      <td><span style={{ fontWeight: 700 }}>{r.jumlah_data.toLocaleString("id-ID")}</span><span style={{ fontSize: ".7rem", color: "var(--ink3)", marginLeft: ".3rem" }}>produk</span></td>
                      <td><span className="badge bk">{r.status}</span></td>
                      {canExport && (
                        <td style={{ paddingRight: "1.15rem" }}>
                          {r.file_excel ? (
                            <button
                              className="btn-sm"
                              style={{ display: "inline-flex", alignItems: "center", gap: ".3rem" }}
                              disabled={downloadingId === r.file_excel}
                              onClick={() => handleDownload(r.session_id, r.file_excel, r.keyword)}
                            >
                              <Download size={14} />
                              {downloadingId === r.file_excel ? "..." : "Unduh"}
                            </button>
                          ) : <span style={{ fontSize: ".7rem", color: "var(--ink4)" }}>—</span>}
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