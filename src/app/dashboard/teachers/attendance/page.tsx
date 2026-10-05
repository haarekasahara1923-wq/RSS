'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminTeacherAttendancePage() {
    const { token } = useAuth()
    const [attendances, setAttendances] = useState<any[]>([])
    const [teachers, setTeachers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [msg, setMsg] = useState('')

    useEffect(() => {
        if (token) {
            fetchTeachers()
        }
    }, [token])

    useEffect(() => {
        if (token && teachers.length > 0) {
            fetchAttendance()
        }
    }, [token, date, teachers])

    const fetchTeachers = async () => {
        try {
            const r = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
            const res = await r.json()
            if (res.success) setTeachers(res.data)
        } catch (e) { console.error(e) }
    }

    const fetchAttendance = async () => {
        setLoading(true)
        try {
            const r = await fetch(`/api/teachers/attendance?date=${date}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            
            if (res.success) {
                // Map attendance to teachers
                const attendanceMap: any = {}
                res.data.forEach((a: any) => {
                    attendanceMap[a.teacherId] = a
                })
                
                const merged = teachers.map(t => ({
                    ...t,
                    attendance: attendanceMap[t.id] || null
                }))
                setAttendances(merged)
            }
        } catch (e) {
            console.error(e)
            setMsg('Failed to fetch attendance')
        }
        setLoading(false)
    }

    const markAbsents = async () => {
        setMsg('Marking...')
        try {
            const unmarked = attendances.filter(a => !a.attendance)
            for (const t of unmarked) {
                await fetch('/api/teachers/attendance', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({
                        teacherId: t.id,
                        date: new Date(date).toISOString(),
                        status: 'ABSENT',
                        notes: 'Marked by Admin'
                    })
                })
            }
            setMsg(`Marked ${unmarked.length} teachers as Absent.`)
            fetchAttendance()
        } catch (e) {
            setMsg('Failed to mark absents')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Teacher Live Attendance</h1>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input" />
                    <button onClick={markAbsents} className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}>
                        Mark Unmarked as Absent
                    </button>
                </div>
            </div>

            {msg && <div style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', marginBottom: '24px' }}>{msg}</div>}

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Teacher</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>IN Time</th>
                            <th style={{ padding: '12px 16px' }}>OUT Time</th>
                            <th style={{ padding: '12px 16px' }}>Notes</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : attendances.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {t.photo ? (
                                            <img src={t.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{t.name?.[0]}</div>
                                        )}
                                        {t.name}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    {t.attendance ? (
                                        <span style={{
                                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                            backgroundColor: t.attendance.status === 'PRESENT' ? '#dcfce7' : t.attendance.status === 'LEAVE' ? '#fef9c3' : '#fee2e2',
                                            color: t.attendance.status === 'PRESENT' ? '#166534' : t.attendance.status === 'LEAVE' ? '#854d0e' : '#991b1b'
                                        }}>
                                            {t.attendance.status}
                                        </span>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '12px', fontWeight: 'bold' }}>NOT MARKED</span>
                                    )}
                                </td>
                                <td style={{ padding: '12px 16px' }}>{t.attendance?.inTime || '-'}</td>
                                <td style={{ padding: '12px 16px' }}>{t.attendance?.outTime || '-'}</td>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>{t.attendance?.notes || '-'}</td>
                            </tr>
                        ))}
                        {!loading && attendances.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No teachers found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
