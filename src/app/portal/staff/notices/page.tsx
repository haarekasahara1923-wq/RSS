'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function StaffNotices() {
  const { token, user } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  // Targeting options: 'ALL' | 'BATCH' | 'STUDENT'
  const [targetType, setTargetType] = useState<'ALL' | 'BATCH' | 'STUDENT'>('STUDENT')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')

  const [form, setForm] = useState({ title: '', message: '' })
  const [showForm, setShowForm] = useState(false)
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const h = { Authorization: `Bearer ${token}` }

  const loadNotices = () => {
    if (!token) return
    fetch('/api/notices', { headers: h })
      .then(r => r.json())
      .then(d => { setNotices(d.notices || []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadNotices()
    if (!token) return
    Promise.all([
      fetch('/api/courses', { headers: h }).then(r => r.json()),
      fetch('/api/batches', { headers: h }).then(r => r.json()),
    ]).then(([c, b]) => {
      setCourses(c.data || [])
      setBatches(b.data || [])
    })
  }, [token])

  useEffect(() => {
    if (!selectedBatch || !token) {
      setStudents([])
      return
    }
    fetch(`/api/students?batchId=${selectedBatch}`, { headers: h })
      .then(r => r.json())
      .then(d => setStudents(d.data || []))
  }, [selectedBatch, token])

  const sendNotice = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      setMsg({ text: 'Please enter notice title and message', type: 'error' })
      return
    }

    if (targetType === 'BATCH' && !selectedBatch) {
      setMsg({ text: 'Please select a Class and Section', type: 'error' })
      return
    }

    if (targetType === 'STUDENT' && !selectedStudent) {
      setMsg({ text: 'Please select a Student', type: 'error' })
      return
    }

    setSending(true)
    setMsg({ text: '', type: '' })

    const payload: any = {
      title: form.title,
      message: form.message,
      targetRole: 'PARENT',
    }

    if (targetType === 'STUDENT') {
      payload.targetType = 'STUDENT_PARENT'
      payload.targetStudentId = selectedStudent
    } else if (targetType === 'BATCH') {
      payload.targetType = 'BATCH'
      payload.targetBatchId = selectedBatch
    } else {
      payload.targetRole = 'PARENT'
    }

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify(payload),
      })
      const d = await res.json()
      setSending(false)
      if (d.success) {
        setMsg({ text: '✅ Notice published successfully to parents!', type: 'success' })
        setForm({ title: '', message: '' })
        setShowForm(false)
        loadNotices()
      } else {
        setMsg({ text: d.error || 'Failed to send notice', type: 'error' })
      }
    } catch {
      setSending(false)
      setMsg({ text: 'Network error occurred', type: 'error' })
    }
  }

  const deleteNotice = async (id: string) => {
    if (!confirm('Are you sure you want to delete this notice?')) return
    await fetch(`/api/notices?id=${id}`, { method: 'DELETE', headers: h })
    loadNotices()
  }

  const filteredBatches = batches.filter(b => b.courseId === selectedCourse)
  const inputStyle = {
    width: '100%',
    background: '#0f172a',
    border: '1px solid #334155',
    borderRadius: '10px',
    padding: '12px',
    color: 'white',
    fontSize: '14px',
    boxSizing: 'border-box' as const,
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>📢 Parent Notices & Alerts</h1>
            <p style={{ fontSize: '12px', opacity: 0.85, margin: '2px 0 0 0' }}>Send official announcements to class parents or a specific student's parent</p>
          </div>
          <button
            onClick={() => { setShowForm(!showForm); setMsg({ text: '', type: '' }) }}
            style={{
              background: showForm ? '#334155' : 'white',
              color: showForm ? 'white' : '#ec4899',
              border: 'none',
              borderRadius: '10px',
              padding: '8px 16px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            {showForm ? '✕ Close Form' : '+ Send New Notice'}
          </button>
        </div>
      </div>

      {msg.text && (
        <div
          style={{
            background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '10px',
            padding: '12px',
            fontSize: '13px',
            color: msg.type === 'success' ? '#10b981' : '#ef4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg({ text: '', type: '' })} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* Notice Form */}
      {showForm && (
        <form onSubmit={sendNotice} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <h3 style={{ color: 'white', margin: 0, fontSize: '15px', fontWeight: '700' }}>Publish Notice to Parents</h3>

          {/* Target Audience Selector */}
          <div>
            <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>
              Notice Target Audience:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
              {[
                { id: 'STUDENT', label: "👨‍👩‍👧 Particular Student's Parent" },
                { id: 'BATCH', label: '🏫 Class & Section Parents' },
                { id: 'ALL', label: '📣 All School Parents' },
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetType(t.id as any)}
                  style={{
                    padding: '8px 6px',
                    borderRadius: '8px',
                    border: `1px solid ${targetType === t.id ? '#ec4899' : '#334155'}`,
                    background: targetType === t.id ? 'rgba(236,72,153,0.15)' : '#0f172a',
                    color: targetType === t.id ? '#f472b6' : '#94a3b8',
                    fontSize: '11px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Class and Section selectors for BATCH or STUDENT */}
          {(targetType === 'BATCH' || targetType === 'STUDENT') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>1. Select Class *</label>
                <select
                  value={selectedCourse}
                  onChange={e => {
                    setSelectedCourse(e.target.value)
                    setSelectedBatch('')
                    setSelectedStudent('')
                  }}
                  style={inputStyle}
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>2. Select Section / Batch *</label>
                <select
                  value={selectedBatch}
                  onChange={e => {
                    setSelectedBatch(e.target.value)
                    setSelectedStudent('')
                  }}
                  disabled={!selectedCourse}
                  style={{ ...inputStyle, opacity: !selectedCourse ? 0.5 : 1 }}
                  required
                >
                  <option value="">-- Choose Section --</option>
                  {filteredBatches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* Specific Student selector */}
          {targetType === 'STUDENT' && (
            <div>
              <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>3. Select Student *</label>
              <select
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                disabled={!selectedBatch}
                style={{ ...inputStyle, opacity: !selectedBatch ? 0.5 : 1 }}
                required
              >
                <option value="">-- Choose Student --</option>
                {students.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} {s.studentId ? `(${s.studentId})` : ''} {s.parentPhone ? `• Parent: ${s.parentPhone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>Notice Title *</label>
            <input
              placeholder="e.g. Incomplete Homework / PTM Meeting on Saturday"
              value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              style={inputStyle}
              required
            />
          </div>

          <div>
            <label style={{ fontSize: '12px', color: '#cbd5e1', marginBottom: '4px', display: 'block' }}>Notice Message *</label>
            <textarea
              placeholder="Write the message for the parent..."
              value={form.message}
              onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
              style={{ ...inputStyle, minHeight: '90px', resize: 'vertical' }}
              required
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            style={{
              background: 'linear-gradient(135deg, #ec4899, #d946ef)',
              border: 'none',
              borderRadius: '10px',
              padding: '12px',
              color: 'white',
              fontWeight: '700',
              fontSize: '14px',
              cursor: 'pointer',
              opacity: sending ? 0.6 : 1,
            }}
          >
            {sending ? 'Publishing...' : '🚀 Publish Notice to Parent'}
          </button>
        </form>
      )}

      {/* Notices List */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: '0 0 10px 0' }}>
          Notice History ({notices.length})
        </h2>

        {loading ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading notices...</div>
        ) : notices.length === 0 ? (
          <div style={{ color: '#64748b', textAlign: 'center', padding: '60px', background: '#1e293b', borderRadius: '16px' }}>
            No notices published yet
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {notices.map((n: any) => (
              <div key={n.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{n.title}</div>
                  <button
                    onClick={() => deleteNotice(n.id)}
                    style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '6px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer' }}
                  >
                    🗑️
                  </button>
                </div>
                <div style={{ fontSize: '13px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{n.message}</div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                  <span style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '4px', fontWeight: '600' }}>
                    {n.targetRole || 'All'}
                  </span>
                  <span>📅 {new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


