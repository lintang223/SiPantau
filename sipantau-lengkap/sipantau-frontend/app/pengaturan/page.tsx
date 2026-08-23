"use client";
// app/pengaturan/page.tsx

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { CheckCircle, AlertTriangle, Plug, Server, RefreshCw } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function PengaturanPage() {
  const router = useRouter();
  useEffect(() => {
    if (!localStorage.getItem("sipantau_auth")) {
      router.push("/");
      return;
    }
    const userStr = localStorage.getItem("sipantau_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.divisi !== "sekditjen" && user.divisi !== "dit_ppsa") {
        router.push("/akses-ditolak");
      }
    }
  }, [router]);

  const [apiUrl, setApiUrl]       = useState(API_URL);
  const [status, setStatus]       = useState<"idle" | "checking" | "ok" | "err">("idle");
  const [statusTxt, setStatusTxt] = useState<React.ReactNode>("");

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
                { lbl: "Instansi",  val: "Kemenhut RI",              cls: "green"  },
                { lbl: "Framework", val: "Next.js 14",              cls: "purple" },
                { lbl: "Platform",  val: "Tokopedia", cls: "orange" },
                { lbl: "Tahun",     val: "2026",                    cls: "blue"   },
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
