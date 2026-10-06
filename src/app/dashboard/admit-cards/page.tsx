'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardAdmitCards() {
    const { token, user } = useAuth()
    const [events, setEvents] = useState<any[]>([])
    const [viewEvent, setViewEvent] = useState<any>(null)
    const [eventDetails, setEventDetails] = useState<any>(null)
    const [filterCourse, setFilterCourse] = useState('')
    const [filterBatch, setFilterBatch] = useState('')
    const [courses, setCourses] = useState<any[]>([])
    const [batches, setBatches] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        fetchData()
        fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => { if (d.success) setCourses(d.data || []) })
        fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json()).then(d => { if (d.success) setBatches(d.data || []) })
    }, [token])

    const fetchData = async () => {
        setLoading(true)
        const params = new URLSearchParams()
        if (filterCourse) params.set('courseId', filterCourse)
        if (filterBatch) params.set('batchId', filterBatch)
        const res = await fetch(`/api/admit-cards?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setEvents(data.data || [])
        setLoading(false)
    }

    useEffect(() => {
        if (token) fetchData()
    }, [filterCourse, filterBatch])

    const openEvent = async (e: any) => {
        setViewEvent(e)
        const res = await fetch(`/api/admit-cards/${e.id}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setEventDetails(data.data)
    }

    const handleAction = async (action: string, studentIds: string[]) => {
        try {
            const res = await fetch(`/api/admit-cards/${viewEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action, studentIds })
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
        const eligible = eventDetails.admitCards
            .filter((c: any) => !c.isPublished && (!c.isBlocked || c.superAdminApproved))
            .map((c: any) => c.studentId)
        if (eligible.length === 0) {
            alert('No eligible cards to publish.')
            return
        }
        await handleAction('publish', eligible)
        alert(`Published ${eligible.length} admit cards successfully!`)
    }

    const getStatusBadge = (card: any) => {
        if (card.isPublished) return { label: 'Published', color: '#10b981', bg: 'rgba(16,185,129,0.1)' }
        if (card.isBlocked && !card.superAdminApproved) return { label: 'Blocked', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
        if (card.isBlocked && card.superAdminApproved) return { label: 'Approved ✓', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' }
        return { label: 'Pending', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
    }

    const stats = events.reduce((acc: any, e: any) => ({
        total: acc.total + e._count.admitCards,
        events: acc.events + 1
    }), { total: 0, events: 0 })

    return (
        <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>🎫 Admit Card Events</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Class-wise & batch-wise admit card management</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--primary)' }}>{stats.events}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Events</div>
                    </div>
                    <div style={{ background: 'var(--surface-2)', padding: '12px 20px', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '22px', fontWeight: 'bold', color: '#10b981' }}>{stats.total}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Cards Total</div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <select
                    value={filterCourse}
                    onChange={e => { setFilterCourse(e.target.value); setFilterBatch('') }}
                    className="input"
                    style={{ flex: 1, minWidth: '160px' }}
                >
                    <option value="">All Classes</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select
                    value={filterBatch}
                    onChange={e => setFilterBatch(e.target.value)}
                    className="input"
                    style={{ flex: 1, minWidth: '160px' }}
                >
                    <option value="">All Batches</option>
                    {batches.filter(b => !filterCourse || b.courseId === filterCourse).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading events...</div>
            ) : (
                <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                    {events.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No admit card events found.</p>}
                    {events.map((e: any) => (
                        <div key={e.id} onClick={() => openEvent(e)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '20px', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '10px', transition: 'all 0.2s' }} className="hover-card">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{e.examName}</div>
                                <span style={{ fontSize: '11px', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '3px 8px', borderRadius: '20px', whiteSpace: 'nowrap' }}>{e._count.admitCards} Cards</span>
                            </div>
                            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                <span style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '6px', marginRight: '6px' }}>📚 {e.course.name}</span>
                                <span style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '6px' }}>👥 {e.batch.name}</span>
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {new Date(e.startDate).toLocaleDateString()} → {new Date(e.endDate).toLocaleDateString()}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {viewEvent && eventDetails && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--surface)', width: '100%', maxWidth: '860px', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '92vh', border: '1px solid var(--border)', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
                        {/* Modal Header */}
                        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                            <div>
                                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', margin: 0 }}>🎫 {eventDetails.examName}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', margin: '4px 0 0 0' }}>
                                    {eventDetails.course.name} — {eventDetails.batch.name}
                                    &nbsp;·&nbsp; {eventDetails.admitCards.length} students
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button
                                    onClick={publishAllEligible}
                                    style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: '8px 16px', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '13px' }}
                                >
                                    ✅ Publish All
                                </button>
                                <button onClick={() => { setViewEvent(null); setEventDetails(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}>×</button>
                            </div>
                        </div>

                        {/* Cards List */}
                        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {eventDetails.admitCards.map((card: any) => {
                                const status = getStatusBadge(card)
                                return (
                                    <div key={card.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '14px 16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                            <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden', border: '2px solid var(--border)', flexShrink: 0 }}>
                                                {card.student.photo ? (
                                                    <img src={card.student.photo} alt={card.student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                ) : (
                                                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '18px', fontWeight: 'bold' }}>
                                                        {card.student.fullName.charAt(0)}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{card.student.fullName}</div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Scholar No: {card.student.scholarNo || 'N/A'}</div>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                            <span style={{ fontSize: '12px', color: status.color, fontWeight: 'bold', background: status.bg, padding: '4px 10px', borderRadius: '20px', whiteSpace: 'nowrap' }}>
                                                {status.label}
                                            </span>

                                            {/* Super admin can approve blocked cards */}
                                            {card.isBlocked && !card.superAdminApproved && (user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN') && (
                                                <button
                                                    onClick={() => handleAction('approve', [card.studentId])}
                                                    style={{ background: '#f59e0b', color: 'white', padding: '5px 12px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    Approve
                                                </button>
                                            )}

                                            {/* Publish button for eligible (not published, not blocked OR superAdminApproved) */}
                                            {!card.isPublished && (!card.isBlocked || card.superAdminApproved) && (
                                                <button
                                                    onClick={() => handleAction('publish', [card.studentId])}
                                                    style={{ background: 'var(--primary)', color: 'white', padding: '5px 12px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}
                                                >
                                                    Publish
                                                </button>
                                            )}

                                            {/* Block / Unblock toggle */}
                                            {!card.isPublished && (
                                                <button
                                                    onClick={() => handleAction(card.isBlocked ? 'unblock' : 'block', [card.studentId])}
                                                    style={{
                                                        background: card.isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                                        color: card.isBlocked ? '#10b981' : '#ef4444',
                                                        border: `1px solid ${card.isBlocked ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                                        padding: '5px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer'
                                                    }}
                                                >
                                                    {card.isBlocked ? 'Unblock' : 'Block'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
