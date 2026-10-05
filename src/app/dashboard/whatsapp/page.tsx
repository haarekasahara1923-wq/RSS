'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import { FeatureGate } from '../layout'

const TEMPLATES = [
    {
        id: 'fee_reminder',
        name: '💰 Fee Reminder',
        message: 'Dear {parent_name}, This is a reminder that {student_name}\'s fee of ₹{amount} is due on {due_date}. Please contact us to arrange payment. - {school_name}',
        type: 'Fee',
        color: '#f59e0b',
    },
    {
        id: 'admission_welcome',
        name: '🎉 Admission Welcome',
        message: 'Dear {student_name}, Welcome to {school_name}! Your admission is confirmed for {course_name}. Classes start from {start_date}. We look forward to your bright future! 🌟',
        type: 'Admission',
        color: '#10b981',
    },
    {
        id: 'absent_alert',
        name: '⚠️ Absence Alert',
        message: 'Dear Parent, {student_name} was absent from today\'s class on {date}. If this was unplanned, please inform us. Consistent attendance is key to success. - {school_name}',
        type: 'Attendance',
        color: '#ef4444',
    },
    {
        id: 'exam_reminder',
        name: '📝 Exam Reminder',
        message: 'Dear {student_name}, Reminder: Your mock test "{test_name}" is scheduled for {date} at {time}. Total marks: {marks}. Best of luck! - {school_name}',
        type: 'Exam',
        color: '#6366f1',
    },
    {
        id: 'result_notify',
        name: '📊 Result Notification',
        message: 'Dear {parent_name}, {student_name}\'s result for {test_name}: Score {obtained}/{total} ({percentage}%). Rank: {rank}. Keep up the great work! 🏆',
        type: 'Result',
        color: '#ec4899',
    },
    {
        id: 'holiday',
        name: '🎊 Holiday Notice',
        message: 'Dear Students & Parents, Please note that our institute will remain closed on {date} for {reason}. Classes will resume normally from {resume_date}. - {school_name}',
        type: 'General',
        color: '#06b6d4',
    },
]

