'use client'
import { useState, useEffect } from 'react'
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

// ── Premium PDF Generator ────────────────────────────────────────────────────
function generateTimeTablePDF(event: any, tenant: any) {
  const schoolName = tenant?.name || 'School'
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
      <td style="padding:10px 14px;font-size:12px;border-bottom:1px solid #e2e8f0;color:#64748b;">
        ${t.duration || computeDuration(t.startTime, t.endTime)}
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
.note{font-size:10px;color:#64748b;max-width:260px;line-height:1.7;}
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
  <div class="title-band">✦ &nbsp; Examination Time Table &nbsp; ✦</div>
  <div class="meta">
    <div>
      <div class="exam-name">${event.examName}</div>
      <div class="exam-sub">${event.course?.name || ''}${event.batch?.name ? ' · ' + event.batch.name : ''}</div>
      <div class="exam-sub" style="margin-top:4px;">📅 ${fmtDate(event.startDate)} &nbsp;→&nbsp; ${fmtDate(event.endDate)}</div>
    </div>
    <div class="badge">Total: ${timetable.length} Papers</div>
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
      <strong>Instructions:</strong><br/>
      • Bring this time table to the exam hall.<br/>
      • Be present 15 minutes before the exam.<br/>
      • Mobile phones are strictly prohibited.
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

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Please allow popups to download the time table.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function StaffExamTimetable() {
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

  const [loading, setLoading] = useState(false)
  const [fetchingEvents, setFetchingEvents] = useState(true)
  const [toast, setToast] = useState('')
  const [viewEvent, setViewEvent] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)

  const h = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) return
    fetchCourses()
    fetchEvents()
  }, [token])

  const fetchCourses = async () => {
    const res = await fetch('/api/courses', { headers: h })
    const d = await res.json()
    if (d.success) setCourses(d.data || [])
  }

  const fetchBatches = async (courseId: string) => {
    const res = await fetch(`/api/batches?courseId=${courseId}`, { headers: h })
    const d = await res.json()
    if (d.success) setBatches(d.data || [])
  }

  const fetchEvents = async () => {
    setFetchingEvents(true)
    const res = await fetch('/api/exam-timetable', { headers: h })
    const d = await res.json()
    if (d.success) setEvents(d.data || [])
    setFetchingEvents(false)
  }

  const addRow = () => setRows([...rows, { date: '', subject: '', startTime: '', endTime: '', duration: '' }])
  const removeRow = (i: number) => setRows(rows.filter((_, idx) => idx !== i))
  const updateRow = (i: number, key: string, val: string) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [key]: val }
    // Auto compute duration if start and end filled
    if ((key === 'startTime' || key === 'endTime') && updated[i].startTime && updated[i].endTime) {
      updated[i].duration = computeDuration(updated[i].startTime, updated[i].endTime)
    }
    setRows(updated)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rows.length === 0) { showToast('⚠️ Add at least one subject row'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/exam-timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ examName, courseId: selectedCourse, batchId: selectedBatch, startDate, endDate, timeTable: rows }),
      })
      const d = await res.json()
      if (d.success) {
        showToast('✅ Exam timetable created successfully!')
        resetForm()
        fetchEvents()
        setShowForm(false)
      } else {
        showToast('❌ ' + (d.error || 'Failed to create'))
      }
    } catch {
      showToast('❌ Network error. Please try again.')
    }
    setLoading(false)
  }

  const resetForm = () => {
    setExamName(''); setStartDate(''); setEndDate('')
    setSelectedCourse(''); setSelectedBatch(''); setRows([])
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 12px', borderRadius: '8px',
    background: '#0f172a', border: '1px solid #334155', color: 'white',
    fontSize: '13px', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: '12px', color: '#94a3b8', marginBottom: '5px', display: 'block', fontWeight: '600',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: toast.startsWith('✅') ? '#064e3b' : toast.startsWith('⚠️') ? '#78350f' : '#7f1d1d',
          color: 'white', padding: '12px 20px', borderRadius: '12px', zIndex: 9999,
          fontSize: '13px', fontWeight: '600', boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
        }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>📝 Exam Time Table</h1>
          <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0' }}>Generate & manage exam schedules</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            border: 'none', borderRadius: '10px', padding: '10px 16px',
            color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
          }}
        >
          {showForm ? '✕ Cancel' : '+ New Timetable'}
        </button>
      </div>

      {/* ── Create Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '16px' }}>
            📋 Create New Exam Time Table
          </h3>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Class & Batch */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Class / Course</label>
                <select
                  value={selectedCourse}
                  onChange={e => { setSelectedCourse(e.target.value); fetchBatches(e.target.value) }}
                  style={inputStyle} required
                >
                  <option value="">Select Class</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Section / Batch (Optional)</label>
                <select
                  value={selectedBatch}
                  onChange={e => setSelectedBatch(e.target.value)}
                  style={{ ...inputStyle, opacity: !selectedCourse ? 0.5 : 1 }}
                  disabled={!selectedCourse}
                >
                  <option value="">{batches.length > 0 ? '-- All Sections / Whole Class --' : '-- Whole Class (No Sections) --'}</option>
                  {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>

            {/* Exam Name */}
            <div>
              <label style={labelStyle}>Exam Name</label>
              <input
                type="text" value={examName} onChange={e => setExamName(e.target.value)}
                placeholder="e.g. Half Yearly Examination 2026" style={inputStyle} required
              />
            </div>

            {/* Start & End dates */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Exam Start Date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>Exam End Date</label>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={inputStyle} required />
              </div>
            </div>

            {/* Subject rows */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={{ ...labelStyle, marginBottom: 0, color: 'white', fontSize: '13px' }}>
                  📚 Subject Schedule ({rows.length} added)
                </label>
                <button
                  type="button" onClick={addRow}
                  style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                >
                  + Add Subject
                </button>
              </div>

              {rows.length === 0 && (
                <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', padding: '20px 0', fontStyle: 'italic', border: '1px dashed #334155', borderRadius: '10px' }}>
                  Click "Add Subject" to add exam entries
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rows.map((row, i) => (
                  <div key={i} style={{ background: '#0f172a', borderRadius: '10px', padding: '12px', border: '1px solid #334155' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 130px' }}>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Date</label>
                        <input type="date" value={row.date} onChange={e => updateRow(i, 'date', e.target.value)} style={{ ...inputStyle, padding: '8px' }} required />
                      </div>
                      <div style={{ flex: '2 1 150px' }}>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Subject / Paper</label>
                        <input type="text" placeholder="e.g. Mathematics" value={row.subject} onChange={e => updateRow(i, 'subject', e.target.value)} style={{ ...inputStyle, padding: '8px' }} required />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Start Time</label>
                        <input type="time" value={row.startTime} onChange={e => updateRow(i, 'startTime', e.target.value)} style={{ ...inputStyle, padding: '8px' }} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>End Time</label>
                        <input type="time" value={row.endTime} onChange={e => updateRow(i, 'endTime', e.target.value)} style={{ ...inputStyle, padding: '8px' }} required />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ ...labelStyle, fontSize: '10px' }}>Duration</label>
                        <input type="text" value={row.duration} readOnly placeholder="Auto" style={{ ...inputStyle, padding: '8px', color: '#94a3b8' }} />
                      </div>
                      <button
                        type="button" onClick={() => removeRow(i)}
                        style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', borderRadius: '8px', padding: '8px 10px', cursor: 'pointer', fontSize: '14px', flexShrink: 0 }}
                      >✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit" disabled={loading}
              style={{
                background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                border: 'none', borderRadius: '12px', padding: '14px',
                color: 'white', fontWeight: '800', fontSize: '15px',
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              {loading ? '⏳ Generating...' : '📝 Generate & Publish Time Table'}
            </button>
          </form>
        </div>
      )}

      {/* ── Existing Timetables List ─────────────────────────────────────── */}
      <div>
        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
          Generated Timetables
        </h3>

        {fetchingEvents ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>Loading...</div>
        ) : events.length === 0 ? (
          <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📋</div>
            <div style={{ color: '#94a3b8', fontSize: '14px' }}>No exam timetables yet. Create one above.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {events.map((ev: any) => {
              const isExpanded = viewEvent?.id === ev.id
              const tt: any[] = Array.isArray(ev.timeTable) ? ev.timeTable : []
              return (
                <div key={ev.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', overflow: 'hidden' }}>
                  {/* Event header row */}
                  <button
                    onClick={() => setViewEvent(isExpanded ? null : ev)}
                    style={{ width: '100%', background: 'none', border: 'none', padding: '16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', textAlign: 'left' }}
                  >
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{ev.examName}</div>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '3px' }}>
                        {ev.course?.name}{ev.batch?.name ? ' · ' + ev.batch.name : ''} &nbsp;·&nbsp; {fmtDate(ev.startDate)} → {fmtDate(ev.endDate)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px' }}>
                        {tt.length} papers
                      </span>
                      <span style={{ color: '#475569', fontSize: '16px', transition: 'transform 0.2s', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                  </button>

                  {/* Expanded timetable */}
                  {isExpanded && (
                    <div style={{ borderTop: '1px solid #334155' }}>
                      {/* PDF Download & Admit Cards btns */}
                      <div style={{ padding: '12px 16px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => generateTimeTablePDF(ev, tenant)}
                          style={{
                            flex: 1, minWidth: '180px', background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                            border: 'none', borderRadius: '10px', padding: '11px',
                            color: 'white', fontWeight: '700', fontSize: '13px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          }}
                        >
                          📥 Download Time Table PDF
                        </button>
                        <a
                          href="/portal/staff/admit-cards"
                          style={{
                            flex: 1, minWidth: '180px', background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                            borderRadius: '10px', padding: '11px', textDecoration: 'none',
                            color: 'white', fontWeight: '700', fontSize: '13px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                          }}
                        >
                          🎫 View & Publish Admit Cards
                        </a>
                      </div>

                      {/* Table preview */}
                      {tt.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: '#475569', fontSize: '13px' }}>No schedule entries</div>
                      ) : (
                        <div style={{ padding: '0 16px 16px', overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                            <thead>
                              <tr style={{ background: '#0f172a' }}>
                                {['#', 'Date', 'Subject', 'Start', 'End', 'Duration'].map(h => (
                                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#94a3b8', fontWeight: '700', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.5px', border: 'none' }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {tt.map((t: any, i: number) => (
                                <tr key={i} style={{ background: i % 2 === 0 ? '#0f172a' : 'transparent', borderBottom: '1px solid #1e293b' }}>
                                  <td style={{ padding: '9px 10px', color: '#64748b', fontSize: '11px' }}>{i + 1}</td>
                                  <td style={{ padding: '9px 10px', color: 'white', fontWeight: '600', fontSize: '12px' }}>{fmtDate(t.date)}</td>
                                  <td style={{ padding: '9px 10px', color: '#e2e8f0', fontSize: '12px' }}>{t.subject}</td>
                                  <td style={{ padding: '9px 10px', color: '#94a3b8', fontSize: '11px' }}>{fmtTime(t.startTime)}</td>
                                  <td style={{ padding: '9px 10px', color: '#94a3b8', fontSize: '11px' }}>{fmtTime(t.endTime)}</td>
                                  <td style={{ padding: '9px 10px', color: '#6366f1', fontSize: '11px', fontWeight: '600' }}>
                                    {t.duration || computeDuration(t.startTime, t.endTime)}
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
