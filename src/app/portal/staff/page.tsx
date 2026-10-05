'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function StaffHome() {
  const { user, token } = useAuth()
  const [stats, setStats] = useState({ homeworks: 0, notices: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch('/api/homework', { headers: h }).then(r => r.json()),
      fetch('/api/notices', { headers: h }).then(r => r.json()),
    ]).then(([hw, n]) => {
      setStats({ homeworks: hw.homeworks?.length || 0, notices: n.notices?.length || 0 })
      setLoading(false)
    })
  }, [token])

  const actions = [
    { href: '/portal/staff/attendance', icon: '✅', label: 'Mark Attendance', color: '#10b981' },
    { href: '/portal/staff/homework', icon: '📚', label: 'Assign Homework', color: '#6366f1' },
    { href: '/portal/staff/homework/submissions', icon: '📋', label: 'View Submissions', color: '#8b5cf6' },
    { href: '/portal/staff/notices', icon: '📢', label: 'Notices', color: '#ec4899' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Good Morning! 👩‍🏫</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{user?.name}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Staff</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {actions.map(a => (
          <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '10px' }}>
              <div style={{ fontSize: '30px' }}>{a.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{a.label}</div>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#6366f1' }}>{loading ? '...' : stats.homeworks}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Homeworks Created</div>
        </div>
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '800', color: '#ec4899' }}>{loading ? '...' : stats.notices}</div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Notices</div>
        </div>
      </div>
    </div>
  )
}
