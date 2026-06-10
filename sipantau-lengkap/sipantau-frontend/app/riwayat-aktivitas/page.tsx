'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar, { UserSession } from '@/components/Navbar'
import { Activity, Search, ShieldAlert, Clock, Monitor, User } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type ActivityLog = {
  id: number
  username: string
  aktivitas: string
  detail: string
  ip_address: string
  waktu: string
}

export default function RiwayatAktivitasPage() {
  const router = useRouter()
  const [logs, setLogs]         = useState<ActivityLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [user, setUser]         = useState<UserSession | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    const auth = localStorage.getItem('sipantau_auth')
    const userData = localStorage.getItem('sipantau_user')
    if (!auth) { router.replace('/'); return }
    if (userData) {
      const u = JSON.parse(userData)
      setUser(u)
      if (u.divisi !== 'sekditjen' && u.divisi !== 'dit_ppsa') {
        router.replace('/dashboard')
        return
      }
    }

    apiFetch('/api/user-activity')
      .then(res => res.json())
      .then(data => { if (data.activity) setLogs(data.activity); setLoading(false) })
      .catch(() => setLoading(false))
  }, [router])

  const filteredLogs = logs.filter(l =>
    l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.aktivitas.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.detail || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getActivityIcon = (akt: string) => {
    if (akt.toLowerCase().includes('login'))    return <Monitor size={16} color="#2563eb" />
    if (akt.toLowerCase().includes('password')) return <ShieldAlert size={16} color="#ea580c" />
    return <Activity size={16} color="#16a34a" />
  }

  const getActivityBg = (akt: string) => {
    if (akt.toLowerCase().includes('login'))    return "#eff6ff"
    if (akt.toLowerCase().includes('password')) return "#fff7ed"
    return "#f0fdf4"
  }

  return (
    <>
      <style>{`
        .ra-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 1.5rem; box-shadow: var(--shadow-sm); }
        .ra-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
        .ra-search { display: flex; align-items: center; background: var(--bg); border: 1.5px solid var(--border); border-radius: 999px; padding: .5rem 1rem; width: 100%; max-width: 320px; transition: border-color .2s; }
        .ra-search:focus-within { border-color: var(--green); }
        .ra-search input { border: none; background: transparent; outline: none; margin-left: .5rem; font-size: .85rem; width: 100%; color: var(--ink); }
        .log-list { display: flex; flex-direction: column; gap: .75rem; }
        .log-item { display: flex; align-items: flex-start; gap: 1rem; padding: 1rem; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--surface); transition: background .2s; }
        .log-item:hover { background: var(--bg); }
        .log-icon { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .log-content { flex: 1; }
        .log-title { font-weight: 700; color: var(--ink); font-size: .95rem; display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
        .log-user { font-size: .75rem; font-weight: 700; background: #f3f4f6; padding: .15rem .5rem; border-radius: 999px; color: #4b5563; display: inline-flex; align-items: center; gap: .25rem; }
        .log-desc { font-size: .85rem; color: var(--ink2); margin-top: .25rem; }
        .log-meta { display: flex; align-items: center; gap: 1rem; font-size: .75rem; color: var(--ink3); margin-top: .5rem; flex-wrap: wrap; }
        .log-meta span { display: flex; align-items: center; gap: .3rem; }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ marginBottom: '1.5rem' }}>
          <div className="bc">SiPantau / <span>Riwayat Aktivitas</span></div>
          <h1>Riwayat Aktivitas User</h1>
          <p>Pantau jejak aktivitas login dan perubahan akun pengguna</p>
        </div>

        <div className="ra-card">
          <div className="ra-header">
            <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
              Total Record: <strong>{filteredLogs.length}</strong>
              {searchTerm && logs.length !== filteredLogs.length && <span style={{ fontSize: '.78rem', color: 'var(--ink3)', marginLeft: '.4rem' }}>dari {logs.length}</span>}
            </div>
            <div className="ra-search">
              <Search size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="Cari username atau aktivitas..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>Memuat data aktivitas...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>
              {searchTerm ? `Tidak ada aktivitas yang cocok dengan "${searchTerm}"` : 'Belum ada aktivitas.'}
            </div>
          ) : (
            <div className="log-list">
              {filteredLogs.map(log => (
                <div key={log.id} className="log-item">
                  <div className="log-icon" style={{ background: getActivityBg(log.aktivitas) }}>
                    {getActivityIcon(log.aktivitas)}
                  </div>
                  <div className="log-content">
                    <div className="log-title">
                      {log.aktivitas}
                      <span className="log-user"><User size={12} /> {log.username}</span>
                    </div>
                    {log.detail && <div className="log-desc">{log.detail}</div>}
                    <div className="log-meta">
                      <span><Clock size={13} /> {log.waktu}</span>
                      <span><Monitor size={13} /> IP: {log.ip_address}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
