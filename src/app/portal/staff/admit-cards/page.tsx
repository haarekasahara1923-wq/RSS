'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function StaffAdmitCards() {
    const { token, tenant } = useAuth()
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [events, setEvents] = useState<any[]>([])
    const [selectedCourse, setSelectedCourse] = useState('')
    const [selectedBatch, setSelectedBatch] = useState('')
    
    // Form state
    const [examName, setExamName] = useState('')
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [timeTable, setTimeTable] = useState<{ date: string, subject: string, startTime: string, endTime: string }[]>([])
    
    // UI state
    const [loading, setLoading] = useState(false)
    const [viewEvent, setViewEvent] = useState<any>(null)
    const [eventDetails, setEventDetails] = useState<any>(null)

    useEffect(() => {
        if (!token) return
        fetchData()
        fetchCourses()
    }, [token])

    const fetchCourses = async () => {
        const res = await fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setCourses(data.data || [])
    }

    const fetchBatches = async (courseId: string) => {
        const res = await fetch(`/api/batches?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setBatches(data.data || [])
    }

    const fetchData = async () => {
        const res = await fetch('/api/admit-cards', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setEvents(data.data || [])
    }

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/admit-cards', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    courseId: selectedCourse,
                    batchId: selectedBatch,
                    examName,
                    startDate,
                    endDate,
                    timeTable
                })
            })
            const data = await res.json()
            if (data.success) {
                alert('Admit Cards generated successfully!')
                setExamName('')
                setStartDate('')
                setEndDate('')
                setSelectedCourse('')
                setSelectedBatch('')
                setTimeTable([])
                fetchData()
            } else {
                alert(data.error || 'Failed to generate admit cards')
            }
        } catch (err) {
            console.error(err)
            alert('An error occurred')
        }
        setLoading(false)
    }

    const openEvent = async (e: any) => {
        setViewEvent(e)
        const res = await fetch(`/api/admit-cards/${e.id}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setEventDetails(data.data)
    }

    const handleAction = async (action: string, studentId: string) => {
        try {
            const res = await fetch(`/api/admit-cards/${viewEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action, studentIds: [studentId] })
            })
            const data = await res.json()
            if (data.success) {
                openEvent(viewEvent)
            } else {
                alert(data.error || 'Failed to update')
            }
        } catch (err) {
            console.error(err)
        }
    }

    const publishAllEligible = async () => {
        if (!eventDetails) return
        const eligible = eventDetails.admitCards.filter((c: any) => !c.isPublished && (!c.isBlocked || c.superAdminApproved)).map((c: any) => c.studentId)
        if (eligible.length === 0) {
            alert('No eligible cards to publish.')
            return
        }
        try {
            const res = await fetch(`/api/admit-cards/${viewEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: 'publish', studentIds: eligible })
            })
            const data = await res.json()
            if (data.success) {
                alert('Published successfully!')
                openEvent(viewEvent)
            } else {
                alert(data.error || 'Failed to publish')
            }
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white' }}>🎫 Admit Cards Generation</h2>

            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '16px', color: 'white', marginBottom: '16px' }}>Generate New Admit Cards</h3>
                <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                        value={selectedCourse}
                        onChange={e => { setSelectedCourse(e.target.value); fetchBatches(e.target.value) }}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        required
                    >
                        <option value="">Select Class / Course</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    <select
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        required
                    >
                        <option value="">Select Batch</option>
                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    <input
                        type="text"
                        placeholder="Exam Name (e.g. Mid Term Exam 2026)"
                        value={examName}
                        onChange={e => setExamName(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        required
                    />

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>Start Date</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                required
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', display: 'block' }}>End Date</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                                required
                            />
                        </div>
                    </div>

                    <div style={{ marginTop: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <label style={{ fontSize: '14px', color: 'white', fontWeight: 'bold' }}>Exam Time Table</label>
                            <button type="button" onClick={() => setTimeTable([...timeTable, { date: '', subject: '', startTime: '', endTime: '' }])} style={{ background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', cursor: 'pointer' }}>+ Add Subject</button>
                        </div>
                        {timeTable.map((row, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                <input type="date" value={row.date} onChange={e => { const t = [...timeTable]; t[idx].date = e.target.value; setTimeTable(t) }} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: 'white' }} required />
                                <input type="text" placeholder="Subject" value={row.subject} onChange={e => { const t = [...timeTable]; t[idx].subject = e.target.value; setTimeTable(t) }} style={{ flex: 1.5, padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: 'white' }} required />
                                <input type="time" value={row.startTime} onChange={e => { const t = [...timeTable]; t[idx].startTime = e.target.value; setTimeTable(t) }} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: 'white' }} required />
                                <input type="time" value={row.endTime} onChange={e => { const t = [...timeTable]; t[idx].endTime = e.target.value; setTimeTable(t) }} style={{ flex: 1, padding: '8px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: 'white' }} required />
                                <button type="button" onClick={() => setTimeTable(timeTable.filter((_, i) => i !== idx))} style={{ background: '#ef4444', color: 'white', padding: '8px 12px', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>✕</button>
                            </div>
                        ))}
                    </div>

                    <button type="submit" disabled={loading} style={{ background: 'linear-gradient(135deg, #f43f5e, #e11d48)', color: 'white', padding: '12px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer', marginTop: '8px' }}>
                        {loading ? 'Generating...' : 'Generate Admit Cards'}
                    </button>
                </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '16px', color: 'white' }}>Generated Admit Card Events</h3>
                {events.length === 0 && <p style={{ color: '#94a3b8', fontSize: '14px' }}>No events generated yet.</p>}
                {events.map((e: any) => (
                    <div key={e.id} onClick={() => openEvent(e)} style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
                        <div>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'white' }}>{e.examName}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>{e.course.name} - {e.batch.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '12px', color: '#6366f1', background: 'rgba(99,102,241,0.1)', padding: '4px 8px', borderRadius: '20px' }}>{e._count.admitCards} Cards</div>
                        </div>
                    </div>
                ))}
            </div>

            {viewEvent && eventDetails && (
                <div style={{ position: 'fixed', inset: 0, background: '#0f172a', zIndex: 100, overflowY: 'auto', padding: '20px', paddingBottom: '80px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <button onClick={() => setViewEvent(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>← Back</button>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => {
                                const html = `<!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Exam Time Table</title>
                                    <style>
                                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; }
                                        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2c3e50; padding-bottom: 20px; }
                                        .logo { max-height: 80px; margin-bottom: 10px; }
                                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
                                        th { background-color: #f8f9fa; font-weight: bold; color: #2c3e50; }
                                        tr:nth-child(even) { background-color: #f8f9fa; }
                                    </style>
                                </head>
                                <body>
                                    <div class="header">
                                        ${tenant?.logo ? `<img src="${tenant.logo}" class="logo" />` : ''}
                                        <h1 style="margin: 0; color: #2c3e50;">${tenant?.name || 'School Name'}</h1>
                                        <h2 style="margin: 5px 0;">Exam Time Table: ${eventDetails.examName}</h2>
                                        <p style="margin: 0; color: #666;">Course: ${eventDetails.course.name} | Batch: ${eventDetails.batch.name}</p>
                                    </div>
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Subject</th>
                                                <th>Start Time</th>
                                                <th>End Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${(eventDetails.timeTable || []).map((t: any) => `
                                                <tr>
                                                    <td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
                                                    <td>${t.subject}</td>
                                                    <td>${t.startTime}</td>
                                                    <td>${t.endTime}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    <script>window.onload = () => window.print();</script>
                                </body>
                                </html>`;
                                const win = window.open('', '_blank');
                                if (win) {
                                    win.document.open();
                                    win.document.write(html);
                                    win.document.close();
                                }
                            }} style={{ background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>📄 Download Time Table</button>
                            <button onClick={publishAllEligible} style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🚀 Publish All</button>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '8px' }}>{eventDetails.examName}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '20px' }}>{eventDetails.course.name} - {eventDetails.batch.name}</p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {eventDetails.admitCards.map((card: any) => (
                            <div key={card.id} style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155', overflow: 'hidden' }}>
                                        {card.student.photo ? <img src={card.student.photo} alt={card.student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{card.student.fullName.charAt(0)}</div>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{card.student.fullName}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {card.student.scholarNo || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {card.isPublished ? (
                                        <span style={{ fontSize: '12px', color: '#10b981', fontWeight: 'bold' }}>Published</span>
                                    ) : card.isBlocked && !card.superAdminApproved ? (
                                        <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 'bold' }}>Blocked (Needs Approval)</span>
                                    ) : card.isBlocked && card.superAdminApproved ? (
                                        <span style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 'bold' }}>Approved to Publish</span>
                                    ) : null}
                                    
                                    {!card.isPublished && (
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                                            <input 
                                                type="checkbox" 
                                                checked={card.isBlocked} 
                                                onChange={() => handleAction(card.isBlocked ? 'unblock' : 'block', card.studentId)}
                                                style={{ width: '18px', height: '18px', accentColor: '#ef4444' }}
                                            />
                                            <span style={{ fontSize: '12px', color: card.isBlocked ? '#ef4444' : '#94a3b8' }}>Cross</span>
                                        </label>
                                    )}
                                    {(!card.isPublished && card.isBlocked && card.superAdminApproved) || (!card.isPublished && !card.isBlocked) ? (
                                        <button onClick={() => handleAction('publish', card.studentId)} style={{ background: '#6366f1', color: 'white', padding: '4px 8px', borderRadius: '6px', border: 'none', fontSize: '11px', cursor: 'pointer' }}>Publish</button>
                                    ) : null}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
