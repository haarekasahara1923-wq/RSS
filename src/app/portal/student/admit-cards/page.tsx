'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'

export default function StudentAdmitCards() {
    const { token } = useAuth()
    const [admitCards, setAdmitCards] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        // Allow printing on this page
        document.body.classList.add('allow-print')
        return () => document.body.classList.remove('allow-print')
    }, [])

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

    const downloadPDF = (cardId: string) => {
        // Add printable class to target card
        const el = document.getElementById(`print-card-${cardId}`)
        if (!el) return
        el.classList.add('printing-now')
        window.print()
        el.classList.remove('printing-now')
    }

    if (loading) return (
        <div style={{ color: 'white', textAlign: 'center', padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>Loading your admit cards...</p>
        </div>
    )

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }} className="admit-cards-container">
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @media print {
                    body * { visibility: hidden; }
                    .print-target.printing-now, .print-target.printing-now * { visibility: visible !important; }
                    .print-target.printing-now { position: fixed; left: 0; top: 0; width: 100%; z-index: 99999; margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                }
            `}</style>

            <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, #1e293b, #0f172a)', padding: '16px', borderRadius: '14px', border: '1px solid #334155' }}>
                <Link href="/portal/student" style={{ color: '#94a3b8', textDecoration: 'none', fontSize: '20px', display: 'flex', alignItems: 'center' }}>←</Link>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', margin: 0 }}>🎫 My Admit Cards</h2>
                    <p style={{ fontSize: '12px', color: '#64748b', margin: '2px 0 0 0' }}>{admitCards.length} card{admitCards.length !== 1 ? 's' : ''} available</p>
                </div>
            </div>

            {admitCards.length === 0 && (
                <div style={{ background: '#1e293b', padding: '40px 20px', borderRadius: '16px', textAlign: 'center', border: '1px dashed #334155' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎫</div>
                    <div style={{ color: '#94a3b8', fontSize: '14px' }}>No admit cards available yet.</div>
                    <div style={{ color: '#64748b', fontSize: '12px', marginTop: '6px' }}>Your teacher will publish them when ready.</div>
                </div>
            )}

            {admitCards.map((card: any) => (
                <div key={card.id} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* PREMIUM ADMIT CARD TEMPLATE */}
                    <div id={`print-card-${card.id}`} className="print-target admit-card" style={{
                        background: 'white',
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        fontFamily: 'Georgia, serif'
                    }}>
                        {/* Top colored strip */}
                        <div style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', padding: '0', height: '8px' }} />

                        {/* School Header */}
                        <div style={{ background: 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #1565c0 100%)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ width: '60px', height: '60px', borderRadius: '12px', overflow: 'hidden', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid rgba(255,255,255,0.3)', flexShrink: 0 }}>
                                    {card.tenant.logo ? (
                                        <img src={card.tenant.logo} alt="School Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    ) : (
                                        <span style={{ fontSize: '28px' }}>🏫</span>
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'white', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.tenant.name}</div>
                                    {card.tenant.address && <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)', marginTop: '2px' }}>{card.tenant.address}</div>}
                                    {(card.tenant.phone || card.tenant.email) && (
                                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>
                                            {card.tenant.phone && `📞 ${card.tenant.phone}`}{card.tenant.phone && card.tenant.email && ' | '}{card.tenant.email && `✉ ${card.tenant.email}`}
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '1px' }}>HALL TICKET</div>
                                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#fbbf24', marginTop: '2px' }}>ADMIT CARD</div>
                            </div>
                        </div>

                        {/* Exam Title Banner */}
                        <div style={{ background: '#fbbf24', padding: '10px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1a237e', textTransform: 'uppercase', letterSpacing: '2px' }}>
                                {card.event.examName}
                            </div>
                        </div>

                        {/* Main Content */}
                        <div style={{ padding: '20px 24px', background: 'white' }}>
                            <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
                                {/* Student Photo */}
                                <div style={{ flexShrink: 0 }}>
                                    <div style={{ width: '90px', height: '110px', background: '#f1f5f9', border: '2px solid #1a237e', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {card.student.photo ? (
                                            <img src={card.student.photo} alt="Student Photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '10px', padding: '8px' }}>
                                                <div style={{ fontSize: '32px', marginBottom: '4px' }}>👤</div>
                                                Photo
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Student Info Grid */}
                                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    {[
                                        { label: "Student's Name", value: card.student.fullName },
                                        { label: "Scholar No / Roll No", value: card.student.scholarNo || 'N/A' },
                                        { label: "Father's Name", value: card.student.fatherName || 'N/A' },
                                        { label: "Class & Section", value: `${card.event.course.name} - ${card.event.batch.name}` },
                                        { label: "Date of Birth", value: card.student.dob ? new Date(card.student.dob).toLocaleDateString('en-IN') : 'N/A' },
                                    ].map(field => (
                                        <div key={field.label}>
                                            <div style={{ fontSize: '9px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px', fontFamily: 'Arial, sans-serif' }}>{field.label}</div>
                                            <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', borderBottom: '1px solid #e2e8f0', paddingBottom: '4px' }}>{field.value}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Exam Schedule */}
                            <div style={{ marginTop: '18px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '9px', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Arial, sans-serif' }}>Exam Starts</div>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a' }}>{new Date(card.event.startDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                                <div style={{ color: '#93c5fd', fontSize: '24px' }}>→</div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '9px', color: '#2563eb', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'Arial, sans-serif' }}>Exam Ends</div>
                                    <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#1e3a8a' }}>{new Date(card.event.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                </div>
                            </div>

                            {/* Instructions */}
                            <div style={{ marginTop: '14px', padding: '10px 14px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px' }}>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#92400e', marginBottom: '4px', fontFamily: 'Arial, sans-serif' }}>IMPORTANT INSTRUCTIONS:</div>
                                <ul style={{ margin: 0, paddingLeft: '16px', fontSize: '10px', color: '#78350f', lineHeight: '1.6', fontFamily: 'Arial, sans-serif' }}>
                                    <li>Carry this admit card to the examination hall.</li>
                                    <li>No candidate will be allowed to enter without this card.</li>
                                    <li>Report 30 minutes before the examination begins.</li>
                                    <li>Mobile phones and electronic devices are strictly prohibited.</li>
                                </ul>
                            </div>

                            {/* Time Table (if exists) */}
                            {card.event.timeTable && card.event.timeTable.length > 0 && (
                                <div style={{ marginTop: '14px' }}>
                                    <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#1a237e', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '2px solid #1a237e', display: 'inline-block', paddingBottom: '2px', fontFamily: 'Arial, sans-serif' }}>Exam Time Table</div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '10px', fontFamily: 'Arial, sans-serif', border: '1px solid #e2e8f0' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', color: '#0f172a' }}>
                                                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Date</th>
                                                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Subject</th>
                                                <th style={{ padding: '6px 8px', borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>Time</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {card.event.timeTable.map((t: any, idx: number) => (
                                                <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '6px 8px', fontWeight: 'bold' }}>{new Date(t.date).toLocaleDateString('en-IN')}</td>
                                                    <td style={{ padding: '6px 8px' }}>{t.subject}</td>
                                                    <td style={{ padding: '6px 8px' }}>{t.startTime} - {t.endTime}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* Footer Signatures */}
                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #0f172a', width: '140px', paddingTop: '4px', fontSize: '10px', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>Student Signature</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ borderTop: '1px solid #0f172a', width: '140px', paddingTop: '4px', fontSize: '10px', color: '#64748b', fontFamily: 'Arial, sans-serif' }}>Principal / Examiner</div>
                                </div>
                            </div>
                        </div>

                        {/* Bottom strip */}
                        <div style={{ background: 'linear-gradient(135deg, #1a237e, #283593)', padding: '8px 24px', textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontFamily: 'Arial, sans-serif' }}>
                                This is an official document issued by {card.tenant.name} · Keep it safe
                            </div>
                        </div>
                    </div>

                    {/* Download Button */}
                    <button
                        onClick={() => downloadPDF(card.id)}
                        className="no-print"
                        style={{
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: 'white',
                            padding: '14px',
                            borderRadius: '12px',
                            border: 'none',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            boxShadow: '0 4px 12px rgba(99,102,241,0.4)'
                        }}
                    >
                        <span>📥</span> Download / Print PDF
                    </button>
                </div>
            ))}
        </div>
    )
}
