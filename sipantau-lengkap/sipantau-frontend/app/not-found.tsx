'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Home, ArrowLeft, TreePine } from 'lucide-react'

export default function NotFound() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        .nf-root {
          min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center;
          background-image: url(/bg-hutan.jpg); background-size: cover; background-position: center; background-color: #0b3d1a;
          font-family: 'Plus Jakarta Sans', sans-serif; padding: 2rem; position: relative; text-align: center;
        }
        .nf-root::before {
          content: ''; position: fixed; inset: 0;
          background: linear-gradient(135deg, rgba(4,22,9,0.88) 0%, rgba(10,48,22,0.85) 50%, rgba(4,22,9,0.92) 100%);
          z-index: 0; pointer-events: none;
        }
        .nf-card {
          position: relative; z-index: 1; background: rgba(255,255,255,0.96); border-radius: 24px;
          padding: 3rem 3.5rem; max-width: 480px; width: 100%;
          box-shadow: 0 32px 80px rgba(0,0,0,.35);
          animation: card-in 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes card-in { from { opacity:0; transform:translateY(24px); } to { opacity:1; transform:translateY(0); } }
        .nf-code { font-size: 5rem; font-weight: 800; color: #1B4332; line-height: 1; letter-spacing: -4px; margin-bottom: .5rem; }
        .nf-title { font-size: 1.4rem; font-weight: 800; color: #111827; margin-bottom: .6rem; }
        .nf-desc  { font-size: .9rem; color: #6b7280; line-height: 1.6; margin-bottom: 2rem; }
        .nf-actions { display: flex; gap: .75rem; justify-content: center; flex-wrap: wrap; }
        .nf-btn-primary {
          display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.5rem;
          background: linear-gradient(135deg, #163f24, #1B4332); color: #fff;
          border-radius: 10px; font-weight: 700; font-size: .88rem; text-decoration: none;
          transition: opacity .2s, transform .15s; box-shadow: 0 4px 14px rgba(27,67,50,.35);
        }
        .nf-btn-primary:hover { opacity: .9; transform: translateY(-1px); }
        .nf-btn-secondary {
          display: inline-flex; align-items: center; gap: .5rem; padding: .7rem 1.5rem;
          background: #f5f5f0; color: #374151; border: 1.5px solid #e5e7e0;
          border-radius: 10px; font-weight: 600; font-size: .88rem; text-decoration: none;
          transition: background .15s;
        }
        .nf-btn-secondary:hover { background: #ebebE6; }
        .nf-icon { color: #1B4332; margin-bottom: 1rem; }
      `}} />

      <div className="nf-root">
        <div className="nf-card">
          <div className="nf-icon">
            <TreePine size={48} />
          </div>
          <div className="nf-code">404</div>
          <div className="nf-title">Halaman Tidak Ditemukan</div>
          <div className="nf-desc">
            Halaman yang Anda cari tidak ada atau sudah dipindahkan.
            Silakan kembali ke dashboard SiPantau.
          </div>
          <div className="nf-actions">
            <Link href="/dashboard" className="nf-btn-primary">
              <Home size={16} /> Dashboard
            </Link>
            <button className="nf-btn-secondary" onClick={() => typeof window !== 'undefined' && window.history.back()}>
              <ArrowLeft size={16} /> Kembali
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
