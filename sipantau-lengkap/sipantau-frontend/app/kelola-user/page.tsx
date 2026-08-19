'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar, { UserSession } from '@/components/Navbar'
import { UserPlus, Eye, EyeOff, Save, CheckCircle, AlertTriangle, Users, Trash2, X } from "lucide-react";
import { apiFetch } from '@/lib/api'
import { DIVISI_OPTIONS, DIVISI_COLOR, DIVISI_LABEL_SHORT } from '@/lib/constants'

type User = {
  id: number;
  username: string;
  nama: string;
  divisi: string;
  level: number;
  can_export: boolean;
  can_manage_users: boolean;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

// ── Modal Konfirmasi Custom ──────────────────────────────────────────────────
function ConfirmModal({ username, onConfirm, onCancel }: { username: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 999, backdropFilter: 'blur(3px)' }} onClick={onCancel} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1000, background: 'var(--surface)', borderRadius: 16, padding: '1.75rem 2rem',
        width: 'min(420px, 92vw)', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={18} color="#dc2626" />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1a1a1a' }}>Hapus User</div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af' }}><X size={18} /></button>
        </div>
        <p style={{ fontSize: '.88rem', color: '#374151', lineHeight: 1.6, marginBottom: '1.5rem' }}>
          Yakin ingin menonaktifkan user <strong>@{username}</strong>? (Soft Delete)
        </p>
        <div style={{ display: 'flex', gap: '.75rem', justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '.6rem 1.2rem', borderRadius: 8, border: '1.5px solid #e5e7e0',
            background: 'rgba(255,255,255,0.05)', fontSize: '.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--ink2)',
          }}>Batal</button>
          <button onClick={onConfirm} style={{
            padding: '.6rem 1.2rem', borderRadius: 8, border: 'none',
            background: '#dc2626', color: '#fff', fontSize: '.85rem', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '.4rem',
          }}><Trash2 size={15} /> Nonaktifkan</button>
        </div>
      </div>
    </>
  )
}

