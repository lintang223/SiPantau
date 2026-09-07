'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  AlertTriangle,
  BarChart3,
  Users,
  History,
  ShieldCheck,
  LogIn,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

const FEATURES = [
  {
    icon: <Search size={22} color="#4ade80" />,
    title: 'Pemantauan Otomatis',
    desc: 'Pantau ribuan listing produk di Tokopedia secara otomatis menggunakan teknologi web scraping cerdas.',
  },
  {
    icon: <AlertTriangle size={22} color="#4ade80" />,
    title: 'Deteksi Perdagangan Ilegal',
    desc: 'Identifikasi produk mencurigakan seperti kayu, satwa, dan bahan ilegal lainnya yang diperdagangkan online.',
  },
  {
    icon: <BarChart3 size={22} color="#4ade80" />,
    title: 'Laporan & Ekspor Data',
    desc: 'Unduh laporan lengkap dalam format Excel siap cetak untuk kebutuhan pelaporan dan tindak lanjut.',
  },
  {
    icon: <Users size={22} color="#4ade80" />,
    title: 'Multi-Pengguna & Divisi',
    desc: 'Sistem manajemen pengguna berbasis divisi dengan kendali akses berlapis sesuai struktur organisasi.',
  },
  {
    icon: <History size={22} color="#4ade80" />,
    title: 'Riwayat Lengkap',
    desc: 'Simpan semua sesi pemantauan dengan log aktivitas terperinci untuk audit dan dokumentasi.',
  },
  {
    icon: <ShieldCheck size={22} color="#4ade80" />,
    title: 'Keamanan Berlapis',
    desc: 'Autentikasi aman dengan proteksi brute-force, session management, dan enkripsi password.',
  },
]

const STATS = [
  { label: 'Divisi Pengguna', val: 5, suffix: '' },
  { label: 'Platform Dipantau', val: 1, suffix: '' },
  { label: 'Produk Terdeteksi', val: 500, suffix: '+' },
  { label: 'Laporan Tersedia', val: 100, suffix: '+' },
]

function useCountUp(target: number, trigger: boolean, duration = 1500) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!trigger) return
    let start = 0
    const step = Math.ceil(target / (duration / 16))
    const timer = setInterval(() => {
      start += step
      if (start >= target) { setCount(target); clearInterval(timer) }
      else setCount(start)
    }, 16)
    return () => clearInterval(timer)
  }, [trigger, target, duration])
  return count
}

function StatCard({ label, val, suffix }: { label: string; val: number; suffix: string }) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const count = useCountUp(val, visible)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])
  return (
    <div ref={ref} className="lp-stat-card">
      <div className="lp-stat-val">{count}{suffix}</div>
      <div className="lp-stat-label">{label}</div>
    </div>
  )
}

