'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { AlertTriangle, CheckCircle, Save } from 'lucide-react'

export default function GantiPasswordPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ username: string; nama: string } | null>(null)
  const [passwordLama, setPasswordLama] = useState('')
  const [passwordBaru, setPasswordBaru] = useState('')
  const [passwordKonfirmasi, setPasswordKonfirmasi] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    const auth = sessionStorage.getItem('sipantau_auth')
    const userData = sessionStorage.getItem('sipantau_user')
    if (!auth) { router.push('/'); return }
    if (userData) setUser(JSON.parse(userData))
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (passwordBaru !== passwordKonfirmasi) {
      setError('Password baru dan konfirmasi tidak cocok')
      return
    }
    if (passwordBaru.length < 6) {
      setError('Password baru minimal 6 karakter')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/api/auth/ganti-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: user?.username,
          password_lama: passwordLama,
          password_baru: passwordBaru
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Gagal ganti password'); setLoading(false); return }
      setSuccess('Password berhasil diubah!')
      setPasswordLama(''); setPasswordBaru(''); setPasswordKonfirmasi('')
    } catch {
      setError('Tidak bisa terhubung ke server')
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        .gp-card { background: var(--surface); border-radius: var(--r); padding: 1.5rem; border: 1px solid var(--border); max-width: 480px; box-shadow: var(--shadow-sm); }
        .gp-field { margin-bottom: 1rem; }
        .gp-label { display: block; font-size: .75rem; font-weight: 700; color: var(--ink2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: .4rem; }
        .gp-input { width: 100%; padding: .65rem .9rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .875rem; color: var(--ink); background: var(--bg); outline: none; font-family: inherit; transition: border-color .2s, box-shadow .2s; }
        .gp-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(27,67,50,.1); }
        .gp-btn { width: 100%; padding: .75rem; background: linear-gradient(135deg, #163f24, var(--green)); color: #fff; border: none; border-radius: var(--r-sm); font-size: .875rem; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: .5rem; transition: opacity .2s; }
        .gp-btn:disabled { opacity: .65; cursor: not-allowed; }
        .gp-success { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: .75rem 1rem; border-radius: var(--r-sm); font-size: .85rem; margin-bottom: 1rem; }
        .gp-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: .75rem 1rem; border-radius: var(--r-sm); font-size: .85rem; margin-bottom: 1rem; }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ marginBottom: '1.5rem' }}>
          <div className="bc">SiPantau / <span>Ganti Password</span></div>
          <h1>Ganti Password</h1>
          <p>Ubah password akun {user?.nama || user?.username}</p>
        </div>

        <div className="gp-card">
          <form onSubmit={handleSubmit}>
            <div className="gp-field">
              <label className="gp-label">Password Lama</label>
              <input className="gp-input" type="password" placeholder="Masukkan password lama"
                value={passwordLama} onChange={e => setPasswordLama(e.target.value)} required />
            </div>
            <div className="gp-field">
              <label className="gp-label">Password Baru</label>
              <input className="gp-input" type="password" placeholder="Minimal 6 karakter"
                value={passwordBaru} onChange={e => setPasswordBaru(e.target.value)} required />
            </div>
            <div className="gp-field">
              <label className="gp-label">Konfirmasi Password Baru</label>
              <input className="gp-input" type="password" placeholder="Ulangi password baru"
                value={passwordKonfirmasi} onChange={e => setPasswordKonfirmasi(e.target.value)} required />
            </div>

            {error   && <div className="gp-error" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><AlertTriangle size={15} /> {error}</div>}
            {success && <div className="gp-success" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><CheckCircle size={15} /> {success}</div>}

            <button type="submit" className="gp-btn" disabled={loading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
              {loading ? 'Menyimpan...' : <><Save size={16} /> Simpan Password Baru</>}
            </button>
          </form>
        </div>
      </div>
    </>
  )
}