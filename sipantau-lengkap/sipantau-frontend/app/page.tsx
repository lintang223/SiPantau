'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.detail || 'Login gagal')
        setLoading(false)
        return
      }

      // Simpan info user ke sessionStorage
      sessionStorage.setItem('sipantau_auth', 'true')
      sessionStorage.setItem('sipantau_user', JSON.stringify(data.user))
      router.push('/dashboard')

    } catch {
      setError('Tidak bisa terhubung ke server. Pastikan backend jalan.')
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .login-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background-image: url(/bg-hutan.jpg); background-size: cover; background-position: center;
          background-color: #0b3d1a; font-family: 'Plus Jakarta Sans', sans-serif; padding: 20px; position: relative;
        }
        .overlay { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(4,22,9,0.75) 0%, rgba(10,48,22,0.68) 50%, rgba(4,22,9,0.80) 100%); }
        .login-card {
          position: relative; z-index: 2; background: rgba(255,255,255,0.97); border-radius: 20px;
          padding: 36px 36px 28px; width: 100%; max-width: 380px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.45); animation: card-in 0.5s cubic-bezier(0.22,1,0.36,1) both;
        }
        @keyframes card-in { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
        .login-card::before {
          content:''; position:absolute; top:0; left:0; right:0; height:3px; border-radius:20px 20px 0 0;
          background: linear-gradient(90deg,#1B4332,#4ade80,#2d8a3e,#1B4332); background-size:300%;
          animation: shimmer 3s linear infinite;
        }
        @keyframes shimmer { 0%{background-position:200% center} 100%{background-position:-200% center} }
        .logo-row { display:flex; align-items:center; gap:12px; margin-bottom:28px; }
        .logo-circle {
          width:44px; height:44px; border-radius:12px; background:linear-gradient(135deg,#1B4332,#2d8a3e);
          display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 3px 10px rgba(27,67,50,0.4);
        }
        .logo-name { font-size:17px; font-weight:800; color:#111827; }
        .logo-sub { font-size:10px; color:#9ca3af; margin-top:2px; font-weight:500; }
        .field-group { width:100%; margin-bottom:16px; }
        .login-label { display:block; font-size:11px; font-weight:700; color:#374151; text-transform:uppercase; letter-spacing:0.7px; margin-bottom:6px; }
        .input-wrap { position:relative; }
        .login-input {
          width:100%; padding:11px 42px 11px 13px; border:1.5px solid #e5e7eb; border-radius:9px;
          font-size:14px; color:#111827; background:#f9fafb; outline:none; font-family:inherit;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-input:focus { border-color:#1B4332; background:#fff; box-shadow:0 0 0 3px rgba(27,67,50,0.1); }
        .toggle-pw { position:absolute; right:12px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; font-size:14px; color:#9ca3af; padding:0; }
        .error-box {
          display:flex; align-items:center; gap:8px; background:#fef2f2; border:1px solid #fecaca;
          border-radius:9px; padding:9px 13px; margin-bottom:12px; color:#dc2626; font-size:13px; font-weight:500;
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97);
        }
        @keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(3px)} 30%,50%,70%{transform:translateX(-4px)} 40%,60%{transform:translateX(4px)} }
        .btn-login {
          width:100%; padding:13px; background:linear-gradient(135deg,#1B4332,#2d8a3e 60%,#1B4332);
          background-size:200%; color:#fff; border:none; border-radius:9px; font-size:14px; font-weight:700;
          font-family:inherit; cursor:pointer; margin-top:4px; transition:transform 0.15s, box-shadow 0.2s, background-position 0.4s;
        }
        .btn-login:hover:not(:disabled) { background-position:right center; transform:translateY(-1px); box-shadow:0 8px 20px rgba(27,67,50,0.35); }
        .btn-login:disabled { opacity:0.70; cursor:not-allowed; }
        .footer { font-size:10.5px; color:#d1d5db; text-align:center; margin-top:22px; line-height:1.7; }
      `}</style>

      <div className="login-root">
        <div className="overlay" />
        <div className="login-card">
          <div className="logo-row">
            <div className="logo-circle">
              <img src="/logo.png" alt="Logo" style={{ width:26, height:26, objectFit:'contain' }} />
            </div>
            <div>
              <div className="logo-name">SiPantau</div>
              <div className="logo-sub">Kementerian Lingkungan Hidup & Kehutanan</div>
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="field-group">
              <label className="login-label">Username</label>
              <div className="input-wrap">
                <input className="login-input" type="text" placeholder="Username"
                  value={username} onChange={e => setUsername(e.target.value)} required autoFocus />
              </div>
            </div>

            <div className="field-group">
              <label className="login-label">Password</label>
              <div className="input-wrap">
                <input className="login-input" type={showPass ? 'text' : 'password'} placeholder="Password"
                  value={password} onChange={e => setPassword(e.target.value)} required />
                <button type="button" className="toggle-pw" onClick={() => setShowPass(!showPass)} tabIndex={-1}>
                  {showPass ? '👁‍🗨' : '👁'}
                </button>
              </div>
            </div>

            {error && <div className="error-box"><span>⚠️</span><span>{error}</span></div>}

            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? '⏳ Memverifikasi...' : 'Masuk'}
            </button>
          </form>

          <p className="footer">SiPantau v1.0 &nbsp;·&nbsp; © 2025 KLHK RI</p>
        </div>
      </div>
    </>
  )
}