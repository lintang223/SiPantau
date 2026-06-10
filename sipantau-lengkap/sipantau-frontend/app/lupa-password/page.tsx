'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Mail } from 'lucide-react'

export default function LupaPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{type: 'success'|'error', msg: string} | null>(null)

  const handleGoogleLogin = () => {
    // Simulasi OAuth redirect
    setStatus({
      type: 'success', 
      msg: 'Fitur integrasi Google Workspace sedang dalam tahap pengembangan (Memerlukan setup Client ID di Google Cloud Console).'
    })
  }

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setStatus({
        type: 'success',
        msg: 'Jika email Anda terdaftar, link reset password telah dikirimkan.'
      })
      setLoading(false)
    }, 1000)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .lp-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background-image: url(/bg-hutan.jpg); background-size: cover; background-position: center;
          background-color: #0b3d1a; font-family: 'Plus Jakarta Sans', sans-serif; padding: 20px; position: relative;
        }
        .overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(4,22,9,0.75) 0%, rgba(10,48,22,0.68) 50%, rgba(4,22,9,0.80) 100%); }
        .lp-card {
          position: relative; z-index: 2; background: rgba(255,255,255,0.97); border-radius: 20px;
          padding: 36px 36px 28px; width: 100%; max-width: 380px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.45); 
        }
        .lp-title { font-size: 1.25rem; font-weight: 800; color: #111; margin-bottom: 5px; }
        .lp-desc { font-size: 13px; color: #6b7280; margin-bottom: 24px; line-height: 1.5; }
        
        .lp-input {
          width: 100%; padding: 11px 13px; border: 1.5px solid #e5e7eb; border-radius: 9px;
          font-size: 14px; color: #111827; background: #f9fafb; outline: none; font-family: inherit;
          margin-bottom: 16px;
        }
        .lp-input:focus { border-color: #1B4332; background: #fff; box-shadow: 0 0 0 3px rgba(27,67,50,0.1); }
        
        .lp-btn {
          width: 100%; padding: 12px; background: #1B4332; color: #fff; border: none; border-radius: 9px;
          font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .lp-btn:hover { background: #2d8a3e; }
        .lp-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .lp-divider {
          display: flex; align-items: center; text-align: center; margin: 20px 0; color: #9ca3af; font-size: 12px;
        }
        .lp-divider::before, .lp-divider::after { content: ''; flex: 1; border-bottom: 1px solid #e5e7eb; }
        .lp-divider:not(:empty)::before { margin-right: .5em; }
        .lp-divider:not(:empty)::after { margin-left: .5em; }

        .btn-google {
          width: 100%; padding: 12px; background: #fff; color: #374151; border: 1px solid #d1d5db; border-radius: 9px;
          font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 10px;
          transition: background 0.2s;
        }
        .btn-google:hover { background: #f3f4f6; }
        
        .lp-back {
          display: inline-flex; align-items: center; gap: 6px; color: #6b7280; font-size: 13px; font-weight: 600;
          text-decoration: none; margin-top: 24px; cursor: pointer;
        }
        .lp-back:hover { color: #111; }
        
        .alert-box {
          padding: 12px; border-radius: 8px; font-size: 13px; margin-bottom: 16px; font-weight: 500; line-height: 1.5;
        }
        .alert-success { background: #f0fdf4; color: #15803d; border: 1px solid #bbf7d0; }
        .alert-error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
      `}} />

      <div className="lp-root">
        <div className="overlay" />
        <div className="lp-card">
          <h1 className="lp-title">Lupa Password?</h1>
          <p className="lp-desc">Masukkan alamat email Anda untuk menerima link reset password, atau masuk menggunakan akun Google Anda.</p>

          {status && (
            <div className={`alert-box ${status.type === 'success' ? 'alert-success' : 'alert-error'}`}>
              {status.msg}
            </div>
          )}

          <form onSubmit={handleReset}>
            <input 
              className="lp-input" 
              type="email" 
              placeholder="Email Anda" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="lp-btn" disabled={loading}>
              <Mail size={16} /> {loading ? 'Mengirim...' : 'Kirim Link Reset'}
            </button>
          </form>

          <div className="lp-divider">ATAU</div>

          <button className="btn-google" onClick={handleGoogleLogin}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Masuk dengan Google
          </button>

          <button className="lp-back" onClick={() => router.push('/')}>
            <ArrowLeft size={14} /> Kembali ke Login
          </button>
        </div>
      </div>
    </>
  )
}
