'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BirthdayCertificateModal } from '@/components/BirthdayCertificateModal'
import { StudentIdCard } from '@/components/StudentIdCard'

export default function ParentHome() {
  const { user, token, tenant } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [birthdayChild, setBirthdayChild] = useState<any>(null)
  const [idCardChild, setIdCardChild] = useState<any>(null)

  useEffect(() => {
    if (!token) return
    const h = { Authorization: `Bearer ${token}` }
    Promise.all([
      fetch('/api/parent', { headers: h }).then(r => r.json()),
      fetch('/api/notices', { headers: h }).then(r => r.json()),
    ]).then(([p, n]) => {
      const prof = p.profile;
      setProfile(prof)
      setNotices(n.notices?.slice(0, 3) || [])
      
      if (prof?.children?.length > 0) {
        const today = new Date();
        const bdayChild = prof.children.find((c: any) => {
          if (!c.dob) return false;
          const dob = new Date(c.dob);
          return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
        });
        if (bdayChild) setBirthdayChild(bdayChild);
      }

      setLoading(false)
    })
  }, [token])

  const children = profile?.children || []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>Welcome! 👨‍👩‍👧‍👦</div>
        <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>{user?.name}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>Parent Portal</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <Link href="/portal/parent/children" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>👶</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>Children</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#ec4899', marginTop: '2px' }}>{children.length}</div>
          </div>
        </Link>
        <Link href="/portal/parent/homework" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>📚</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>Homework</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#8b5cf6', marginTop: '2px' }}>View</div>
          </div>
        </Link>
        <Link href="/portal/parent/exams" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>📑</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>Test Marks</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#10b981', marginTop: '2px' }}>
              {children.reduce((acc: number, c: any) => acc + (c.examResults?.length || 0), 0)}
            </div>
          </div>
        </Link>
        <Link href="/portal/parent/notices" style={{ textDecoration: 'none' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: '26px', marginBottom: '6px' }}>📢</div>
            <div style={{ fontSize: '12px', fontWeight: '600', color: 'white' }}>Notices</div>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#6366f1', marginTop: '2px' }}>{notices.length}</div>
          </div>
        </Link>
      </div>

      {children.length > 0 && (
        <div>
          <div style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Children Summary</div>
          {children.map((child: any) => {
            const todayAttendances = child.attendances?.filter((a: any) => new Date(a.date).toDateString() === new Date().toDateString())
            const presentToday = todayAttendances?.find((a: any) => a.status === 'PRESENT')
            const pendingFeeAmount = Math.max(0, child.totalFee - child.paidFee)
            
            return (
              <div key={child.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{child.fullName}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{child.course?.name} • {child.batch?.name}</div>
                  </div>
                  <button onClick={() => setIdCardChild(child)} style={{ background: '#334155', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' }}>🪪 ID Card</button>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                  <div style={{ flex: 1, background: '#0f172a', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px' }}>{presentToday ? '✅' : '❓'}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Today's Att.</div>
                  </div>
                  <div style={{ flex: 1, background: '#0f172a', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '800', color: pendingFeeAmount > 0 ? '#f59e0b' : '#10b981' }}>
                        ₹{pendingFeeAmount.toLocaleString('en-IN')}
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>Pending Fees</div>
                  </div>
                </div>

                {child.examResults && child.examResults.length > 0 && (
                    <div style={{ marginTop: '16px', borderTop: '1px solid #334155', paddingTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600 }}>Recent Exam Marks</span>
                          <Link href="/portal/parent/exams" style={{ fontSize: '11px', color: '#10b981', textDecoration: 'none', fontWeight: 600 }}>View All Marks →</Link>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {child.examResults.map((er: any) => (
                                <div key={er.id} style={{ display: 'flex', justifyContent: 'space-between', background: '#0f172a', padding: '8px 12px', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontSize: '13px', color: 'white', fontWeight: 600 }}>{er.exam?.title}</div>
                                        <div style={{ fontSize: '11px', color: '#64748b' }}>{er.exam?.subject} • {new Date(er.exam?.date).toLocaleDateString('en-IN')}</div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '14px', fontWeight: 800, color: er.marksObtained >= (er.exam?.maxMarks * 0.4) ? '#10b981' : '#ef4444' }}>
                                            {er.marksObtained} <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 400 }}>/ {er.exam?.maxMarks}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {children.length === 0 && !loading && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '24px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👶</div>
          <div style={{ fontSize: '14px', color: '#94a3b8' }}>No children linked yet</div>
          <Link href="/portal/parent/children" style={{ textDecoration: 'none', display: 'inline-block', marginTop: '12px', background: '#6366f1', color: 'white', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: '600' }}>Link Children</Link>
        </div>
      )}

      {birthdayChild && (
        <BirthdayCertificateModal 
          isOpen={!!birthdayChild} 
          onClose={() => setBirthdayChild(null)}
          student={birthdayChild}
          school={tenant}
        />
      )}

      {idCardChild && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setIdCardChild(null)} style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: 'white', fontSize: '30px', cursor: 'pointer' }}>&times;</button>
            <StudentIdCard student={idCardChild} school={tenant} />
          </div>
        </div>
      )}
    </div>
  )
}
