"use client";
// app/scraping/page.tsx

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Settings, Activity, ClipboardList, AlertTriangle, CheckCircle, Search, FolderOpen, Trash2, Download } from "lucide-react";
import { API_URL, AGENT_URL, apiFetch } from "@/lib/api";

type Produk = {
  nama: string;
  harga: number;
  platform: string;
  rating: number;
  terjual: string;
  url: string;
  waktu: string;
};

export default function ScrapingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!localStorage.getItem("sipantau_auth")) { router.push("/"); return; }
    const userData = localStorage.getItem("sipantau_user");
    if (userData) setUsername(JSON.parse(userData).username);
  }, [router]);

  const [keyword, setKeyword]     = useState("");
  const [pages, setPages]         = useState("3");
  const [targetCount, setTargetCount] = useState("50");
  const [hargaThreshold, setHargaThreshold] = useState("350000");
  const [platforms] = useState({ tokopedia: true });
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState<Produk[]>([]);
  const [log, setLog]             = useState<string[]>([]);
  const [done, setDone]           = useState(false);
  const [prog, setProg]           = useState({ tokopedia: 0 });
  const [fileExcel, setFileExcel] = useState("");
  const [agentJobId, setAgentJobId] = useState("");
  const [agentActive, setAgentActive] = useState(false);
  const [browserReady, setBrowserReady] = useState(false);
  const [browserMessage, setBrowserMessage] = useState("Memeriksa browser...");
  const [pollIntervalId, setPollIntervalId] = useState<NodeJS.Timeout | null>(null);
  const logRef                    = useRef<HTMLDivElement>(null);
  const pollRef                   = useRef<NodeJS.Timeout | null>(null); // agar bisa diakses dari restore

  // ── Restore state dari sessionStorage saat komponen di-mount kembali ──────
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("sipantau_scrape_state");
      if (saved) {
        const s = JSON.parse(saved);
        if (s.keyword)   setKeyword(s.keyword);
        if (s.loading !== undefined) setLoading(s.loading);
        if (s.done !== undefined)    setDone(s.done);
        if (s.results)   setResults(s.results);
        if (s.log)       setLog(s.log);
        if (s.prog)      setProg(s.prog);
        if (s.fileExcel) setFileExcel(s.fileExcel);
        if (s.agentJobId) setAgentJobId(s.agentJobId);
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  // ── Simpan state ke sessionStorage setiap kali berubah ───────────────────
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("sipantau_scrape_state", JSON.stringify({
      keyword, loading, done, results, log, prog, fileExcel, agentJobId
    }));
  }, [hydrated, keyword, loading, done, results, log, prog, fileExcel, agentJobId]);

  useEffect(() => {
    // Cek status agent setiap 3 detik
    const checkAgent = async () => {
      try {
        const res = await fetch(`${AGENT_URL}/ping`);
        if (res.ok) {
          const data = await res.json();
          setAgentActive(true);
          setBrowserReady(data.browser_ready ?? true);
          setBrowserMessage(data.browser_message ?? "Browser siap.");
        } else {
          setAgentActive(false);
          setBrowserReady(false);
        }
      } catch {
        setAgentActive(false);
        setBrowserReady(false);
        setBrowserMessage("Agent tidak terdeteksi. Pastikan SiPantau_Agent.exe sedang berjalan.");
      }
    };
    checkAgent();
    const intv = setInterval(checkAgent, 3000);
    return () => clearInterval(intv);
  }, []);



  function addLog(msg: string, type: "ok" | "info" | "warn" = "ok") {
    const time = new Date().toLocaleTimeString("id-ID");
    setLog(prev => [...prev, `${type}||[${time}] ${msg}`]);
    setTimeout(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, 50);
  }

  // Membersihkan polling saat unmount
  useEffect(() => {
    return () => {
      // JANGAN stop polling saat unmount — biarkan job tetap berjalan
      // Polling akan di-restore saat kembali ke halaman ini
    };
  }, [pollIntervalId]);

  // ── Re-attach polling jika ada job yang sedang berjalan saat kembali ke halaman ──
  useEffect(() => {
    if (!hydrated || !agentJobId || done || !loading) return;
    // Jika sudah ada jobId (dari restore) dan masih loading, mulai polling lagi
    const intv = setInterval(async () => {
      try {
        const statusRes = await fetch(`${AGENT_URL}/status/${agentJobId}`);
        if (!statusRes.ok) return;
        const statusData = await statusRes.json();
        setProg(prev => ({ ...prev, tokopedia: Math.min(statusData.total * 5, 95) }));
        setLog(prev => {
          const lastMsg = prev[prev.length - 1];
          if (!lastMsg?.includes(statusData.message)) {
            return [...prev, `info||[${new Date().toLocaleTimeString("id-ID")}] ${statusData.message}`];
          }
          return prev;
        });
        if (statusData.status === "done" || statusData.status === "error") {
          clearInterval(intv);
          setPollIntervalId(null);
          if (statusData.status === "error") {
            setLog(prev => [...prev, `warn||Agent error: ${statusData.message}`]);
            setLoading(false);
            return;
          }
          setProg(prev => ({ ...prev, tokopedia: 100 }));
          const resultRes  = await fetch(`${AGENT_URL}/results/${agentJobId}`);
          const resultData = await resultRes.json();
          const mapped: Produk[] = (resultData.results || []).map((r: Record<string, unknown>) => ({
            nama:     r.nama_produk  as string,
            harga:    r.harga        as number,
            platform: r.platform     as string,
            rating:   r.rating       as number,
            terjual:  r.terjual      as string,
            url:      r.url_produk   as string,
            waktu:    r.waktu_scrape as string,
          }));
          setResults(mapped);
          setFileExcel(resultData.file_excel || "");
          setDone(true);
          setLoading(false);
        }
      } catch { /* abaikan error jaringan saat polling */ }
    }, 2000);
    setPollIntervalId(intv);
    pollRef.current = intv;
    return () => clearInterval(intv);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, agentJobId]);

  function handleReset() {
    if (loading) return; // jangan reset saat masih berjalan
    setLoading(false); setDone(false); setResults([]); setLog([]); setFileExcel(""); setAgentJobId("");
    setProg({ tokopedia: 0 });
    localStorage.removeItem("sipantau_scrape_state");
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    if (!selected.length) { alert("Pilih minimal satu platform!"); return; }

    setLoading(true); setDone(false); setResults([]); setLog([]); setFileExcel(""); setAgentJobId("");
    setProg({ tokopedia: 0 });

    addLog("Memulai sesi pemantauan...", "info");
    addLog(`Kata kunci: "${keyword}" — ${selected.join(", ")}`, "info");

    if (agentActive) {
      // Alur Local Agent (Tokopedia)
      let allResults: Produk[] = [];

      for (const plat of selected) {
        try {
          addLog(`[${plat.toUpperCase()}] Memulai Agent...`, "info");
          const res = await fetch(`${AGENT_URL}/scrape`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              keyword,
              platform: plat,
              max_pages: parseInt(pages),
              target_product_count: parseInt(targetCount),
              harga_threshold: parseInt(hargaThreshold),
              username,
              backend_url: API_URL
            }),
          });
          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.detail || `Gagal memulai agent untuk ${plat}`);
          }
          
          const data = await res.json();
          const jobId = data.job_id;
          setAgentJobId(jobId);
          addLog(`[${plat.toUpperCase()}] Agent mulai bekerja (Job ID: ${jobId.split('_')[1]})`, "ok");

          let isDone = false;
          while (!isDone) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
              const statusRes = await fetch(`${AGENT_URL}/status/${jobId}`);
              if (!statusRes.ok) continue;
              const statusData = await statusRes.json();
              
              setProg(prev => ({ ...prev, [plat]: Math.min(statusData.total * 5, 95) }));
              
              setLog(prev => {
                const lastMsg = prev[prev.length - 1];
                if (!lastMsg?.includes(statusData.message)) {
                   return [...prev, `info||[${new Date().toLocaleTimeString("id-ID")}] [${plat.toUpperCase()}] ${statusData.message}`];
                }
                return prev;
              });

              if (statusData.status === "done" || statusData.status === "error") {
                isDone = true;
                setAgentJobId("");
                
                if (statusData.status === "error") {
                  addLog(`❌ Agent error (${plat}): ${statusData.message}`, "warn");
                  continue; // Lanjut ke platform berikutnya
                }

                setProg(prev => ({ ...prev, [plat]: 100 }));
                const resultRes = await fetch(`${AGENT_URL}/results/${jobId}`);
                const resultData = await resultRes.json();
                
                addLog(`✅ Selesai ${plat.toUpperCase()} — ${resultData.total} produk ditemukan`, "ok");
                
                if (resultData.upload_status === "ok") {
                  addLog(`[${plat.toUpperCase()}] 📤 Data berhasil dikirim ke server.`, "ok");
                } else if (resultData.upload_status === "error") {
                  addLog(`[${plat.toUpperCase()}] ⚠️ Gagal kirim ke server (tersimpan di lokal).`, "warn");
                }

                if (resultData.file_excel) {
                  addLog(`📁 File Excel lokal: ${resultData.file_excel}`, "info");
                  setFileExcel(resultData.file_excel);
                }
                
                const mapped: Produk[] = (resultData.results || []).map((r: Record<string, unknown>) => ({
                  nama:     r.nama_produk  as string,
                  harga:    r.harga        as number,
                  platform: (r.platform as string) || plat.toUpperCase(),
                  rating:   r.rating       as number,
                  terjual:  r.terjual      as string,
                  url:      r.url_produk   as string,
                  waktu:    r.waktu_scrape as string,
                }));

                allResults = [...allResults, ...mapped];
                setResults(allResults);
              }
            } catch (e) {
              console.error("Polling error", e);
            }
          }
        } catch (err: any) {
          addLog(`❌ Error Agent (${plat}): ${err.message}`, "warn");
        }
      }
      setDone(true);
      setLoading(false);
    } else {
      // Alur Fallback Backend (Tokopedia jika agent mati)
      try {
        const res = await fetch(`${API_URL}/api/scrape`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            platforms: selected,
            max_pages: parseInt(pages),
            target_product_count: parseInt(targetCount),
            harga_threshold: parseInt(hargaThreshold),
            username,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || "Gagal terhubung ke backend");
        }
        const data = await res.json();

        const newProg = { ...prog };
        selected.forEach(p => { (newProg as Record<string, number>)[p] = 100; });
        setProg(newProg);

        selected.forEach(p => addLog(`[${p.toUpperCase()}] Selesai — ${data.total} produk ditemukan`));
        addLog(`✅ Total listing ditemukan: ${data.total}`, "ok");

        const mapped: Produk[] = (data.results || []).map((r: Record<string, unknown>) => ({
          nama:     r.nama_produk  as string,
          harga:    r.harga        as number,
          platform: r.platform     as string,
          rating:   r.rating       as number,
          terjual:  r.terjual      as string,
          url:      r.url_produk   as string,
          waktu:    r.waktu_scrape as string,
        }));

        setResults(mapped);
        setFileExcel(data.file_excel || "");
        setDone(true);
      } catch (err: any) {
        addLog(`❌ ${err.message || "Tidak bisa terhubung ke backend"}`, "warn");
      } finally {
        setLoading(false);
      }
    }
  }

  const selectedPlats = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
  const badgeClass = () => "bt";

  return (
    <>
      <Navbar />
      <div className="wrap">

        <div className="phead">
          <div className="bc">Sipantau / <span>Pemantauan</span></div>
          <h1>Pemantauan Market Place</h1>
          <p>Pantau Listing Produk Dari Tokopedia secara Otomatis</p>
        </div>

        {/* ─── Banner: Agent tidak berjalan ─── */}
        {!agentActive && platforms.tokopedia && (
          <div className="warn-card">
            <div className="warn-card-title">⚠️ Aplikasi Agent Belum Berjalan</div>
            <p className="warn-card-desc">
              Untuk Scrapping Tokopedia. Perlu Aplikasi Kecil Yang Berjalan di Komputer Anda - Cukup 1 Klik.
            </p>
            <div className="warn-card-steps">
              <div>1️⃣&nbsp; Klik tombol download AGENT di bawah ini.</div>
              <div>2️⃣&nbsp; Buka file yang ter download → klik 2x SiPantau_Agent.exe</div>
              <div>3️⃣&nbsp; Tunggu beberapa menit - browser akan tebuka sendiri</div>
            </div>
            <a
              href="/downloads/SiPantau_Agent.exe"
              download
              className="btn-download"
            >
              ⬇ Download Aplikasi Agent (.exe)
            </a>
          </div>
        )}

        {/* ─── Banner: Agent aktif tapi browser belum siap ─── */}
        {agentActive && !browserReady && (
          <div style={{ background: "#EEF2FF", color: "#3730A3", padding: "1.2rem", borderRadius: "12px", marginBottom: "1.2rem", border: "1.5px solid #A5B4FC", display: "flex", alignItems: "center", gap: "1rem" }}>
            <div style={{ fontSize: "2rem", flexShrink: 0 }}>⏳</div>
            <div>
              <strong style={{ display: "block", marginBottom: ".2rem" }}>Sedang Menyiapkan Browser Otomatis...</strong>
              <div style={{ fontSize: ".85rem", opacity: .85 }}>{browserMessage}</div>
              <div style={{ fontSize: ".8rem", marginTop: ".4rem", opacity: .7 }}>Ini hanya terjadi satu kali. Browser akan terbuka otomatis setelah selesai.</div>
            </div>
          </div>
        )}

        {/* ─── Banner: Agent & browser siap ─── */}
        {agentActive && browserReady && (
          <div style={{ background: "#F0FDF4", color: "#166534", padding: ".8rem 1.2rem", borderRadius: "10px", marginBottom: "1.2rem", border: "1.5px solid #86EFAC", display: "flex", alignItems: "center", gap: ".8rem", fontSize: ".9rem" }}>
            <span style={{ fontSize: "1.3rem" }}>✅</span>
            <span><b>Agent aktif dan browser siap.</b> Anda bisa memulai pemantauan.</span>
          </div>
        )}



        <div className="card" style={{ marginBottom: ".85rem" }}>
          <div className="card-head">
            <h2 style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Settings size={20} /> Parameter Pemantauan</h2>
            {done && (
              <span style={{ fontSize: ".7rem", color: "var(--green-mid)", fontWeight: 600 }}>
                ✓ Selesai — {results.length} listing
              </span>
            )}
          </div>
          <div className="card-body">
            <form onSubmit={handleScrape}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem", marginBottom: "1rem", alignItems: "start" }}>
                <div className="fgroup" style={{ display: "flex", flexDirection: "column" }}>
                  <label>Kata Kunci Pencarian</label>
                  <input className="finput" value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="Contoh: kayu jati, gading, sisik trenggiling..."
                    required autoFocus />
                </div>
                <div className="fgroup" style={{ display: "flex", flexDirection: "column" }}>
                  <label>Load More (Tokopedia)</label>
                  <select className="finput" value={targetCount} onChange={e => setTargetCount(e.target.value)}>
                    {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}x Klik</option>)}
                  </select>
                  <small style={{ color: "var(--ink3)", fontSize: ".7rem", marginTop: ".3rem", lineHeight: 1.4 }}>
                    Sesi berikutnya lanjut dari produk yang belum pernah di-scrap.
                  </small>
                </div>
                <div className="fgroup" style={{ display: "flex", flexDirection: "column" }}>
                  <label>Ambang Batas Harga (Threshold)</label>
                  <div style={{ display: "flex", alignItems: "stretch" }}>
                    <span style={{ padding: "0 0.85rem", display: "flex", alignItems: "center", background: "var(--surface2)", border: "1.5px solid var(--border)", borderRight: "none", borderRadius: "6px 0 0 6px", fontSize: ".85rem", color: "var(--ink2)", fontWeight: 600 }}>Rp</span>
                    <input type="number" className="finput" value={hargaThreshold}
                      onChange={e => setHargaThreshold(e.target.value)}
                      style={{ borderRadius: "0 6px 6px 0", flex: 1 }}
                      min={0} step={50000} />
                  </div>
                  <small style={{ color: "var(--ink3)", fontSize: ".7rem", marginTop: ".3rem", lineHeight: 1.4 }}>
                    Produk di bawah harga ini akan di-skip. &ge; Rp1jt dilabeli <b>Mahal</b>.
                  </small>
                </div>
              </div>

              <div style={{ marginBottom: ".95rem" }}>
                <label style={{ fontSize: ".7rem", fontWeight: 700, color: "var(--ink2)", letterSpacing: ".4px", textTransform: "uppercase", display: "block", marginBottom: ".5rem" }}>
                  Platform Tujuan
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: ".5rem", padding: ".45rem .85rem", background: "#e8f7e9", border: "1.5px solid #86efac", borderRadius: 8, fontSize: ".85rem", fontWeight: 600, color: "#15803d" }}>
                    <img src="/tokopedia.png" alt="Tokopedia" width={20} height={20} style={{ objectFit: "contain" }} />
                    Tokopedia
                    <CheckCircle size={14} color="#22c55e" />
                  </div>
                  <span style={{ fontSize: ".72rem", color: "var(--ink3)", fontStyle: "italic" }}>Platform eksklusif</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="submit"
                  className="btn-green"
                  disabled={loading || (agentActive && !browserReady)}
                  style={{ minWidth: 180 }}
                  title={agentActive && !browserReady ? browserMessage : ""}
                >
                  {loading
                      ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Search size={16} className="animate-spin" /> Sedang memantau...</span>
                      : agentActive && !browserReady
                      ? <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Search size={16} className="animate-spin" /> Menyiapkan browser...</span>
                      : <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Search size={16} /> Mulai Pemantauan</span>}
                </button>

                {loading && agentJobId && (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch(`${AGENT_URL}/cancel/${agentJobId}`, { method: "POST" });
                        if (res.ok) {
                          setLoading(false);
                          setDone(true);
                          setAgentJobId("");
                        } else {
                          alert("Gagal membatalkan pemantauan.");
                        }
                      } catch (e) {
                        if (window.confirm("Gagal terhubung ke Agent. Agent mungkin sudah tertutup atau mati.\n\nApakah Anda ingin membersihkan pemantauan yang macet (force clear)?")) {
                           setLoading(false);
                           setDone(true);
                           setAgentJobId("");
                        }
                      }
                    }}
                    style={{ padding: ".65rem 1.3rem", borderRadius: 6, background: "#fef2f2", border: "1px solid #ef4444", color: "#dc2626", cursor: "pointer", fontWeight: 700, fontSize: ".875rem", transition: "all 0.2s" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><AlertTriangle size={16} /> Batalkan Pemantauan</span>
                  </button>
                )}

                {(done || results.length > 0) && !loading && (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`${AGENT_URL}/open-output-folder`);
                          if (!res.ok) alert("Gagal membuka folder. Pastikan SiPantau_Agent berjalan.");
                        } catch {
                          alert("Gagal terhubung ke Agent.");
                        }
                      }}
                      style={{ padding: ".55rem 1rem", border: "1px solid #22c55e", borderRadius: 6, background: "#f0fdf4", cursor: "pointer", fontSize: ".85rem", color: "#166534", fontWeight: 600 }}
                    >
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><FolderOpen size={16} /> Buka Folder Hasil (Screenshot)</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      style={{ padding: ".55rem 1rem", border: "1px solid #d1d5db", borderRadius: 6, background: "#f3f4f6", cursor: "pointer", fontSize: ".85rem", color: "#374151", fontWeight: 600 }}
                    >
                      <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Trash2 size={16} /> Bersihkan</span>
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>

        {(loading || done) && (
          <div className="card" style={{ marginBottom: ".85rem" }}>
            <div className="card-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><Activity size={20} /> Progress Pemantauan</h2>
              {loading && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: ".4rem", fontSize: ".7rem", color: "var(--green-mid)", fontWeight: 600 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--green-vivid)", animation: "pulse-nav 1.5s ease-in-out infinite", flexShrink: 0, display: "inline-block" }} />
                  Memantau...
                </span>
              )}
            </div>
            <div className="card-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".85rem", marginBottom: ".85rem" }}>
                {selectedPlats.map(p => (
                  <div key={p} className="prog-wrap" style={{ margin: 0 }}>
                    <div className="prog-lbl">
                      <span>{p.charAt(0).toUpperCase() + p.slice(1)}</span>
                      <span>{(prog as Record<string, number>)[p] ?? 0}%</span>
                    </div>
                    <div className="prog-bar">
                      <div className="prog-fill" style={{ width: `${(prog as Record<string, number>)[p] ?? 0}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="logbox" ref={logRef}>
                {log.map((l, i) => {
                  const [type, msg] = l.split("||");
                  return <p key={i} className={type === "warn" ? "lwarn" : type === "info" ? "linfo" : "lok"}>{msg}</p>;
                })}
              </div>
            </div>
          </div>
        )}

        {results.length > 0 && (
          <div className="card">
            <div className="card-head">
              <h2 style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><ClipboardList size={20} /> Hasil Pemantauan</h2>
              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                <span style={{ fontSize: ".72rem", fontWeight: 700, padding: ".2rem .65rem", borderRadius: 99, background: "rgba(74,222,128,0.15)", color: "#86efac", border: "1px solid #4ade80" }}>
                  {results.length} listing
                </span>
                {fileExcel && (
                  <button
                    onClick={async () => {
                      try {
                        let res = await apiFetch(`/api/export/download/${fileExcel}`);
                        let blob: Blob;
                        if (!res.ok) {
                          // Jika gagal dari backend (misal nama file beda karena versi Agent lama), coba dari Agent
                          if (agentJobId) {
                            const agentRes = await fetch(`${AGENT_URL}/download/${agentJobId}`);
                            if (!agentRes.ok) throw new Error("Gagal mengunduh dari server & agent");
                            blob = await agentRes.blob();
                          } else {
                            throw new Error("Gagal mengunduh");
                          }
                        } else {
                          blob = await res.blob();
                        }
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = fileExcel;
                        document.body.appendChild(a);
                        a.click();
                        window.URL.revokeObjectURL(url);
                      } catch (e) {
                        alert("Gagal mengunduh excel");
                      }
                    }}
                    className="btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", border: "none", cursor: "pointer" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Download size={14} /> Unduh Excel (Lokal)</span>
                  </button>
                )}
                {agentJobId && done && (
                  <a
                    href={`${AGENT_URL}/download/${agentJobId}`}
                    className="btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", textDecoration: "none", background: "var(--green)", color: "white", border: "1px solid var(--green)" }}
                    target="_blank" rel="noopener noreferrer"
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Download size={14} /> Unduh Excel (Lokal Agent)</span>
                  </a>
                )}
              </div>
            </div>
            <div className="card-body tbl-wrap" style={{ padding: 0 }}>
              <table>
                <thead>
                  <tr>
                    <th style={{ paddingLeft: "1.15rem" }}>No</th>
                    <th>Nama Produk</th>
                    <th>Harga</th>
                    <th>Platform</th>
                    <th>Rating</th>
                    <th>Terjual</th>
                    <th style={{ paddingRight: "1.15rem" }}>Waktu</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, i) => {
                    const isExpensive = r.harga >= parseInt(hargaThreshold);
                    return (
                    <tr key={i} style={isExpensive ? { background: "rgba(255, 0, 0, 0.05)" } : {}}>
                      <td className="td-g" style={{ paddingLeft: "1.15rem" }}>{i + 1}</td>
                      <td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <a href={r.url} target="_blank" rel="noopener noreferrer"
                          style={{ color: "var(--ink)", textDecoration: "none", fontWeight: 500 }}
                          onMouseEnter={e => (e.currentTarget.style.color = "var(--green)")}
                          onMouseLeave={e => (e.currentTarget.style.color = "var(--ink)")}>
                          {r.nama}
                        </a>
                      </td>
                      <td className="td-m" style={{ fontWeight: 600, color: isExpensive ? "#D92D20" : "var(--ink)" }}>
                        Rp {r.harga.toLocaleString("id-ID")}
                        {isExpensive && <span style={{ marginLeft: "6px", fontSize: "0.65rem", padding: "2px 6px", background: "#FEE4E2", color: "#D92D20", borderRadius: "10px" }}>🚨 Mahal</span>}
                      </td>
                      <td><span className={`badge ${badgeClass()}`}>{r.platform}</span></td>
                      <td className="td-g">
                        {r.rating > 0 ? <span>⭐ {r.rating}</span> : <span style={{ color: "var(--border-mid)" }}>—</span>}
                      </td>
                      <td className="td-g">{r.terjual || "—"}</td>
                      <td className="td-g td-m" style={{ fontSize: ".67rem", paddingRight: "1.15rem" }}>{r.waktu}</td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </>
  );
}