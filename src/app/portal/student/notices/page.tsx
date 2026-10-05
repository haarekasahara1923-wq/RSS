'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function StudentNotices() {
  const { token } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/notices', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setNotices(d.notices || []); setLoading(false) })
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>📢 Notices</h1>
      {loading ? <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading...</div> :
        notices.length === 0 ? <div style={{ color: '#64748b', textAlign: 'center', padding: '60px 20px', background: '#1e293b', borderRadius: '16px' }}>No notices yet</div> :
        notices.map((n: any) => (
          <div key={n.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{n.title}</div>
              {n.targetRole && <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', borderRadius: '6px', padding: '2px 8px' }}>{n.targetRole}</span>}
            </div>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginTop: '8px' }}>{n.message}</div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          </div>
        ))
      }
    </div>
  )
}