export default function KelolaUserPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null)
  const [users, setUsers]   = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Form tambah user
  const [form, setForm] = useState({ username: '', password: '', nama: '', divisi: 'balai_gakkum' })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError]     = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [showFormPw, setShowFormPw]   = useState(false)

  // Inline edit password
  const [editPw, setEditPw]         = useState<Record<string, string>>({})
  const [editMsg, setEditMsg]       = useState<Record<string, { type: string; text: string }>>({})
  const [editSaving, setEditSaving] = useState<Record<string, boolean>>({})
  const [showPw, setShowPw]         = useState<Record<string, boolean>>({})

  // Konfirmasi hapus
  const [confirmUsername, setConfirmUsername] = useState<string | null>(null)

  useEffect(() => {
    const auth = localStorage.getItem('sipantau_auth')
    const userData = localStorage.getItem('sipantau_user')
    if (!auth) { router.push('/'); return }
    if (userData) {
      const u: UserSession = JSON.parse(userData)
      setCurrentUser(u)
      if (!u.can_manage_users) { router.push('/akses-ditolak'); return }
    }
    fetchUsers()
  }, [router])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res = await apiFetch('/api/users?include_deleted=true')
      const data = await res.json()
      const filtered = data.users.filter((u: User) => [
        'sekditjen', 'dit_ppsa', 'balai_gakkum',
        'gakkum_sumatra', 'gakkum_jabalnusra', 'gakkum_kalimantan', 'gakkum_sulawesi', 'gakkum_malupapua'
      ].includes(u.divisi))
      setUsers(filtered)
    } catch { }
    setLoading(false)
  }

  const handleTambah = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(''); setFormSuccess('')
    if (form.password.length < 8) { setFormError('Password minimal 8 karakter'); return }
    setFormLoading(true)
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setFormError(data.detail || 'Gagal tambah user'); setFormLoading(false); return }
      setFormSuccess(`User '${form.username}' berhasil ditambahkan!`)
      setForm({ username: '', password: '', nama: '', divisi: 'balai_gakkum' })
      fetchUsers()
    } catch (err: unknown) {
      setFormError(err instanceof Error ? err.message : 'Tidak bisa terhubung ke server')
    }
    setFormLoading(false)
  }

  const handleHapus = async (username: string) => {
    try {
      const res = await apiFetch(`/api/users/${username}`, { method: 'DELETE' })
      if (res.ok) fetchUsers()
    } catch { }
    setConfirmUsername(null)
  }

  const handleRestore = async (username: string) => {
    try {
      const res = await apiFetch(`/api/users/${username}/restore`, { method: 'PUT' })
      if (res.ok) fetchUsers()
    } catch { }
  }

  const handleSavePw = async (username: string) => {
    const pw = editPw[username] || ''
    if (pw.length < 8) {
      setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: 'Min. 8 karakter' } }))
      return
    }
    setEditSaving(prev => ({ ...prev, [username]: true }))
    try {
      const res = await apiFetch('/api/users/reset-password', {
        method: 'POST',
        body: JSON.stringify({ username, password_baru: pw }),
      })
      const data = await res.json()
      if (!res.ok) {
        setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: data.detail || 'Gagal' } }))
      } else {
        setEditMsg(prev => ({ ...prev, [username]: { type: 'success', text: 'Password berhasil direset!' } }))
        setEditPw(prev => { const next = { ...prev }; delete next[username]; return next; })
        setTimeout(() => setEditMsg(prev => ({ ...prev, [username]: { type: '', text: '' } })), 2500)
      }
    } catch {
      setEditMsg(prev => ({ ...prev, [username]: { type: 'error', text: 'Koneksi gagal' } }))
    }
    setEditSaving(prev => ({ ...prev, [username]: false }))
  }

  const getAccessDescription = (divisi: string) => {
    if (divisi === 'sekditjen')    return "Dapat mengawasi semuanya (Dit. PPSA & Balai Gakkum)";
    if (divisi === 'dit_ppsa')     return "Dapat melihat data Balai Gakkum";
    if (divisi.includes('gakkum')) return "Hanya dapat mengakses data divisinya sendiri";
    return "Akses divisi";
  };

  const filteredUsers = users.filter(u => 
    u.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.divisi.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <style>{`
        .ku-wrap { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 1.5rem; align-items: start; }
        .ku-card { background: var(--surface); border-radius: var(--r-md); padding: 1.5rem; border: 1px solid var(--border); box-shadow: var(--shadow-sm); }
        .ku-title { font-size: .95rem; font-weight: 700; color: var(--ink); margin-bottom: 1rem; }
        .ku-field { margin-bottom: .85rem; }
        .ku-label { display: block; font-size: .7rem; font-weight: 700; color: var(--ink2); text-transform: uppercase; letter-spacing: .5px; margin-bottom: .35rem; }
        .ku-input { width: 100%; padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .85rem; color: var(--ink); background: var(--bg); outline: none; font-family: inherit; transition: border-color .2s; }
        .ku-input:focus { border-color: var(--green); box-shadow: 0 0 0 3px rgba(27,67,50,.1); }
        .ku-pw-wrap { position: relative; }
        .ku-pw-eye { position: absolute; right: .65rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; display: flex; align-items: center; padding: 0; }
        .ku-select { width: 100%; padding: .6rem .85rem; border: 1.5px solid var(--border); border-radius: var(--r-sm); font-size: .85rem; background: var(--bg); outline: none; font-family: inherit; color: var(--ink); cursor: pointer; }
        .ku-btn { width: 100%; padding: .7rem; background: var(--green); color: #fff; border: none; border-radius: var(--r-sm); font-size: .85rem; font-weight: 700; cursor: pointer; font-family: inherit; margin-top: .35rem; transition: background .15s; }
        .ku-btn:hover { background: var(--green-mid); }
        .ku-btn:disabled { opacity: .65; cursor: not-allowed; }
        .ku-success { background: #f0fdf4; border: 1px solid #86efac; color: #15803d; padding: .6rem .85rem; border-radius: var(--r-sm); font-size: .8rem; margin-bottom: .75rem; display: flex; align-items: center; gap: .4rem; }
        .ku-error   { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; padding: .6rem .85rem; border-radius: var(--r-sm); font-size: .8rem; margin-bottom: .75rem; display: flex; align-items: center; gap: .4rem; }
        .ku-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .ku-table th { position: sticky; top: 0; background: var(--surface); z-index: 10; text-align: left; padding: .6rem .85rem; font-size: .68rem; text-transform: uppercase; letter-spacing: .4px; color: var(--ink3); border-bottom: 2px solid var(--border); white-space: nowrap; }
        .ku-table td { padding: .6rem .85rem; border-bottom: 1px solid var(--border); color: var(--ink2); vertical-align: middle; }
        .ku-table tr:last-child td { border-bottom: none; }
        .ku-table tr:hover td { background: var(--green-pale); }
        .pw-wrap { display: flex; align-items: center; gap: .4rem; }
        .pw-input { width: 100%; flex: 1; padding: .4rem .65rem; border: 1.5px solid var(--border); border-radius: 7px; font-size: .8rem; color: var(--ink); background: var(--bg); outline: none; font-family: inherit; min-width: 0; transition: border-color .2s; }
        .pw-input:focus { border-color: var(--green); }
        .pw-toggle { background: none; border: none; cursor: pointer; font-size: .8rem; color: var(--ink3); padding: 0 2px; flex-shrink: 0; display: flex; align-items: center; }
        .pw-save { background: var(--green); color: #fff; border: none; border-radius: 7px; padding: .38rem .75rem; font-size: .75rem; font-weight: 700; cursor: pointer; flex-shrink: 0; white-space: nowrap; display: flex; align-items: center; gap: .3rem; }
        .pw-save:disabled { opacity: .6; cursor: not-allowed; }
        .pw-msg-ok  { font-size: .7rem; color: #15803d; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: .3rem; margin-top: 4px; }
        .pw-msg-err { font-size: .7rem; color: #dc2626; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: .3rem; margin-top: 4px; }
        .hapus-btn { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; border-radius: 6px; padding: 4px 10px; font-size: .75rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: .3rem; transition: background .15s; }
        .hapus-btn:hover { background: #fee2e2; }
        .restore-btn { background: #f0fdf4; color: #15803d; border: 1px solid #86efac; border-radius: 6px; padding: 4px 10px; font-size: .75rem; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: .3rem; transition: background .15s; }
        .restore-btn:hover { background: #dcfce7; }
        .badge-divisi { display: inline-block; padding: .25rem .75rem; border-radius: 999px; font-size: .75rem; font-weight: 700; color: #fff; white-space: nowrap; text-align: center; }
        .badge-status-aktif { display: inline-block; padding: .15rem .5rem; border-radius: 6px; font-size: .65rem; font-weight: 700; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; margin-top: .3rem; }
        .badge-status-nonaktif { display: inline-block; padding: .15rem .5rem; border-radius: 6px; font-size: .65rem; font-weight: 700; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; margin-top: .3rem; }
        .timestamp { font-size: .65rem; color: var(--ink3); margin-top: .3rem; }
        @media (max-width: 900px) { .ku-wrap { grid-template-columns: 1fr; } }
      `}</style>

      {confirmUsername && (
        <ConfirmModal
          username={confirmUsername}
          onConfirm={() => handleHapus(confirmUsername)}
          onCancel={() => setConfirmUsername(null)}
        />
      )}

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
                  value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })} required />
              </div>
              <div className="ku-field">
                <label className="ku-label">Password</label>
                <div className="ku-pw-wrap">
                  <input className="ku-input" type={showFormPw ? 'text' : 'password'} placeholder="Minimal 8 karakter, huruf & angka"
                    style={{ paddingRight: '2.4rem' }}
                    value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
                  <button type="button" className="ku-pw-eye" onClick={() => setShowFormPw(p => !p)}>
                    {showFormPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
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

              {formError   && <div className="ku-error"><AlertTriangle size={15} /> {formError}</div>}
              {formSuccess && <div className="ku-success"><CheckCircle size={15} /> {formSuccess}</div>}
              <button type="submit" className="ku-btn" disabled={formLoading} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: ".4rem" }}>
                {formLoading ? 'Menyimpan...' : <><UserPlus size={16} /> Tambah User</>}
              </button>
            </form>
          </div>

          {/* Tabel User */}
          <div className="ku-card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div className="ku-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: ".5rem" }}>
                <Users size={18} /> Daftar User ({filteredUsers.length})
              </div>
              <input 
                type="text" 
                placeholder="Cari nama, username, divisi..." 
                className="ku-input" 
                style={{ width: '260px', padding: '.45rem .85rem', marginBottom: 0 }}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            {loading ? (
              <p style={{ padding: '1.5rem', color: 'var(--ink3)', fontSize: '.85rem' }}>Memuat...</p>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: 'calc(100vh - 180px)', overflowY: 'auto' }}>
                <table className="ku-table">
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Username</th>
                      <th>Divisi</th>
                      <th>Reset Password</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr><td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink3)' }}>Tidak ada user yang cocok</td></tr>
                    ) : filteredUsers.map(u => {
                      const divLabel = DIVISI_LABEL_SHORT[u.divisi] || u.divisi;
                      const divColor = DIVISI_COLOR[u.divisi] || '#374151';
                      const isDeleted = u.deleted_at !== null;
                      return (
                        <tr key={u.id} style={{ opacity: isDeleted ? 0.6 : 1 }}>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--ink)', textDecoration: isDeleted ? 'line-through' : 'none' }}>{u.nama}</div>
                            {isDeleted ? <div className="badge-status-nonaktif">Nonaktif</div> : <div className="badge-status-aktif">Aktif</div>}
                          </td>
                          <td>
                            <div style={{ fontFamily: 'monospace', fontSize: '.8rem' }}>@{u.username}</div>
                            <div className="timestamp">Dibuat: {u.created_at?.split(' ')[0]}</div>
                          </td>
                          <td><span className="badge-divisi" style={{ background: divColor }}>{divLabel}</span></td>
                          <td>
                            {!isDeleted && (
                              <>
                                <div className="pw-wrap">
                                  <input
                                    className="pw-input"
                                    type={showPw[u.username] ? 'text' : 'password'}
                                    value={editPw[u.username] !== undefined ? editPw[u.username] : ''}
                                    onChange={e => setEditPw(prev => ({ ...prev, [u.username]: e.target.value }))}
                                    placeholder="Password baru..."
                                    readOnly={u.username === 'admin' && currentUser?.username !== 'admin'}
                                  />
                                  <button type="button" className="pw-toggle"
                                    onClick={() => setShowPw(prev => ({ ...prev, [u.username]: !prev[u.username] }))}>
                                    {showPw[u.username] ? <EyeOff size={15} /> : <Eye size={15} />}
                                  </button>
                                  {u.username !== 'admin' && (
                                    <button type="button" className="pw-save"
                                      onClick={() => handleSavePw(u.username)}
                                      disabled={editSaving[u.username] || !editPw[u.username]}>
                                      {editSaving[u.username] ? '...' : <><Save size={14} /> Simpan</>}
                                    </button>
                                  )}
                                </div>
                                {editMsg[u.username]?.text && (
                                  <div className={editMsg[u.username].type === 'error' ? 'pw-msg-err' : 'pw-msg-ok'}>
                                    {editMsg[u.username].type === 'error' ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                                    {editMsg[u.username].text}
                                  </div>
                                )}
                              </>
                            )}
                          </td>
                          <td>
                            {u.username !== 'admin' && (
                              isDeleted ? (
                                <button className="restore-btn" onClick={() => handleRestore(u.username)}>
                                  <CheckCircle size={13} /> Pulihkan
                                </button>
                              ) : (
                                <button className="hapus-btn" onClick={() => setConfirmUsername(u.username)}>
                                  <Trash2 size={13} /> Nonaktifkan
                                </button>
                              )
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