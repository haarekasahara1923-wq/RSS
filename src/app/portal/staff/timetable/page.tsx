'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function StaffTimetablePage() {
    const { token, user } = useAuth()
    const [timetables, setTimetables] = useState<any[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    
    // Form state
    const [courseId, setCourseId] = useState('')
    const [batchId, setBatchId] = useState('')
    const [subject, setSubject] = useState('')
    const [dayOfWeek, setDayOfWeek] = useState('1')
    const [startTime, setStartTime] = useState('')
    const [endTime, setEndTime] = useState('')
    
    const [msg, setMsg] = useState('')
    const [errorMsg, setErrorMsg] = useState('')

    useEffect(() => {
        if (token && (user as any)?.teacherProfile?.id) {
            fetchTimetable()
            fetchOptions()
        }
    }, [token, user])

    const fetchOptions = async () => {
        try {
            const rc = await fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
            const cRes = await rc.json()
            if (cRes.success) setCourses(cRes.data)

            const rb = await fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } })
            const bRes = await rb.json()
            if (bRes.success) setBatches(bRes.data)
        } catch (e) {}
    }

    const fetchTimetable = async () => {
        try {
            const r = await fetch(`/api/teachers/timetable?teacherId=${(user as any)?.teacherProfile?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) setTimetables(res.data)
        } catch (e) {
            console.error(e)
        }
    }

    const submitTimetable = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')
        setMsg('')
        if (!(user as any)?.teacherProfile?.id) return

        try {
            const r = await fetch('/api/teachers/timetable', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    teacherId: (user as any).teacherProfile.id,
                    courseId,
                    batchId,
                    subject,
                    dayOfWeek,
                    startTime,
                    endTime
                })
            })
            const res = await r.json()
            if (res.success) {
                setMsg('Schedule submitted for approval.')
                setSubject('')
                setStartTime('')
                setEndTime('')
                fetchTimetable()
            } else {
                setErrorMsg(res.error || 'Failed to submit schedule.')
            }
        } catch (e) {
            setErrorMsg('Network error.')
        }
    }

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    return (
        <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>My Class Schedule</h1>

            {errorMsg && <div style={{ color: 'red', marginBottom: '16px' }}>{errorMsg}</div>}
            {msg && <div style={{ color: 'green', marginBottom: '16px' }}>{msg}</div>}

            <form onSubmit={submitTimetable} className="card" style={{ padding: '24px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Add New Class Schedule</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div>
                        <label className="label">Class</label>
                        <select className="input" value={courseId} onChange={e => { setCourseId(e.target.value); setBatchId(''); }}>
                            <option value="">Select Class</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Section/Batch</label>
                        <select className="input" value={batchId} onChange={e => setBatchId(e.target.value)}>
                            <option value="">Select Section</option>
                            {batches.filter(b => b.courseId === courseId).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Subject</label>
                        <input type="text" required value={subject} onChange={e => setSubject(e.target.value)} className="input" placeholder="e.g. Mathematics" />
                    </div>
                    <div>
                        <label className="label">Day</label>
                        <select className="input" required value={dayOfWeek} onChange={e => setDayOfWeek(e.target.value)}>
                            {days.map((d, i) => <option key={i+1} value={i+1}>{d}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="label">Start Time</label>
                        <input type="time" required value={startTime} onChange={e => setStartTime(e.target.value)} className="input" />
                    </div>
                    <div>
                        <label className="label">End Time</label>
                        <input type="time" required value={endTime} onChange={e => setEndTime(e.target.value)} className="input" />
                    </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Submit Schedule</button>
            </form>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Day</th>
                            <th style={{ padding: '12px 16px' }}>Time</th>
                            <th style={{ padding: '12px 16px' }}>Class/Section</th>
                            <th style={{ padding: '12px 16px' }}>Subject</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {timetables.map((t: any) => (
                            <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{days[t.dayOfWeek - 1]}</td>
                                <td style={{ padding: '12px 16px' }}>{t.startTime} - {t.endTime}</td>
                                <td style={{ padding: '12px 16px' }}>{t.course?.name || 'N/A'} - {t.batch?.name || 'N/A'}</td>
                                <td style={{ padding: '12px 16px' }}>{t.subject}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: t.status === 'PUBLISHED' ? '#dcfce7' : '#fef9c3',
                                        color: t.status === 'PUBLISHED' ? '#166534' : '#854d0e'
                                    }}>
                                        {t.status === 'PUBLISHED' ? 'PUBLISHED' : 'PENDING'}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {timetables.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No schedule entries found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
