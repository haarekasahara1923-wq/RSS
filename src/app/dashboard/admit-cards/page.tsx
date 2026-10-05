'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function DashboardAdmitCards() {
    const { token, user } = useAuth()
    const [events, setEvents] = useState<any[]>([])
    const [viewEvent, setViewEvent] = useState<any>(null)
    const [eventDetails, setEventDetails] = useState<any>(null)

    useEffect(() => {
        if (!token) return
        fetchData()
    }, [token])

    const fetchData = async () => {
        const res = await fetch('/api/admit-cards', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setEvents(data.data || [])
    }

    const openEvent = async (e: any) => {
        setViewEvent(e)
        const res = await fetch(`/api/admit-cards/${e.id}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setEventDetails(data.data)
    }

    const handleApprove = async (studentId: string) => {
        try {
            const res = await fetch(`/api/admit-cards/${viewEvent.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ action: 'approve', studentIds: [studentId] })
            })
            const data = await res.json()
            if (data.success) {
                openEvent(viewEvent)
            } else {
                alert(data.error || 'Failed to approve')
            }
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="card">
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)', marginBottom: '20px' }}>Admit Card Events</h2>
            
            <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
                {events.length === 0 && <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No events found.</p>}
                {events.map((e: any) => (
                    <div key={e.id} onClick={() => openEvent(e)} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '20px', borderRadius: '16px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'all 0.2s' }} className="hover-card">
                        <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{e.examName}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Class: {e.course.name} | Batch: {e.batch.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--primary)', background: 'rgba(99,102,241,0.1)', padding: '4px 8px', borderRadius: '20px', width: 'fit-content', marginTop: '8px' }}>{e._count.admitCards} Cards Generated</div>
                    </div>
                ))}
            </div>

            {viewEvent && eventDetails && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                    <div style={{ background: 'var(--surface)', width: '100%', maxWidth: '800px', borderRadius: '20px', display: 'flex', flexDirection: 'column', maxHeight: '90vh', border: '1px solid var(--border)', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{eventDetails.examName}</h2>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{eventDetails.course.name} - {eventDetails.batch.name}</p>
                            </div>
                            <button onClick={() => setViewEvent(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                        </div>
                        
                        <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {eventDetails.admitCards.map((card: any) => (
                                <div key={card.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'var(--surface)', overflow: 'hidden' }}>
                                            {card.student.photo ? <img src={card.student.photo} alt={card.student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', fontSize: '18px' }}>{card.student.fullName.charAt(0)}</div>}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{card.student.fullName}</div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ID: {card.student.scholarNo || 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                        {card.isPublished ? (
                                            <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 'bold', background: 'rgba(16,185,129,0.1)', padding: '4px 12px', borderRadius: '20px' }}>Published</span>
                                        ) : card.isBlocked ? (
                                            card.superAdminApproved ? (
                                                <span style={{ fontSize: '13px', color: 'var(--warning)', fontWeight: 'bold', background: 'rgba(245,158,11,0.1)', padding: '4px 12px', borderRadius: '20px' }}>Approved</span>
                                            ) : (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <span style={{ fontSize: '13px', color: 'var(--danger)', fontWeight: 'bold', background: 'rgba(239,68,68,0.1)', padding: '4px 12px', borderRadius: '20px' }}>Blocked</span>
                                                    {(user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN') && (
                                                        <button onClick={() => handleApprove(card.studentId)} style={{ background: 'var(--success)', color: 'white', padding: '6px 16px', borderRadius: '8px', border: 'none', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' }}>Approve</button>
                                                    )}
                                                </div>
                                            )
                                        ) : (
                                            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 'bold', background: 'var(--surface)', padding: '4px 12px', borderRadius: '20px' }}>Pending Publish</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