export default function LandingPage() {
  const router = useRouter()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    // Jika sudah login, langsung ke dashboard
    if (localStorage.getItem('sipantau_auth')) {
      router.replace('/dashboard')
      return
    }
    const handleScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [router])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; background: #0a1f0f; color: #fff; overflow-x: hidden; }

        /* ── Navbar ── */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 clamp(1.5rem, 5vw, 4rem); height: 68px;
          transition: background 0.3s, backdrop-filter 0.3s, box-shadow 0.3s;
        }
        .lp-nav.scrolled {
          background: rgba(10,31,15,0.92); backdrop-filter: blur(18px);
          box-shadow: 0 1px 0 rgba(255,255,255,0.06);
        }
        .lp-nav-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .lp-nav-logo img { height: 36px; object-fit: contain; }
        .lp-nav-brand { font-size: 18px; font-weight: 800; color: #fff; letter-spacing: -0.3px; }
        .lp-nav-brand span { color: #4ade80; }
        .lp-nav-links { display: flex; align-items: center; gap: 2rem; }
        .lp-nav-link { font-size: 14px; font-weight: 600; color: rgba(255,255,255,0.75); text-decoration: none; transition: color 0.2s; }
        .lp-nav-link:hover { color: #fff; }
        .lp-btn-masuk {
          padding: 9px 20px;
          background: #16a34a;
          color: #fff;
          border-radius: 8px;
          font-weight: 700;
          font-size: 14px;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: background 0.2s, transform 0.15s;
        }
        .lp-btn-masuk:hover {
          background: #15803d;
          transform: translateY(-1px);
        }

        /* ── Hero ── */
        .lp-hero {
          min-height: 100vh; position: relative; display: flex; align-items: center;
          padding: clamp(5rem, 10vw, 8rem) clamp(1.5rem, 5vw, 4rem) 4rem;
          overflow: hidden;
        }
        .lp-hero-bg {
          position: absolute; inset: 0; z-index: 0;
          background-image: url(/bg-hutan.jpg); background-size: cover; background-position: center 30%;
        }
        .lp-hero-overlay {
          position: absolute; inset: 0; z-index: 1;
          background: linear-gradient(135deg, rgba(4,18,8,0.82) 0%, rgba(6,32,14,0.72) 50%, rgba(4,18,8,0.88) 100%);
        }
        .lp-hero-overlay2 {
          position: absolute; bottom: 0; left: 0; right: 0; height: 200px; z-index: 1;
          background: linear-gradient(to top, #0a1f0f, transparent);
        }
        .lp-hero-content {
          position: relative; z-index: 2; max-width: 720px;
          animation: hero-in 0.8s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes hero-in { from { opacity:0; transform:translateY(30px); } to { opacity:1; transform:translateY(0); } }
        .lp-hero-title {
          font-size: clamp(2.4rem, 6vw, 4rem); font-weight: 900; line-height: 1.1;
          letter-spacing: -1.5px; margin-bottom: 1.25rem; color: #fff;
        }
        .lp-hero-title em { font-style: normal; color: #4ade80; }
        .lp-hero-desc {
          font-size: clamp(1rem, 2vw, 1.15rem); color: rgba(255,255,255,0.72); line-height: 1.75;
          margin-bottom: 2.5rem; font-weight: 400; max-width: 580px;
        }
        .lp-hero-cta { display: flex; gap: 1rem; flex-wrap: wrap; }
        .lp-cta-primary {
          padding: 13px 28px;
          background: #16a34a;
          color: #fff;
          border-radius: 10px;
          font-weight: 700;
          font-size: 15px;
          text-decoration: none;
          transition: background 0.2s, transform 0.15s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .lp-cta-primary:hover {
          background: #15803d;
          transform: translateY(-1px);
        }
        .lp-cta-secondary {
          padding: 13px 26px;
          background: rgba(255,255,255,0.06);
          border: 1px solid rgba(255,255,255,0.2);
          color: #fff;
          border-radius: 10px;
          font-weight: 600;
          font-size: 15px;
          text-decoration: none;
          transition: all 0.2s;
          backdrop-filter: blur(8px);
        }
        .lp-cta-secondary:hover {
          background: rgba(255,255,255,0.12);
          border-color: rgba(255,255,255,0.35);
        }

        /* ── Sections ── */
        .lp-section { padding: clamp(4rem, 8vw, 6rem) clamp(1.5rem, 5vw, 4rem); max-width: 1200px; margin: 0 auto; }
        .lp-section-title {
          font-size: clamp(1.8rem, 4vw, 2.8rem); font-weight: 900; letter-spacing: -1px;
          margin-bottom: 1rem; color: #fff;
        }
        .lp-section-desc { font-size: 1.05rem; color: rgba(255,255,255,0.6); line-height: 1.75; max-width: 580px; }
        .lp-divider { width: 100%; height: 1px; background: linear-gradient(90deg, transparent, rgba(74,222,128,0.2), transparent); margin: 0 auto; }

        /* ── Stats ── */
        .lp-stats-wrap {
          background: rgba(14, 46, 24, 0.55);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(74, 222, 128, 0.15);
          border-radius: 16px;
          overflow: hidden;
        }
        .lp-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0; }
        .lp-stat-card {
          padding: 2.2rem 1.5rem;
          text-align: center;
          position: relative;
          background: transparent !important;
          border-right: 1px solid rgba(255,255,255,0.07);
        }
        .lp-stat-card:last-child { border-right: none; }
        .lp-stat-val { font-size: 2.8rem; font-weight: 900; color: #4ade80; letter-spacing: -1.5px; line-height: 1; }
        .lp-stat-label { font-size: 11px; color: rgba(255,255,255,0.65); font-weight: 700; margin-top: 8px; text-transform: uppercase; letter-spacing: 0.8px; }

        /* ── Features ── */
        .lp-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.25rem; margin-top: 2.5rem; }
        .lp-feature-card {
          background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 1.75rem; transition: all 0.25s; cursor: default;
        }
        .lp-feature-card:hover { background: rgba(74,222,128,0.05); border-color: rgba(74,222,128,0.25); transform: translateY(-3px); box-shadow: 0 12px 32px rgba(0,0,0,0.3); }
        .lp-feature-icon {
          width: 44px;
          height: 44px;
          border-radius: 10px;
          background: rgba(74, 222, 128, 0.1);
          border: 1px solid rgba(74, 222, 128, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1.25rem;
        }
        .lp-feature-title { font-size: 16px; font-weight: 800; color: #fff; margin-bottom: 0.5rem; }
        .lp-feature-desc { font-size: 13.5px; color: rgba(255,255,255,0.6); line-height: 1.65; }

        /* ── CTA Banner ── */
        .lp-cta-banner {
          background: #0d381b;
          border: 1px solid rgba(74,222,128,0.22);
          border-radius: 20px;
          padding: 3.5rem 3rem; text-align: center; position: relative; overflow: hidden;
        }
        .lp-cta-banner::before {
          content: ''; position: absolute; top: -50%; left: -20%;
          width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(74,222,128,0.08), transparent 70%);
          pointer-events: none;
        }
        .lp-cta-banner-title { font-size: clamp(1.5rem, 3vw, 2.2rem); font-weight: 900; color: #fff; margin-bottom: 0.75rem; letter-spacing: -0.5px; }
        .lp-cta-banner-desc { color: rgba(255,255,255,0.65); font-size: 1rem; margin-bottom: 2rem; }
        .lp-cta-banner-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 32px;
          background: #16a34a;
          color: #fff; border-radius: 10px; font-weight: 700; font-size: 15px;
          text-decoration: none; transition: background 0.2s, transform 0.15s;
        }
        .lp-cta-banner-btn:hover {
          background: #15803d;
          transform: translateY(-1px);
        }

        /* ── Footer ── */
        .lp-footer { border-top: 1px solid rgba(255,255,255,0.07); padding: 2rem clamp(1.5rem, 5vw, 4rem); display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
        .lp-footer-brand { display: flex; align-items: center; gap: 8px; }
        .lp-footer-brand img { height: 28px; }
        .lp-footer-copy { font-size: 12px; color: rgba(255,255,255,0.4); }
        .lp-footer-right { font-size: 12px; color: rgba(255,255,255,0.4); }

        @media (max-width: 640px) {
          .lp-nav-links { gap: 1rem; }
          .lp-stat-card { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); }
          .lp-stat-card:last-child { border-bottom: none; }
          .lp-cta-banner { padding: 2.5rem 1.5rem; }
          .lp-footer { justify-content: center; text-align: center; }
        }
      `}} />

      {/* ── Navbar ── */}
      <nav className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
        <a className="lp-nav-logo" href="#">
          <img src="/logo.png" alt="Logo" />
          <span className="lp-nav-brand">Si<span>Pantau</span></span>
        </a>
        <div className="lp-nav-links">
          <a className="lp-nav-link" href="#fitur">Fitur</a>
          <a className="lp-nav-link" href="#tentang">Tentang</a>
          <Link className="lp-btn-masuk" href="/login">
            Masuk <ArrowRight size={15} />
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-bg" />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-overlay2" />
        <div className="lp-hero-content">
          <h1 className="lp-hero-title">
            Sistem Pantau<br />
            <em>Perdagangan Ilegal</em><br />
            di Marketplace
          </h1>
          <p className="lp-hero-desc">
            SiPantau adalah platform intelijen digital Direktorat Jenderal Penegakan Hukum Kehutanan
            untuk memantau dan mendeteksi aktivitas perdagangan produk ilegal kehutanan secara real-time
            di platform e-commerce.
          </p>
          <div className="lp-hero-cta">
            <Link className="lp-cta-primary" href="/login">
              <LogIn size={18} /> Masuk ke Sistem
            </Link>
            <a className="lp-cta-secondary" href="#fitur">
              Pelajari Lebih Lanjut
            </a>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <div style={{ padding: '0 clamp(1.5rem, 5vw, 4rem)' }}>
        <div className="lp-stats-wrap" style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div className="lp-stats-grid">
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>
        </div>
      </div>

      <div className="lp-divider" style={{ margin: '4rem auto' }} />

      {/* ── Features ── */}
      <section className="lp-section" id="fitur">
        <h2 className="lp-section-title">Fitur Unggulan SiPantau</h2>
        <p className="lp-section-desc">
          Dirancang khusus untuk kebutuhan penegakan hukum kehutanan dengan teknologi scraping
          otomatis dan analisis data cerdas.
        </p>
        <div className="lp-features-grid">
          {FEATURES.map(f => (
            <div className="lp-feature-card" key={f.title}>
              <div className="lp-feature-icon">{f.icon}</div>
              <div className="lp-feature-title">{f.title}</div>
              <div className="lp-feature-desc">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="lp-divider" style={{ margin: '0 auto' }} />

      {/* ── About ── */}
      <section className="lp-section" id="tentang">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3.5rem', alignItems: 'center' }}>
          <div>
            <h2 className="lp-section-title">Melindungi Hutan Indonesia dari Ancaman Digital</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '0.95rem', marginTop: '1rem' }}>
              SiPantau hadir sebagai solusi teknologi untuk membantu petugas penegak hukum kehutanan
              dalam mengawasi aktivitas perdagangan ilegal komoditas kehutanan yang semakin marak
              terjadi di berbagai platform e-commerce.
            </p>
            <p style={{ color: 'rgba(255,255,255,0.65)', lineHeight: 1.8, fontSize: '0.95rem', marginTop: '1rem' }}>
              Dengan sistem pemantauan otomatis, tim dapat fokus pada analisis dan tindak lanjut,
              bukan pada pengumpulan data manual yang menyita waktu.
            </p>
            <div style={{ display: 'flex', gap: '2rem', marginTop: '2rem' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <CheckCircle2 size={15} color="#4ade80" /> Aktif
                </div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Tokopedia</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#4ade80' }}>50+</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Kategori Ilegal</div>
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 800, color: '#4ade80' }}>Real-time</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>Pembaruan Data</div>
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 20, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {[
              { step: '01', label: 'Input Kata Kunci', desc: 'Masukkan kata kunci produk yang ingin dipantau.' },
              { step: '02', label: 'Scraping Otomatis', desc: 'Agent memantau ribuan listing secara otomatis.' },
              { step: '03', label: 'Analisis Data', desc: 'Sistem menandai produk mencurigakan secara cerdas.' },
              { step: '04', label: 'Laporan & Tindak Lanjut', desc: 'Ekspor data dan ambil tindakan yang diperlukan.' },
            ].map(({ step, label, desc }) => (
              <div key={step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 800, color: '#4ade80' }}>{step}</div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#fff', marginBottom: 2 }}>{label}</div>
                  <div style={{ fontSize: '12.5px', color: 'rgba(255,255,255,0.5)' }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <div style={{ padding: '0 clamp(1.5rem, 5vw, 4rem) 5rem', maxWidth: 1200, margin: '0 auto' }}>
        <div className="lp-cta-banner">
          <div className="lp-cta-banner-title">Siap Mulai Pemantauan?</div>
          <p className="lp-cta-banner-desc">Masuk ke sistem dan mulai pantau aktivitas perdagangan ilegal sekarang.</p>
          <Link className="lp-cta-banner-btn" href="/login">
            <LogIn size={18} /> Masuk ke SiPantau
          </Link>
        </div>
      </div>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <img src="/logo.png" alt="Logo" />
          <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>SiPantau</span>
        </div>
        <span className="lp-footer-copy">© 2026 Kementerian Kehutanan Republik Indonesia</span>
        <span className="lp-footer-right">Sistem Pantau Informasi Market</span>
      </footer>
    </>
  )
}