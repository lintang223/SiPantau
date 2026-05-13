'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar, { UserSession } from '@/components/Navbar'
import { UserPlus, Eye, EyeOff, Save, CheckCircle, AlertTriangle, Users } from "lucide-react";

type User = {
  id: number;
  username: string;
  password_plain: string;
  nama: string;
  divisi: string;
  level: number;
  can_export: boolean;
  can_manage_users: boolean;
  created_at: string;
}

const API = 'http://localhost:8000'

const DIVISI_OPTIONS = [
  { value: 'superadmin', label: 'Admin' },
  { value: 'sekdit',     label: 'Sekditjen' },
  { value: 'pengawasan', label: 'Pengawasan' },
  { value: 'pengaduan',  label: 'Pengaduan' },
]

const DIVISI_COLOR: Record<string, string> = {
  superadmin: '#7c3aed', // purple
  sekdit:     '#1B4332', // dark green
  pengawasan: '#1d4ed8', // blue
  pengaduan:  '#c2410c', // orange
}

export default function KelolaUserPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  const [users, setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Form tambah user
  const [form, setForm] = useState({ username: '', password: '', nama: '', divisi: 'pengawasan' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Inline edit password
  const [editPw, setEditPw]     = useState<Record<string, string>>({})
  const [editMsg, setEditMsg]   = useState<Record<string, { type: string; text: string }>>({})
  const [editSaving, setEditSaving] = useState<Record<string, boolean>>({})
  const [showPw, setShowPw]     = useState<Record<string, boolean>>({})

  useEffect(() => {
    const auth = sessionStorage.getItem('sipantau_auth')
    const userData = sessionStorage.getItem('sipantau_user')
    if (!auth) { router.push('/'); return }
    if (userData) {
      const u: UserSession = JSON.parse(userData)
      setCurrentUser(u)
      // Gate: must have can_manage_users
      if (!u.can_manage_users) { router.push('/akses-ditolak'); return }
    }
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/users`)
      const data = await res.json()
      // Exclude unused old data ("umum", "operator") from display to keep it clean
      const filtered = data.users.filter((u: User) => ['superadmin', 'sekdit', 'pengawasan', 'pengaduan'].includes(u.divisi))
      setUsers(filtered)
    } catch { }
    setLoading(false)
  }

  const handleTambah = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(''); setFormSuccess('')
    if (form.password.length < 6) { setFormError('Password minimal 6 karakter'); return }
    setFormLoading(true)
    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.detail || 'Gagal tambah user'); setFormLoading(false); return }
      setFormSuccess(`User '${form.username}' berhasil ditambahkan!`)
      setForm({ username: '', password: '', nama: '', divisi: 'pengawasan' })
      fetchUsers()
    } catch { setFormError('Tidak bisa terhubung ke server') }
    setFormLoading(false)
  }

  const handleHapus = async (username: string) => {
    if (!confirm(`Hapus user '${username}'?`)) return
    try {
      const res = await fetch(`${API}/api/users/${username}`, { method: 'DELETE' })
      if (res.ok) fetchUsers()
    } catch { }
  }

  const handleSavePw = async (username: string) => {
    const pw = editPw[username] || ''
    if (pw.length < 6) {
      setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: 'Min. 6 karakter' } }))
      return
    }
    setEditSaving(prev => ({ ...prev, [username]: true }))
    try {
      const res = await fetch(`${API}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password_baru: pw })
      })
      const data = await res.json()
      if (!res.ok) {
        setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: data.detail || 'Gagal' } }))
      } else {
        setEditMsg(prev => ({ ...prev, [username]: { type: 'success', text: 'Tersimpan!' } }))
        setEditPw(prev => { const next = { ...prev }; delete next[username]; return next; })
        fetchUsers()
        setTimeout(() => setEditMsg(prev => ({ ...prev, [username]: { type: '', text: '' } })), 2000)
      }
    } catch {
      setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: 'Koneksi gagal' } }))
    }
    setEditSaving(prev => ({ ...prev, [username]: false }))
  }

  const getAccessDescription = (divisi: string) => {
    if (divisi === 'superadmin') return "Dapat mengawasi semuanya (Sekditjen, Pengawasan, Pengaduan)";
    if (divisi === 'sekdit') return "Dapat melihat data divisi Pengawasan & Pengaduan";
    return "Hanya dapat melihat data milik sendiri";
  };

  return (
    <>
      <style>{`
        .ku-wrap { display: grid; grid-template-columns: 360px 1fr; gap: 1.5rem; align-items: start; }
        .ku-card { background: var(--surface); border-radius: var(--r-md); padding: 1.5rem; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .ku-title { font-size: .95rem; font-weight: 700; color: var(--ink); margin-bottom: 1rem; }
        .ku-field { margin-bottom: .85rem; }
        .ku-label { display: block; font-size: .7rem; font-weight: 700; color: var(--ink2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: .35rem; }
        .ku-input { width: 100%; padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .85rem; color: var(--ink); background: var(--bg); outline: none; font-family: inherit; transition: border-color .2s; }
        .ku-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(27,67,50,.1); }
        .ku-select { width: 100%; padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .85rem; background: var(--bg); outline: none; font-family: inherit; color: var(--ink); cursor: pointer; }
        .ku-btn { width: 100%; padding: .7rem; background: var(--green); color: #fff; border: none; border-radius: var(--r-sm); font-size: .85rem; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: .35rem; transition: background .15s; }
        .ku-btn:hover { background: var(--green-mid); }
        .ku-btn:disabled { opacity: .65; cursor: not-allowed; }
        .ku-success { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: .6rem .85rem; border-radius: var(--r-sm); font-size: .8rem; margin-bottom: .75rem; }
        .ku-error   { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: .6rem .85rem; border-radius: var(--r-sm); font-size: .8rem; margin-bottom: .75rem; }
        .ku-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .ku-table th { text-align: left; padding: .6rem .85rem; font-size: .68rem; text-transform: uppercase; letter-spacing: .4px; color: var(--ink3); border-bottom: 2px solid var(--border); white-space: nowrap; }
        .ku-table td { padding: .6rem .85rem; border-bottom: 1px solid var(--border); color: var(--ink2); vertical-align: middle; }
        .ku-table tr:last-child td { border-bottom: none; }
        .ku-table tr:hover td { background: var(--green-pale); }
        .pw-wrap { display: flex; align-items: center; gap: .4rem; }
        .pw-input { flex: 1; padding: .4rem .65rem; border: 1.5px solid var(--border); border-radius: 7px; font-size: .8rem; color: var(--ink); background: var(--bg); outline: none; font-family: inherit; min-width: 0; transition: border-color .2s; }
        .pw-input:focus { border-color: var(--green); }
        .pw-toggle { background: none; border: none; cursor: pointer; font-size: .8rem; color: var(--ink3); padding: 0 2px; flex-shrink: 0; }
        .pw-save { background: var(--green); color: #fff; border: none; border-radius: 7px; padding: .38rem .75rem; font-size: .75rem; font-weight: 700; cursor: pointer; flex-shrink: 0; white-space: nowrap; }
        .pw-save:disabled { opacity: .6; cursor: not-allowed; }
        .pw-msg-ok  { font-size: .7rem; color: #15803d; font-weight: 600; white-space: nowrap; }
        .pw-msg-err { font-size: .7rem; color: #dc2626; font-weight: 600; white-space: nowrap; }
        .hapus-btn { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 3px 10px; font-size: .75rem; cursor: pointer; font-weight: 600; }
        .hapus-btn:hover { background: #fee2e2; }
        
        .badge-divisi { display: inline-block; padding: .2rem .65rem; border-radius: 999px; font-size: .7rem; font-weight: 700; color: #fff; }
        @media (max-width: 900px) { .ku-wrap { grid-template-columns: 1fr; } }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ marginBottom: '1.5rem' }}>
          <div className="bc">Sipantau / <span>Kelola User</span></div>
          <h1>Kelola User</h1>
          <p>Tambah, hapus, dan atur Divisi pengguna</p>
        </div>

        <div className="ku-wrap">
          {/* Form Tambah User */}
          <div className="ku-card">
            <div className="ku-title" style={{ display: "flex", alignItems: "center", gap: ".5rem" }}><UserPlus size={18} /> Tambah User Baru</div>
            <form onSubmit={handleTambah}>
              <div className="ku-field">
                <label className="ku-label">Nama Lengkap</label>
                <input className="ku-input" type="text" placeholder="Nama lengkap"
                  value={form.nama} onChange={e => setForm({ ...form, nama: e.target.value })} required />
              </div>
              <div className="ku-field">
                <label className="ku-label">Username</label>
                <input className="ku-input" type="text" placeholder="Username untuk login"
                  value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} required />
              </div>
              <div className="ku-field">
                <label className="ku-label">Password</label>
                <input className="ku-input" type="text" placeholder="Minimal 6 karakter"
                  value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
              </div>
              <div className="ku-field" style={{ marginBottom: '1.25rem' }}>
                <label className="ku-label">Divisi Akses</label>
                <select className="ku-select" value={form.divisi} onChange={e => setForm({ ...form, divisi: e.target.value })}>
                  {DIVISI_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
                <div style={{ marginTop: '.4rem', fontSize: '.7rem', color: 'var(--ink3)' }}>
                  Akses: <strong>{getAccessDescription(form.divisi)}</strong>
                </div>
              </div>

              {formError   && <div className="ku-error" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><AlertTriangle size={15} /> {formError}</div>}
              {formSuccess && <div className="ku-success" style={{ display: "flex", alignItems: "center", gap: ".4rem" }}><CheckCircle size={15} /> {formSuccess}</div>}
              <button type="submit" className="ku-btn" disabled={formLoading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
                {formLoading ? 'Menyimpan...' : <><UserPlus size={16} /> Tambah User</>}
              </button>
            </form>
          </div>

          {/* Tabel User */}
          <div className="ku-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div className="ku-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: ".5rem" }}><Users size={18} /> Daftar User ({users.length})</div>
            </div>
            {loading ? (
              <p style={{ padding: '1.5rem', color: 'var(--ink3)', fontSize: '.85rem' }}>Memuat...</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ku-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Username</th>
                      <th>Divisi</th>
                      <th>Password</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => {
                      const divLabel = DIVISI_OPTIONS.find(o => o.value === u.divisi)?.label || u.divisi;
                      const divColor = DIVISI_COLOR[u.divisi] || '#374151';
                      return (
                        <tr key={u.id}>
                          <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.nama}</td>
                          <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{u.username}</td>
                          <td>
                            <span className="badge-divisi" style={{ background: divColor }}>{divLabel}</span>
                          </td>
                          <td style={{ minWidth: 200 }}>
                            <div className="pw-wrap">
                              <input
                                className="pw-input"
                                type={showPw[u.username] ? 'text' : 'password'}
                                value={editPw[u.username] !== undefined ? editPw[u.username] : (u.password_plain || '')}
                                onChange={e => setEditPw(prev => ({ ...prev, [u.username]: e.target.value }))}
                                placeholder="—"
                                readOnly={u.username === 'admin'}
                              />
                              <button type="button" className="pw-toggle" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                onClick={() => setShowPw(prev => ({ ...prev, [u.username]: !prev[u.username] }))}>
                                {showPw[u.username] ? <EyeOff size={15} /> : <Eye size={15} />}
                              </button>
                              {u.username !== 'admin' && (
                                <button type="button" className="pw-save" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
                                  onClick={() => handleSavePw(u.username)}
                                  disabled={editSaving[u.username] || !editPw[u.username]}>
                                  {editSaving[u.username] ? '...' : <Save size={14} />}
                                </button>
                              )}
                            </div>
                            {editMsg[u.username]?.text && (
                              <div className={editMsg[u.username].type === 'error' ? 'pw-msg-err' : 'pw-msg-ok'}
                                style={{ marginTop: 4, display: "flex", alignItems: "center", gap: ".3rem" }}>
                                {editMsg[u.username].type === 'error' ? <AlertTriangle size={12} /> : <CheckCircle size={12} />} {editMsg[u.username].text}
                              </div>
                            )}
                          </td>
                          <td>
                            {u.username !== 'admin' && (
                              <button className="hapus-btn" onClick={() => handleHapus(u.username)}>Hapus</button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}