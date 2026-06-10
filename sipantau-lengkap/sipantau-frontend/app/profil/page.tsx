'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { AlertTriangle, CheckCircle, Eye, EyeOff, Lock, User, Shield, Camera, ChevronRight, Pencil, KeyRound, BadgeCheck } from 'lucide-react'
import { apiFetch, logout as apiLogout } from '@/lib/api'
import { DIVISI_LABEL, DIVISI_COLOR } from '@/lib/constants'

type UserData = {
  username: string
  nama: string
  divisi: string
  level: number
  can_export?: boolean
  can_manage_users?: boolean
  divisi_color?: string
  foto_profil?: string
}

export default function ProfilPage() {
  const router = useRouter()
  const [user, setUser] = useState<UserData | null>(null)
  const [activeTab, setActiveTab] = useState<'profil' | 'keamanan'>('profil')

  // Edit profil state
  const [editNama, setEditNama] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editMsg, setEditMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  
  // Foto Profil State
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fotoLoading, setFotoLoading] = useState(false)

  // Ganti password state
  const [pwLama, setPwLama]       = useState('')
  const [pwBaru, setPwBaru]       = useState('')
  const [pwKonfirm, setPwKonfirm] = useState('')
  const [showPw, setShowPw]       = useState<Record<string, boolean>>({})
  const [pwLoading, setPwLoading] = useState(false)
  const [pwMsg, setPwMsg]         = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Password strength
  const pwStrength = (() => {
    if (!pwBaru) return null
    if (pwBaru.length < 6)  return { level: 0, label: 'Terlalu pendek', color: '#ef4444' }
    if (pwBaru.length < 8 || !/[0-9]/.test(pwBaru)) return { level: 1, label: 'Lemah', color: '#f97316' }
    if (!/[A-Z]/.test(pwBaru) || !/[^a-zA-Z0-9]/.test(pwBaru)) return { level: 2, label: 'Sedang', color: '#eab308' }
    return { level: 3, label: 'Kuat', color: '#22c55e' }
  })()

  useEffect(() => {
    const auth = localStorage.getItem('sipantau_auth')
    const raw  = localStorage.getItem('sipantau_user')
    if (!auth) { router.push('/'); return }
    if (raw) {
      const u: UserData = JSON.parse(raw)
      setUser(u)
      setEditNama(u.nama || '')
    }
  }, [router])

  // ── Simpan nama ─────────────────────────────────────────────────────────────
  const handleEditProfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setEditMsg(null)
    if (!editNama.trim()) { setEditMsg({ type: 'err', text: 'Nama tidak boleh kosong' }); return }
    setEditLoading(true)
    try {
      const res  = await apiFetch('/api/auth/update-profil', { method: 'PUT', body: JSON.stringify({ nama: editNama.trim() }) })
      const data = await res.json()
      if (!res.ok) { setEditMsg({ type: 'err', text: data.detail || 'Gagal memperbarui profil' }); setEditLoading(false); return }
      localStorage.setItem('sipantau_user', JSON.stringify(data.user))
      setUser(data.user)
      setEditMsg({ type: 'ok', text: 'Profil berhasil diperbarui!' })
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tidak bisa terhubung ke server'
      setEditMsg({ type: 'err', text: msg })
    }
    setEditLoading(false)
  }

  // ── Ganti Foto Profil ───────────────────────────────────────────────────────
  const handleGantiFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      alert("Ukuran foto maksimal 2MB")
      return
    }

    setFotoLoading(true)
    try {
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64String = reader.result as string
        const res = await apiFetch('/api/auth/update-foto', { 
          method: 'PUT', 
          body: JSON.stringify({ foto: base64String }) 
        })
        const data = await res.json()
        if (res.ok) {
          localStorage.setItem('sipantau_user', JSON.stringify(data.user))
          setUser(data.user)
        } else {
          alert(data.detail || "Gagal mengganti foto profil")
        }
        setFotoLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (err: unknown) {
      alert("Tidak bisa terhubung ke server")
      setFotoLoading(false)
    }
  }

  // ── Ganti password ──────────────────────────────────────────────────────────
  const handleGantiPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwMsg(null)
    if (pwBaru !== pwKonfirm) { setPwMsg({ type: 'err', text: 'Konfirmasi password tidak cocok' }); return }
    if (pwBaru.length < 6)    { setPwMsg({ type: 'err', text: 'Password baru minimal 6 karakter' }); return }
    setPwLoading(true)
    try {
      const res  = await apiFetch('/api/auth/ganti-password', {
        method: 'POST',
        body: JSON.stringify({ username: user?.username, password_lama: pwLama, password_baru: pwBaru }),
      })
      const data = await res.json()
      if (!res.ok) { setPwMsg({ type: 'err', text: data.detail || 'Gagal mengganti password' }); setPwLoading(false); return }
      setPwMsg({ type: 'ok', text: 'Password berhasil diubah! Anda akan diarahkan ke login...' })
      setPwLama(''); setPwBaru(''); setPwKonfirm('')
      setTimeout(() => { apiLogout() }, 2200)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Tidak bisa terhubung ke server'
      setPwMsg({ type: 'err', text: msg })
    }
    setPwLoading(false)
  }

  const divisiColor = user?.divisi_color || DIVISI_COLOR[user?.divisi || ''] || '#374151'
  const divisiLabel = DIVISI_LABEL[user?.divisi || ''] || user?.divisi || ''
  const togglePw    = (key: string) => setShowPw(p => ({ ...p, [key]: !p[key] }))

  return (
    <>
      <style>{`
        .prof-wrap { max-width: 780px; }
        .prof-hero {
          display: flex; align-items: center; gap: 1.5rem;
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; padding: 1.5rem 1.75rem;
          margin-bottom: 1.25rem; box-shadow: 0 4px 20px rgba(0,0,0,.12);
        }
        .prof-avatar-wrap { position: relative; flex-shrink: 0; }
        .prof-avatar {
          width: 76px; height: 76px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 1.85rem; font-weight: 800;
          box-shadow: 0 4px 18px rgba(0,0,0,.18);
          background: linear-gradient(135deg, var(--av-c1, #1B4332), var(--av-c2, #2d6a4f));
        }
        .prof-avatar-btn {
          position: absolute; bottom: -2px; right: -2px;
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--green-vivid); border: 2px solid var(--surface);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,.3); color: #ffffff;
          transition: transform .15s, background .15s;
        }
        .prof-avatar-btn:hover { transform: scale(1.1); background: var(--green-mid); }
        .prof-meta { flex: 1; }
        .prof-name  { font-size: 1.2rem; font-weight: 800; color: var(--ink); }
        .prof-uname { font-size: .78rem; color: var(--ink3); margin-top: .18rem; }
        .prof-badge {
          display: inline-flex; align-items: center; gap: .35rem;
          margin-top: .55rem; padding: .28rem .85rem; border-radius: 999px;
          font-size: .72rem; font-weight: 700; color: #fff;
        }
        .prof-tab-container {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 14px; box-shadow: 0 4px 20px rgba(0,0,0,.12); overflow: hidden;
        }
        .prof-tabs {
          display: flex; border-bottom: 2px solid #e5e7e0;
          padding: 0 1.75rem; background: var(--surface2);
        }
        .prof-tab {
          display: flex; align-items: center; gap: .5rem;
          padding: .85rem 1.25rem; font-size: .85rem; font-weight: 600;
          color: var(--ink3); border: none; background: none; cursor: pointer;
          border-bottom: 2.5px solid transparent; margin-bottom: -2px;
          transition: color .15s, border-color .15s; font-family: inherit; white-space: nowrap;
        }
        .prof-tab:hover { color: var(--ink); }
        .prof-tab.active { color: #4ade80; border-bottom-color: #4ade80; }
        .prof-card { padding: 1.5rem 1.75rem; }
        .prof-card-title { font-size: 1rem; font-weight: 800; color: var(--ink); margin-bottom: .25rem; }
        .prof-card-sub   { font-size: .78rem; color: var(--ink3); margin-bottom: 1.5rem; }
        .pf-field { margin-bottom: 1.15rem; }
        .pf-label { display: block; font-size: .72rem; font-weight: 700; color: var(--ink2); letter-spacing: .4px; text-transform: uppercase; margin-bottom: .42rem; }
        .pf-input-wrap { position: relative; }
        .pf-input {
          width: 100%; padding: .7rem 1rem; border: 1.5px solid var(--border);
          border-radius: 8px; font-size: .88rem; color: var(--ink);
          background: rgba(255,255,255,0.05); outline: none; font-family: inherit; transition: border-color .2s, box-shadow .2s;
        }
        .pf-input:focus { border-color: #1B4332; background: rgba(255,255,255,0.05); box-shadow: 0 0 0 3px rgba(27,67,50,.09); }
        .pf-input.has-icon { padding-right: 2.6rem; }
        .pf-eye { position: absolute; right: .75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--ink3); display: flex; align-items: center; padding: 0; }
        .pf-eye:hover { color: var(--ink); }
        .pw-strength { margin-top: .45rem; }
        .pw-strength-bar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); overflow: hidden; margin-bottom: .3rem; }
        .pw-strength-fill { height: 100%; border-radius: 2px; transition: width .3s, background .3s; }
        .pw-strength-label { font-size: .7rem; font-weight: 600; }
        .pf-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: .45rem;
          padding: .75rem 1.5rem; border-radius: 8px; font-size: .875rem;
          font-weight: 700; cursor: pointer; border: none; font-family: inherit; transition: opacity .2s, transform .15s, box-shadow .2s;
        }
        .pf-btn-primary { background: linear-gradient(135deg, var(--green-mid), var(--green-vivid)); color: #fff; box-shadow: 0 3px 12px rgba(27,67,50,.25); }
        .pf-btn-primary:hover:not(:disabled) { opacity: .9; transform: translateY(-1px); box-shadow: 0 5px 16px rgba(27,67,50,.3); }
        .pf-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
        .pf-alert { display: flex; align-items: center; gap: .5rem; padding: .75rem 1rem; border-radius: 8px; font-size: .83rem; font-weight: 500; margin-bottom: 1rem; }
        .pf-alert.ok  { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; }
        .pf-alert.err { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
        .info-section { display: flex; flex-direction: column; gap: .85rem; margin-bottom: 1.5rem; }
        .info-row-item { display: flex; align-items: center; justify-content: space-between; padding: .8rem 1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 8px; }
        .info-row-key { font-size: .78rem; color: var(--ink3); font-weight: 600; text-transform: uppercase; letter-spacing: .4px; }
        .info-row-val { font-size: .9rem; color: var(--ink); font-weight: 600; }
        .pf-divider { height: 1px; background: var(--border); margin: 1.5rem 0; }
        .sec-tips { display: flex; flex-direction: column; gap: .6rem; margin-top: 1.5rem; }
        .sec-tip { display: flex; align-items: flex-start; gap: .6rem; padding: .7rem .9rem; background: rgba(74, 222, 128, 0.1); border: 1px solid rgba(74, 222, 128, 0.2); border-radius: 8px; }
        .sec-tip-text  { font-size: .78rem; color: var(--ink); line-height: 1.5; }
        .sec-tip-title { font-weight: 700; font-size: .8rem; color: #4ade80; }
      `}</style>

      <Navbar />
      <div className="wrap prof-wrap">
        <div className="phead" style={{ marginBottom: '1.35rem' }}>
          <div className="bc">SiPantau / <span>Profil</span></div>
          <h1>Profil Saya</h1>
          <p>Kelola informasi profil dan keamanan akun Anda</p>
        </div>

        {/* ── Hero ── */}
        {user && (
          <div className="prof-hero" style={{ '--av-c1': divisiColor, '--av-c2': divisiColor + 'cc' } as React.CSSProperties}>
            <div className="prof-avatar-wrap">
              <div className="prof-avatar">
                {user.foto_profil ? (
                  <img src={user.foto_profil} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  (user.nama || user.username).charAt(0).toUpperCase()
                )}
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handleGantiFoto} />
              <button className="prof-avatar-btn" title="Ganti foto profil" onClick={() => fileInputRef.current?.click()} disabled={fotoLoading}>
                <Camera size={12} />
              </button>
            </div>
            <div className="prof-meta">
              <div className="prof-name">{user.nama}</div>
              <div className="prof-uname">@{user.username}</div>
              <div className="prof-badge" style={{ background: divisiColor }}>
                <BadgeCheck size={12} />{divisiLabel}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '.35rem' }}>
              <div style={{ fontSize: '.72rem', color: 'var(--ink3)' }}>Level akses</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{user.level}</div>
              <div style={{ fontSize: '.68rem', color: 'var(--ink4)' }}>
                {user.level === 1 ? 'Tertinggi' : user.level === 2 ? 'Menengah' : 'Standar'}
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="prof-tab-container">
          <div className="prof-tabs">
            <button className={`prof-tab${activeTab === 'profil' ? ' active' : ''}`} onClick={() => setActiveTab('profil')}>
              <Pencil size={15} /> Edit Profil
            </button>
            <button className={`prof-tab${activeTab === 'keamanan' ? ' active' : ''}`} onClick={() => setActiveTab('keamanan')}>
              <Shield size={15} /> Keamanan
            </button>
          </div>

          {/* TAB: EDIT PROFIL */}
          {activeTab === 'profil' && (
            <div className="prof-card">
              <div className="prof-card-title">Informasi Profil</div>
              <div className="prof-card-sub">Perbarui nama tampilan akun Anda</div>
              <div className="info-section">
                <div className="info-row-item" title="Username tidak dapat diubah">
                  <div><div className="info-row-key">Username</div><div className="info-row-val">@{user?.username}</div></div>
                  <Lock size={14} color="#9ca3af" />
                </div>
                <div className="info-row-item" title="Hubungi Super Admin jika ingin mengubah Divisi">
                  <div><div className="info-row-key">Divisi / Peran</div><div className="info-row-val">{divisiLabel || '-'}</div></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: divisiColor, display: 'inline-block' }} />
                    <Lock size={14} color="#9ca3af" />
                  </div>
                </div>
              </div>
              <div className="pf-divider" />
              <form onSubmit={handleEditProfil}>
                {editMsg && (
                  <div className={`pf-alert ${editMsg.type}`}>
                    {editMsg.type === 'ok' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                    {editMsg.text}
                  </div>
                )}
                <div className="pf-field">
                  <label className="pf-label">Nama Lengkap</label>
                  <input className="pf-input" type="text" placeholder="Masukkan nama lengkap"
                    value={editNama} onChange={e => setEditNama(e.target.value)} maxLength={80} required />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="pf-btn pf-btn-primary" disabled={editLoading}>
                    {editLoading ? 'Menyimpan...' : <><User size={15} /> Simpan Perubahan</>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB: KEAMANAN */}
          {activeTab === 'keamanan' && (
            <div className="prof-card" style={{ borderTop: '1px solid #f0f0ec' }}>
              <div className="prof-card-title">Ganti Password</div>
              <div className="prof-card-sub">Pastikan akun Anda menggunakan password yang kuat dan unik</div>
              <form onSubmit={handleGantiPassword}>
                {pwMsg && (
                  <div className={`pf-alert ${pwMsg.type}`}>
                    {pwMsg.type === 'ok' ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
                    {pwMsg.text}
                  </div>
                )}
                <div className="pf-field">
                  <label className="pf-label">Password Saat Ini</label>
                  <div className="pf-input-wrap">
                    <input className="pf-input has-icon" type={showPw.lama ? 'text' : 'password'} placeholder="Masukkan password saat ini"
                      value={pwLama} onChange={e => setPwLama(e.target.value)} required />
                    <button type="button" className="pf-eye" onClick={() => togglePw('lama')}>
                      {showPw.lama ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="pf-divider" style={{ margin: '1rem 0' }} />
                <div className="pf-field">
                  <label className="pf-label">Password Baru</label>
                  <div className="pf-input-wrap">
                    <input className="pf-input has-icon" type={showPw.baru ? 'text' : 'password'} placeholder="Minimal 6 karakter"
                      value={pwBaru} onChange={e => setPwBaru(e.target.value)} required />
                    <button type="button" className="pf-eye" onClick={() => togglePw('baru')}>
                      {showPw.baru ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwStrength && (
                    <div className="pw-strength">
                      <div className="pw-strength-bar">
                        <div className="pw-strength-fill" style={{ width: `${(pwStrength.level + 1) * 25}%`, background: pwStrength.color }} />
                      </div>
                      <div className="pw-strength-label" style={{ color: pwStrength.color }}>{pwStrength.label}</div>
                    </div>
                  )}
                </div>
                <div className="pf-field">
                  <label className="pf-label">Konfirmasi Password Baru</label>
                  <div className="pf-input-wrap">
                    <input className="pf-input has-icon" type={showPw.konfirm ? 'text' : 'password'} placeholder="Ulangi password baru"
                      value={pwKonfirm} onChange={e => setPwKonfirm(e.target.value)} required />
                    <button type="button" className="pf-eye" onClick={() => togglePw('konfirm')}>
                      {showPw.konfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {pwKonfirm && pwBaru && (
                    <div style={{ marginTop: '.35rem', fontSize: '.72rem', fontWeight: 600, color: pwKonfirm === pwBaru ? '#22c55e' : '#ef4444' }}>
                      {pwKonfirm === pwBaru ? '✓ Password cocok' : '✗ Password tidak cocok'}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button type="submit" className="pf-btn pf-btn-primary" disabled={pwLoading}>
                    {pwLoading ? 'Memperbarui...' : <><KeyRound size={15} /> Perbarui Password</>}
                  </button>
                </div>
              </form>
              <div className="pf-divider" />
              <div style={{ fontSize: '.8rem', fontWeight: 700, color: 'var(--ink)', marginBottom: '.75rem', display: 'flex', alignItems: 'center', gap: '.4rem' }}>
                <Lock size={14} /> Tips Keamanan
              </div>
              <div className="sec-tips">
                {[
                  { title: 'Gunakan kombinasi karakter', body: 'Campurkan huruf besar, kecil, angka, dan simbol.' },
                  { title: 'Jangan gunakan informasi pribadi', body: 'Hindari nama, tanggal lahir, atau username sebagai password.' },
                  { title: 'Minimal 8 karakter', body: 'Semakin panjang password, semakin sulit ditebak.' },
                ].map((tip, i) => (
                  <div key={i} className="sec-tip">
                    <CheckCircle size={15} color="#16a34a" style={{ flexShrink: 0, marginTop: 1 }} />
                    <div className="sec-tip-text"><div className="sec-tip-title">{tip.title}</div>{tip.body}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
