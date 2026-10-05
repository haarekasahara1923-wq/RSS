'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function ParentAdmitCards() {
    const { token } = useAuth()
    const [admitCards, setAdmitCards] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        fetch('/api/my-admit-cards', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => {
                if (d.success) setAdmitCards(d.data || [])
                setLoading(false)
            })
            .catch(() => setLoading(false))
    }, [token])

    const downloadPDF = () => {
        window.print()
    }

    if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '20px' }}>Loading...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} className="admit-cards-container">
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .admit-cards-container, .admit-cards-container * { visibility: visible; }
                    .admit-cards-container { position: absolute; left: 0; top: 0; width: 100%; padding: 0 !important; }
                    .no-print { display: none !important; }
                    .admit-card { page-break-inside: avoid; border: 1px solid #ccc !important; background: white !important; color: black !important; }
                    .admit-card * { color: black !important; }
                }
            `}</style>

            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#1e293b', padding: '16px', borderRadius: '12px' }}>
                <Link href="/portal/parent" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '20px' }}>←</Link>
                <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>Admit Cards</h2>
            </div>

            {admitCards.length === 0 && (
                <div style={{ background: '#1e293b', padding: '20px', borderRadius: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '10px' }}>🎫</div>
                    <div style={{ color: '#94a3b8', fontSize: '14px' }}>No admit cards available yet.</div>
                </div>
            )}

            {admitCards.map((card: any) => (
                <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div className="admit-card" style={{ background: 'linear-gradient(135deg, #1e293b, #0f172a)', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden', position: 'relative' }}>
                        {/* Decorative elements */}
                        <div style={{ position: 'absolute', top: '-50px', right: '-50px', width: '150px', height: '150px', background: 'rgba(99,102,241,0.1)', borderRadius: '50%', zIndex: 0 }} />
                        <div style={{ position: 'absolute', bottom: '-50px', left: '-50px', width: '150px', height: '150px', background: 'rgba(236,72,153,0.1)', borderRadius: '50%', zIndex: 0 }} />
                        
                        <div style={{ position: 'relative', zIndex: 1, padding: '24px' }}>
                            {/* School Header */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px', marginBottom: '16px' }}>
                                <img src={card.tenant.logo || '/logo.png'} alt="Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                                <div>
                                    <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>{card.tenant.name}</div>
                                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>{card.tenant.address || 'Address not provided'}</div>
                                </div>
                            </div>
                            
                            {/* Exam Title */}
                            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#6366f1', textTransform: 'uppercase', letterSpacing: '1px' }}>Admit Card</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', marginTop: '4px' }}>{card.event.examName}</div>
                            </div>

                            {/* Student Details */}
                            <div style={{ display: 'flex', gap: '16px' }}>
                                <div style={{ width: '80px', height: '100px', background: '#334155', borderRadius: '8px', overflow: 'hidden', border: '2px solid #475569', flexShrink: 0 }}>
                                    {card.student.photo ? (
                                        <img src={card.student.photo} alt="Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>No Photo</div>
                                    )}
                                </div>
                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Student Name</div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{card.student.fullName}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Scholar No / ID</div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{card.student.scholarNo || 'N/A'}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Class & Batch</div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{card.event.course.name} - {card.event.batch.name}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '10px', color: '#94a3b8' }}>Father's Name</div>
                                        <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{card.student.fatherName || 'N/A'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Dates */}
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>Start Date</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{new Date(card.event.startDate).toLocaleDateString()}</div>
                                </div>
                                <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }}></div>
                                <div>
                                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>End Date</div>
                                    <div style={{ fontSize: '13px', fontWeight: 'bold', color: 'white' }}>{new Date(card.event.endDate).toLocaleDateString()}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <button onClick={downloadPDF} className="no-print" style={{ background: '#6366f1', color: 'white', padding: '12px', borderRadius: '12px', border: 'none', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span>📥</span> Download PDF
                    </button>
                </div>
            ))}
        </div>
    )
}
