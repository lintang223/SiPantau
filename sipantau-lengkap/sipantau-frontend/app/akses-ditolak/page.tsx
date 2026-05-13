'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { AlertTriangle, ArrowLeft, LogOut } from 'lucide-react'

export default function AksesDitolakPage() {
  const router = useRouter()

  useEffect(() => {
    // If not logged in at all, redirect to login
    if (!sessionStorage.getItem('sipantau_auth')) {
      router.push('/')
    }
  }, [router])

  return (
    <>
      <style>{`
        .denied-root {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-family: 'Inter', system-ui, sans-serif;
          padding: 2rem;
        }
        .denied-card {
          background: #fff;
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 12px 40px rgba(0,0,0,0.08);
          padding: 3rem 2.5rem;
          max-width: 440px;
          width: 100%;
          text-align: center;
        }
        .denied-icon {
          font-size: 3.5rem;
          margin-bottom: 1.25rem;
          display: block;
        }
        .denied-title {
          font-size: 1.35rem;
          font-weight: 800;
          color: #1a1a1a;
          margin-bottom: .5rem;
          letter-spacing: -.4px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
        }
        .denied-desc {
          font-size: .88rem;
          color: #6b7280;
          line-height: 1.7;
          margin-bottom: 2rem;
        }
        .denied-badge {
          display: inline-block;
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #dc2626;
          border-radius: 999px;
          padding: .3rem 1rem;
          font-size: .78rem;
          font-weight: 700;
          margin-bottom: 1.75rem;
        }
        .denied-actions {
          display: flex;
          gap: .75rem;
          justify-content: center;
          flex-wrap: wrap;
        }
        .btn-back {
          background: var(--green, #1B4332);
          color: #fff;
          border: none;
          border-radius: 999px;
          padding: .6rem 1.5rem;
          font-size: .875rem;
          font-weight: 700;
          cursor: pointer;
          text-decoration: none;
          transition: background .15s;
          display: inline-flex;
          align-items: center;
          gap: .4rem;
        }
        .btn-back:hover { background: #2d6a4f; }
        .btn-outline {
          background: transparent;
          color: #374151;
          border: 1.5px solid #e5e7eb;
          border-radius: 999px;
          padding: .6rem 1.5rem;
          font-size: .875rem;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: border-color .15s, color .15s;
          display: inline-flex;
          align-items: center;
          gap: .4rem;
        }
        .btn-outline:hover { border-color: #9ca3af; color: #111827; }
      `}</style>

      <div className="denied-root">
        <div className="denied-card">
          <div className="denied-title">
            <AlertTriangle size={32} color="#dc2626" />
            Akses Ditolak
          </div>
          <div className="denied-badge">403 — Forbidden</div>
          <p className="denied-desc">
            Anda tidak memiliki izin untuk melihat halaman ini.<br />
            Hubungi Administrator untuk mengubah hak akses Anda.
          </p>
          <div className="denied-actions">
            <Link href="/dashboard" className="btn-back">
              <ArrowLeft size={16} /> Kembali ke Dashboard
            </Link>
            <Link href="/" className="btn-outline">
              <LogOut size={16} /> Keluar
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}
