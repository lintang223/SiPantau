'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff, AlertTriangle, LogIn, Lock, User, ArrowLeft } from 'lucide-react'
import { API_URL } from '@/lib/api'

const LOCKOUT_KEY = 'sipantau_lockout_until'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [lockoutSeconds, setLockoutSeconds] = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // ── Cek apakah sudah login — jika iya, redirect ke dashboard ─────────────────
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('redirect=')) {
      localStorage.removeItem('sipantau_token')
      localStorage.removeItem('sipantau_auth')
      localStorage.removeItem('sipantau_user')
      setIsChecking(false)
      return
    }

    const authFlag = localStorage.getItem('sipantau_auth')
    if (authFlag) {
      router.replace('/dashboard')
      return
    }
    setIsChecking(false)
  }, [router])

  // Saat halaman dimuat, cek status blokir ke BACKEND
  useEffect(() => {
    const checkLockout = async () => {
      try {
        const res = await fetch(`${API_URL}/api/auth/lockout-status`)
        const data = await res.json()
        if (data.locked && data.remaining_seconds > 0) {
          setError('Akun diblokir sementara.')
          startCountdown(data.remaining_seconds)
        } else {
          localStorage.removeItem(LOCKOUT_KEY)
        }
      } catch {
        const stored = localStorage.getItem(LOCKOUT_KEY)
        if (stored) {
          const remaining = Math.ceil((parseInt(stored) - Date.now()) / 1000)
          if (remaining > 0) {
            setError('Akun diblokir sementara.')
            startCountdown(remaining)
          } else {
            localStorage.removeItem(LOCKOUT_KEY)
          }
        }
      }
    }
    const authFlag = localStorage.getItem('sipantau_auth')
    if (!authFlag || (typeof window !== 'undefined' && window.location.search.includes('redirect='))) {
      checkLockout().finally(() => setIsChecking(false))
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const startCountdown = (seconds: number) => {
    setLockoutSeconds(seconds)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setLockoutSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!)
          localStorage.removeItem(LOCKOUT_KEY)
          setError('')
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const startLockout = (seconds: number) => {
    const until = Date.now() + seconds * 1000
    localStorage.setItem(LOCKOUT_KEY, String(until))
    startCountdown(seconds)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (lockoutSeconds > 0) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password })
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          const match = (data.detail as string).match(/dalam (\d+) detik/)
          const secs = match ? parseInt(match[1]) : 300
          startLockout(secs)
          setError(data.detail || 'Terlalu banyak percobaan. Coba lagi nanti.')
        } else {
          setError(data.detail || 'Login gagal. Periksa username dan password.')
        }
        setLoading(false)
        return
      }

      localStorage.setItem('sipantau_auth', 'true')
      localStorage.setItem('sipantau_user', JSON.stringify(data.user))
      document.cookie = `sipantau_auth=1; path=/; max-age=${30 * 24 * 3600}; SameSite=Lax`
      router.replace('/dashboard')

      setTimeout(() => setLoading(false), 500)

    } catch {
      setError('Tidak bisa terhubung ke server. Pastikan server backend aktif.')
      setLoading(false)
    }
  }

  if (isChecking) return null

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        
        .login-root {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          background-image: url(/bg-hutan.jpg); background-size: cover; background-position: center;
          background-color: #0b3d1a; font-family: 'Plus Jakarta Sans', sans-serif; padding: 24px; position: relative;
        }
        .login-overlay {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(4,22,9,0.85) 0%, rgba(10,48,22,0.78) 50%, rgba(4,22,9,0.88) 100%);
        }

        .login-card {
          position: relative; z-index: 2;
          background: #ffffff;
          border-radius: 18px;
          width: 100%; max-width: 410px;
          box-shadow: 0 24px 64px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.1);
          animation: card-in 0.45s cubic-bezier(0.22,1,0.36,1) both;
          overflow: hidden;
        }
        @keyframes card-in { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }

        .login-card-top-bar {
          height: 4px;
          background: #16a34a;
          width: 100%;
        }

        .login-card-body {
          padding: 32px 32px 28px;
        }

        /* ── Header Brand Row ── */
        .login-header {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 24px; padding-bottom: 18px;
          border-bottom: 1px solid #f1f5f9;
        }
        .login-brand-wrap {
          display: flex; align-items: center; gap: 12px;
        }
        .login-logo-img {
          height: 44px; width: auto; object-fit: contain;
        }
        .login-brand-title {
          font-size: 21px; font-weight: 900; color: #0f172a;
          letter-spacing: -0.5px; line-height: 1.1;
        }
        .login-brand-title span {
          color: #16a34a;
        }
        .login-brand-sub {
          font-size: 11px; color: #64748b; font-weight: 600; margin-top: 3px;
        }
        .login-back-btn {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 12px; font-weight: 600; color: #64748b;
          text-decoration: none; padding: 6px 10px; border-radius: 6px;
          transition: background 0.15s, color 0.15s;
        }
        .login-back-btn:hover {
          background: #f1f5f9; color: #0f172a;
        }

        /* ── Form ── */
        .field-group { width: 100%; margin-bottom: 18px; }
        .login-label {
          display: block; font-size: 11.5px; font-weight: 700;
          color: #334155; text-transform: uppercase; letter-spacing: 0.6px;
          margin-bottom: 7px;
        }
        .input-wrap { position: relative; display: flex; align-items: center; }
        .input-icon-left {
          position: absolute; left: 13px; color: #94a3b8; pointer-events: none;
        }
        .login-input {
          width: 100%; padding: 12px 14px 12px 38px;
          border: 1.5px solid #e2e8f0; border-radius: 10px;
          font-size: 14px; color: #0f172a; background: #f8fafc;
          outline: none; font-family: inherit; font-weight: 500;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .login-input:focus {
          border-color: #16a34a; background: #ffffff;
          box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.12);
        }
        .login-input::placeholder {
          color: #94a3b8;
        }
        .toggle-pw {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #94a3b8;
          padding: 4px; display: flex; align-items: center; justify-content: center;
          border-radius: 4px; transition: color 0.15s;
        }
        .toggle-pw:hover { color: #475569; }

        /* ── Error Box ── */
        .error-box {
          display: flex; align-items: center; gap: 8px;
          background: #fef2f2; border: 1px solid #fecaca;
          border-radius: 10px; padding: 10px 14px; margin-bottom: 16px;
          color: #b91c1c; font-size: 13px; font-weight: 500;
          animation: shake 0.4s cubic-bezier(.36,.07,.19,.97);
        }
        @keyframes shake { 10%,90%{transform:translateX(-2px)} 20%,80%{transform:translateX(3px)} 30%,50%,70%{transform:translateX(-4px)} 40%,60%{transform:translateX(4px)} }

        /* ── Solid Button (No Gradient) ── */
        .btn-login {
          width: 100%; padding: 13px;
          background: #16a34a;
          color: #ffffff; border: none; border-radius: 10px;
          font-size: 14.5px; font-weight: 700; font-family: inherit;
          cursor: pointer; margin-top: 6px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: background 0.2s, transform 0.15s;
        }
        .btn-login:hover:not(:disabled) {
          background: #15803d; transform: translateY(-1px);
        }
        .btn-login:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-login:disabled {
          opacity: 0.65; cursor: not-allowed;
        }

        .login-footer {
          font-size: 11px; color: #94a3b8; text-align: center;
          margin-top: 24px; font-weight: 500;
        }
      `}} />

      <div className="login-root">
        <div className="login-overlay" />
        <div className="login-card">
          <div className="login-card-top-bar" />
          <div className="login-card-body">
            
            {/* ── Brand Row (Logo + SiPantau Side by Side) ── */}
            <div className="login-header">
              <div className="login-brand-wrap">
                <img src="/logo.png" alt="Logo Kemenhut & Gakkum" className="login-logo-img" />
                <div>
                  <div className="login-brand-title">Si<span>Pantau</span></div>
                  <div className="login-brand-sub">Kementerian Kehutanan RI</div>
                </div>
              </div>
              <Link href="/" className="login-back-btn" title="Kembali ke Beranda">
                <ArrowLeft size={14} /> Beranda
              </Link>
            </div>

            <form onSubmit={handleLogin}>
              <div className="field-group">
                <label className="login-label">Username</label>
                <div className="input-wrap">
                  <User className="input-icon-left" size={17} />
                  <input
                    className="login-input"
                    type="text"
                    placeholder="Masukkan username"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    required
                    autoFocus
                    disabled={isChecking || lockoutSeconds > 0}
                  />
                </div>
              </div>

              <div className="field-group">
                <label className="login-label">Password</label>
                <div className="input-wrap">
                  <Lock className="input-icon-left" size={17} />
                  <input
                    className="login-input"
                    type={showPass ? 'text' : 'password'}
                    placeholder="Masukkan password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    disabled={isChecking || lockoutSeconds > 0}
                  />
                  <button
                    type="button"
                    className="toggle-pw"
                    onClick={() => setShowPass(!showPass)}
                    tabIndex={-1}
                    aria-label={showPass ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {lockoutSeconds > 0 ? (
                <div className="error-box" style={{ background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" }}>
                  <Lock size={16} />
                  <span>Akun diblokir sementara. Coba lagi dalam <strong>{lockoutSeconds}</strong> detik.</span>
                </div>
              ) : error ? (
                <div className="error-box">
                  <AlertTriangle size={16} />
                  <span>{error}</span>
                </div>
              ) : null}

              <button
                type="submit"
                className="btn-login"
                disabled={isChecking || loading || lockoutSeconds > 0}
              >
                {isChecking ? 'Memeriksa...' : loading ? 'Memverifikasi...' : lockoutSeconds > 0
                  ? <><Lock size={17} /> Diblokir ({Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, '0')})</>
                  : <><LogIn size={17} /> Masuk</>}
              </button>
            </form>

            <p className="login-footer">SiPantau v1.0 &nbsp;·&nbsp; © 2026 Ditjen Gakkum Kemenhut RI</p>
          </div>
        </div>
      </div>
    </>
  )
}