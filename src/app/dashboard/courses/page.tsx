'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

const CLASS_OPTIONS = [
    'Nursery', 'LKG', 'UKG',
    'Class 1', 'Class 2', 'Class 3', 'Class 4', 'Class 5', 'Class 6',
    'Class 7', 'Class 8', 'Class 9', 'Class 10', 'Class 11', 'Class 12',
]

const CLASS_GROUPS = [
    { label: 'Junior (Upto 4th)', value: 'Junior' },
    { label: 'Middle (5th to 8th)', value: 'Middle' },
    { label: 'Higher Sec (9th to 10th)', value: 'Higher Sec' },
    { label: 'Senior Hr Secondary (11th to 12th)', value: 'Senior Hr Secondary' },
]

const SUBJECT_GROUPS = ['Science Bio', 'Science Maths', 'Arts', 'Commerce']

const SECTION_OPTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G']

export default function ClassesPage() {
    const { token, handleUnauthorized } = useAuth()
    const [courses, setCourses] = useState<{ id: string; name: string; description: string; duration: string; fees: number; subjects: string[]; installmentCount: number; isActive: boolean; classGroup?: string; subjectGroup?: string }[]>([])
    const [batches, setBatches] = useState<{ id: string; name: string; courseId: string; courseName: string; startTime: string; endTime: string; capacity: number; studentCount: number }[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('courses')
    const [showAddCourse, setShowAddCourse] = useState(false)
    const [showAddBatch, setShowAddBatch] = useState(false)
    const [courseForm, setCourseForm] = useState({ id: '', name: '', description: '', duration: '', fees: '', subjects: '', installmentCount: '1', classGroup: '', subjectGroup: '' })
    const [batchForm, setBatchForm] = useState({ id: '', name: '', courseId: '', section: 'A', capacity: '40' })
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')

    // Auto-redirect to login on 401 (expired/invalid token)
    const handleApiError = (data: any, status: number) => {
        if (status === 401 || data?.error === 'Unauthorized') {
            handleUnauthorized()
            return
        }
        alert(data?.error || 'Something went wrong')
    }

    const fetchData = async () => {
        if (!token) return
        const [c, b] = await Promise.all([
            fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
            fetch('/api/batches', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        ])
        if (c.success) setCourses(c.data)
        if (b.success) setBatches(b.data)
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [token])

    const handleAddCourse = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const isEdit = !!courseForm.id
        const res = await fetch('/api/courses', {
            method: isEdit ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ ...courseForm, subjects: courseForm.subjects.split(',').map(s => s.trim()) }),
        })
        const data = await res.json()
        setSaving(false)
        if (data.success) {
            setToast(`Class ${isEdit ? 'updated' : 'added'}!`)
            setShowAddCourse(false)
            setCourseForm({ id: '', name: '', description: '', duration: '', fees: '', subjects: '', installmentCount: '1', classGroup: '', subjectGroup: '' })
            fetchData()
            setTimeout(() => setToast(''), 3000)
        } else { handleApiError(data, res.status) }
    }

    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const isEdit = !!batchForm.id
        // Auto-generate batch name from section if not edited
        const selectedCourse = courses.find(c => c.id === batchForm.courseId)
        const autoName = selectedCourse ? `${selectedCourse.name} – Section ${batchForm.section}` : batchForm.name
        const payload = {
            ...batchForm,
            name: batchForm.name || autoName,
            startTime: '',
            endTime: '',
        }
        const res = await fetch('/api/batches', {
            method: isEdit ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(payload),
        })
        const data = await res.json()
        setSaving(false)
        if (data.success) {
            setToast(`Batch ${isEdit ? 'updated' : 'added'}!`)
            setShowAddBatch(false)
            setBatchForm({ id: '', name: '', courseId: '', section: 'A', capacity: '40' })
            fetchData()
            setTimeout(() => setToast(''), 3000)
        } else { handleApiError(data, res.status) }
    }

    const handleDelete = async (type: 'course' | 'batch', id: string) => {
        if (!confirm(`Are you sure you want to delete this ${type === 'course' ? 'class' : 'batch'}?`)) return
        const res = await fetch(`/api/${type === 'course' ? 'courses' : 'batches'}?id=${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (data.success) fetchData()
        else handleApiError(data, res.status)
    }

    const openEditCourse = (c: any) => {
        setCourseForm({
            id: c.id, name: c.name, description: c.description, duration: c.duration,
            fees: String(c.fees), subjects: c.subjects.join(', '), installmentCount: String(c.installmentCount),
            classGroup: c.classGroup || '', subjectGroup: c.subjectGroup || ''
        })
        setShowAddCourse(true)
    }

    const openEditBatch = (b: any) => {
        // Try to extract section from batch name (e.g. "Class 5 – Section B" → "B")
        const sectionMatch = b.name?.match(/Section\s+([A-G])/i)
        const section = sectionMatch ? sectionMatch[1].toUpperCase() : 'A'
        setBatchForm({
            id: b.id, name: b.name, courseId: b.courseId, section, capacity: String(b.capacity)
        })
        setShowAddBatch(true)
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">🏫 Classes &amp; Batches</h1>
                    <p className="page-subtitle">{courses.length} classes • {batches.length} sections/batches</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={() => setShowAddCourse(true)} className="btn btn-secondary">➕ Class</button>
                    <button onClick={() => setShowAddBatch(true)} className="btn btn-primary">➕ Batch/Section</button>
                </div>
            </div>

            {toast && <div className="toast toast-success" style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>✓ {toast}</div>}

            <div className="tabs">
                <button className={`tab ${activeTab === 'courses' ? 'active' : ''}`} onClick={() => setActiveTab('courses')}>🏫 Classes ({courses.length})</button>
                <button className={`tab ${activeTab === 'batches' ? 'active' : ''}`} onClick={() => setActiveTab('batches')}>📋 Sections/Batches ({batches.length})</button>
            </div>

            {activeTab === 'courses' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                    {loading ? <div style={{ padding: '40px' }}><div className="spinner" /></div> :
                        courses.map(c => (
                            <div key={c.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <h3 style={{ fontWeight: '700', fontSize: '16px' }}>{c.name}</h3>
                                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{c.classGroup} {c.subjectGroup ? `• ${c.subjectGroup}` : ''}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openEditCourse(c)} className="btn btn-sm" style={{ padding: '4px', background: 'transparent', color: '#6366f1' }}>✏️</button>
                                        <button onClick={() => handleDelete('course', c.id)} className="btn btn-sm" style={{ padding: '4px', background: 'transparent', color: '#ef4444' }}>🗑️</button>
                                        <span className={`badge ${c.isActive ? 'badge-success' : 'badge-gray'}`}>{c.isActive ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '16px' }}>{c.description}</p>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                                    <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: '800', color: '#10b981', fontSize: '18px' }}>₹{(c.fees / 1000).toFixed(0)}K</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Fees</div>
                                    </div>
                                    <div style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: '8px', textAlign: 'center' }}>
                                        <div style={{ fontWeight: '800', color: '#6366f1', fontSize: '18px' }}>{c.installmentCount}</div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Installments</div>
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '700', textTransform: 'uppercase' }}>Subjects</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                        {c.subjects.map(s => (
                                            <span key={s} style={{ padding: '3px 10px', background: 'rgba(99,102,241,0.15)', color: 'var(--primary-light)', borderRadius: '4px', fontSize: '11px', fontWeight: '600' }}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {activeTab === 'batches' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                    {loading ? <div style={{ padding: '40px' }}><div className="spinner" /></div> :
                        batches.map(b => (
                            <div key={b.id} className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h3 style={{ fontWeight: '700', fontSize: '15px', marginBottom: '6px' }}>{b.name}</h3>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button onClick={() => openEditBatch(b)} className="btn btn-sm" style={{ padding: '4px', background: 'transparent', color: '#6366f1' }}>✏️</button>
                                        <button onClick={() => handleDelete('batch', b.id)} className="btn btn-sm" style={{ padding: '4px', background: 'transparent', color: '#ef4444' }}>🗑️</button>
                                    </div>
                                </div>
                                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '16px' }}>{b.courseName}</p>
                                <div style={{ marginBottom: '12px' }}>
                                    {/* Section badge */}
                                    {(() => {
                                        const match = b.name?.match(/Section\s+([A-G])/i)
                                        return match ? (
                                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(99,102,241,0.15)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.3)' }}>
                                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Section</span>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: 'var(--primary-light)' }}>{match[1].toUpperCase()}</span>
                                            </div>
                                        ) : null
                                    })()}
                                </div>
                                <div className="progress-bar" style={{ marginBottom: '6px' }}>
                                    <div className="progress-fill" style={{ width: `${Math.min((b.studentCount / b.capacity) * 100, 100)}%` }} />
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                                    <span>{b.studentCount} students enrolled</span>
                                    <span>Capacity: {b.capacity}</span>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            {/* Add Class Modal */}
            {showAddCourse && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 style={{ fontWeight: '700' }}>🏫 {courseForm.id ? 'Edit' : 'Add'} Class</h3>
                            <button onClick={() => setShowAddCourse(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleAddCourse}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label className="label">Class Name *</label>
                                    <select className="input" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} required>
                                        <option value="">Select Class</option>
                                        {CLASS_OPTIONS.map(cls => (
                                            <option key={cls} value={cls}>{cls}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Class Group *</label>
                                    <select className="input" value={courseForm.classGroup} onChange={e => {
                                        setCourseForm({ ...courseForm, classGroup: e.target.value, subjectGroup: e.target.value !== 'Senior Hr Secondary' ? '' : courseForm.subjectGroup })
                                    }} required>
                                        <option value="">Select Group</option>
                                        {CLASS_GROUPS.map(g => (
                                            <option key={g.value} value={g.value}>{g.label}</option>
                                        ))}
                                    </select>
                                </div>
                                {courseForm.classGroup === 'Senior Hr Secondary' && (
                                    <div>
                                        <label className="label">Subject Group *</label>
                                        <select className="input" value={courseForm.subjectGroup} onChange={e => setCourseForm({ ...courseForm, subjectGroup: e.target.value })} required>
                                            <option value="">Select Subject Group</option>
                                            {SUBJECT_GROUPS.map(sg => (
                                                <option key={sg} value={sg}>{sg}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div><label className="label">Description</label><input className="input" placeholder="e.g. Primary level curriculum" value={courseForm.description} onChange={e => setCourseForm({ ...courseForm, description: e.target.value })} /></div>
                                <div className="grid-cols-2">
                                    <div><label className="label">Fees (₹)</label><input className="input" type="number" placeholder="12000" value={courseForm.fees} onChange={e => setCourseForm({ ...courseForm, fees: e.target.value })} /></div>
                                    <div>
                                        <label className="label">Installments (Months)</label>
                                        <select className="input" value={courseForm.installmentCount} onChange={e => setCourseForm({ ...courseForm, installmentCount: e.target.value })}>
                                            {[1, 2, 3, 4, 5, 6, 12].map(i => <option key={i} value={i}>{i} Installment{i > 1 ? 's' : ''}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div><label className="label">Subjects (comma separated)</label><input className="input" placeholder="Maths, Science, English, Hindi" value={courseForm.subjects} onChange={e => setCourseForm({ ...courseForm, subjects: e.target.value })} /></div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowAddCourse(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳' : `✅ ${courseForm.id ? 'Update' : 'Add'} Class`}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Batch/Section Modal */}
            {showAddBatch && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3 style={{ fontWeight: '700' }}>📋 {batchForm.id ? 'Edit' : 'Add'} Section / Batch</h3>
                            <button onClick={() => setShowAddBatch(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleAddBatch}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div>
                                    <label className="label">Class *</label>
                                    <select className="input" value={batchForm.courseId} onChange={e => {
                                        const courseId = e.target.value
                                        const cls = courses.find(c => c.id === courseId)
                                        const autoName = cls ? `${cls.name} – Section ${batchForm.section}` : ''
                                        setBatchForm({ ...batchForm, courseId, name: autoName })
                                    }} required>
                                        <option value="">Select Class</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Section *</label>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                                        {SECTION_OPTIONS.map(sec => (
                                            <button
                                                key={sec}
                                                type="button"
                                                onClick={() => {
                                                    const cls = courses.find(c => c.id === batchForm.courseId)
                                                    const autoName = cls ? `${cls.name} – Section ${sec}` : batchForm.name
                                                    setBatchForm({ ...batchForm, section: sec, name: autoName })
                                                }}
                                                style={{
                                                    padding: '12px 4px',
                                                    borderRadius: '10px',
                                                    border: `2px solid ${batchForm.section === sec ? 'var(--primary)' : 'var(--border)'}`,
                                                    background: batchForm.section === sec ? 'rgba(99,102,241,0.2)' : 'var(--surface-2)',
                                                    color: batchForm.section === sec ? 'var(--primary-light)' : 'var(--text-secondary)',
                                                    fontWeight: '800',
                                                    fontSize: '16px',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s',
                                                }}
                                            >
                                                {sec}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Batch Name (auto-generated, can edit)</label>
                                    <input className="input" placeholder="e.g. Class 5 – Section A" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Capacity</label>
                                    <input className="input" type="number" value={batchForm.capacity} onChange={e => setBatchForm({ ...batchForm, capacity: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowAddBatch(false)} className="btn btn-secondary">Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳' : `✅ ${batchForm.id ? 'Update' : 'Add'} Section`}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
