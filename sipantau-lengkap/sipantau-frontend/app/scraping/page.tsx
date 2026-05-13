"use client";
// app/scraping/page.tsx

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { Settings, Activity, ClipboardList, AlertTriangle, CheckCircle, Search, FolderOpen, Trash2, Download } from "lucide-react";

type Produk = {
  nama: string;
  harga: number;
  platform: string;
  rating: number;
  terjual: string;
  url: string;
  waktu: string;
};

const API_URL = "http://localhost:8000";

export default function ScrapingPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  useEffect(() => {
    if (!sessionStorage.getItem("sipantau_auth")) { router.push("/"); return; }
    const userData = sessionStorage.getItem("sipantau_user");
    if (userData) setUsername(JSON.parse(userData).username);
  }, [router]);

  const [keyword, setKeyword]     = useState("");
  const [pages, setPages]         = useState("3");
  const [targetCount, setTargetCount] = useState("50");
  const [hargaThreshold, setHargaThreshold] = useState("350000");
  const [platforms, setPlatforms] = useState({ tokopedia: true, shopee: false, lazada: false });
  const [loading, setLoading]     = useState(false);
  const [results, setResults]     = useState<Produk[]>([]);
  const [log, setLog]             = useState<string[]>([]);
  const [done, setDone]           = useState(false);
  const [prog, setProg]           = useState({ tokopedia: 0, shopee: 0, lazada: 0 });
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
      const saved = sessionStorage.getItem("sipantau_scrape_state");
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
    sessionStorage.setItem("sipantau_scrape_state", JSON.stringify({
      keyword, loading, done, results, log, prog, fileExcel, agentJobId
    }));
  }, [hydrated, keyword, loading, done, results, log, prog, fileExcel, agentJobId]);

  useEffect(() => {
    // Cek status agent setiap 3 detik
    const checkAgent = async () => {
      try {
        const res = await fetch('http://localhost:7777/ping');
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
        const statusRes = await fetch(`http://localhost:7777/status/${agentJobId}`);
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
          const resultRes  = await fetch(`http://localhost:7777/results/${agentJobId}`);
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
    setProg({ tokopedia: 0, shopee: 0, lazada: 0 });
    sessionStorage.removeItem("sipantau_scrape_state");
  }

  async function handleScrape(e: React.FormEvent) {
    e.preventDefault();
    const selected = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
    if (!selected.length) { alert("Pilih minimal satu platform!"); return; }

    setLoading(true); setDone(false); setResults([]); setLog([]); setFileExcel(""); setAgentJobId("");
    setProg({ tokopedia: 0, shopee: 0, lazada: 0 });

    addLog("Memulai sesi pemantauan...", "info");
    addLog(`Kata kunci: "${keyword}" — ${selected.join(", ")}`, "info");

    if (platforms.tokopedia && agentActive) {
      // Alur Local Agent (Tokopedia)
      try {
        const res = await fetch("http://localhost:7777/scrape", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            keyword,
            max_pages: parseInt(pages),
            target_product_count: parseInt(targetCount),
            harga_threshold: parseInt(hargaThreshold),
            username,
            backend_url: API_URL
          }),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.detail || "Gagal memulai agent");
        }
        
        const data = await res.json();
        const jobId = data.job_id;
        setAgentJobId(jobId);
        addLog(`Agent mulai bekerja (Job ID: ${jobId.split('_')[1]})`, "ok");

        // Mulai polling
        const intv = setInterval(async () => {
          try {
            const statusRes = await fetch(`http://localhost:7777/status/${jobId}`);
            if (!statusRes.ok) return;
            const statusData = await statusRes.json();
            
            // Update progress & log message
            setProg(prev => ({ ...prev, tokopedia: Math.min(statusData.total * 5, 95) }));
            
            // Add unique log message to prevent spam
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
                addLog(`❌ Agent error: ${statusData.message}`, "warn");
                setLoading(false);
                return;
              }

              // Jika selesai, ambil resultnya
              setProg(prev => ({ ...prev, tokopedia: 100 }));
              const resultRes = await fetch(`http://localhost:7777/results/${jobId}`);
              const resultData = await resultRes.json();
              
              addLog(`✅ Selesai — ${resultData.total} produk ditemukan`, "ok");
              
              // Pesan status upload
              if (resultData.upload_status === "ok") {
                addLog("📤 Data berhasil dikirim ke server & tersimpan di database.", "ok");
              } else if (resultData.upload_status === "error") {
                addLog("⚠️ Gagal kirim ke server — tetapi data SUDAH tersimpan di file Excel lokal (folder output/ di samping Agent.exe).", "warn");
              }

              if (resultData.file_excel) {
                addLog(`📁 File Excel tersimpan: ${resultData.file_excel}`, "info");
              }
              
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
              setDone(true);
              setLoading(false);
            }
          } catch (e) {
            console.error("Polling error", e);
          }
        }, 3000);
        
        setPollIntervalId(intv);

      } catch (err: any) {
        addLog(`❌ Error Agent: ${err.message}`, "warn");
        setLoading(false);
      }
    } else {
      // Alur Fallback Backend (Shopee, Lazada, atau Tokopedia jika agent mati)
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

        if (!res.ok) throw new Error("Gagal terhubung ke backend");
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
      } catch {
        addLog("❌ Tidak bisa terhubung ke backend. Pastikan main.py berjalan.", "warn");
      } finally {
        setLoading(false);
      }
    }
  }

  const selectedPlats = Object.entries(platforms).filter(([, v]) => v).map(([k]) => k);
  const badgeClass = (p: string) => p === "Tokopedia" ? "bt" : p === "Shopee" ? "bs" : "bl";

  return (
    <>
      <Navbar />
      <div className="wrap">

        <div className="phead">
          <div className="bc">Sipantau / <span>Pemantauan</span></div>
          <h1>Pemantauan Market Place</h1>
          <p>Pantau Listing Produk Dari Tokopedia, shopee dan Lazada secara Otomatis</p>
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
                <div className="fcheck-group">
                  {(["tokopedia", "shopee", "lazada"] as const).map(p => (
                    <label key={p} className="fcheck">
                      <input type="checkbox" checked={platforms[p]}
                        onChange={e => setPlatforms(prev => ({ ...prev, [p]: e.target.checked }))} />
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

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
              {(done || results.length > 0) && !loading && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await fetch("http://localhost:7777/open-output-folder");
                        if (!res.ok) alert("Gagal membuka folder. Pastikan SiPantau_Agent berjalan.");
                      } catch {
                        alert("Gagal terhubung ke Agent.");
                      }
                    }}
                    style={{ marginLeft: ".75rem", padding: ".55rem 1rem", border: "1px solid var(--green)", borderRadius: 6, background: "var(--green-pale)", cursor: "pointer", fontSize: ".85rem", color: "var(--green)", fontWeight: 600 }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><FolderOpen size={16} /> Buka Folder Hasil (Screenshot)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    style={{ marginLeft: ".75rem", padding: ".55rem 1rem", border: "1px solid var(--border-mid)", borderRadius: 6, background: "transparent", cursor: "pointer", fontSize: ".85rem", color: "var(--ink2)" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Trash2 size={16} /> Bersihkan</span>
                  </button>
                </>
              )}
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
                <span style={{ fontSize: ".72rem", fontWeight: 700, padding: ".2rem .65rem", borderRadius: 99, background: "var(--green-light)", color: "var(--green)", border: "1px solid var(--border-mid)" }}>
                  {results.length} listing
                </span>
                {fileExcel && (
                  <a
                    href={`${API_URL}/api/export/download/${fileExcel}`}
                    className="btn-sm"
                    style={{ display: "inline-flex", alignItems: "center", gap: ".3rem", textDecoration: "none" }}
                  >
                    <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}><Download size={14} /> Unduh Excel (Server)</span>
                  </a>
                )}
                {agentJobId && done && (
                  <a
                    href={`http://localhost:7777/download/${agentJobId}`}
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
                      <td><span className={`badge ${badgeClass(r.platform)}`}>{r.platform}</span></td>
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