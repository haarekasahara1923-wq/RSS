'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtTime(t: string) {
  if (!t) return ''
  const [h, m] = t.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hr = h % 12 || 12
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`
}

function computeDuration(start: string, end: string): string {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const total = (eh * 60 + em) - (sh * 60 + sm)
  if (total <= 0) return ''
  const h = Math.floor(total / 60)
  const m = total % 60
  return h > 0 ? `${h}h ${m > 0 ? m + 'm' : ''}`.trim() : `${m}m`
}

// ── Premium Branded PDF Generator ─────────────────────────────────────────────
function generateTimeTablePDF(event: any, tenant: any) {
  const schoolName = tenant?.name || 'RSS Public School'
  const schoolAddress = tenant?.address || ''
  const schoolPhone = tenant?.phone || ''
  const schoolEmail = tenant?.email || ''
  const logoUrl = tenant?.logo || ''
  const schoolCode = tenant?.schoolCode || ''
  const directorSign = tenant?.directorSign || ''

  const timetable: any[] = Array.isArray(event.timeTable) ? event.timeTable : []

  const rows = timetable.map((t: any, i: number) => `
    <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#fff'};">
      <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;font-weight:700;color:#1a3c5e;">
        ${fmtDate(t.date)}
      </td>
      <td style="padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0;font-weight:600;">
        ${t.subject}
      </td>
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#475569;">
        ${fmtTime(t.startTime)}
      </td>
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#475569;">
        ${fmtTime(t.endTime)}
      </td>
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#64748b;font-weight:600;">
        ${t.duration || computeDuration(t.startTime, t.endTime) || '—'}
      </td>
    </tr>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Exam Time Table – ${event.examName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f0f4f8;padding:20px;display:flex;justify-content:center;}
