'use client'
import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'

function PortalShell({ children }: { children: React.ReactNode }) {
  const { user, tenant, isLoading, logout, token } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user) router.push('/login')
  }, [user, isLoading, router])

  useEffect(() => {
    if (!isLoading && user && token && 'serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.register('/sw.js')
        .then(async (reg) => {
          console.log('Service Worker Registered')
          let sub = await reg.pushManager.getSubscription()
          if (!sub) {
            const pubKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BFG54n2XjD6u05w21Zsz2g5p7fR9n...'
            const padding = '='.repeat((4 - pubKey.length % 4) % 4)
            const base64 = (pubKey + padding).replace(/\-/g, '+').replace(/_/g, '/')
            const rawData = window.atob(base64)
            const outputArray = new Uint8Array(rawData.length)
            for (let i = 0; i < rawData.length; ++i) {
              outputArray[i] = rawData.charCodeAt(i)
            }
            sub = await reg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: outputArray
            })
          }
          await fetch('/api/push/subscribe', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify(sub)
          })
        }).catch(err => console.error('Push subscription failed:', err))
    }
  }, [user, isLoading, token])

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading RSS Public School Portal...</p>
      </div>
    )
  }

  if (!user) return null

  const role = user.role

  // Define nav items per role
  const navItems = {
    STUDENT: [
      { href: '/portal/student', icon: '🏠', label: 'Home' },
      { href: '/portal/student/homework', icon: '📚', label: 'Homework' },
      { href: '/portal/student/admit-cards', icon: '🎫', label: 'Admit Cards' },
      { href: '/portal/student/notices', icon: '📢', label: 'Notices' },
    ],
    PARENT: [
      { href: '/portal/parent', icon: '🏠', label: 'Home' },
      { href: '/portal/parent/homework', icon: '📚', label: 'Homework' },
      { href: '/portal/parent/admit-cards', icon: '🎫', label: 'Admit Cards' },
      { href: '/portal/parent/exams', icon: '📑', label: 'Marks' },
      { href: '/portal/parent/children', icon: '👶', label: 'Children' },
      { href: '/portal/parent/notices', icon: '📢', label: 'Notices' },
    ],
    DRIVER: [
      { href: '/portal/driver', icon: '🚌', label: 'Dashboard' }
    ],
    TEACHER: [
      { href: '/portal/staff', icon: '🏠', label: 'Home' },
      { href: '/portal/staff/attendance', icon: '✅', label: 'Attendance' },
      { href: '/portal/staff/homework', icon: '📚', label: 'Homework' },
      { href: '/portal/staff/exams', icon: '📝', label: 'Exams' },
      { href: '/portal/staff/notices', icon: '📢', label: 'Notices' },
      { href: '/portal/staff/profile', icon: '👤', label: 'Profile' },
    ],
    STAFF: [
      { href: '/portal/staff', icon: '🏠', label: 'Home' },
      { href: '/portal/staff/attendance', icon: '✅', label: 'Attendance' },
      { href: '/portal/staff/homework', icon: '📚', label: 'Homework' },
      { href: '/portal/staff/exams', icon: '📝', label: 'Exams' },
      { href: '/portal/staff/notices', icon: '📢', label: 'Notices' },
      { href: '/portal/staff/profile', icon: '👤', label: 'Profile' },
    ],
  }

  const items = navItems[role as keyof typeof navItems] || navItems.STUDENT

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', paddingBottom: '70px' }}>
      {/* Top Header */}
      <header style={{ background: '#1e293b', borderBottom: '1px solid #334155', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.1)' }}>
            <img src={tenant?.logo || "/logo.png"} alt="School Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'white', lineHeight: '1.2' }}>{tenant?.name || 'RSS Public School'}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{role === 'STUDENT' ? 'Student Portal' : role === 'PARENT' ? 'Parent Portal' : role === 'DRIVER' ? 'Driver Portal' : 'Staff Portal'}</span>
              {tenant?.schoolCode && <span style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.15)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontWeight: '600' }}>{tenant.schoolCode}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

          <button onClick={logout} style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}>Logout</button>
        </div>
      </header>

      {/* Content */}
      <main style={{ padding: '16px', maxWidth: '480px', margin: '0 auto' }}>
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#1e293b', borderTop: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px 0', zIndex: 50 }}>
        {items.map(item => (
          <Link key={item.href} href={item.href} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', padding: '4px 12px', borderRadius: '8px', background: pathname === item.href ? 'rgba(99,102,241,0.2)' : 'transparent' }}>
            <span style={{ fontSize: '20px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', color: pathname === item.href ? '#818cf8' : '#64748b', fontWeight: pathname === item.href ? '700' : '400' }}>{item.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  )
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <PortalShell>{children}</PortalShell>
    </AuthProvider>
  )
}
