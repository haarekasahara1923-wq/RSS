'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function StaffSubmissions() {
  const { token } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [selectedHw, setSelectedHw] = useState('')
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [grading, setGrading] = useState<string | null>(null)
  const [grades, setGrades] = useState<Record<string, { grade: string; feedback: string }>>({})
  const [msg, setMsg] = useState('')
  const h = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch('/api/courses', { headers: h }).then(r => r.json()),
      fetch('/api/batches', { headers: h }).then(r => r.json()),
      fetch('/api/homework', { headers: h }).then(r => r.json()),
    ]).then(([c, b, hw]) => {
      setCourses(c.data || [])
      setBatches(b.data || [])
      setHomeworks(hw.homeworks || [])
    })
  }, [token])

  useEffect(() => {
    if (!selectedHw || !token) {
      setSubmissions([])
      return
    }
    setLoading(true)
    fetch(`/api/homework/submit?homeworkId=${selectedHw}`, { headers: h })
      .then(r => r.json())
      .then(d => {
        const subs = d.submissions || []
        setSubmissions(subs)
        const initGrades: Record<string, { grade: string; feedback: string }> = {}
        subs.forEach((s: any) => {
          initGrades[s.id] = { grade: s.grade || '', feedback: s.feedback || '' }
        })
        setGrades(initGrades)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedHw])

  const grade = async (id: string) => {
    setGrading(id)
    try {
      const res = await fetch('/api/homework/submit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ id, grade: grades[id]?.grade || '', feedback: grades[id]?.feedback || '' }),
      })
      const d = await res.json()
      setGrading(null)
      if (d.success) {
        setSubmissions(prev =>
          prev.map(s => (s.id === id ? { ...s, grade: grades[id]?.grade, feedback: grades[id]?.feedback, status: 'GRADED' } : s))
        )
        setMsg('✅ Review & grade saved!')
        setTimeout(() => setMsg(''), 3000)
      } else {
        alert('Failed to save grade: ' + (d.error || 'Unknown error'))
      }
    } catch {
      setGrading(null)
      alert('Network error')
    }
  }

  const filteredBatches = batches.filter(b => !selectedCourse || b.courseId === selectedCourse)
  const filteredHomeworks = homeworks.filter(hw => {
    if (selectedBatch) return hw.batchId === selectedBatch
    if (selectedCourse) return hw.batch?.course?.id === selectedCourse || hw.batch?.courseId === selectedCourse
    return true
  })

  const statusColor: Record<string, string> = { SUBMITTED: '#f59e0b', GRADED: '#10b981', LATE: '#f59e0b', MISSING: '#ef4444' }
  const inputStyle = { width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' as const }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>📋 Check Homework Submissions</h1>
        <Link href="/portal/staff/homework" style={{ textDecoration: 'none', background: '#6366f1', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
          + Assign Homework
        </Link>
      </div>

      {msg && <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '10px 14px', borderRadius: '8px', fontSize: '13px' }}>{msg}</div>}

      {/* Filter by Class and Section */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}>Filter by Class & Section:</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <select
            value={selectedCourse}
            onChange={e => {
              setSelectedCourse(e.target.value)
              setSelectedBatch('')
              setSelectedHw('')
            }}
            style={inputStyle}
          >
            <option value="">All Classes</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select
            value={selectedBatch}
            onChange={e => {
              setSelectedBatch(e.target.value)
              setSelectedHw('')
            }}
            style={inputStyle}
          >
            <option value="">All Sections</option>
            {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px', display: 'block' }}>Select Homework *</label>
          <select value={selectedHw} onChange={e => setSelectedHw(e.target.value)} style={inputStyle}>
            <option value="">-- Select Homework Assignment --</option>
            {filteredHomeworks.map(hw => (
              <option key={hw.id} value={hw.id}>
                {hw.title} ({hw.batch?.course?.name ? `${hw.batch.course.name} - ` : ''}{hw.batch?.name}) • {hw._count?.submissions || hw.submissions?.length || 0} Submissions
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading && <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>Loading student submissions...</div>}

      {!loading && selectedHw && submissions.length === 0 && (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '40px', background: '#1e293b', borderRadius: '14px' }}>
          📬 No submissions received yet for this homework assignment.
        </div>
      )}

      {submissions.map((s: any) => (
        <div key={s.id} style={{ background: '#1e293b', border: `1px solid ${s.status === 'GRADED' ? 'rgba(16,185,129,0.3)' : '#334155'}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{s.student?.fullName}</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{s.student?.studentId ? `ID: ${s.student.studentId} • ` : ''}Submitted: {new Date(s.submittedAt).toLocaleString('en-IN')}</div>
            </div>
            <span style={{ fontSize: '11px', background: `${statusColor[s.status] || '#6366f1'}20`, color: statusColor[s.status] || '#6366f1', borderRadius: '6px', padding: '3px 8px', fontWeight: '700' }}>
              {s.status === 'GRADED' ? `✓ Graded: ${s.grade}` : '⏳ Pending Review'}
            </span>
          </div>

          <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: '600' }}>Answer / Content:</div>
          <div style={{ fontSize: '13px', color: 'white', background: '#0f172a', borderRadius: '8px', padding: '10px', whiteSpace: 'pre-wrap' }}>
            {s.content || <em style={{ color: '#64748b' }}>No text content</em>}
          </div>

          {s.attachmentUrl && (
            <div>
              <a href={s.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'underline' }}>
                📎 View Attached Submission
              </a>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(99,102,241,0.06)', padding: '10px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                placeholder="Grade (e.g. A+, 95/100, Good)"
                value={grades[s.id]?.grade || ''}
                onChange={e => setGrades(p => ({ ...p, [s.id]: { ...p[s.id], grade: e.target.value } }))}
                style={{ ...inputStyle, padding: '8px 12px', flex: 1, fontSize: '13px' }}
              />
              <button
                onClick={() => grade(s.id)}
                disabled={grading === s.id}
                style={{ background: '#10b981', border: 'none', color: 'white', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', cursor: 'pointer', fontWeight: '700' }}
              >
                {grading === s.id ? 'Saving...' : '💾 Save Grade'}
              </button>
            </div>
            <input
              placeholder="Teacher's Review / Feedback"
              value={grades[s.id]?.feedback || ''}
              onChange={e => setGrades(p => ({ ...p, [s.id]: { ...p[s.id], feedback: e.target.value } }))}
              style={{ ...inputStyle, padding: '8px 12px', fontSize: '13px' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
