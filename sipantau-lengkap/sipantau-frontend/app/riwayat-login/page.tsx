'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar, { UserSession } from '@/components/Navbar'
import { Activity, Search, LogIn, XCircle, AlertTriangle, Monitor } from 'lucide-react'
import { apiFetch } from '@/lib/api'

type LoginLog = {
  id: number
  username: string
  ip_address: string
  user_agent: string
  status: string
  detail: string
  attempted_at: string
}

export default function RiwayatLoginPage() {
  const router = useRouter()
  const [logs, setLogs]         = useState<LoginLog[]>([])
  const [loading, setLoading]   = useState(true)
  const [user, setUser]         = useState<UserSession | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    const auth = localStorage.getItem('sipantau_auth')
    const userData = localStorage.getItem('sipantau_user')
    if (!auth) { router.replace('/'); return }
    if (userData) {
      const u = JSON.parse(userData)
      setUser(u)
      if (u.divisi !== 'sekditjen') { // HANYA SEKditjen
        router.replace('/dashboard')
        return
      }
    }

    fetchLogs()
  }, [router, filterStatus])

  const fetchLogs = () => {
    setLoading(true)
    let url = '/api/login-logs'
    if (filterStatus) {
      url += `?status=${filterStatus}`
    }
    apiFetch(url)
      .then(res => res.json())
      .then(data => { if (data.logs) setLogs(data.logs); setLoading(false) })
      .catch(() => setLoading(false))
  }

  const filteredLogs = logs.filter(l =>
    l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (l.ip_address || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    if (status === 'success') return <span className="badge-status-aktif"><LogIn size={12}/> Sukses</span>
    if (status === 'failed')  return <span className="badge-status-nonaktif"><XCircle size={12}/> Gagal</span>
    if (status === 'blocked') return <span className="badge-status-warn"><AlertTriangle size={12}/> Diblokir</span>
    return <span>{status}</span>
  }

  return (
    <>
      <style>{`
        .ra-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 1.5rem; box-shadow: var(--shadow-sm); }
        .ra-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap; }
        .ra-search { display: flex; align-items: center; background: var(--bg); border: 1.5px solid var(--border); border-radius: 999px; padding: .5rem 1rem; width: 100%; max-width: 320px; transition: border-color .2s; }
        .ra-search:focus-within { border-color: var(--green); }
        .ra-search input { border: none; background: transparent; outline: none; margin-left: .5rem; font-size: .85rem; width: 100%; color: var(--ink); }
        .log-table { width: 100%; border-collapse: collapse; font-size: .82rem; }
        .log-table th { text-align: left; padding: .6rem .85rem; font-size: .68rem; text-transform: uppercase; letter-spacing: .4px; color: var(--ink3); border-bottom: 2px solid var(--border); white-space: nowrap; }
        .log-table td { padding: .6rem .85rem; border-bottom: 1px solid var(--border); color: var(--ink2); vertical-align: middle; }
        .log-table tr:last-child td { border-bottom: none; }
        .log-table tr:hover td { background: var(--green-pale); }
        .badge-status-aktif { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .6rem; border-radius: 6px; font-size: .65rem; font-weight: 700; background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
        .badge-status-nonaktif { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .6rem; border-radius: 6px; font-size: .65rem; font-weight: 700; background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; }
        .badge-status-warn { display: inline-flex; align-items: center; gap: .3rem; padding: .2rem .6rem; border-radius: 6px; font-size: .65rem; font-weight: 700; background: #fff7ed; color: #9a3412; border: 1px solid #fdba74; }
        .filter-select { padding: .5rem 1rem; border: 1.5px solid var(--border); border-radius: 999px; font-size: .85rem; color: var(--ink); background: var(--bg); outline: none; cursor: pointer; }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ marginBottom: '1.5rem' }}>
          <div className="bc">SiPantau / <span>Log Login</span></div>
          <h1>Log Aktivitas Login</h1>
          <p>Pantau percobaan login (sukses, gagal, dan diblokir). Khusus Superadmin.</p>
        </div>

        <div className="ra-card">
          <div className="ra-header">
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                Total Record: <strong>{filteredLogs.length}</strong>
              </div>
              <select 
                className="filter-select"
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="success">Sukses</option>
                <option value="failed">Gagal</option>
                <option value="blocked">Diblokir</option>
              </select>
            </div>
            
            <div className="ra-search">
              <Search size={16} color="#9ca3af" />
              <input
                type="text"
                placeholder="Cari username atau IP..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>Memuat data aktivitas...</div>
          ) : filteredLogs.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--ink3)' }}>
              {searchTerm || filterStatus ? 'Tidak ada data log yang cocok' : 'Belum ada data log.'}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="log-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Status</th>
                    <th>Username</th>
                    <th>IP Address</th>
                    <th>Browser / User Agent</th>
                    <th>Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map(log => (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{log.attempted_at}</td>
                      <td>{getStatusBadge(log.status)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--ink)' }}>@{log.username}</td>
                      <td><div style={{ display: 'flex', alignItems: 'center', gap: '.3rem' }}><Monitor size={12}/> {log.ip_address}</div></td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={log.user_agent}>
                        {log.user_agent || '-'}
                      </td>
                      <td style={{ color: log.status === 'success' ? '#15803d' : '#dc2626' }}>{log.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
