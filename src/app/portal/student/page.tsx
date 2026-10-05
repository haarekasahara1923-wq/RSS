'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'

import { BirthdayCertificateModal } from '@/components/BirthdayCertificateModal'
import { StudentIdCard } from '@/components/StudentIdCard'

export default function StudentHome() {
  const { user, token, tenant } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [studentProfile, setStudentProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showBirthday, setShowBirthday] = useState(false)
  const [showIdCard, setShowIdCard] = useState(false)

  useEffect(() => {
    if (!token) return
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch('/api/notices', { headers: h }).then(r => r.json()),
      fetch('/api/homework', { headers: h }).then(r => r.json()),
      fetch('/api/portal/profile', { headers: h }).then(r => r.json())
    ]).then(([n, hw, profileRes]) => {
      setNotices(n.notices?.slice(0, 3) || [])
      setHomeworks(hw.homeworks?.slice(0, 3) || [])
      
      const prof = profileRes.profile;
      setStudentProfile(prof);
      
      // Check Birthday
      if (prof?.dob) {
        const dob = new Date(prof.dob);
        const today = new Date();
        if (dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth()) {
          setShowBirthday(true);
        }
      }
      setLoading(false)
    })
  }, [token])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Greeting */}
      <div style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Good Morning! 👋</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{user?.name}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Student</div>
      </div>

      {/* Quick Actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {[
          { href: '/portal/student/homework', icon: '📚', label: 'My Homework', color: '#6366f1' },
          { href: '/portal/student/notices', icon: '📢', label: 'Notices', color: '#ec4899' },
        ].map(a => (
          <Link key={a.href} href={a.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ fontSize: '30px' }}>{a.icon}</div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{a.label}</div>
            </div>
          </Link>
        ))}
        {/* ID Card Action */}
        <div onClick={() => setShowIdCard(true)} style={{ cursor: 'pointer', background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: '30px' }}>🪪</div>
          <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>ID Card</div>
        </div>
      </div>

      {/* Recent Homework */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Homework</div>
        {loading ? <div style={{ color: '#64748b', fontSize: '13px' }}>Loading...</div> :
          homeworks.length === 0 ? <div style={{ color: '#64748b', fontSize: '13px', padding: '20px', textAlign: 'center', background: '#1e293b', borderRadius: '12px' }}>No homework assigned yet</div> :
          homeworks.map((hw: any) => (
            <div key={hw.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{hw.title}</div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>{hw.subject} • {hw.batch?.name}</div>
              {hw.dueDate && <div style={{ fontSize: '11px', color: '#f59e0b', marginTop: '4px' }}>Due: {new Date(hw.dueDate).toLocaleDateString('en-IN')}</div>}
            </div>
          ))
        }
      </div>

      {/* Recent Notices */}
      <div>
        <div style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Latest Notices</div>
        {loading ? <div style={{ color: '#64748b', fontSize: '13px' }}>Loading...</div> :
          notices.length === 0 ? <div style={{ color: '#64748b', fontSize: '13px', padding: '20px', textAlign: 'center', background: '#1e293b', borderRadius: '12px' }}>No notices</div> :
          notices.map((n: any) => (
            <div key={n.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px', marginBottom: '8px' }}>
              <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>📢 {n.title}</div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{n.message}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '6px' }}>{new Date(n.createdAt).toLocaleDateString('en-IN')}</div>
            </div>
          ))
        }
      </div>

      {showBirthday && studentProfile && (
        <BirthdayCertificateModal 
          isOpen={showBirthday} 
          onClose={() => setShowBirthday(false)}
          student={studentProfile}
          school={tenant}
        />
      )}

      {showIdCard && studentProfile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowIdCard(false)} style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', fontSize: '30px', cursor: 'pointer' }}>&times;</button>
            <StudentIdCard student={studentProfile} school={tenant} />
          </div>
        </div>
      )}
    </div>
  )
}
