'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function StaffAttendance() {
  const { token } = useAuth()
  const [batches, setBatches] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const h = { Authorization: `Bearer ${token}` }

  // Load classes and batches
  useEffect(() => {
    if (!token) return
    fetch('/api/courses', { headers: h }).then(r => r.json()).then(d => setCourses(d.data || []))
    fetch('/api/batches', { headers: h }).then(r => r.json()).then(d => setBatches(d.data || []))
  }, [token])

  // Load students immediately when Class (selectedCourse) or Section (selectedBatch) is chosen
  useEffect(() => {
    if (!selectedCourse || !token) {
      setStudents([])
      setAttendance({})
      return
    }

    setLoading(true)
    setMsg('')

    const studentUrl = selectedBatch
      ? `/api/students?courseId=${selectedCourse}&batchId=${selectedBatch}`
      : `/api/students?courseId=${selectedCourse}`

    const attendanceUrl = selectedBatch
      ? `/api/attendance?courseId=${selectedCourse}&batchId=${selectedBatch}&date=${date}`
      : `/api/attendance?courseId=${selectedCourse}&date=${date}`

    Promise.all([
      fetch(studentUrl, { headers: h }).then(r => r.json()),
      fetch(attendanceUrl, { headers: h }).then(r => r.json()).catch(() => ({ data: [] }))
    ])
      .then(([studentRes, attRes]) => {
        const stuList = studentRes.data || []
        setStudents(stuList)

        // Map existing attendance records if already marked today
        const existingMap: Record<string, string> = {}
        if (attRes.success && Array.isArray(attRes.data)) {
          attRes.data.forEach((a: any) => {
            if (a.studentId) existingMap[a.studentId] = a.status
          })
        }

        const initialAttendance: Record<string, string> = {}
        stuList.forEach((s: any) => {
          initialAttendance[s.id] = existingMap[s.id] || 'PRESENT'
        })
        setAttendance(initialAttendance)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load students:', err)
        setLoading(false)
      })
  }, [selectedCourse, selectedBatch, date, token])

  const save = async () => {
    if (!selectedCourse || students.length === 0) return
    setSaving(true)
    setMsg('')
    const records = students.map(s => ({
      studentId: s.id,
      batchId: s.batchId || selectedBatch || null,
      date,
      status: attendance[s.id] || 'PRESENT'
    }))

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ records }),
      })
      const d = await res.json()
      setSaving(false)
      if (d.success) {
        setMsg('✅ Attendance saved successfully and parents notified!')
      } else {
        setMsg(d.error || 'Failed to save attendance')
      }
    } catch {
      setSaving(false)
      setMsg('Network error while saving attendance')
    }
  }

  const markAll = (status: string) => {
    const updated: Record<string, string> = {}
    students.forEach(s => { updated[s.id] = status })
    setAttendance(updated)
  }

  const courseBatches = batches.filter(b => b.courseId === selectedCourse)
  const statusOptions = ['PRESENT', 'ABSENT', 'LATE', 'LEAVE']
  const statusColors: Record<string, string> = { PRESENT: '#10b981', ABSENT: '#ef4444', LATE: '#f59e0b', LEAVE: '#6366f1' }
  const inputStyle = { width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px', color: 'white', fontSize: '14px', boxSizing: 'border-box' as const }

  const presentCount = Object.values(attendance).filter(st => st === 'PRESENT').length
  const absentCount = Object.values(attendance).filter(st => st === 'ABSENT').length
  const leaveCount = Object.values(attendance).filter(st => st === 'LEAVE' || st === 'LATE').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>📋 Mark Daily Attendance</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#1e293b', padding: '16px', borderRadius: '14px', border: '1px solid #334155' }}>
        <div>
          <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} />
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>Class *</label>
            <select
              value={selectedCourse}
              onChange={e => {
                setSelectedCourse(e.target.value)
                setSelectedBatch('')
              }}
              style={inputStyle}
            >
              <option value="">-- Select Class --</option>
              {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px', display: 'block' }}>Section / Batch (Optional)</label>
            <select
              value={selectedBatch}
              onChange={e => setSelectedBatch(e.target.value)}
              disabled={!selectedCourse}
              style={{ ...inputStyle, opacity: !selectedCourse ? 0.5 : 1 }}
            >
              <option value="">
                {courseBatches.length > 0 ? '-- All Sections / Whole Class --' : '-- Whole Class (No Sections) --'}
              </option>
              {courseBatches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {msg && (
        <div style={{
          background: msg.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '10px',
          padding: '12px',
          fontSize: '13px',
          color: msg.startsWith('✅') ? '#10b981' : '#ef4444'
        }}>
          {msg}
        </div>
      )}

      {loading && <div style={{ color: '#94a3b8', textAlign: 'center', padding: '30px' }}>⏳ Loading students list...</div>}

      {!loading && !selectedCourse && (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '30px', background: '#1e293b', borderRadius: '12px', border: '1px dashed #334155' }}>
          👆 Please select a class above to view students and mark attendance.
        </div>
      )}

      {!loading && selectedCourse && students.length === 0 && (
        <div style={{ color: '#ef4444', textAlign: 'center', padding: '30px', background: '#1e293b', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)' }}>
          No active students found in this class.
        </div>
      )}

      {students.length > 0 && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', color: 'white' }}>{students.length} Students</span>
              <span style={{ color: '#10b981' }}>● {presentCount} Present</span>
              <span style={{ color: '#ef4444' }}>● {absentCount} Absent</span>
              {leaveCount > 0 && <span style={{ color: '#f59e0b' }}>● {leaveCount} Other</span>}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => markAll('PRESENT')}
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                All Present
              </button>
              <button
                type="button"
                onClick={() => markAll('ABSENT')}
                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer', fontWeight: '600' }}
              >
                All Absent
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {students.map((s: any, idx: number) => (
              <div
                key={s.id}
                style={{
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#334155',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    fontSize: '12px',
                    fontWeight: '700',
                    overflow: 'hidden'
                  }}>
                    {s.photo ? (
                      <img src={s.photo} alt={s.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{s.fullName}</div>
                    <div style={{ fontSize: '11px', color: '#64748b' }}>
                      {s.scholarNo ? `Scholar No: ${s.scholarNo}` : s.studentId ? `ID: ${s.studentId}` : s.fatherName ? `Father: ${s.fatherName}` : 'Student'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {statusOptions.map(st => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setAttendance(prev => ({ ...prev, [s.id]: st }))}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: `1px solid ${attendance[s.id] === st ? statusColors[st] : '#334155'}`,
                        background: attendance[s.id] === st ? `${statusColors[st]}25` : 'transparent',
                        color: attendance[s.id] === st ? statusColors[st] : '#64748b',
                        fontSize: '11px',
                        fontWeight: '700',
                        cursor: 'pointer'
                      }}
                    >
                      {st[0] + st.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={save}
            disabled={saving}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              border: 'none',
              borderRadius: '12px',
              padding: '14px',
              color: 'white',
              fontWeight: '700',
              fontSize: '15px',
              cursor: 'pointer',
              opacity: saving ? 0.6 : 1,
              marginTop: '8px',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
            }}
          >
            {saving ? 'Saving...' : '💾 Save & Publish Attendance'}
          </button>
        </>
      )}
    </div>
  )
}
