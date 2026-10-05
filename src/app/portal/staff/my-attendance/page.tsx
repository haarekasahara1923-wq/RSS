'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function StaffMyAttendancePage() {
    const { token, user } = useAuth()
    const [attendances, setAttendances] = useState<any[]>([])
    const [todayMarked, setTodayMarked] = useState(false)
    const [todayOutMarked, setTodayOutMarked] = useState(false)
    const [todayAttendanceId, setTodayAttendanceId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        if (token && (user as any)?.teacherProfile?.id) {
            fetchAttendance()
        }
    }, [token, user])

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const r = await fetch(`/api/teachers/attendance?teacherId=${(user as any)?.teacherProfile?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) {
                setAttendances(res.data)
                
                // Check if today is marked
                const today = new Date().toDateString()
                const todayRecord = res.data.find((a: any) => new Date(a.date).toDateString() === today)
                setTodayMarked(!!todayRecord)
                setTodayOutMarked(!!(todayRecord && todayRecord.outTime))
                setTodayAttendanceId(todayRecord ? todayRecord.id : null)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    const markAttendance = async (type: 'IN' | 'OUT') => {
        if (!(user as any)?.teacherProfile?.id) return
        setMsg(type === 'IN' ? 'Marking IN...' : 'Marking OUT...')
        try {
            const now = new Date()
            const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            
            const payload = {
                teacherId: (user as any).teacherProfile.id,
                date: now.toISOString(),
                status: 'PRESENT',
                [type === 'IN' ? 'inTime' : 'outTime']: timeString,
                notes: type === 'IN' ? 'Marked IN from Portal' : 'Marked OUT from Portal'
            }
            
            const r = await fetch('/api/teachers/attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload)
            })
            const res = await r.json()
            if (res.success) {
                setMsg(`Successfully marked ${type}!`)
                fetchAttendance()
            } else {
                setMsg(res.error || `Failed to mark ${type}`)
            }
        } catch (e) {
            setMsg('Network Error')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>My Attendance</h1>

            <div className="card" style={{ padding: '32px', marginBottom: '32px', textAlign: 'center', background: (todayMarked && todayOutMarked) ? '#f0fdf4' : 'var(--surface-2)' }}>
                <h2 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--text-color)' }}>
                    {todayMarked && todayOutMarked ? '✅ You have completed your shift today' : todayMarked ? '✅ You are marked IN. Remember to mark OUT.' : 'Ready to mark your IN time?'}
                </h2>
                
                {msg && <p style={{ marginBottom: '16px', color: '#10b981' }}>{msg}</p>}

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <button 
                        onClick={() => markAttendance('IN')} 
                        disabled={todayMarked}
                        className={`btn`} 
                        style={{ padding: '12px 32px', fontSize: '18px', cursor: todayMarked ? 'not-allowed' : 'pointer', background: todayMarked ? '#475569' : '#10b981', color: 'white', border: 'none' }}
                    >
                        {todayMarked ? 'IN Marked' : 'MARK IN'}
                    </button>

                    <button 
                        onClick={() => markAttendance('OUT')} 
                        disabled={!todayMarked || todayOutMarked}
                        className={`btn`} 
                        style={{ padding: '12px 32px', fontSize: '18px', cursor: (!todayMarked || todayOutMarked) ? 'not-allowed' : 'pointer', background: (!todayMarked || todayOutMarked) ? '#475569' : '#f59e0b', color: 'white', border: 'none' }}
                    >
                        {todayOutMarked ? 'OUT Marked' : 'MARK OUT'}
                    </button>
                </div>
                <p style={{ marginTop: '16px', color: 'var(--text-muted)', fontSize: '14px' }}>
                    Your IN and OUT times will be captured automatically.
                </p>
            </div>

            <div className="card" style={{ padding: '0' }}>
                <h3 style={{ padding: '16px', borderBottom: '1px solid #e2e8f0', margin: 0 }}>Attendance History</h3>
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                    <table style={{ width: '100%', minWidth: '600px', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th style={{ padding: '12px 16px' }}>Date</th>
                                <th style={{ padding: '12px 16px' }}>Status</th>
                                <th style={{ padding: '12px 16px' }}>IN Time</th>
                                <th style={{ padding: '12px 16px' }}>OUT Time</th>
                                <th style={{ padding: '12px 16px' }}>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center' }}>Loading...</td></tr>
                            ) : attendances.map((a: any) => (
                                <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                    <td style={{ padding: '12px 16px' }}>{new Date(a.date).toLocaleDateString()}</td>
                                    <td style={{ padding: '12px 16px', fontWeight: 'bold', color: a.status === 'PRESENT' ? '#16a34a' : a.status === 'LEAVE' ? '#ca8a04' : '#dc2626' }}>{a.status}</td>
                                    <td style={{ padding: '12px 16px' }}>{a.inTime || '-'}</td>
                                    <td style={{ padding: '12px 16px' }}>{a.outTime || '-'}</td>
                                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{a.notes || '-'}</td>
                                </tr>
                            ))}
                            {!loading && attendances.length === 0 && (
                                <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No records found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
