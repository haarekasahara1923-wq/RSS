'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FeatureGate } from '../layout'

interface MockTest {
    id: string
    title: string
    subject: string
    type: string
    duration: number
    totalMarks: number
    passingMarks: number
    negativeMarks: number
    isPublished: boolean
    batchName: string
    questionCount: number
    createdAt: string
}

const typeColors: Record<string, string> = { MCQ: '#6366f1', DESCRIPTIVE: '#ec4899', MIXED: '#f59e0b' }

export default function MockTestsPage() {
    const { token } = useAuth()
    const [tests, setTests] = useState<MockTest[]>([])
    const [batches, setBatches] = useState<{ id: string; name: string }[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [form, setForm] = useState({ title: '', subject: '', type: 'MCQ', batchId: '', duration: '60', totalMarks: '100', passingMarks: '40', negativeMarks: '0', instructions: '' })
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')

    const fetchData = async () => {
        if (!token) return
        const [t, b] = await Promise.all([
            fetch('/api/mock-tests', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ])
        if (t.success) setTests(t.data)
        if (b.success) setBatches(b.data)
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [token])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const res = await fetch('/api/mock-tests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(form),
        })
        const data = await res.json()
        setSaving(false)
        if (data.success) {
            setToast('Test created!')
            setShowAdd(false)
            fetchData()
            setTimeout(() => setToast(''), 3000)
        }
    }

    return (
        <FeatureGate feature="mockTests">
            <div>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h1 className="page-title">📝 Mock Tests & Exams</h1>
                        <p className="page-subtitle">{tests.length} tests created</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button onClick={() => setShowAdd(true)} className="btn btn-primary">➕ Create Test</button>
                    </div>
                </div>

                {toast && <div className="toast toast-success" style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>✓ {toast}</div>}

                {/* Stats */}
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {[
                        { label: 'Total Tests', value: tests.length, color: '#6366f1', icon: '📝' },
                        { label: 'Published', value: tests.filter(t => t.isPublished).length, color: '#10b981', icon: '✅' },
                        { label: 'Drafts', value: tests.filter(t => !t.isPublished).length, color: '#f59e0b', icon: '📄' },
                        { label: 'MCQ Tests', value: tests.filter(t => t.type === 'MCQ').length, color: '#ec4899', icon: '🔵' },
                    ].map(s => (
                        <div key={s.label} style={{ padding: '14px 20px', background: 'var(--surface)', border: `1px solid ${s.color}30`, borderRadius: '12px', borderLeft: `3px solid ${s.color}`, minWidth: '120px' }}>
                            <div style={{ fontSize: '22px', fontWeight: '800', color: s.color }}>{s.value}</div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.icon} {s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : tests.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center', gridColumn: '1/-1' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '16px' }}>No tests created yet</p>
                            <button onClick={() => setShowAdd(true)} className="btn btn-primary">Create First Test</button>
                        </div>
                    ) : tests.map(test => (
                        <div key={test.id} className="card" style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '6px' }}>
                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: `${typeColors[test.type] || '#6366f1'}20`, color: typeColors[test.type] || '#818cf8' }}>{test.type}</span>
                                <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: test.isPublished ? 'rgba(16,185,129,0.15)' : 'rgba(100,116,139,0.15)', color: test.isPublished ? '#10b981' : '#94a3b8' }}>
                                    {test.isPublished ? '✅ Live' : '📄 Draft'}
                                </span>
                            </div>

                            <h3 style={{ fontWeight: '700', fontSize: '16px', marginBottom: '4px', paddingRight: '100px' }}>{test.title}</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>{test.subject || 'All Subjects'} • {test.batchName || 'All Batches'}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
                                {[
                                    { label: 'Duration', value: `${test.duration} min` },
                                    { label: 'Total Marks', value: test.totalMarks },
                                    { label: 'Questions', value: test.questionCount },
                                ].map(d => (
                                    <div key={d.label} style={{ padding: '8px', background: 'var(--surface-2)', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>{d.value}</div>
                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{d.label}</div>
                                    </div>
                                ))}
                            </div>

                            {test.negativeMarks > 0 && (
                                <div style={{ fontSize: '12px', color: '#f59e0b', marginBottom: '12px' }}>⚠️ Negative marking: -{test.negativeMarks} per wrong answer</div>
                            )}

                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>✏️ Edit</button>
                                <button className="btn btn-primary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>📊 Results</button>
                            </div>
                        </div>
                    ))}
                </div>

                {showAdd && (
                    <div className="modal-overlay">
                        <div className="modal modal-lg">
                            <div className="modal-header">
                                <h3 style={{ fontWeight: '700' }}>📝 Create Mock Test</h3>
                                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div><label className="label">Test Title *</label><input className="input" placeholder="Physics Chapter 5 Mock Test" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required /></div>
                                    <div className="grid-cols-2">
                                        <div><label className="label">Subject</label><input className="input" placeholder="Physics" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} /></div>
                                        <div><label className="label">Test Type</label>
                                            <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                                                <option value="MCQ">MCQ</option>
                                                <option value="DESCRIPTIVE">Descriptive</option>
                                                <option value="MIXED">Mixed</option>
                                            </select></div>
                                    </div>
                                    <div><label className="label">Target Batch</label>
                                        <select className="input" value={form.batchId} onChange={e => setForm({ ...form, batchId: e.target.value })}>
                                            <option value="">All Batches</option>
                                            {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                        </select></div>
                                    <div className="grid-cols-3" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                                        <div><label className="label">Duration (min)</label><input className="input" type="number" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
                                        <div><label className="label">Total Marks</label><input className="input" type="number" value={form.totalMarks} onChange={e => setForm({ ...form, totalMarks: e.target.value })} /></div>
                                        <div><label className="label">Passing Marks</label><input className="input" type="number" value={form.passingMarks} onChange={e => setForm({ ...form, passingMarks: e.target.value })} /></div>
                                    </div>
                                    <div><label className="label">Negative Marking (marks per wrong answer)</label><input className="input" type="number" step="0.25" value={form.negativeMarks} onChange={e => setForm({ ...form, negativeMarks: e.target.value })} placeholder="0 = no negative marking" /></div>
                                    <div><label className="label">Instructions</label><textarea className="input" rows={3} placeholder="Write test instructions for students..." value={form.instructions} onChange={e => setForm({ ...form, instructions: e.target.value })} style={{ resize: 'none' }} /></div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳' : '✅ Create Test'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    )
}
