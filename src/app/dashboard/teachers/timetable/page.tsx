'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminTimetablePage() {
    const { token } = useAuth()
    const [timetables, setTimetables] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [msg, setMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (token) {
            fetchTimetable()
        }
    }, [token])

    const fetchTimetable = async () => {
        setLoading(true)
        try {
            const r = await fetch('/api/teachers/timetable', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) setTimetables(res.data)
        } catch (e) {
            console.error(e)
            setErrorMsg('Failed to fetch timetables')
        }
        setLoading(false)
    }

    const updateStatus = async (id: string, status: string) => {
        setErrorMsg('')
        setMsg('')
        try {
            const r = await fetch('/api/teachers/timetable', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id, status })
            })
            const res = await r.json()
            if (res.success) {
                setMsg(`Timetable ${status.toLowerCase()} successfully.`)
                fetchTimetable()
            } else {
                setErrorMsg(res.error || 'Failed to update status.')
            }
        } catch (e) {
            setErrorMsg('Network error.')
        }
    }

    const deleteEntry = async (id: string) => {
        if (!confirm('Are you sure you want to delete this entry?')) return
        try {
            const r = await fetch(`/api/teachers/timetable?id=${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) {
                setMsg('Entry deleted.')
                fetchTimetable()
            }
        } catch (e) {}
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Teacher Timetables</h1>

            {errorMsg && <div style={{ color: 'red', marginBottom: '16px' }}>{errorMsg}</div>}
            {msg && <div style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', marginBottom: '24px' }}>{msg}</div>}

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Teacher</th>
                            <th style={{ padding: '12px 16px' }}>Day & Time</th>
                            <th style={{ padding: '12px 16px' }}>Class/Section</th>
                            <th style={{ padding: '12px 16px' }}>Subject</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : timetables.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{t.teacher?.name}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <div style={{ fontWeight: 'bold' }}>{days[t.dayOfWeek - 1]}</div>
                                    <div style={{ color: '#64748b', fontSize: '12px' }}>{t.startTime} - {t.endTime}</div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>{t.course?.name || 'N/A'} - {t.batch?.name || 'N/A'}</td>
                                <td style={{ padding: '12px 16px' }}>{t.subject}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: t.status === 'PUBLISHED' ? '#dcfce7' : t.status === 'DRAFT' ? '#f1f5f9' : '#fef9c3',
                                        color: t.status === 'PUBLISHED' ? '#166534' : t.status === 'DRAFT' ? '#475569' : '#854d0e'
                                    }}>
                                        {t.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    {t.status === 'PENDING_APPROVAL' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => updateStatus(t.id, 'PUBLISHED')} className="btn" style={{ padding: '6px 12px', background: '#22c55e', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Approve</button>
                                            <button onClick={() => updateStatus(t.id, 'DRAFT')} className="btn" style={{ padding: '6px 12px', background: '#ef4444', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Reject</button>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => updateStatus(t.id, t.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')} className="btn" style={{ padding: '6px 12px', background: '#64748b', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>
                                                {t.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                                            </button>
                                            <button onClick={() => deleteEntry(t.id)} className="btn" style={{ padding: '6px 12px', background: '#ef4444', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Delete</button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && timetables.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No timetables found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