export default function WhatsAppPage() {
    const { tenant } = useAuth()
    const [activeTemplate, setActiveTemplate] = useState<typeof TEMPLATES[0] | null>(null)
    const [customMsg, setCustomMsg] = useState('')
    const [sending, setSending] = useState(false)
    const [toast, setToast] = useState('')

    const sendDemo = (template: typeof TEMPLATES[0]) => {
        const msg = template.message
            .replace('{school_name}', tenant?.name || 'School Name')
            .replace('{student_name}', '[Student Name]')
            .replace('{parent_name}', '[Parent Name]')
            .replace('{amount}', '[Amount]')
            .replace('{due_date}', '[Due Date]')
            .replace('{course_name}', '[Course Name]')
            .replace('{start_date}', '[Start Date]')
            .replace('{date}', new Date().toLocaleDateString('en-IN'))
            .replace('{time}', '[Time]')
            .replace('{test_name}', '[Test Name]')
            .replace('{marks}', '[Marks]')
            .replace('{obtained}', '[Obtained]')
            .replace('{total}', '[Total]')
            .replace('{percentage}', '[%]')
            .replace('{rank}', '[Rank]')
            .replace('{reason}', '[Reason]')
            .replace('{resume_date}', '27 Jan 2025')

        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }

    return (
        <FeatureGate feature="whatsApp">
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">💬 WhatsApp Automation</h1>
                        <p className="page-subtitle">Send automated messages to students and parents</p>
                    </div>
                    <div style={{ padding: '8px 16px', background: '#25d36615', border: '1px solid #25d36640', borderRadius: '10px', color: '#25d366', fontSize: '13px', fontWeight: '700' }}>
                        ✅ WhatsApp Connected
                    </div>
                </div>

                {toast && <div className="toast toast-success" style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>✓ {toast}</div>}

                {/* Stats */}
                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '24px' }}>
                    {[
                        { label: 'Messages Sent Today', value: '24', color: '#25d366' },
                        { label: 'Delivered', value: '22', color: '#10b981' },
                        { label: 'Read', value: '18', color: '#6366f1' },
                        { label: 'Replies Received', value: '5', color: '#f59e0b' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '14px 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', borderLeft: `3px solid ${s.color}` }}>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    {/* Message Templates */}
                    <div>
                        <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px' }}>📋 Message Templates</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {TEMPLATES.map(t => (
                                <div key={t.id} style={{
                                    padding: '16px', background: 'var(--surface)', border: `1px solid ${t.color}30`,
                                    borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s',
                                    borderLeft: `4px solid ${t.color}`,
                                }} onClick={() => setActiveTemplate(t)}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <h4 style={{ fontWeight: '700', fontSize: '14px' }}>{t.name}</h4>
                                        <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', background: `${t.color}20`, color: t.color }}>{t.type}</span>
                                    </div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '10px' }}>
                                        {t.message.substring(0, 80)}...
                                    </p>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <button onClick={e => { e.stopPropagation(); sendDemo(t) }} style={{ padding: '5px 12px', background: '#25d36615', border: '1px solid #25d36640', borderRadius: '6px', color: '#25d366', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>
                                            💬 Test Send
                                        </button>
                                        <button onClick={e => { e.stopPropagation(); setActiveTemplate(t) }} className="btn btn-secondary btn-sm">
                                            ✏️ Edit
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Preview & Bulk Send */}
                    <div>
                        <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px' }}>📤 Send Message</h3>

                        {activeTemplate && (
                            <div className="card" style={{ marginBottom: '16px' }}>
                                <h4 style={{ fontWeight: '700', marginBottom: '12px', color: 'var(--primary-light)' }}>✏️ {activeTemplate.name}</h4>
                                <div style={{ padding: '14px', background: '#25d36610', borderRadius: '12px', border: '1px solid #25d36630', marginBottom: '12px' }}>
                                    <p style={{ fontSize: '13px', lineHeight: '1.7', color: 'var(--text-secondary)' }}>{activeTemplate.message}</p>
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                                    💡 Variables like {'{student_name}'}, {'{amount}'} will be auto-filled
                                </div>
                                <button onClick={() => sendDemo(activeTemplate)} className="btn btn-success" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
                                    💬 Send via WhatsApp
                                </button>
                            </div>
                        )}

                        <div className="card">
                            <h4 style={{ fontWeight: '700', marginBottom: '12px' }}>📨 Bulk Send</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {[
                                    { label: 'All Active Students', count: '6', icon: '👥' },
                                    { label: 'Students with Dues', count: '4', icon: '💰' },
                                    { label: 'Absent Today', count: '0', icon: '⚠️' },
                                    { label: 'Upcoming Test', count: '6', icon: '📝' },
                                ].map(r => (
                                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                            <span>{r.icon}</span>
                                            <span style={{ fontSize: '13px', fontWeight: '600' }}>{r.label}</span>
                                            <span style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)', borderRadius: '10px', fontSize: '11px', fontWeight: '700' }}>{r.count}</span>
                                        </div>
                                        <button className="btn btn-secondary btn-sm">Send →</button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="card" style={{ marginTop: '16px' }}>
                            <h4 style={{ fontWeight: '700', marginBottom: '12px' }}>✉️ Custom Message</h4>
                            <textarea className="input" rows={4} placeholder="Type your custom message here..." value={customMsg} onChange={e => setCustomMsg(e.target.value)} style={{ resize: 'none', marginBottom: '12px' }} />
                            <button
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(customMsg)}`, '_blank')}
                                className="btn btn-success"
                                disabled={!customMsg}
                                style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #25d366, #128c7e)' }}>
                                💬 Send Custom Message
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </FeatureGate>
    )
}
