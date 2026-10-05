'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function StaffHomework() {
  const { token } = useAuth()
  const [tab, setTab] = useState<'assign' | 'list' | 'review'>('assign')
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Assign Form state
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [batchStudentsCount, setBatchStudentsCount] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '',
    subject: '',
    description: '',
    dueDate: '',
    attachmentUrl: ''
  })
  const [creating, setCreating] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Submissions & Review state
  const [selectedHomeworkId, setSelectedHomeworkId] = useState('')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loadingSubmissions, setLoadingSubmissions] = useState(false)
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'GRADED'>('ALL')
  const [gradingState, setGradingState] = useState<Record<string, { grade: string; feedback: string }>>({})
  const [savingGradeId, setSavingGradeId] = useState<string | null>(null)

  const [msg, setMsg] = useState({ text: '', type: '' })
  const h = { Authorization: `Bearer ${token}` }

  // Load Courses, Batches, Homeworks
  const loadHomeworks = () => {
    if (!token) return
    fetch('/api/homework', { headers: h })
      .then(r => r.json())
      .then(d => {
        setHomeworks(d.homeworks || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch('/api/courses', { headers: h }).then(r => r.json()),
      fetch('/api/batches', { headers: h }).then(r => r.json()),
    ]).then(([c, b]) => {
      setCourses(c.data || [])
      setBatches(b.data || [])
      loadHomeworks()
    })
  }, [token])

  // Count students when batch changes
  useEffect(() => {
    if (!selectedBatch || !token) {
      setBatchStudentsCount(null)
      return
    }
    fetch(`/api/students?batchId=${selectedBatch}`, { headers: h })
      .then(r => r.json())
      .then(d => setBatchStudentsCount(d.data?.length || 0))
      .catch(() => setBatchStudentsCount(null))
  }, [selectedBatch, token])

  // Load Submissions when selectedHomeworkId changes
  const loadSubmissions = (hwId: string) => {
    if (!hwId || !token) return
    setLoadingSubmissions(true)
    fetch(`/api/homework/submit?homeworkId=${hwId}`, { headers: h })
      .then(r => r.json())
      .then(d => {
        const subs = d.submissions || []
        setSubmissions(subs)
        const gradesInit: Record<string, { grade: string; feedback: string }> = {}
        subs.forEach((s: any) => {
          gradesInit[s.id] = { grade: s.grade || '', feedback: s.feedback || '' }
        })
        setGradingState(gradesInit)
        setLoadingSubmissions(false)
      })
      .catch(() => setLoadingSubmissions(false))
  }

  useEffect(() => {
    if (selectedHomeworkId) {
      loadSubmissions(selectedHomeworkId)
    }
  }, [selectedHomeworkId])

  // Create Homework
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCourse) {
      setMsg({ text: 'Please select a Class', type: 'error' })
      return
    }
    if (!selectedBatch) {
      setMsg({ text: 'Please select a Section / Batch', type: 'error' })
      return
    }
    if (!form.title.trim()) {
      setMsg({ text: 'Please enter Homework Title', type: 'error' })
      return
    }

    setCreating(true)
    setMsg({ text: '', type: '' })
    try {
      const res = await fetch('/api/homework', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({
          batchId: selectedBatch,
          title: form.title,
          subject: form.subject,
          description: form.description,
          dueDate: form.dueDate || null,
          attachmentUrl: form.attachmentUrl || null,
        }),
      })
      const d = await res.json()
      setCreating(false)
      if (d.success) {
        setMsg({ text: '✅ Homework assigned successfully! Students have been notified.', type: 'success' })
        setForm({ title: '', subject: '', description: '', dueDate: '', attachmentUrl: '' })
        loadHomeworks()
        setTimeout(() => setTab('list'), 1200)
      } else {
        setMsg({ text: d.error || 'Failed to assign homework', type: 'error' })
      }
    } catch {
      setCreating(false)
      setMsg({ text: 'Network error occurred', type: 'error' })
    }
  }

  // Delete Homework
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this homework? All student submissions will also be removed.')) return
    await fetch(`/api/homework?id=${id}`, { method: 'DELETE', headers: h })
    if (selectedHomeworkId === id) {
      setSelectedHomeworkId('')
      setSubmissions([])
    }
    loadHomeworks()
  }

  // Save Grade and Review
  const handleSaveGrade = async (subId: string) => {
    const data = gradingState[subId] || { grade: '', feedback: '' }
    setSavingGradeId(subId)
    try {
      const res = await fetch('/api/homework/submit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({
          id: subId,
          grade: data.grade,
          feedback: data.feedback,
        }),
      })
      const d = await res.json()
      setSavingGradeId(null)
      if (d.success) {
        setSubmissions(prev =>
          prev.map(s => (s.id === subId ? { ...s, grade: data.grade, feedback: data.feedback, status: 'GRADED' } : s))
        )
        setMsg({ text: '✅ Grade and review feedback saved!', type: 'success' })
        setTimeout(() => setMsg({ text: '', type: '' }), 3000)
      } else {
        alert('Failed to save grade: ' + (d.error || 'Unknown error'))
      }
    } catch {
      setSavingGradeId(null)
      alert('Error updating grade')
    }
  }

  const filteredBatches = batches.filter(b => b.courseId === selectedCourse)
  const currentSelectedHw = homeworks.find(h => h.id === selectedHomeworkId)

  const displayedSubmissions = submissions.filter(s => {
    if (statusFilter === 'ALL') return true
    if (statusFilter === 'GRADED') return s.status === 'GRADED'
    if (statusFilter === 'SUBMITTED') return s.status !== 'GRADED'
    return true
  })

  const inputStyle = {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '12px 14px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '28px' }}>📚</span>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>Teacher Homework Portal</h1>
            <p style={{ fontSize: '12px', opacity: 0.85, margin: '2px 0 0 0' }}>Assign homework by Class & Section, check submissions, and review students' work</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '6px', borderRadius: '12px', border: '1px solid #334155' }}>
        <button
          onClick={() => { setTab('assign'); setMsg({ text: '', type: '' }); }}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '8px',
            border: 'none',
            background: tab === 'assign' ? '#6366f1' : 'transparent',
            color: tab === 'assign' ? 'white' : '#94a3b8',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ➕ Assign Homework
        </button>
        <button
          onClick={() => { setTab('list'); setMsg({ text: '', type: '' }); }}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '8px',
            border: 'none',
            background: tab === 'list' ? '#6366f1' : 'transparent',
            color: tab === 'list' ? 'white' : '#94a3b8',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📚 Assigned ({homeworks.length})
        </button>
        <button
          onClick={() => { setTab('review'); setMsg({ text: '', type: '' }); }}
          style={{
            flex: 1,
            padding: '10px 8px',
            borderRadius: '8px',
            border: 'none',
            background: tab === 'review' ? '#6366f1' : 'transparent',
            color: tab === 'review' ? 'white' : '#94a3b8',
            fontSize: '13px',
            fontWeight: '700',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          📋 Check Submissions
        </button>
      </div>

      {/* Notification Toast */}
      {msg.text && (
        <div
          style={{
            background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '10px',
            padding: '12px 16px',
            fontSize: '13px',
            color: msg.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '14px' }}>✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: ASSIGN NEW HOMEWORK */}
      {/* ========================================================================= */}
      {tab === 'assign' && (
        <form onSubmit={handleCreate} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: 0 }}>Assign Homework to Class</h2>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0 0' }}>Select the target class & section. All enrolled students will receive this assignment instantly.</p>
          </div>

          {/* Class and Batch Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                1. Select Class *
              </label>
              <select
                value={selectedCourse}
                onChange={e => {
                  setSelectedCourse(e.target.value)
                  setSelectedBatch('')
                }}
                style={inputStyle}
                required
              >
                <option value="">-- Choose Class --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                2. Select Section / Batch *
              </label>
              <select
                value={selectedBatch}
                onChange={e => setSelectedBatch(e.target.value)}
                disabled={!selectedCourse}
                style={{ ...inputStyle, opacity: !selectedCourse ? 0.5 : 1 }}
                required
              >
                <option value="">-- Choose Section --</option>
                {filteredBatches.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Enrolled Students Badge */}
          {selectedBatch && batchStudentsCount !== null && (
            <div style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>👥</span>
              <span><strong>{batchStudentsCount}</strong> student{batchStudentsCount === 1 ? '' : 's'} enrolled in this section will receive this homework.</span>
            </div>
          )}

          {/* Subject & Due Date */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Subject
              </label>
              <input
                placeholder="e.g. Mathematics, Science"
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
                Submission Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
              Homework Title *
            </label>
            <input
              placeholder="e.g. Chapter 4 Quadratic Equations — Exercise 4.2"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>

          {/* Description / Instructions */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
              Instructions / Questions
            </label>
            <textarea
              placeholder="Write the homework questions, guidelines, or page references..."
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
            />
          </div>

          {/* Photo / Camera Upload */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '600', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
              Upload Homework Photo / Reference Material (Optional)
            </label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={async e => {
                  const file = e.target.files?.[0]
                  if (!file) return
                  setUploadingImage(true)
                  const fd = new FormData()
                  fd.append('file', file)
                  try {
                    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
                    const data = await res.json()
                    if (data.url) {
                      setForm(p => ({ ...p, attachmentUrl: data.url }))
                    } else {
                      setMsg({ text: data.error || 'Upload failed', type: 'error' })
                    }
                  } catch (err) {
                    setMsg({ text: 'Upload error', type: 'error' })
                  }
                  setUploadingImage(false)
                }}
                style={{ ...inputStyle, padding: '8px' }}
              />
              {uploadingImage && <div className="spinner" style={{ width: '20px', height: '20px', borderWidth: '2px' }} />}
            </div>
            {form.attachmentUrl && (
              <div style={{ marginTop: '8px' }}>
                <a href={form.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'underline' }}>
                  ✓ Attachment Uploaded (Click to view)
                </a>
              </div>
            )}
            <div style={{ marginTop: '8px', fontSize: '11px', color: '#94a3b8' }}>
              Or enter URL manually:
              <input
                type="url"
                placeholder="https://drive.google.com/..."
                value={form.attachmentUrl}
                onChange={e => setForm(p => ({ ...p, attachmentUrl: e.target.value }))}
                style={{ ...inputStyle, padding: '6px 10px', marginTop: '4px' }}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={creating}
            style={{
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              color: 'white',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer',
              marginTop: '6px',
              boxShadow: '0 4px 14px rgba(99,102,241,0.3)',
              opacity: creating ? 0.7 : 1,
            }}
          >
            {creating ? 'Assigning Homework...' : '🚀 Publish & Assign Homework'}
          </button>
        </form>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ASSIGNED HOMEWORKS LIST */}
      {/* ========================================================================= */}
      {tab === 'list' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: 0 }}>
              All Assigned Homeworks ({homeworks.length})
            </h2>
            <button
              onClick={() => setTab('assign')}
              style={{
                background: '#6366f1',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'white',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              + Assign New
            </button>
          </div>

          {loading ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading homeworks...</div>
          ) : homeworks.length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📝</div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>No homework assigned yet</div>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '6px 0 16px 0' }}>Assign homework by choosing a class and section.</p>
              <button
                onClick={() => setTab('assign')}
                style={{ background: '#6366f1', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}
              >
                + Assign Homework Now
              </button>
            </div>
          ) : (
            homeworks.map((hw: any) => {
              const submissionCount = hw._count?.submissions ?? hw.submissions?.length ?? 0
              const courseName = hw.batch?.course?.name
              const batchName = hw.batch?.name

              return (
                <div key={hw.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{hw.title}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px', alignItems: 'center' }}>
                        {courseName && (
                          <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            Class: {courseName}
                          </span>
                        )}
                        {batchName && (
                          <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            Section: {batchName}
                          </span>
                        )}
                        {hw.subject && (
                          <span style={{ fontSize: '11px', background: 'rgba(236,72,153,0.15)', color: '#f472b6', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                            {hw.subject}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleDelete(hw.id)}
                      title="Delete Homework"
                      style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '6px 10px', fontSize: '12px', cursor: 'pointer' }}
                    >
                      🗑️
                    </button>
                  </div>

                  {hw.description && (
                    <div style={{ fontSize: '13px', color: '#cbd5e1', background: '#0f172a', borderRadius: '8px', padding: '10px', whiteSpace: 'pre-wrap' }}>
                      {hw.description}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #334155', paddingTop: '10px', fontSize: '12px' }}>
                    <div style={{ color: hw.dueDate ? '#f59e0b' : '#94a3b8' }}>
                      {hw.dueDate ? `⏰ Due: ${new Date(hw.dueDate).toLocaleDateString('en-IN')}` : 'No due date'}
                    </div>

                    <button
                      onClick={() => {
                        setSelectedHomeworkId(hw.id)
                        setTab('review')
                      }}
                      style={{
                        background: '#6366f1',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>📋 Submissions ({submissionCount})</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: CHECK & REVIEW SUBMISSIONS */}
      {/* ========================================================================= */}
      {tab === 'review' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Homework Selector */}
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px' }}>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
              Select Homework to Review
            </label>
            <select
              value={selectedHomeworkId}
              onChange={e => setSelectedHomeworkId(e.target.value)}
              style={inputStyle}
            >
              <option value="">-- Choose an assigned homework --</option>
              {homeworks.map(hw => (
                <option key={hw.id} value={hw.id}>
                  {hw.title} ({hw.batch?.course?.name ? `${hw.batch.course.name} - ` : ''}{hw.batch?.name}) • {hw._count?.submissions || hw.submissions?.length || 0} Submissions
                </option>
              ))}
            </select>
          </div>

          {selectedHomeworkId && currentSelectedHw && (
            <div style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '12px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{currentSelectedHw.title}</div>
                <div style={{ fontSize: '12px', color: '#94a3b8' }}>
                  {currentSelectedHw.batch?.course?.name} • {currentSelectedHw.batch?.name} • Subject: {currentSelectedHw.subject || 'General'}
                </div>
              </div>

              {/* Status Filter Buttons */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setStatusFilter('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: statusFilter === 'ALL' ? '#6366f1' : '#334155',
                    color: 'white',
                  }}
                >
                  All ({submissions.length})
                </button>
                <button
                  onClick={() => setStatusFilter('SUBMITTED')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: statusFilter === 'SUBMITTED' ? '#f59e0b' : '#334155',
                    color: 'white',
                  }}
                >
                  Pending Review ({submissions.filter(s => s.status !== 'GRADED').length})
                </button>
                <button
                  onClick={() => setStatusFilter('GRADED')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    background: statusFilter === 'GRADED' ? '#10b981' : '#334155',
                    color: 'white',
                  }}
                >
                  Graded ({submissions.filter(s => s.status === 'GRADED').length})
                </button>
              </div>
            </div>
          )}

          {/* Submissions List */}
          {loadingSubmissions ? (
            <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading student submissions...</div>
          ) : !selectedHomeworkId ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '40px 20px', textAlign: 'center', color: '#94a3b8' }}>
              👆 Please select a homework from the dropdown above to view and review submissions.
            </div>
          ) : displayedSubmissions.length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📬</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>No submissions found</div>
              <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0 0' }}>
                {statusFilter === 'ALL'
                  ? 'None of the students have submitted their homework yet.'
                  : `No submissions matching status: ${statusFilter}`}
              </p>
            </div>
          ) : (
            displayedSubmissions.map((sub: any) => {
              const isGraded = sub.status === 'GRADED'
              const currentGrading = gradingState[sub.id] || { grade: '', feedback: '' }

              return (
                <div
                  key={sub.id}
                  style={{
                    background: '#1e293b',
                    border: `1px solid ${isGraded ? 'rgba(16,185,129,0.3)' : '#334155'}`,
                    borderRadius: '14px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Student Info & Submission Time */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>
                        {sub.student?.fullName || 'Student'}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                        {sub.student?.studentId ? `ID: ${sub.student.studentId} • ` : ''}
                        Submitted: {new Date(sub.submittedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: isGraded ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: isGraded ? '#10b981' : '#f59e0b',
                      }}
                    >
                      {isGraded ? `✓ Graded: ${sub.grade}` : '⏳ Pending Review'}
                    </span>
                  </div>

                  {/* Submitted Content */}
                  <div>
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px', fontWeight: '600' }}>Student's Solution / Answer:</div>
                    <div
                      style={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '10px',
                        padding: '12px',
                        fontSize: '13px',
                        color: 'white',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {sub.content || <em style={{ color: '#64748b' }}>No text content submitted</em>}
                    </div>

                    {sub.attachmentUrl && (
                      <div style={{ marginTop: '6px' }}>
                        <a
                          href={sub.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'underline' }}
                        >
                          📎 View Attached File / Submission Link
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Teacher Grading & Review Box */}
                  <div
                    style={{
                      background: 'rgba(99,102,241,0.06)',
                      border: '1px solid rgba(99,102,241,0.2)',
                      borderRadius: '10px',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: '700', color: '#a5b4fc' }}>
                      Teacher Review & Grade:
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '8px' }}>
                      <input
                        placeholder="Grade (e.g. A+, 95/100, Good)"
                        value={currentGrading.grade}
                        onChange={e =>
                          setGradingState(p => ({
                            ...p,
                            [sub.id]: { ...p[sub.id], grade: e.target.value },
                          }))
                        }
                        style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      />
                      <input
                        placeholder="Review / Feedback (e.g. Good explanation, neat handwriting)"
                        value={currentGrading.feedback}
                        onChange={e =>
                          setGradingState(p => ({
                            ...p,
                            [sub.id]: { ...p[sub.id], feedback: e.target.value },
                          }))
                        }
                        style={{ ...inputStyle, padding: '8px 10px', fontSize: '13px' }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSaveGrade(sub.id)}
                      disabled={savingGradeId === sub.id}
                      style={{
                        alignSelf: 'flex-end',
                        background: '#10b981',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '12px',
                        cursor: 'pointer',
                        opacity: savingGradeId === sub.id ? 0.6 : 1,
                      }}
                    >
                      {savingGradeId === sub.id ? 'Saving...' : '💾 Save Review & Grade'}
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}


