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
    const [classStudentCount, setClassStudentCount] = useState<number | null>(null)

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

    const handleCourseChange = async (courseId: string) => {
        setSelectedCourse(courseId)
        setSelectedBatch('')
        if (!courseId) {
            setBatches([])
            setClassStudentCount(null)
            return
        }
        fetchBatches(courseId)
        try {
            const res = await fetch(`/api/students?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
            const data = await res.json()
            if (data.success) setClassStudentCount(data.data?.length || 0)
        } catch {
            setClassStudentCount(null)
        }
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: 0 }}>🎫 Admit Cards Generation</h2>
                <a
                    href="/portal/staff/exam-timetable"
                    style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        color: 'white',
                        padding: '10px 16px',
                        borderRadius: '10px',
                        textDecoration: 'none',
                        fontSize: '13px',
                        fontWeight: '700',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 12px rgba(99,102,241,0.3)'
                    }}
                >
                    <span>📝</span> Generate Exam Time Table
                </a>
            </div>

            <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
                <h3 style={{ fontSize: '16px', color: 'white', marginBottom: '16px' }}>Generate New Admit Cards</h3>
                <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                        value={selectedCourse}
                        onChange={e => handleCourseChange(e.target.value)}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white' }}
                        required
                    >
                        <option value="">Select Class / Course *</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>

                    {classStudentCount !== null && (
                        <div style={{ fontSize: '13px', color: classStudentCount > 0 ? '#10b981' : '#ef4444', fontWeight: '600', padding: '4px 8px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px' }}>
                            {classStudentCount > 0 ? `👥 ${classStudentCount} Students enrolled in this class` : '⚠️ No active students found in this class'}
                        </div>
                    )}

                    <select
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                        disabled={!selectedCourse}
                        style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#0f172a', border: '1px solid #334155', color: 'white', opacity: !selectedCourse ? 0.5 : 1 }}
                    >
                        <option value="">{batches.length > 0 ? '-- All Sections / Whole Class --' : '-- Whole Class (No Sections) --'}</option>
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
                        <button onClick={() => setViewEvent(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px', cursor: 'pointer' }}>← Back</button>
                        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                            <button onClick={() => {
                                const html = `<!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Exam Time Table - ${eventDetails.examName}</title>
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

                            <button onClick={() => {
                                const schoolName = tenant?.name || 'RSS Public School';
                                const schoolLogo = tenant?.logo || '';
                                const schoolAddress = tenant?.address || '';
                                const cardsHtml = eventDetails.admitCards.map((card: any) => `
                                    <div class="admit-card-page">
                                        <div class="card-border">
                                            <div class="header">
                                                <div class="logo-box">${schoolLogo ? `<img src="${schoolLogo}" />` : '🏫'}</div>
                                                <div class="header-text">
                                                    <h2 style="margin:0;font-size:18px;text-transform:uppercase;color:#1a237e;">${schoolName}</h2>
                                                    ${schoolAddress ? `<p style="margin:2px 0;font-size:11px;color:#666;">${schoolAddress}</p>` : ''}
                                                    <div style="font-size:14px;font-weight:bold;color:#b45309;margin-top:4px;">HALL TICKET / ADMIT CARD</div>
                                                </div>
                                            </div>
                                            <div class="exam-banner">
                                                ${eventDetails.examName} (${eventDetails.course.name} - ${eventDetails.batch.name})
                                            </div>
                                            <div class="student-info">
                                                <div class="student-details">
                                                    <div><strong>Student Name:</strong> ${card.student.fullName}</div>
                                                    <div><strong>Scholar / Roll No:</strong> ${card.student.scholarNo || 'N/A'}</div>
                                                    <div><strong>Father's Name:</strong> ${card.student.fatherName || 'N/A'}</div>
                                                    <div><strong>Class & Batch:</strong> ${eventDetails.course.name} - ${eventDetails.batch.name}</div>
                                                    <div><strong>Date of Birth:</strong> ${card.student.dob ? new Date(card.student.dob).toLocaleDateString('en-IN') : 'N/A'}</div>
                                                </div>
                                                <div class="photo-box">
                                                    ${card.student.photo ? `<img src="${card.student.photo}" style="width:100%;height:100%;object-fit:cover;" />` : '<div style="font-size:32px;">👤</div>'}
                                                </div>
                                            </div>
                                            <div class="section-title">EXAMINATION TIME TABLE</div>
                                            <table class="timetable-table">
                                                <thead>
                                                    <tr>
                                                        <th>Date</th>
                                                        <th>Subject</th>
                                                        <th>Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${(eventDetails.timeTable || []).map((t: any) => `
                                                        <tr>
                                                            <td>${new Date(t.date).toLocaleDateString('en-IN')}</td>
                                                            <td>${t.subject}</td>
                                                            <td>${t.startTime} - ${t.endTime}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                            <div class="instructions">
                                                <strong>IMPORTANT INSTRUCTIONS:</strong>
                                                <ol style="margin:4px 0 0;padding-left:18px;">
                                                    <li>Candidate must carry this Admit Card to the examination hall.</li>
                                                    <li>Report 30 minutes before exam commences.</li>
                                                    <li>Mobile phones and unfair means are strictly prohibited.</li>
                                                </ol>
                                            </div>
                                            <div class="signatures">
                                                <div class="sig-col">
                                                    <div class="sig-line"></div>
                                                    <span>Student Signature</span>
                                                </div>
                                                <div class="sig-col">
                                                    <div class="sig-line"></div>
                                                    <span>Principal / Controller of Exams</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                `).join('');

                                const html = `<!DOCTYPE html>
                                <html>
                                <head>
                                    <title>Admit Cards - ${eventDetails.examName}</title>
                                    <style>
                                        @page { size: A4 portrait; margin: 10mm; }
                                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #fff; color: #1e293b; }
                                        .admit-card-page { page-break-after: always; padding: 10px; }
                                        .card-border { border: 2px solid #1a237e; border-radius: 8px; padding: 18px; }
                                        .header { display: flex; align-items: center; gap: 14px; border-bottom: 2px solid #1a237e; padding-bottom: 12px; }
                                        .logo-box { width: 60px; height: 60px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                                        .logo-box img { width: 100%; height: 100%; object-fit: contain; }
                                        .header-text { flex: 1; }
                                        .exam-banner { background: #fbbf24; color: #1a237e; font-weight: bold; text-align: center; padding: 6px; margin: 12px 0; border-radius: 4px; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }
                                        .student-info { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 14px; }
                                        .student-details { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 12px; flex: 1; }
                                        .photo-box { width: 90px; height: 110px; border: 1px solid #94a3b8; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
                                        .section-title { font-size: 11px; font-weight: bold; color: #1a237e; text-transform: uppercase; margin-top: 10px; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 3px; }
                                        .timetable-table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 12px; }
                                        .timetable-table th, .timetable-table td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
                                        .timetable-table th { background: #f1f5f9; color: #1e293b; font-weight: bold; }
                                        .instructions { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 8px 12px; font-size: 10px; color: #92400e; margin-bottom: 16px; }
                                        .signatures { display: flex; justify-content: space-between; margin-top: 24px; }
                                        .sig-col { text-align: center; font-size: 11px; color: #475569; }
                                        .sig-line { width: 140px; border-bottom: 1px solid #1e293b; margin-bottom: 4px; }
                                    </style>
                                </head>
                                <body>
                                    ${cardsHtml}
                                    <script>window.onload = () => window.print();</script>
                                </body>
                                </html>`;
                                const win = window.open('', '_blank');
                                if (win) {
                                    win.document.open();
                                    win.document.write(html);
                                    win.document.close();
                                }
                            }} style={{ background: '#8b5cf6', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🖨️ Print All Cards</button>

                            <button onClick={publishAllEligible} style={{ background: '#10b981', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}>🚀 Publish All</button>
                        </div>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginBottom: '4px' }}>{eventDetails.examName}</h2>
                    <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>{eventDetails.course.name} - {eventDetails.batch.name}</p>

                    {/* Attached Exam Time Table preview */}
                    {eventDetails.timeTable && eventDetails.timeTable.length > 0 && (
                        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    📋 Attached Exam Time Table (Shown below each admit card)
                                </div>
                                <span style={{ fontSize: '11px', color: '#94a3b8' }}>{eventDetails.timeTable.length} Subjects</span>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', color: 'white' }}>
                                    <thead>
                                        <tr style={{ background: '#0f172a' }}>
                                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>Date</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>Subject</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>Start Time</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8' }}>End Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {eventDetails.timeTable.map((t: any, idx: number) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid #334155' }}>
                                                <td style={{ padding: '8px 10px', fontWeight: '600' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                                                <td style={{ padding: '8px 10px' }}>{t.subject}</td>
                                                <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{t.startTime}</td>
                                                <td style={{ padding: '8px 10px', color: '#94a3b8' }}>{t.endTime}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {eventDetails.admitCards.map((card: any) => (
                            <div key={card.id} style={{ background: '#1e293b', border: '1px solid #334155', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#334155', overflow: 'hidden' }}>
                                        {card.student.photo ? <img src={card.student.photo} alt={card.student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{card.student.fullName.charAt(0)}</div>}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'white' }}>{card.student.fullName}</div>
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>ID: {card.student.scholarNo || 'N/A'}</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                    {/* Print individual admit card */}
                                    <button
                                        onClick={() => {
                                            const schoolName = tenant?.name || 'RSS Public School';
                                            const schoolLogo = tenant?.logo || '';
                                            const schoolAddress = tenant?.address || '';
                                            const html = `<!DOCTYPE html>
                                            <html>
                                            <head>
                                                <title>Admit Card - ${card.student.fullName}</title>
                                                <style>
                                                    @page { size: A4 portrait; margin: 10mm; }
                                                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #fff; color: #1e293b; }
                                                    .card-border { border: 2px solid #1a237e; border-radius: 8px; padding: 24px; }
                                                    .header { display: flex; align-items: center; gap: 16px; border-bottom: 2px solid #1a237e; padding-bottom: 14px; }
                                                    .logo-box { width: 64px; height: 64px; border-radius: 8px; border: 1px solid #cbd5e1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
                                                    .logo-box img { width: 100%; height: 100%; object-fit: contain; }
                                                    .header-text { flex: 1; }
                                                    .exam-banner { background: #fbbf24; color: #1a237e; font-weight: bold; text-align: center; padding: 8px; margin: 14px 0; border-radius: 4px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
                                                    .student-info { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
                                                    .student-details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 13px; flex: 1; }
                                                    .photo-box { width: 100px; height: 120px; border: 1px solid #94a3b8; border-radius: 6px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #f8fafc; }
                                                    .section-title { font-size: 12px; font-weight: bold; color: #1a237e; text-transform: uppercase; margin-top: 14px; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
                                                    .timetable-table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px; }
                                                    .timetable-table th, .timetable-table td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
                                                    .timetable-table th { background: #f1f5f9; color: #1e293b; font-weight: bold; }
                                                    .instructions { background: #fef3c7; border: 1px solid #fde68a; border-radius: 6px; padding: 10px 14px; font-size: 11px; color: #92400e; margin-bottom: 20px; }
                                                    .signatures { display: flex; justify-content: space-between; margin-top: 36px; }
                                                    .sig-col { text-align: center; font-size: 11px; color: #475569; }
                                                    .sig-line { width: 160px; border-bottom: 1px solid #1e293b; margin-bottom: 6px; }
                                                </style>
                                            </head>
                                            <body>
                                                <div class="card-border">
                                                    <div class="header">
                                                        <div class="logo-box">${schoolLogo ? `<img src="${schoolLogo}" />` : '🏫'}</div>
                                                        <div class="header-text">
                                                            <h2 style="margin:0;font-size:20px;text-transform:uppercase;color:#1a237e;">${schoolName}</h2>
                                                            ${schoolAddress ? `<p style="margin:2px 0;font-size:12px;color:#666;">${schoolAddress}</p>` : ''}
                                                            <div style="font-size:15px;font-weight:bold;color:#b45309;margin-top:4px;">HALL TICKET / ADMIT CARD</div>
                                                        </div>
                                                    </div>
                                                    <div class="exam-banner">
                                                        ${eventDetails.examName} (${eventDetails.course.name} - ${eventDetails.batch.name})
                                                    </div>
                                                    <div class="student-info">
                                                        <div class="student-details">
                                                            <div><strong>Student Name:</strong> ${card.student.fullName}</div>
                                                            <div><strong>Scholar / Roll No:</strong> ${card.student.scholarNo || 'N/A'}</div>
                                                            <div><strong>Father's Name:</strong> ${card.student.fatherName || 'N/A'}</div>
                                                            <div><strong>Class & Batch:</strong> ${eventDetails.course.name} - ${eventDetails.batch.name}</div>
                                                            <div><strong>Date of Birth:</strong> ${card.student.dob ? new Date(card.student.dob).toLocaleDateString('en-IN') : 'N/A'}</div>
                                                        </div>
                                                        <div class="photo-box">
                                                            ${card.student.photo ? `<img src="${card.student.photo}" style="width:100%;height:100%;object-fit:cover;" />` : '<div style="font-size:32px;">👤</div>'}
                                                        </div>
                                                    </div>
                                                    <div class="section-title">EXAMINATION TIME TABLE</div>
                                                    <table class="timetable-table">
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
                                                    <div class="instructions">
                                                        <strong>IMPORTANT INSTRUCTIONS:</strong>
                                                        <ol style="margin:4px 0 0;padding-left:18px;">
                                                            <li>Candidate must carry this Admit Card to the examination hall.</li>
                                                            <li>Report 30 minutes before exam commences.</li>
                                                            <li>Mobile phones and unfair means are strictly prohibited.</li>
                                                        </ol>
                                                    </div>
                                                    <div class="signatures">
                                                        <div class="sig-col">
                                                            <div class="sig-line"></div>
                                                            <span>Student Signature</span>
                                                        </div>
                                                        <div class="sig-col">
                                                            <div class="sig-line"></div>
                                                            <span>Principal / Controller of Exams</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <script>window.onload = () => window.print();</script>
                                            </body>
                                            </html>`;
                                            const win = window.open('', '_blank');
                                            if (win) {
                                                win.document.open();
                                                win.document.write(html);
                                                win.document.close();
                                            }
                                        }}
                                        style={{ background: '#3b82f6', color: 'white', padding: '5px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                                    >
                                        👁️ Admit Card
                                    </button>

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
                                        <button onClick={() => handleAction('publish', card.studentId)} style={{ background: '#6366f1', color: 'white', padding: '5px 10px', borderRadius: '6px', border: 'none', fontSize: '11px', cursor: 'pointer' }}>Publish</button>
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