.page{width:210mm;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,0.12);border-radius:8px;overflow:hidden;}
.header{background:linear-gradient(135deg,#1a237e 0%,#1565c0 100%);color:#fff;padding:24px 32px;display:flex;align-items:center;gap:20px;}
.logo-box{width:72px;height:72px;border-radius:12px;background:rgba(255,255,255,0.15);display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;overflow:hidden;}
.logo-box img{width:100%;height:100%;object-fit:cover;}
.school-info{flex:1;}
.school-name{font-size:20px;font-weight:800;letter-spacing:.5px;}
.school-sub{font-size:11px;color:rgba(255,255,255,.72);margin-top:5px;line-height:1.6;}
.title-band{background:#fbbf24;text-align:center;padding:9px;font-size:12px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#1a237e;}
.meta{padding:20px 32px 0;display:flex;justify-content:space-between;align-items:center;}
.exam-name{font-size:20px;font-weight:800;color:#1a237e;}
.exam-sub{font-size:12px;color:#64748b;margin-top:4px;}
.badge{background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:6px 14px;font-size:11px;font-weight:700;color:#1e40af;}
.body{padding:20px 32px;}
table.tt{width:100%;border-collapse:collapse;border-radius:10px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.06);}
table.tt thead tr{background:linear-gradient(135deg,#1a237e,#1565c0);color:#fff;}
table.tt th{padding:11px 14px;font-size:11px;text-align:left;font-weight:700;letter-spacing:.5px;text-transform:uppercase;}
.footer{padding:20px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end;margin-top:12px;}
.note{font-size:10px;color:#64748b;max-width:280px;line-height:1.7;}
.sig{text-align:center;}
.sig-line{width:180px;height:50px;border-bottom:1.5px solid #0f172a;margin-bottom:5px;display:flex;align-items:flex-end;justify-content:center;}
.sig-line img{max-height:48px;max-width:160px;object-fit:contain;}
.sig-lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.4px;}
.watermark{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-30deg);font-size:80px;font-weight:900;color:rgba(26,35,126,0.04);pointer-events:none;white-space:nowrap;z-index:0;}
@media print{body{background:#fff;padding:0;}.page{width:100%;box-shadow:none;}@page{margin:0;size:A4;}}
</style>
</head>
<body>
<div class="page" style="position:relative;">
  <div class="watermark">EXAM SCHEDULE</div>
  <div class="header">
    <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.parentElement.textContent='🏫'"/>` : '🏫'}</div>
    <div class="school-info">
      <div class="school-name">${schoolName.toUpperCase()}</div>
      <div class="school-sub">
        ${schoolAddress ? `📍 ${schoolAddress}<br/>` : ''}
        ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
        ${schoolCode ? `<br/>School Code: <strong>${schoolCode}</strong>` : ''}
      </div>
    </div>
  </div>
  <div class="title-band">✦ &nbsp; Official Examination Time Table &nbsp; ✦</div>
  <div class="meta">
    <div>
      <div class="exam-name">${event.examName}</div>
      <div class="exam-sub">${event.course?.name || ''}${event.batch?.name ? ' · ' + event.batch.name : ''}</div>
      <div class="exam-sub" style="margin-top:4px;">📅 ${fmtDate(event.startDate)} &nbsp;→&nbsp; ${fmtDate(event.endDate)}</div>
    </div>
    <div class="badge">Total: ${timetable.length} Papers Scheduled</div>
  </div>
  <div class="body">
    <table class="tt">
      <thead>
        <tr>
          <th>Date</th>
          <th>Subject / Paper</th>
          <th>Start Time</th>
          <th>End Time</th>
          <th>Duration</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">
    <div class="note">
      <strong>Important Examination Instructions:</strong><br/>
      • Bring this official time table & Admit Card to the exam hall.<br/>
      • Students must report 20 minutes before examination commences.<br/>
      • Any unfair means or electronic gadgets will lead to cancellation.
    </div>
    <div class="sig">
      <div class="sig-line">${directorSign ? `<img src="${directorSign}" alt="Sign"/>` : ''}</div>
      <div class="sig-lbl">Principal / Controller of Examinations</div>
      <div style="font-size:10px;color:#64748b;margin-top:2px;">${schoolName}</div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print();}</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=950,height=750')
  if (!win) { alert('Please allow popups to print/download the time table.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function DashboardExamTimetable() {
  const { token, tenant } = useAuth()
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])

  // Form state
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  const [examName, setExamName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [rows, setRows] = useState<{ date: string; subject: string; startTime: string; endTime: string; duration: string }[]>([])
  const [classStudentCount, setClassStudentCount] = useState<number | null>(null)

  const [loading, setLoading] = useState(false)
  const [fetchingEvents, setFetchingEvents] = useState(true)
  const [toast, setToast] = useState('')
  const [viewEvent, setViewEvent] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  // Filters
  const [filterCourse, setFilterCourse] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) return
    fetchCourses()
    fetchEvents()
  }, [token])

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses', { headers })
      const d = await res.json()
      if (d.success) setCourses(d.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBatches = async (courseId: string) => {
    try {
      const res = await fetch(`/api/batches?courseId=${courseId}`, { headers })
      const d = await res.json()
      if (d.success) setBatches(d.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const handleCourseChange = async (courseId: string) => {
    setSelectedCourse(courseId)
    setSelectedBatch('')
    if (!courseId) {
      setBatches([])
      setClassStudentCount(null)
      return
    }
    fetchBatches(courseId)
    try {
      const res = await fetch(`/api/students?courseId=${courseId}`, { headers })
      const data = await res.json()
      if (data.success) setClassStudentCount(data.data?.length || 0)
    } catch {
      setClassStudentCount(null)
    }
  }

  const fetchEvents = async () => {
    setFetchingEvents(true)
    try {
      const res = await fetch('/api/exam-timetable', { headers })
      const d = await res.json()
      if (d.success) setEvents(d.data || [])
    } catch (err) {
      console.error(err)
    }
    setFetchingEvents(false)
  }

  const addRow = () => setRows([...rows, { date: '', subject: '', startTime: '09:00', endTime: '12:00', duration: '3h' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [key]: val }
    if ((key === 'startTime' || key === 'endTime') && updated[i].startTime && updated[i].endTime) {
      updated[i].duration = computeDuration(updated[i].startTime, updated[i].endTime)
    }
    setRows(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rows.length === 0) { showToast('⚠️ Add at least one subject to the exam time table'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/exam-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          examName,
          courseId: selectedCourse,
          batchId: selectedBatch,
          startDate,
          endDate,
          timeTable: rows
        }),
      })
      const d = await res.json()
      if (d.success) {
        showToast('✅ Exam Time Table & Admit Cards created successfully!')
        resetForm()
        fetchEvents()
        setShowForm(false)
      } else {
        showToast('❌ ' + (d.error || 'Failed to create time table'))
      }
    } catch {
      showToast('❌ Network error. Please try again.')
    }
    setLoading(false)
  }

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also remove associated admit cards.`)) return
    try {
      const res = await fetch(`/api/admit-cards/${id}`, {
        method: 'DELETE',
        headers,
      })
      const d = await res.json()
      if (d.success) {
        showToast('🗑️ Exam Time Table deleted successfully')
        fetchEvents()
      } else {
        showToast('❌ ' + (d.error || 'Failed to delete'))
      }
    } catch {
      showToast('❌ Network error')
    }
  }

  const resetForm = () => {
    setExamName('')
    setStartDate('')
    setEndDate('')
    setSelectedCourse('')
    setSelectedBatch('')
    setRows([])
    setClassStudentCount(null)
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const filteredEvents = filterCourse
    ? events.filter(e => e.courseId === filterCourse)
    : events

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)',
          background: toast.startsWith('✅') ? '#064e3b' : toast.startsWith('⚠️') ? '#78350f' : '#7f1d1d',
          color: 'white', padding: '12px 24px', borderRadius: '12px', zIndex: 99999,
          fontSize: '13px', fontWeight: '700', boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {toast}
        </div>
      )}

      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>📅</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Exam Time Table & Schedules
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Create class-wise examination schedules, print official timetables, and publish admit cards to parents & students.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/admit-cards"
            style={{
              background: 'rgba(139,92,246,0.15)',
              border: '1px solid rgba(139,92,246,0.35)',
              borderRadius: '12px',
              padding: '10px 16px',
              color: '#a78bfa',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🎫</span> Admit Cards Flow
          </Link>

          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              background: showForm ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #10b981, #059669)',
              border: showForm ? '1px solid rgba(239,68,68,0.4)' : 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              color: 'white',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(16,185,129,0.3)'
            }}
          >
            <span>{showForm ? '✕' : '+'}</span>
            {showForm ? 'Close Form' : 'Create Exam Time Table'}
          </button>
        </div>
      </div>

      {/* Overview Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Timetables</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{events.length}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Papers Scheduled</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>
            {events.reduce((sum, e) => sum + (Array.isArray(e.timeTable) ? e.timeTable.length : 0), 0)}
          </div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Admit Cards Linked</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#f59e0b', marginTop: '4px' }}>
            {events.reduce((sum, e) => sum + (e._count?.admitCards || 0), 0)}
          </div>
        </div>
      </div>

      {/* ── Create New Timetable Form ────────────────────────────────────── */}
      {showForm && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid var(--primary)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>📝</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Generate New Exam Time Table
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
              Auto Generates Student Admit Cards
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Class & Section Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Select Class / Course *
                </label>
                <select
                  value={selectedCourse}
                  onChange={e => handleCourseChange(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {classStudentCount !== null && (
                  <div style={{ fontSize: '12px', color: classStudentCount > 0 ? '#10b981' : '#ef4444', fontWeight: '700', marginTop: '6px' }}>
                    {classStudentCount > 0 ? `👥 ${classStudentCount} Active Students will receive this Admit Card` : '⚠️ No active students found in this class'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Section / Batch (Optional)
                </label>
                <select
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  className="input"
                  disabled={!selectedCourse}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', opacity: !selectedCourse ? 0.5 : 1 }}
                >
                  <option value="">{batches.length > 0 ? '-- All Sections / Whole Class --' : '-- Whole Class (No Sections) --'}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Exam Name */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                Exam Title / Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Mid Term Exam 2026 / Annual Examination"
                value={examName}
                onChange={e => setExamName(e.target.value)}
                className="input"
                style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                required
              />
            </div>

            {/* Start & End Dates */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Exam Start Date *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Exam End Date *
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  required
                />
              </div>
            </div>

            {/* Subject Time Table Schedule Builder */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    📚 Exam Time Table Subjects ({rows.length} added)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Add all papers with dates and timings. This timetable will be printed below each admit card.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addRow}
                  style={{
                    background: 'var(--primary)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 14px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  + Add Subject
                </button>
              </div>

              {rows.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px', fontSize: '13px' }}>
                  Click <strong>"+ Add Subject"</strong> to enter exam dates, subjects, and timings.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {rows.map((row, idx) => (
                    <div
                      key={idx}
                      style={{
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        padding: '12px',
                        borderRadius: '10px',
                        display: 'grid',
                        gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr auto',
                        gap: '8px',
                        alignItems: 'center'
                      }}
                    >
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Date *</label>
                        <input
                          type="date"
                          value={row.date}
                          onChange={e => updateRow(idx, 'date', e.target.value)}
                          className="input"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Subject / Paper *</label>
                        <input
                          type="text"
                          placeholder="e.g. Science / Mathematics"
                          value={row.subject}
                          onChange={e => updateRow(idx, 'subject', e.target.value)}
                          className="input"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Time</label>
                        <input
                          type="time"
                          value={row.startTime}
                          onChange={e => updateRow(idx, 'startTime', e.target.value)}
                          className="input"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>End Time</label>
                        <input
                          type="time"
                          value={row.endTime}
                          onChange={e => updateRow(idx, 'endTime', e.target.value)}
                          className="input"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Duration</label>
                        <input
                          type="text"
                          value={row.duration}
                          readOnly
                          className="input"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRow(idx)}
                        style={{
                          background: 'rgba(239,68,68,0.15)',
                          border: '1px solid rgba(239,68,68,0.3)',
                          color: '#ef4444',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          marginTop: '14px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(16,185,129,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {loading ? '⏳ Generating Time Table & Admit Cards...' : '🚀 Generate Exam Time Table & Admit Cards'}
            </button>
          </form>
        </div>
      )}

      {/* Filter by Class */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filterCourse}
          onChange={e => setFilterCourse(e.target.value)}
          className="input"
          style={{ minWidth: '200px', padding: '10px 14px', borderRadius: '10px' }}
        >
          <option value="">All Classes</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {filterCourse && (
          <button
            onClick={() => setFilterCourse('')}
            style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* ── Timetables List ─────────────────────────────────────────────── */}
      <div>
        {fetchingEvents ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading timetables...</div>
        ) : filteredEvents.length === 0 ? (
          <div style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '42px', marginBottom: '10px' }}>📋</div>
            <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>No Exam Timetables Found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '6px 0 16px' }}>
              Create an exam schedule above to generate printable timetables and student admit cards.
            </p>
            <button
              onClick={() => setShowForm(true)}
              style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: '700', cursor: 'pointer' }}
            >
              + Create First Timetable
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {filteredEvents.map(ev => {
              const isExpanded = viewEvent?.id === ev.id
              const tt: any[] = Array.isArray(ev.timeTable) ? ev.timeTable : []
              return (
                <div
                  key={ev.id}
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Card Header Row */}
                  <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                        📋
                      </div>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {ev.examName}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                          <span style={{ color: '#a78bfa', fontWeight: '600' }}>📚 {ev.course?.name}{ev.batch?.name ? ` · ${ev.batch.name}` : ''}</span>
                          <span>📅 {fmtDate(ev.startDate)} → {fmtDate(ev.endDate)}</span>
                          <span style={{ color: '#10b981', fontWeight: '600' }}>👥 {ev._count?.admitCards || 0} Admit Cards</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => generateTimeTablePDF(ev, tenant)}
                        style={{
                          background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        📥 Print / PDF
                      </button>

                      <Link
                        href={`/dashboard/admit-cards?eventId=${ev.id}`}
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                          color: 'white',
                          borderRadius: '10px',
                          padding: '8px 14px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        🎫 Admit Cards
                      </Link>

                      <button
                        onClick={() => handleDelete(ev.id, ev.examName)}
                        style={{
                          background: 'rgba(239,68,68,0.1)',
                          border: '1px solid rgba(239,68,68,0.25)',
                          color: '#ef4444',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        🗑️
                      </button>

                      <button
                        onClick={() => setViewEvent(isExpanded ? null : ev)}
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--text-primary)',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: '700'
                        }}
                      >
                        {isExpanded ? 'Hide ▲' : `${tt.length} Papers ▼`}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Table Schedule View */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '16px 20px' }}>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#a78bfa', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                        Examination Schedule ({tt.length} Papers)
                      </div>
                      {tt.length === 0 ? (
                        <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No subjects added in this timetable.</div>
                      ) : (
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>#</th>
                                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Date</th>
                                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Subject / Paper</th>
                                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Start Time</th>
                                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>End Time</th>
                                <th style={{ padding: '10px', textAlign: 'left', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>Duration</th>
                              </tr>
                            </thead>
                            <tbody>
                              {tt.map((t: any, i: number) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{i + 1}</td>
                                  <td style={{ padding: '10px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmtDate(t.date)}</td>
                                  <td style={{ padding: '10px', fontWeight: '600', color: '#a78bfa' }}>{t.subject}</td>
                                  <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{fmtTime(t.startTime)}</td>
                                  <td style={{ padding: '10px', color: 'var(--text-muted)' }}>{fmtTime(t.endTime)}</td>
                                  <td style={{ padding: '10px', color: '#10b981', fontWeight: '700' }}>
                                    {t.duration || computeDuration(t.startTime, t.endTime) || '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
