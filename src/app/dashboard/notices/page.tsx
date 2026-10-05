'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function AdminNotices() {
  const { token } = useAuth()
  const [notices, setNotices] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  const [targetType, setTargetType] = useState<'BROADCAST' | 'BATCH' | 'STUDENT'>('BROADCAST')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [selectedStudent, setSelectedStudent] = useState('')

  const [form, setForm] = useState({ title: '', message: '', targetRole: '' })
  const [creating, setCreating] = useState(false)
  const [msg, setMsg] = useState('')
  const h = { Authorization: `Bearer ${token}` }

  const load = () => {
    if (!token) return
    fetch('/api/notices', { headers: h }).then(r => r.json()).then(d => setNotices(d.notices || []))
  }

  useEffect(() => {
    load()
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

  const publish = async () => {
    if (!form.title.trim() || !form.message.trim()) { setMsg('Title and message are required'); return }
    if (targetType === 'BATCH' && !selectedBatch) { setMsg('Please select Class and Section'); return }
    if (targetType === 'STUDENT' && !selectedStudent) { setMsg('Please select a Student'); return }

    setCreating(true)
    const payload: any = {
      title: form.title,
      message: form.message,
      targetRole: form.targetRole,
    }

    if (targetType === 'BATCH') {
      payload.targetType = 'BATCH'
      payload.targetBatchId = selectedBatch
    } else if (targetType === 'STUDENT') {
      payload.targetType = 'STUDENT_PARENT'
      payload.targetStudentId = selectedStudent
    }

    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify(payload),
    })
    const d = await res.json()
    setCreating(false)
    if (d.success) {
      setMsg('✅ Notice published successfully!')
      setForm({ title: '', message: '', targetRole: '' })
      load()
    } else {
      setMsg(d.error || 'Failed')
    }
  }

  const del = async (id: string) => {
    if (!confirm('Delete this notice?')) return
    await fetch(`/api/notices?id=${id}`, { method: 'DELETE', headers: h })
    load()
  }

  const filteredBatches = batches.filter(b => b.courseId === selectedCourse)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">📢 Notices & Announcements</h1>
          <p className="page-subtitle">Publish notices to students, parents, and staff</p>
        </div>
      </div>

      {/* Publish Form */}
      <div className="card">
        <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px' }}>Publish New Notice</h3>
        {msg && <div style={{ background: msg.startsWith('✅') ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '10px', padding: '12px', fontSize: '13px', color: msg.startsWith('✅') ? '#10b981' : '#ef4444', marginBottom: '16px' }}>{msg}</div>}
        
        {/* Targeting Mode */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          {[
            { id: 'BROADCAST', label: '📣 Broadcast' },
            { id: 'BATCH', label: '🏫 Class & Section Parents' },
            { id: 'STUDENT', label: "👨‍👩‍👧 Particular Student's Parent" },
          ].map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTargetType(t.id as any)}
              className="btn btn-sm"
              style={{
                background: targetType === t.id ? 'var(--primary)' : 'var(--surface-2)',
                color: targetType === t.id ? 'white' : 'var(--text-muted)',
                fontWeight: targetType === t.id ? 700 : 500,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Class and Section selectors for BATCH or STUDENT */}
          {(targetType === 'BATCH' || targetType === 'STUDENT') && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label className="label">1. Select Class *</label>
                <select
                  className="input"
                  value={selectedCourse}
                  onChange={e => {
                    setSelectedCourse(e.target.value)
                    setSelectedBatch('')
                    setSelectedStudent('')
                  }}
                >
                  <option value="">-- Choose Class --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">2. Select Section / Batch *</label>
                <select
                  className="input"
                  value={selectedBatch}
                  onChange={e => {
                    setSelectedBatch(e.target.value)
                    setSelectedStudent('')
                  }}
                  disabled={!selectedCourse}
                >
                  <option value="">-- Choose Section --</option>
                  {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
          )}

          {targetType === 'STUDENT' && (
            <div>
              <label className="label">3. Select Student *</label>
              <select
                className="input"
                value={selectedStudent}
                onChange={e => setSelectedStudent(e.target.value)}
                disabled={!selectedBatch}
              >
                <option value="">-- Choose Student --</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.fullName} ({s.studentId || s.phone}) {s.parentPhone ? `• Parent: ${s.parentPhone}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {targetType === 'BROADCAST' && (
            <div>
              <label className="label">Audience</label>
              <select className="input" value={form.targetRole} onChange={e => setForm(p => ({ ...p, targetRole: e.target.value }))}>
                <option value="">📣 Broadcast to All</option>
                <option value="STUDENT">👨‍🎓 Students Only</option>
                <option value="PARENT">👨‍👩‍👧 Parents Only</option>
                <option value="TEACHER">👩‍🏫 Staff Only</option>
              </select>
            </div>
          )}

          <div>
            <label className="label">Notice Title *</label>
            <input className="input" placeholder="Notice Title *" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>

          <div>
            <label className="label">Notice Message *</label>
            <textarea className="input" placeholder="Notice Message *" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} style={{ minHeight: '100px', resize: 'vertical' }} />
          </div>

          <button className="btn btn-primary" onClick={publish} disabled={creating} style={{ alignSelf: 'flex-start' }}>
            {creating ? 'Publishing...' : '📢 Publish Notice'}
          </button>
        </div>
      </div>

      {/* Existing Notices */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontWeight: '700', fontSize: '16px', margin: 0 }}>Published Notices ({notices.length})</h3>
        </div>
        {notices.length === 0 ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No notices published yet</div> :
          notices.map((n: any) => (
            <div key={n.id} style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>{n.title}</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>{n.message}</div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', alignItems: 'center' }}>
                  {n.targetRole ? <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', borderRadius: '6px', padding: '2px 8px' }}>{n.targetRole}</span> : <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#10b981', borderRadius: '6px', padding: '2px 8px' }}>All</span>}
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(n.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <button onClick={() => del(n.id)} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px', flexShrink: 0 }}>🗑️</button>
            </div>
          ))
        }
      </div>
    </div>
  )
}
