'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

interface Student { id: string; fullName: string; studentId: string }
interface Course  { id: string; name: string }
interface Batch   { id: string; name: string; courseId: string }

export default function ExamsPage() {
    const { token } = useAuth()
    const [step, setStep] = useState<1 | 2>(1)
    const [courses, setCourses] = useState<Course[]>([])
    const [batches, setBatches] = useState<Batch[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [loadingStudents, setLoadingStudents] = useState(false)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState({ msg: '', type: '' })
    const [marks, setMarks] = useState<Record<string, string>>({})

    const [form, setForm] = useState({
        title: '',
        subject: '',
        date: new Date().toISOString().split('T')[0],
        maxMarks: '100',
        courseId: '',
        batchId: '',
    })

    useEffect(() => {
        if (!token) return
        Promise.all([
            fetch('/api/courses', { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
            fetch('/api/batches',  { headers: { Authorization: 'Bearer ' + token } }).then(r => r.json()),
        ]).then(([c, b]) => {
            if (c.success) setCourses(c.data)
            if (b.success) setBatches(b.data)
        })
    }, [token])

    const filteredBatches = batches.filter(b => b.courseId === form.courseId)

    // Step 1 → Step 2: load students
    const handleLoadStudents = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.courseId || !form.batchId) {
            setToast({ msg: 'Please select Class and Section first.', type: 'error' })
            return
        }
        setLoadingStudents(true)
        const res = await fetch(
            `/api/students?course=${form.courseId}&batch=${form.batchId}`,
            { headers: { Authorization: 'Bearer ' + token } }
        )
        const data = await res.json()
        setLoadingStudents(false)
        if (data.success && data.data.length > 0) {
            setStudents(data.data)
            // pre-fill marks with empty string
            const init: Record<string, string> = {}
            data.data.forEach((s: Student) => { init[s.id] = '' })
            setMarks(init)
            setStep(2)
        } else {
            setToast({ msg: 'No students found in this class/section.', type: 'error' })
        }
    }

    // Step 2: publish marks
    const handlePublish = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const results = students.map(s => ({
            studentId: s.id,
            marksObtained: parseFloat(marks[s.id] || '0'),
        }))
        const res = await fetch('/api/exams', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
            body: JSON.stringify({ ...form, maxMarks: parseFloat(form.maxMarks), results }),
        })
        const data = await res.json()
        setSaving(false)
        if (data.success) {
            setToast({ msg: '✅ Marks published successfully! Parents can now see them.', type: 'success' })
            // reset
            setStep(1)
            setStudents([])
            setMarks({})
            setForm({ title: '', subject: '', date: new Date().toISOString().split('T')[0], maxMarks: '100', courseId: '', batchId: '' })
        } else {
            setToast({ msg: data.error || 'Failed to publish marks.', type: 'error' })
        }
    }

    return (
        <div>
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">📑 Monthly Tests & Marks</h1>
                    <p className="page-subtitle">Teacher fills marks → Parents see them instantly on their portal</p>
                </div>
            </div>

            {/* Toast */}
            {toast.msg && (
                <div
                    className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}
                    style={{ marginBottom: '16px', cursor: 'pointer' }}
                    onClick={() => setToast({ msg: '', type: '' })}
                >
                    {toast.msg}
                </div>
            )}

            {/* Step indicator */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {[
                    { n: 1, label: 'Test Details' },
                    { n: 2, label: 'Enter Marks' },
                ].map(s => (
                    <div key={s.n} style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '8px 18px', borderRadius: '999px',
                        background: step === s.n ? 'var(--primary)' : 'var(--surface-2)',
                        color: step === s.n ? 'white' : 'var(--text-muted)',
                        fontWeight: step === s.n ? 700 : 400,
                        fontSize: '13px',
                        transition: 'all 0.2s',
                    }}>
                        <span style={{
                            width: '22px', height: '22px', borderRadius: '50%',
                            background: step === s.n ? 'rgba(255,255,255,0.25)' : 'var(--border)',
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '12px',
                        }}>{s.n}</span>
                        {s.label}
                    </div>
                ))}
            </div>

            {/* ── STEP 1: Test Details ── */}
            {step === 1 && (
                <form onSubmit={handleLoadStudents} className="card" style={{ maxWidth: '680px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px', color: 'var(--primary-light)' }}>
                        📝 Test Information
                    </h3>
                    <div className="grid-cols-2">
                        <div>
                            <label className="label">Test Title *</label>
                            <input
                                className="input"
                                placeholder="e.g. August Monthly Test"
                                value={form.title}
                                onChange={e => setForm({ ...form, title: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Subject *</label>
                            <input
                                className="input"
                                placeholder="e.g. Mathematics"
                                value={form.subject}
                                onChange={e => setForm({ ...form, subject: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Test Date *</label>
                            <input
                                type="date"
                                className="input"
                                value={form.date}
                                onChange={e => setForm({ ...form, date: e.target.value })}
                                required
                            />
                        </div>
                        <div>
                            <label className="label">Max Marks *</label>
                            <input
                                type="number"
                                className="input"
                                placeholder="100"
                                value={form.maxMarks}
                                onChange={e => setForm({ ...form, maxMarks: e.target.value })}
                                required min="1"
                            />
                        </div>
                        <div>
                            <label className="label">Class *</label>
                            <select
                                className="input"
                                value={form.courseId}
                                onChange={e => setForm({ ...form, courseId: e.target.value, batchId: '' })}
                                required
                            >
                                <option value="">Select Class</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="label">Section *</label>
                            <select
                                className="input"
                                value={form.batchId}
                                onChange={e => setForm({ ...form, batchId: e.target.value })}
                                required
                                disabled={!form.courseId}
                            >
                                <option value="">Select Section</option>
                                {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                        <button type="submit" className="btn btn-primary" disabled={loadingStudents}>
                            {loadingStudents
                                ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Loading Students...</>
                                : '➡️ Next: Load Students'}
                        </button>
                    </div>
                </form>
            )}

            {/* ── STEP 2: Enter Marks ── */}
            {step === 2 && (
                <form onSubmit={handlePublish}>
                    {/* Summary card */}
                    <div className="card" style={{ marginBottom: '16px', padding: '14px 20px', display: 'flex', flexWrap: 'wrap', gap: '20px', alignItems: 'center', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.3)' }}>
                        <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Test</span><div style={{ fontWeight: 700 }}>{form.title}</div></div>
                        <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Subject</span><div style={{ fontWeight: 700 }}>{form.subject}</div></div>
                        <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Date</span><div style={{ fontWeight: 700 }}>{form.date}</div></div>
                        <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Max Marks</span><div style={{ fontWeight: 700 }}>{form.maxMarks}</div></div>
                        <div><span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>Students</span><div style={{ fontWeight: 700 }}>{students.length}</div></div>
                        <button type="button" onClick={() => setStep(1)} className="btn btn-secondary" style={{ marginLeft: 'auto', fontSize: '12px' }}>
                            ← Edit Details
                        </button>
                    </div>

                    {/* Marks table */}
                    <div className="card" style={{ padding: 0 }}>
                        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '15px' }}>✏️ Enter Marks for Each Student</h3>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{students.length} students</span>
                        </div>
                        <div className="table-container">
                            <table>
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>Student</th>
                                        <th>Roll No.</th>
                                        <th>Marks Obtained (out of {form.maxMarks})</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {students.map((s, i) => (
                                        <tr key={s.id}>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '13px' }}>
                                                        {s.fullName.charAt(0)}
                                                    </div>
                                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{s.fullName}</span>
                                                </div>
                                            </td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{s.studentId}</td>
                                            <td>
                                                <input
                                                    type="number"
                                                    className="input"
                                                    style={{ width: '120px' }}
                                                    placeholder="0"
                                                    value={marks[s.id]}
                                                    onChange={e => setMarks({ ...marks, [s.id]: e.target.value })}
                                                    min={0}
                                                    max={parseFloat(form.maxMarks)}
                                                    required
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Publish button */}
                        <div style={{ padding: '20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setStep(1)} className="btn btn-secondary">
                                ← Back
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: '160px', justifyContent: 'center' }}>
                                {saving
                                    ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} /> Publishing...</>
                                    : '🚀 Publish Marks'}
                            </button>
                        </div>
                    </div>
                </form>
            )}
        </div>
    )
}
