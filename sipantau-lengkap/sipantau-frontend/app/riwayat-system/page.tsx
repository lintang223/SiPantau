'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Navbar, { UserSession } from '@/components/Navbar'
import { Terminal, RefreshCw, AlertTriangle, Shield } from 'lucide-react'
import { apiFetch } from '@/lib/api'

export default function RiwayatSystemPage() {
  const router = useRouter()
  const [logs, setLogs] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserSession | null>(null)
  const logContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const auth = localStorage.getItem('sipantau_auth')
    const userData = localStorage.getItem('sipantau_user')
    if (!auth) { router.replace('/'); return }
    if (userData) {
      const u = JSON.parse(userData)
      setUser(u)
      if (u.divisi !== 'sekditjen') { // Only sekditjen (Administrator) can view system logs
        router.replace('/dashboard')
        return
      }
    }

    fetchLogs()
  }, [router])

  const fetchLogs = () => {
    setLoading(true)
    apiFetch('/api/system-logs')
      .then(res => res.json())
      .then(data => {
        if (data.logs) {
          setLogs(data.logs)
        }
        setLoading(false)
        // Scroll to bottom after loading logs
        setTimeout(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight
          }
        }, 50)
      })
      .catch(() => setLoading(false))
  }

  return (
    <>
      <style>{`
        .console-container {
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          padding: 1rem;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
          font-size: .8rem;
          color: #f1f5f9;
          height: 500px;
          overflow-y: auto;
          box-shadow: inset 0 2px 4px rgba(0,0,0,0.6);
        }
        .console-line {
          line-height: 1.5;
          word-break: break-all;
          white-space: pre-wrap;
          margin-bottom: 0.25rem;
        }
        .console-line.error { color: #f87171; }
        .console-line.warn { color: #fbbf24; }
        .console-line.info { color: #38bdf8; }
        
        .sys-card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--r-sm); padding: 1.5rem; box-shadow: var(--shadow-sm); }
        .sys-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.2rem; }
      `}</style>

      <Navbar />
      <div className="wrap">
        <div className="phead" style={{ marginBottom: '1.5rem' }}>
          <div className="bc">SiPantau / <span>System Logs</span></div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '.5rem' }}><Terminal /> Log Sistem Server</h1>
          <p>Pantau log jalannya aplikasi server, error, dan informasi startup backend secara real-time.</p>
        </div>

        <div className="sys-card">
          <div className="sys-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '.5rem', color: 'var(--ink)' }}>
              <Shield size={16} style={{ color: 'var(--green)' }} />
              <span style={{ fontSize: '.85rem', fontWeight: 600 }}>150 Baris Aktivitas Terakhir</span>
            </div>
            <button 
              onClick={fetchLogs} 
              disabled={loading}
              className="btn-sm" 
              style={{ display: 'inline-flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer' }}
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              {loading ? 'Memuat...' : 'Refresh'}
            </button>
          </div>

          <div className="console-container" ref={logContainerRef}>
            {loading && logs.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <span style={{ color: 'var(--ink3)' }}>Membaca berkas log server...</span>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <span style={{ color: 'var(--ink3)' }}>Belum ada log terekam.</span>
              </div>
            ) : (
              logs.map((line, idx) => {
                let statusClass = ''
                if (line.includes('[ERROR]') || line.includes('Traceback') || line.includes('Error:')) {
                  statusClass = 'error'
                } else if (line.includes('[WARNING]') || line.includes('Warning:')) {
                  statusClass = 'warn'
                } else if (line.includes('[INFO]')) {
                  statusClass = 'info'
                }
                return (
                  <div key={idx} className={`console-line ${statusClass}`}>
                    {line}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </>
  )
}
