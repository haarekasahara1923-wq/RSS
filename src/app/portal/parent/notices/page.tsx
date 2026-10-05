'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function ParentNotices() {
  const { token } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    fetch('/api/notices', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { setNotices(d.notices || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>📢 Parent Notices & Circulars</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, margin: '4px 0 0 0' }}>Official school announcements, class notices, and messages regarding your child</p>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading notices...</div>
      ) : notices.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px 20px', background: '#1e293b', borderRadius: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>📫</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>No notices published yet</div>
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>You will receive school announcements and class notices here.</p>
        </div>
      ) : (
        notices.map((n: any) => {
          const isPersonal = n.title?.includes('📌') || n.title?.toLowerCase().includes('parent:')
          const isClass = n.title?.includes('🏫') || n.title?.includes('[')

          return (
            <div key={n.id} style={{ background: '#1e293b', border: `1px solid ${isPersonal ? 'rgba(236,72,153,0.4)' : '#334155'}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{n.title}</div>
                {isPersonal ? (
                  <span style={{ fontSize: '10px', background: 'rgba(236,72,153,0.2)', color: '#f472b6', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    Personal Notice
                  </span>
                ) : isClass ? (
                  <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    Class Notice
                  </span>
                ) : (
                  <span style={{ fontSize: '10px', background: 'rgba(16,185,129,0.2)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '6px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    General
                  </span>
                )}
              </div>
              <div style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{n.message}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                📅 {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
