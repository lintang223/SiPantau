'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from '@/components/Navbar'

type User = { id: number; username: string; password_plain: string; nama: string; role: string; created_at: string }

const API = 'http://localhost:8000'

export default function KelolaUserPage() {
  const router = useRouter()
  const [users, setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Form tambah user
  const [form, setForm]           = useState({ username: '', password: '', nama: '', role: 'user' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]   = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Inline edit password
  const [editPw, setEditPw]     = useState<Record<string, string>>({})   // username -> pw baru
  const [editMsg, setEditMsg]   = useState<Record<string, { type: string; text: string }>>({})
  const [editSaving, setEditSaving] = useState<Record<string, boolean>>({})
  const [showPw, setShowPw]     = useState<Record<string, boolean>>({})  // toggle show/hide

  useEffect(() => {
    const auth = sessionStorage.getItem('sipantau_auth')
    const userData = sessionStorage.getItem('sipantau_user')
    if (!auth) { router.push('/'); return }
    if (userData) {
      const u = JSON.parse(userData)
      if (u.role !== 'admin') { router.push('/dashboard'); return }
    }
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/users`)
      const data = await res.json()
      setUsers(data.users)
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
      setForm({ username: '', password: '', nama: '', role: 'user' })
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
        setEditPw(prev => ({ ...prev, [username]: '' }))
        setTimeout(() => setEditMsg(prev => ({ ...prev, [username]: { type: '', text: '' } })), 2000)
      }
    } catch {
      setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: 'Koneksi gagal' } }))
    }
    setEditSaving(prev => ({ ...prev, [username]: false }))
  }

  return (
    <>
      <style>{`
        .ku-wrap { display: grid; grid-template-columns: 340px 1fr; gap: 1.5rem; align-items: start; }
        .ku-card { background: var(--surface); border-radius: var(--r); padding: 1.5rem; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .ku-title { font-size: .95rem; font-weight: 700; color: var(--ink); margin-bottom: 1rem; }
        .ku-field { margin-bottom: .85rem; }
        .ku-label { display: block; font-size: .7rem; font-weight: 700; color: var(--ink2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: .35rem; }
        .ku-input { width: 100%; padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .85rem; color: var(--ink); background: var(--bg); outline: none; font-family: inherit; transition: border-color .2s; }
        .ku-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(27,67,50,.1); }
        .ku-select { width: 100%; padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .85rem; background: var(--bg); outline: none; font-family: inherit; color: var(--ink); }
        .ku-btn { width: 100%; padding: .7rem; background: linear-gradient(135deg, #163f24, var(--green)); color: #fff; border: none; border-radius: var(--r-sm); font-size: .85rem; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: .35rem; }
        .ku-btn:disabled { opacity: .65; cursor: not-allowed; }
        .ku-success { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: .6rem .85rem; border-radius: var(--r-sm); font-size: .8rem; margin-bottom: .75rem; }
        .ku-error   { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626;  padding: .6rem .85rem; border-radius: var(--r-sm); font-size: .8rem; margin-bottom: .75rem; }
        .ku-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .ku-table th { text-align: left; padding: .6rem .85rem; font-size: .68rem; text-transform: uppercase; letter-spacing: .4px; color: var(--ink3); border-bottom: 2px solid var(--border); white-space: nowrap; }
        .ku-table td { padding: .6rem .85rem; border-bottom: 1px solid var(--border); color: var(--ink2); vertical-align: middle; }
        .ku-table tr:last-child td { border-bottom: none; }
        .ku-table tr:hover td { background: var(--green-light); }
        .role-badge { display: inline-block; padding: 2px 10px; border-radius: 99px; font-size: .68rem; font-weight: 700; }
        .role-admin { background: #fef3c7; color: #92400e; }
        .role-user  { background: #e8f7e9; color: #1a5c2e; }
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
        @media (max-width: 900px) { .ku-wrap { grid-template-columns: 1fr; } }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ marginBottom: '1.5rem' }}>
          <div className="bc">SiPantau / <span>Kelola User</span></div>
          <h1>Kelola User</h1>
          <p>Tambah, hapus, dan atur password akun pengguna</p>
        </div>

        <div className="ku-wrap">
          {/* Form Tambah User */}
          <div className="ku-card">
            <div className="ku-title">➕ Tambah User Baru</div>
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
              <div className="ku-field">
                <label className="ku-label">Role</label>
                <select className="ku-select" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {formError   && <div className="ku-error">⚠️ {formError}</div>}
              {formSuccess && <div className="ku-success">✅ {formSuccess}</div>}
              <button type="submit" className="ku-btn" disabled={formLoading}>
                {formLoading ? '⏳ Menyimpan...' : '➕ Tambah User'}
              </button>
            </form>
          </div>

          {/* Tabel User */}
          <div className="ku-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div className="ku-title" style={{ marginBottom: 0 }}>👥 Daftar User ({users.length})</div>
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
                      <th>Role</th>
                      <th>Password</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(u => (
                      <tr key={u.id}>
                        <td style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.nama}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>{u.username}</td>
                        <td>
                          <span className={`role-badge ${u.role === 'admin' ? 'role-admin' : 'role-user'}`}>
                            {u.role}
                          </span>
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
                            <button type="button" className="pw-toggle"
                              onClick={() => setShowPw(prev => ({ ...prev, [u.username]: !prev[u.username] }))}>
                              {showPw[u.username] ? '👁‍🗨' : '👁'}
                            </button>
                            {u.username !== 'admin' && (
                              <button type="button" className="pw-save"
                                onClick={() => handleSavePw(u.username)}
                                disabled={editSaving[u.username] || !editPw[u.username]}>
                                {editSaving[u.username] ? '...' : '💾'}
                              </button>
                            )}
                          </div>
                          {editMsg[u.username]?.text && (
                            <div className={editMsg[u.username].type === 'error' ? 'pw-msg-err' : 'pw-msg-ok'}
                              style={{ marginTop: 3 }}>
                              {editMsg[u.username].type === 'error' ? '⚠️' : '✅'} {editMsg[u.username].text}
                            </div>
                          )}
                        </td>
                        <td>
                          {u.username !== 'admin' && (
                            <button className="hapus-btn" onClick={() => handleHapus(u.username)}>Hapus</button>
                          )}
                        </td>
                      </tr>
                    ))}
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