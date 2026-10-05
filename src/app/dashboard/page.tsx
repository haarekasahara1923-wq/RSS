'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function AdminDashboard() {
  const { token, tenant, user } = useAuth()
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(id)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch { }
  }

  useEffect(() => {
    if (!token) return
    fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data.overview); setLoading(false) })
  }, [token])

  const fmt = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n)

  const quickStats = stats ? [
    { label: 'Total Students', value: stats.totalStudents, icon: '👨‍🎓', color: '#6366f1' },
    { label: 'Total Revenue', value: fmt(stats.totalRevenue || 0), icon: '💰', color: '#10b981' },
    { label: "Today's Collection", value: fmt(stats.thisMonthRevenue || 0), icon: '📈', color: '#f59e0b' },
    { label: 'Outstanding', value: fmt(stats.totalOutstanding || 0), icon: '⚠️', color: '#ef4444' },
    { label: 'Teachers', value: stats.totalTeachers, icon: '👩‍🏫', color: '#8b5cf6' },
    { label: 'Active Students', value: stats.activeStudents, icon: '✅', color: '#06b6d4' },
  ] : []

  const actionButtons = [
    { href: '/dashboard/students', icon: '👨‍🎓', label: 'All Students', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { href: '/dashboard/students/add', icon: '➕', label: 'Add Student', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { href: '/dashboard/fees', icon: '💰', label: 'Fee Management', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { href: '/dashboard/attendance', icon: '✅', label: 'Attendance', color: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
    { href: '/dashboard/courses', icon: '🏫', label: 'Classes & Batches', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { href: '/dashboard/teachers', icon: '👩‍🏫', label: 'Teachers', color: '#ec4899', bg: 'rgba(236,72,153,0.1)' },
    { href: '/dashboard/notices', icon: '📢', label: 'Publish Notice', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { href: '/dashboard/reports', icon: '📊', label: 'Reports', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { href: '/dashboard/expenses', icon: '📉', label: 'Expenses', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
    { href: '/dashboard/leads', icon: '📋', label: 'Leads', color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { href: '/dashboard/analytics', icon: '📈', label: 'Analytics', color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)' },
    { href: '/dashboard/profile', icon: '🏢', label: 'School Profile', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
  ]

  if (user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN') {
      const idx = actionButtons.findIndex(a => a.href === '/dashboard/analytics')
      actionButtons.splice(idx !== -1 ? idx + 1 : actionButtons.length, 0, { href: '/dashboard/super-admin/manage-admins', icon: '👥', label: 'Manage Admins', color: '#10b981', bg: 'rgba(16,185,129,0.1)' })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Welcome Banner */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', borderRadius: '16px', padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ fontSize: '22px', fontWeight: '800', color: 'white' }}>{tenant?.name || 'School'} Dashboard 🏫</div>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {user?.role === 'SUPER_ADMIN' && tenant?.schoolCode && (
            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '700', marginBottom: '4px' }}>Unique School ID</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#fde047', fontFamily: 'monospace', letterSpacing: '2px' }}>{tenant.schoolCode}</span>
                <button onClick={() => setShowBroadcastModal(true)}
                  style={{ padding: '6px 12px', background: 'rgba(253,224,71,0.2)', border: '1px solid rgba(253,224,71,0.4)', borderRadius: '8px', color: '#fef08a', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                  📢 Broadcast
                </button>
              </div>
            </div>
          )}
          <div style={{ fontSize: '48px', display: 'none' /* hidden for space if needed, or keep: display:'block' */ }}>🎓</div>
        </div>
      </div>

      {/* Quick Stats */}
      {!loading && quickStats.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {quickStats.map(s => (
            <div key={s.label} style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: '600' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons Grid */}
      <div>
        <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Quick Actions</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          {actionButtons.map(a => (
            <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
              <div style={{ background: a.bg, border: `1px solid ${a.color}30`, borderRadius: '14px', padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px', cursor: 'pointer', transition: 'transform 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}>
                <div style={{ fontSize: '26px' }}>{a.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: a.color, lineHeight: '1.3' }}>{a.label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* BROADCAST MODAL */}
      {showBroadcastModal && tenant && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}
          onClick={e => e.target === e.currentTarget && setShowBroadcastModal(false)}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '24px', padding: '36px', width: '100%', maxWidth: '540px', boxShadow: '0 24px 80px rgba(0,0,0,0.5)' }}>
            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>📢</div>
              <h3 style={{ fontWeight: '900', fontSize: '22px', color: 'var(--text)', marginBottom: '6px' }}>Broadcast School ID</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>
                Share this Unique School ID with all <strong style={{ color: '#fbbf24' }}>Teachers, Parents, and Students</strong> of <strong style={{ color: 'var(--text)' }}>{tenant.name}</strong>.<br />
                They will need this ID when signing up/logging in.
              </p>
            </div>

            {/* Big School Code Display */}
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '2px solid rgba(251,191,36,0.4)', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: 'rgba(251,191,36,0.6)', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '10px' }}>Unique School ID</div>
              <div style={{ fontSize: '36px', fontWeight: '900', color: '#fbbf24', fontFamily: 'monospace', letterSpacing: '4px', marginBottom: '16px' }}>
                {tenant.schoolCode}
              </div>
              <button
                onClick={() => copyToClipboard(tenant.schoolCode!, 'code')}
                style={{
                  padding: '10px 24px', background: copiedCode === 'code' ? 'rgba(16,185,129,0.2)' : 'rgba(251,191,36,0.15)',
                  border: `1px solid ${copiedCode === 'code' ? 'rgba(16,185,129,0.5)' : 'rgba(251,191,36,0.4)'}`,
                  borderRadius: '10px', color: copiedCode === 'code' ? '#34d399' : '#fbbf24',
                  fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px'
                }}>
                {copiedCode === 'code' ? '✅ Copied!' : '📋 Copy School ID'}
              </button>
            </div>

            {/* Instructions */}
            <div style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px' }}>📋 Broadcast Message (Copy & Send)</div>
              <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.8', fontStyle: 'italic', background: 'var(--surface-2)', borderRadius: '8px', padding: '12px' }}>
                🏫 <strong style={{ color: 'var(--text)' }}>Important — School Registration ID</strong><br />
                Dear Teachers, Parents & Students of <strong style={{ color: '#fbbf24' }}>{tenant.name}</strong>,<br /><br />
                Please use the following <strong>Unique School ID</strong> when signing up to the RSS Public School Management System:<br /><br />
                🔑 <strong style={{ color: '#fbbf24', fontFamily: 'monospace', fontSize: '16px', letterSpacing: '2px' }}>{tenant.schoolCode}</strong><br /><br />
                This School ID ensures your data is securely linked to our school. Please do not share it outside.<br /><br />
                — School Administration
              </div>
              <button
                onClick={() => copyToClipboard(
                  `🏫 Important — School Registration ID\nDear Teachers, Parents & Students of ${tenant.name},\n\nPlease use the following Unique School ID when signing up to the RSS Public School Management System:\n\n🔑 ${tenant.schoolCode}\n\nThis School ID ensures your data is securely linked to our school. Please do not share it outside.\n\n— School Administration`,
                  'msg'
                )}
                style={{ marginTop: '10px', padding: '7px 16px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: '8px', color: '#a5b4fc', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
                {copiedCode === 'msg' ? '✅ Message Copied!' : '📱 Copy Full Message'}
              </button>
            </div>

            <button onClick={() => setShowBroadcastModal(false)}
              style={{ width: '100%', padding: '12px', background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
