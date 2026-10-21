'use client'
import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
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

// ── Printable Admit Card HTML Generator ──────────────────────────────────────
// Format: School Header -> HALL TICKET / ADMIT CARD -> Student Details & Photo -> Attached Exam Timetable -> Instructions -> Signatures
function generateAdmitCardsPrintHTML(eventDetails: any, tenant: any, singleCard?: any) {
  const schoolName = tenant?.name || 'RSS Public School'
  const schoolLogo = tenant?.logo || ''
  const schoolAddress = tenant?.address || ''
  const schoolPhone = tenant?.phone || ''
  const schoolEmail = tenant?.email || ''
  const schoolCode = tenant?.schoolCode || ''
  const directorSign = tenant?.directorSign || ''

  const cardsToPrint = singleCard ? [singleCard] : (eventDetails.admitCards || [])
  const timeTable = Array.isArray(eventDetails.timeTable) ? eventDetails.timeTable : []

  const cardsHtml = cardsToPrint.map((card: any) => `
    <div class="admit-card-page">
      <div class="card-border">
        <!-- Colored top bar -->
        <div class="top-strip"></div>

        <!-- School Header -->
        <div class="header">
          <div class="logo-box">
            ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" onerror="this.parentElement.textContent='🏫'"/>` : '<span style="font-size:32px;">🏫</span>'}
          </div>
          <div class="header-text">
            <h1 class="school-name">${schoolName}</h1>
            ${schoolAddress ? `<p class="school-sub">${schoolAddress}</p>` : ''}
            <p class="school-contact">
              ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
              ${schoolCode ? ` &nbsp;|&nbsp; School Code: <strong>${schoolCode}</strong>` : ''}
            </p>
          </div>
          <div class="header-tag">
            <div class="tag-sub">HALL TICKET</div>
            <div class="tag-main">ADMIT CARD</div>
          </div>
        </div>

        <!-- Exam Title Banner -->
        <div class="exam-banner">
          ✦ &nbsp; ${eventDetails.examName} &nbsp; ✦
          <div style="font-size:11px;font-weight:600;margin-top:2px;letter-spacing:0.5px;opacity:0.9;">
            ${eventDetails.course?.name || ''}${eventDetails.batch?.name ? ' — ' + eventDetails.batch.name : ''}
          </div>
        </div>

        <!-- Student Info & Photo Section -->
        <div class="student-info-section">
          <div class="student-details-grid">
            <div class="detail-item">
              <span class="detail-label">STUDENT NAME</span>
              <span class="detail-value highlight">${card.student.fullName}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">SCHOLAR / ROLL NO</span>
              <span class="detail-value">${card.student.scholarNo || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">FATHER'S NAME</span>
              <span class="detail-value">${card.student.fatherName || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">CLASS & SECTION</span>
              <span class="detail-value">${eventDetails.course?.name || ''} - ${eventDetails.batch?.name || ''}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">DATE OF BIRTH</span>
              <span class="detail-value">${card.student.dob ? fmtDate(card.student.dob) : 'N/A'}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">EXAMINATION DATES</span>
              <span class="detail-value">${fmtDate(eventDetails.startDate)} → ${fmtDate(eventDetails.endDate)}</span>
            </div>
          </div>

          <div class="photo-container">
            <div class="photo-box">
              ${card.student.photo ? `<img src="${card.student.photo}" alt="Student Photo" />` : '<div style="font-size:36px;">👤</div><div style="font-size:9px;color:#64748b;margin-top:4px;">Affix Photo</div>'}
            </div>
          </div>
        </div>

        <!-- Attached Exam Time Table (Shown directly below admit card) -->
        <div class="section-divider">
          <span>EXAMINATION TIME TABLE / SCHEDULE</span>
        </div>

        <table class="timetable-table">
          <thead>
            <tr>
              <th style="width:14%;">Date</th>
              <th style="width:40%;">Subject / Paper</th>
              <th style="width:23%;">Exam Time</th>
              <th style="width:23%;">Duration</th>
            </tr>
          </thead>
          <tbody>
            ${timeTable.length === 0 ? `
              <tr>
                <td colspan="4" style="text-align:center;padding:12px;color:#64748b;">Schedule will be notified separately.</td>
              </tr>
            ` : timeTable.map((t: any) => `
              <tr>
                <td style="font-weight:700;color:#1a237e;">${fmtDate(t.date)}</td>
                <td style="font-weight:600;color:#0f172a;">${t.subject}</td>
                <td>${fmtTime(t.startTime)} — ${fmtTime(t.endTime)}</td>
                <td style="color:#64748b;">${t.duration || computeDuration(t.startTime, t.endTime) || '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- Instructions -->
        <div class="instructions-box">
          <div class="instructions-title">IMPORTANT CANDIDATE INSTRUCTIONS:</div>
          <ol class="instructions-list">
            <li>Candidate must carry this Admit Card & School ID Card to the examination hall for all papers.</li>
            <li>Report strictly 20 minutes before the scheduled exam commencement time.</li>
            <li>Mobile phones, smartwatches, calculators, and unfair means material are strictly prohibited.</li>
            <li>Maintain silence and strict discipline inside the examination hall.</li>
          </ol>
        </div>

        <!-- Signatures -->
        <div class="signatures-row">
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-text">Candidate's Signature</div>
          </div>
          <div class="sig-block">
            <div class="sig-line"></div>
            <div class="sig-text">Class Teacher's Signature</div>
          </div>
          <div class="sig-block">
            <div class="sig-line">
              ${directorSign ? `<img src="${directorSign}" alt="Principal Signature" style="max-height:40px;max-width:140px;object-fit:contain;"/>` : ''}
            </div>
            <div class="sig-text">Principal / Controller of Exams</div>
          </div>
        </div>
      </div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Admit Cards – ${eventDetails.examName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f1f5f9;margin:0;padding:20px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.admit-card-page{width:210mm;margin:0 auto 30px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.12);page-break-after:always;}
.card-border{border:2.5px solid #1a237e;border-radius:10px;margin:8px;padding:18px 20px;position:relative;}
.top-strip{position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(90deg,#1a237e,#2563eb,#fbbf24);}
.header{display:flex;align-items:center;gap:16px;border-bottom:2px solid #1a237e;padding-bottom:12px;margin-top:4px;}
.logo-box{width:68px;height:68px;border-radius:10px;border:1.5px solid #cbd5e1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:#f8fafc;flex-shrink:0;}
.logo-box img{width:100%;height:100%;object-fit:contain;}
.header-text{flex:1;}
.school-name{font-size:19px;font-weight:900;color:#1a237e;text-transform:uppercase;letter-spacing:0.5px;margin:0;}
.school-sub{font-size:11px;color:#475569;margin-top:2px;line-height:1.4;}
.school-contact{font-size:10px;color:#64748b;margin-top:2px;}
.header-tag{text-align:right;flex-shrink:0;}
.tag-sub{font-size:10px;font-weight:700;color:#64748b;letter-spacing:1px;text-transform:uppercase;}
.tag-main{font-size:18px;font-weight:900;color:#b45309;background:#fef3c7;padding:4px 10px;border-radius:6px;border:1px solid #fde68a;margin-top:2px;letter-spacing:0.5px;}

.exam-banner{background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1a237e;font-weight:900;text-align:center;padding:7px 12px;margin:12px 0;border-radius:6px;font-size:13px;text-transform:uppercase;letter-spacing:1.5px;}

.student-info-section{display:flex;gap:18px;align-items:flex-start;margin-bottom:12px;}
.student-details-grid{flex:1;display:grid;grid-template-columns:1fr 1fr;gap:9px 16px;}
.detail-item{border-bottom:1px solid #e2e8f0;padding-bottom:4px;}
.detail-label{display:block;font-size:9px;font-weight:700;color:#64748b;letter-spacing:0.5px;text-transform:uppercase;}
.detail-value{font-size:13px;font-weight:700;color:#0f172a;}
.detail-value.highlight{color:#1a237e;font-size:14px;font-weight:800;}
.photo-container{width:96px;flex-shrink:0;text-align:center;}
.photo-box{width:96px;height:116px;border:1.5px solid #1a237e;border-radius:6px;background:#f8fafc;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;}
.photo-box img{width:100%;height:100%;object-fit:cover;}

.section-divider{display:flex;align-items:center;margin:10px 0 6px 0;text-align:center;}
.section-divider::before,.section-divider::after{content:'';flex:1;border-bottom:1.5px solid #cbd5e1;}
.section-divider span{padding:0 10px;font-size:11px;font-weight:800;color:#1a237e;letter-spacing:1px;text-transform:uppercase;}

.timetable-table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:10px;border-radius:6px;overflow:hidden;border:1px solid #cbd5e1;}
.timetable-table th{background:#1a237e;color:#fff;padding:6px 10px;text-align:left;font-weight:700;letter-spacing:0.5px;text-transform:uppercase;font-size:10px;}
.timetable-table td{border-bottom:1px solid #e2e8f0;padding:6px 10px;text-align:left;}
.timetable-table tr:nth-child(even){background:#f8fafc;}

.instructions-box{background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:8px 12px;margin-bottom:14px;}
.instructions-title{font-size:10px;font-weight:800;color:#92400e;letter-spacing:0.5px;}
.instructions-list{margin:4px 0 0;padding-left:16px;font-size:9.5px;color:#78350f;line-height:1.5;}

.signatures-row{display:flex;justify-content:space-between;align-items:flex-end;margin-top:16px;padding:0 10px;}
.sig-block{text-align:center;width:150px;}
.sig-line{height:42px;border-bottom:1.5px solid #1e293b;margin-bottom:4px;display:flex;align-items:flex-end;justify-content:center;}
.sig-text{font-size:10px;font-weight:700;color:#475569;}

@media print{
  body{background:#fff;padding:0;}
  .admit-card-page{width:100%;margin:0;box-shadow:none;page-break-after:always;}
  .card-border{border:2px solid #1a237e;margin:0;padding:16px 18px;}
  @page{size:A4 portrait;margin:8mm;}
}
</style>
</head>
<body>
  ${cardsHtml}
  <script>window.onload=function(){window.print();}</script>
</body>
</html>`
}

function printCardsWindow(eventDetails: any, tenant: any, singleCard?: any) {
  const html = generateAdmitCardsPrintHTML(eventDetails, tenant, singleCard)
  const win = window.open('', '_blank', 'width=950,height=750')
  if (!win) {
    alert('Please allow popups to print/download Admit Cards.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ── Main Component ────────────────────────────────────────────────────────────
function DashboardAdmitCardsContent() {
  const { token, user, tenant } = useAuth()
  const searchParams = useSearchParams()
  const eventIdParam = searchParams.get('eventId')

  const [events, setEvents] = useState<any[]>([])
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])

  // Selection & UI state
  const [viewEvent, setViewEvent] = useState<any>(null)
  const [eventDetails, setEventDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modalLoading, setModalLoading] = useState(false)
  const [showGenerateForm, setShowGenerateForm] = useState(false)
  const [searchStudent, setSearchStudent] = useState('')
  const [toast, setToast] = useState('')

  // Form state
  const [formCourse, setFormCourse] = useState('')
  const [formBatch, setFormBatch] = useState('')
  const [formExamName, setFormExamName] = useState('')
  const [formStartDate, setFormStartDate] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [formTimeTable, setFormTimeTable] = useState<{ date: string; subject: string; startTime: string; endTime: string; duration: string }[]>([])
  const [formStudentCount, setFormStudentCount] = useState<number | null>(null)
  const [generating, setGenerating] = useState(false)

  // Filters
  const [filterCourse, setFilterCourse] = useState('')
  const [filterBatch, setFilterBatch] = useState('')

  const headers = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) return
    fetchData()
    fetchCourses()
    fetchBatches()
  }, [token])

  useEffect(() => {
    if (eventIdParam && events.length > 0 && !viewEvent) {
      const match = events.find(e => e.id === eventIdParam)
      if (match) openEvent(match)
    }
  }, [eventIdParam, events])

  const fetchCourses = async () => {
    try {
      const res = await fetch('/api/courses', { headers })
      const d = await res.json()
      if (d.success) setCourses(d.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/batches', { headers })
      const d = await res.json()
      if (d.success) setBatches(d.data || [])
    } catch (err) {
      console.error(err)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filterCourse) params.set('courseId', filterCourse)
      if (filterBatch) params.set('batchId', filterBatch)
      const res = await fetch(`/api/admit-cards?${params.toString()}`, { headers })
      const data = await res.json()
      if (data.success) setEvents(data.data || [])
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (token) fetchData()
  }, [filterCourse, filterBatch])

  const handleFormCourseChange = async (courseId: string) => {
    setFormCourse(courseId)
    setFormBatch('')
    if (!courseId) {
      setFormStudentCount(null)
      return
    }
    try {
      const res = await fetch(`/api/students?courseId=${courseId}`, { headers })
      const data = await res.json()
      if (data.success) setFormStudentCount(data.data?.length || 0)
    } catch {
      setFormStudentCount(null)
    }
  }

  const addTimeTableRow = () => {
    setFormTimeTable([...formTimeTable, { date: '', subject: '', startTime: '09:00', endTime: '12:00', duration: '3h' }])
  }

  const removeTimeTableRow = (idx: number) => {
    setFormTimeTable(formTimeTable.filter((_, i) => i !== idx))
  }

  const updateTimeTableRow = (idx: number, key: string, val: string) => {
    const updated = [...formTimeTable]
    updated[idx] = { ...updated[idx], [key]: val }
    if ((key === 'startTime' || key === 'endTime') && updated[idx].startTime && updated[idx].endTime) {
      updated[idx].duration = computeDuration(updated[idx].startTime, updated[idx].endTime)
    }
    setFormTimeTable(updated)
  }

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setGenerating(true)
    try {
      const res = await fetch('/api/admit-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({
          courseId: formCourse,
          batchId: formBatch,
          examName: formExamName,
          startDate: formStartDate,
          endDate: formEndDate,
          timeTable: formTimeTable,
        }),
      })
      const data = await res.json()
      if (data.success) {
        showToast('✅ Admit Cards & Time Table generated successfully!')
        setFormExamName('')
        setFormStartDate('')
        setFormEndDate('')
        setFormCourse('')
        setFormBatch('')
        setFormTimeTable([])
        setFormStudentCount(null)
        setShowGenerateForm(false)
        fetchData()
        if (data.data?.id) {
          openEvent(data.data)
        }
      } else {
        showToast('❌ ' + (data.error || 'Failed to generate admit cards'))
      }
    } catch (err) {
      console.error(err)
      showToast('❌ An error occurred while generating admit cards')
    }
    setGenerating(false)
  }

  const openEvent = async (e: any) => {
    setViewEvent(e)
    setModalLoading(true)
    try {
      const res = await fetch(`/api/admit-cards/${e.id}`, { headers })
      const data = await res.json()
      if (data.success) setEventDetails(data.data)
    } catch (err) {
      console.error(err)
    }
    setModalLoading(false)
  }

  const handleAction = async (action: string, studentIds: string[]) => {
    if (!viewEvent) return
    try {
      const res = await fetch(`/api/admit-cards/${viewEvent.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action, studentIds }),
      })
      const data = await res.json()
      if (data.success) {
        showToast(`✅ ${action.toUpperCase()} completed successfully`)
        openEvent(viewEvent)
        fetchData()
      } else {
        showToast('❌ ' + (data.error || 'Failed to update status'))
      }
    } catch (err) {
      console.error(err)
      showToast('❌ Network error')
    }
  }

  const publishAllEligible = async () => {
    if (!eventDetails) return
    const eligible = eventDetails.admitCards
      .filter((c: any) => !c.isPublished && (!c.isBlocked || c.superAdminApproved))
      .map((c: any) => c.studentId)
    if (eligible.length === 0) {
      showToast('⚠️ No eligible admit cards found to publish')
      return
    }
    await handleAction('publish', eligible)
  }

  const handleDeleteEvent = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete event "${name}"? All associated student admit cards will be removed.`)) return
    try {
      const res = await fetch(`/api/admit-cards/${id}`, {
        method: 'DELETE',
        headers,
      })
      const data = await res.json()
      if (data.success) {
        showToast('🗑️ Admit Card event deleted successfully')
        if (viewEvent?.id === id) {
          setViewEvent(null)
          setEventDetails(null)
        }
        fetchData()
      } else {
        showToast('❌ ' + (data.error || 'Failed to delete event'))
      }
    } catch {
      showToast('❌ Network error')
    }
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  const getStatusBadge = (card: any) => {
    if (card.isPublished) return { label: 'Published ✓', color: '#10b981', bg: 'rgba(16,185,129,0.15)' }
    if (card.isBlocked && !card.superAdminApproved) return { label: 'Blocked ✕', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' }
    if (card.isBlocked && card.superAdminApproved) return { label: 'Approved ✓', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' }
    return { label: 'Pending ⏱️', color: '#94a3b8', bg: 'rgba(148,163,184,0.15)' }
  }

  const stats = events.reduce((acc: any, e: any) => ({
    total: acc.total + (e._count?.admitCards || 0),
    events: acc.events + 1
  }), { total: 0, events: 0 })

  const filteredStudents = eventDetails?.admitCards?.filter((c: any) => {
    if (!searchStudent) return true
    const q = searchStudent.toLowerCase()
    return (
      c.student.fullName?.toLowerCase().includes(q) ||
      c.student.scholarNo?.toLowerCase().includes(q) ||
      c.student.fatherName?.toLowerCase().includes(q)
    )
  }) || []

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
            <span style={{ fontSize: '24px' }}>🎫</span>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              Admit Cards & Examination Hall Tickets
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Generate student admit cards, schedule attached exam timetables, approve dues, and publish real-time to Parent & Student portals.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <Link
            href="/dashboard/exam-timetable"
            style={{
              background: 'rgba(16,185,129,0.15)',
              border: '1px solid rgba(16,185,129,0.35)',
              borderRadius: '12px',
              padding: '10px 16px',
              color: '#10b981',
              fontSize: '13px',
              fontWeight: '700',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>📅</span> Exam Time Tables
          </Link>

          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            style={{
              background: showGenerateForm ? 'rgba(239,68,68,0.2)' : 'linear-gradient(135deg, #f43f5e, #e11d48)',
              border: showGenerateForm ? '1px solid rgba(239,68,68,0.4)' : 'none',
              borderRadius: '12px',
              padding: '10px 18px',
              color: 'white',
              fontSize: '13px',
              fontWeight: '800',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(244,63,94,0.35)'
            }}
          >
            <span>{showGenerateForm ? '✕' : '+'}</span>
            {showGenerateForm ? 'Close Generator' : 'Generate Admit Cards'}
          </button>
        </div>
      </div>

      {/* Stats Counter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Exam Events</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: 'var(--primary)', marginTop: '4px' }}>{stats.events}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Student Cards</div>
          <div style={{ fontSize: '26px', fontWeight: '800', color: '#10b981', marginTop: '4px' }}>{stats.total}</div>
        </div>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', padding: '16px 20px', borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active Tenant / Branch</div>
          <div style={{ fontSize: '15px', fontWeight: '800', color: '#a78bfa', marginTop: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tenant?.name || 'School Branch'}
          </div>
        </div>
      </div>

      {/* ── Generate Admit Cards Form ─────────────────────────────────────── */}
      {showGenerateForm && (
        <div style={{
          background: 'var(--surface)',
          border: '1px solid #f43f5e',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '22px' }}>🎫</span>
              <h2 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                Generate New Admit Cards with Attached Timetable
              </h2>
            </div>
            <span style={{ fontSize: '11px', color: '#f43f5e', background: 'rgba(244,63,94,0.15)', padding: '4px 10px', borderRadius: '20px', fontWeight: '700' }}>
              Publishes to Parent Portal
            </span>
          </div>

          <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Class & Section Selection */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Select Class / Course *
                </label>
                <select
                  value={formCourse}
                  onChange={e => handleFormCourseChange(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  required
                >
                  <option value="">-- Choose Class --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {formStudentCount !== null && (
                  <div style={{ fontSize: '12px', color: formStudentCount > 0 ? '#10b981' : '#ef4444', fontWeight: '700', marginTop: '6px' }}>
                    {formStudentCount > 0 ? `👥 ${formStudentCount} Active Students will receive this Admit Card` : '⚠️ No active students found in this class'}
                  </div>
                )}
              </div>

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                  Section / Batch (Optional)
                </label>
                <select
                  value={formBatch}
                  onChange={e => setFormBatch(e.target.value)}
                  className="input"
                  disabled={!formCourse}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', opacity: !formCourse ? 0.5 : 1 }}
                >
                  <option value="">
                    {batches.filter(b => b.courseId === formCourse).length > 0
                      ? '-- All Sections / Whole Class --'
                      : '-- Whole Class (No Sections) --'}
                  </option>
                  {batches.filter(b => b.courseId === formCourse).map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Exam Name */}
            <div>
              <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
                Exam Name / Hall Ticket Title *
              </label>
              <input
                type="text"
                placeholder="e.g. Mid Term Exam 2026 / Annual Examination"
                value={formExamName}
                onChange={e => setFormExamName(e.target.value)}
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
                  value={formStartDate}
                  onChange={e => setFormStartDate(e.target.value)}
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
                  value={formEndDate}
                  onChange={e => setFormEndDate(e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
                  required
                />
              </div>
            </div>

            {/* Attached Exam Time Table Schedule Builder */}
            <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    📋 Attached Examination Time Table ({formTimeTable.length} papers added)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Format requirement: This timetable appears directly below each student's admit card.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addTimeTableRow}
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

              {formTimeTable.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px', fontSize: '13px' }}>
                  Click <strong>"+ Add Subject"</strong> to attach exam dates and times to this admit card.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {formTimeTable.map((row, idx) => (
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
                          onChange={e => updateTimeTableRow(idx, 'date', e.target.value)}
                          className="input"
                          style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                          required
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Subject *</label>
                        <input
                          type="text"
                          placeholder="e.g. Mathematics"
                          value={row.subject}
                          onChange={e => updateTimeTableRow(idx, 'subject', e.target.value)}
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
                          onChange={e => updateTimeTableRow(idx, 'startTime', e.target.value)}
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
                          onChange={e => updateTimeTableRow(idx, 'endTime', e.target.value)}
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
                        onClick={() => removeTimeTableRow(idx)}
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
              disabled={generating}
              style={{
                background: 'linear-gradient(135deg, #f43f5e, #e11d48)',
                color: 'white',
                border: 'none',
                padding: '14px',
                borderRadius: '12px',
                fontWeight: '800',
                fontSize: '14px',
                cursor: generating ? 'not-allowed' : 'pointer',
                opacity: generating ? 0.7 : 1,
                boxShadow: '0 4px 16px rgba(244,63,94,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {generating ? '⏳ Generating Admit Cards for Class...' : '🚀 Generate Admit Cards & Publish Schedule'}
            </button>
          </form>
        </div>
      )}

      {/* Class & Section Filters */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select
          value={filterCourse}
          onChange={e => { setFilterCourse(e.target.value); setFilterBatch('') }}
          className="input"
          style={{ minWidth: '180px', padding: '10px 14px', borderRadius: '10px' }}
        >
          <option value="">All Classes</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterBatch}
          onChange={e => setFilterBatch(e.target.value)}
          className="input"
          disabled={!filterCourse}
          style={{ minWidth: '180px', padding: '10px 14px', borderRadius: '10px', opacity: !filterCourse ? 0.5 : 1 }}
        >
          <option value="">All Sections</option>
          {batches.filter(b => !filterCourse || b.courseId === filterCourse).map(b => (
            <option key={b.id} value={b.id}>{b.name}</option>
          ))}
        </select>

        {(filterCourse || filterBatch) && (
          <button
            onClick={() => { setFilterCourse(''); setFilterBatch('') }}
            style={{ background: 'none', border: 'none', color: '#a78bfa', fontSize: '12px', cursor: 'pointer', fontWeight: '700' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* ── Events Grid ─────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading admit cards...</div>
      ) : events.length === 0 ? (
        <div style={{ background: 'var(--surface-2)', border: '1px dashed var(--border)', borderRadius: '16px', padding: '40px', textAlign: 'center' }}>
          <div style={{ fontSize: '42px', marginBottom: '10px' }}>🎫</div>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>No Admit Card Events Found</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '6px 0 16px' }}>
            Generate admit cards above to enable student examination hall tickets with timetable.
          </p>
          <button
            onClick={() => setShowGenerateForm(true)}
            style={{ background: '#f43f5e', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 18px', fontWeight: '700', cursor: 'pointer' }}
          >
            + Generate First Admit Card Event
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {events.map((e: any) => (
            <div
              key={e.id}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '16px',
                padding: '18px 20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '12px',
                transition: 'all 0.2s',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    {e.examName}
                  </div>
                  <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.15)', padding: '4px 8px', borderRadius: '20px', fontWeight: '700', whiteSpace: 'nowrap' }}>
                    {e._count?.admitCards || 0} Cards
                  </span>
                </div>

                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '6px', color: '#a78bfa', fontWeight: '600' }}>
                    📚 {e.course?.name}{e.batch?.name ? ` · ${e.batch.name}` : ''}
                  </span>
                  <span style={{ background: 'var(--surface)', padding: '2px 8px', borderRadius: '6px' }}>
                    📅 {fmtDate(e.startDate)} → {fmtDate(e.endDate)}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <button
                  onClick={() => openEvent(e)}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px'
                  }}
                >
                  👁️ Manage & Publish
                </button>

                <button
                  onClick={() => handleDeleteEvent(e.id, e.examName)}
                  style={{
                    background: 'rgba(239,68,68,0.1)',
                    border: '1px solid rgba(239,68,68,0.25)',
                    color: '#ef4444',
                    borderRadius: '10px',
                    padding: '9px 12px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    fontWeight: '700'
                  }}
                  title="Delete event"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Event Details & Manage Modal ─────────────────────────────────── */}
      {viewEvent && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: 'var(--surface)',
            width: '100%',
            maxWidth: '920px',
            maxHeight: '92vh',
            borderRadius: '20px',
            border: '1px solid var(--border)',
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              background: 'var(--surface-2)'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '20px' }}>🎫</span>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
                    {viewEvent.examName}
                  </h2>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {viewEvent.course?.name}{viewEvent.batch?.name ? ` · ${viewEvent.batch.name}` : ''} &nbsp;·&nbsp;
                  {fmtDate(viewEvent.startDate)} → {fmtDate(viewEvent.endDate)}
                </div>
              </div>

              {/* Action Buttons in Modal Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                {eventDetails && (
                  <>
                    <button
                      onClick={() => printCardsWindow(eventDetails, tenant)}
                      style={{
                        background: 'linear-gradient(135deg, #1e3a8a, #2563eb)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🖨️ Print All Cards
                    </button>

                    <button
                      onClick={publishAllEligible}
                      style={{
                        background: 'linear-gradient(135deg, #10b981, #059669)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: '800',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      🚀 Publish All Eligible
                    </button>
                  </>
                )}

                <button
                  onClick={() => { setViewEvent(null); setEventDetails(null); setSearchStudent('') }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    fontSize: '24px',
                    cursor: 'pointer',
                    lineHeight: 1,
                    padding: '4px'
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {modalLoading ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading student cards...</div>
              ) : !eventDetails ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Failed to load event details.</div>
              ) : (
                <>
                  {/* Attached Exam Timetable Banner */}
                  {Array.isArray(eventDetails.timeTable) && eventDetails.timeTable.length > 0 && (
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '14px', padding: '14px 16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          📋 Attached Exam Timetable (Printed below each student's admit card)
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{eventDetails.timeTable.length} Subjects</span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead>
                            <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Date</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Subject</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Time</th>
                              <th style={{ padding: '6px 10px', textAlign: 'left', color: 'var(--text-muted)' }}>Duration</th>
                            </tr>
                          </thead>
                          <tbody>
                            {eventDetails.timeTable.map((t: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '6px 10px', fontWeight: '700', color: 'var(--text-primary)' }}>{fmtDate(t.date)}</td>
                                <td style={{ padding: '6px 10px', color: '#a78bfa' }}>{t.subject}</td>
                                <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{fmtTime(t.startTime)} — {fmtTime(t.endTime)}</td>
                                <td style={{ padding: '6px 10px', color: '#10b981' }}>{t.duration || computeDuration(t.startTime, t.endTime) || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Search Bar & Stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <input
                      type="text"
                      placeholder="🔍 Search student name, roll / scholar no..."
                      value={searchStudent}
                      onChange={e => setSearchStudent(e.target.value)}
                      className="input"
                      style={{ flex: 1, minWidth: '220px', padding: '10px 14px', borderRadius: '10px' }}
                    />
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>
                      Showing {filteredStudents.length} of {eventDetails.admitCards?.length || 0} students
                    </div>
                  </div>

                  {/* Student Cards List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {filteredStudents.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No matching students found.</div>
                    ) : (
                      filteredStudents.map((card: any) => {
                        const status = getStatusBadge(card)
                        return (
                          <div
                            key={card.id}
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border)',
                              padding: '12px 16px',
                              borderRadius: '14px',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              flexWrap: 'wrap',
                              gap: '12px'
                            }}
                          >
                            {/* Student Profile Info */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{
                                width: '44px',
                                height: '44px',
                                borderRadius: '10px',
                                background: 'var(--surface)',
                                border: '1.5px solid var(--border)',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0
                              }}>
                                {card.student.photo ? (
                                  <img src={card.student.photo} alt={card.student.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: '20px' }}>👤</span>
                                )}
                              </div>
                              <div>
                                <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                                  {card.student.fullName}
                                </div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  <span>Scholar No: <strong>{card.student.scholarNo || 'N/A'}</strong></span>
                                  {card.student.fatherName && <span>Father: {card.student.fatherName}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Status & Actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                              <span style={{
                                fontSize: '11px',
                                color: status.color,
                                background: status.bg,
                                padding: '4px 10px',
                                borderRadius: '20px',
                                fontWeight: '800',
                                whiteSpace: 'nowrap'
                              }}>
                                {status.label}
                              </span>

                              {/* Super Admin Approve blocked student */}
                              {card.isBlocked && !card.superAdminApproved && (user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN') && (
                                <button
                                  onClick={() => handleAction('approve', [card.studentId])}
                                  style={{
                                    background: '#f59e0b',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                  }}
                                  title="Super Admin override for fee dues/block"
                                >
                                  ⚡ Approve
                                </button>
                              )}

                              {/* Publish Single Card */}
                              {!card.isPublished && (!card.isBlocked || card.superAdminApproved) && (
                                <button
                                  onClick={() => handleAction('publish', [card.studentId])}
                                  style={{
                                    background: '#10b981',
                                    color: 'white',
                                    border: 'none',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '800',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Publish
                                </button>
                              )}

                              {/* Block / Unblock Toggle */}
                              {!card.isPublished && (
                                <button
                                  onClick={() => handleAction(card.isBlocked ? 'unblock' : 'block', [card.studentId])}
                                  style={{
                                    background: card.isBlocked ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                    color: card.isBlocked ? '#10b981' : '#ef4444',
                                    border: `1px solid ${card.isBlocked ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {card.isBlocked ? 'Unblock' : 'Block'}
                                </button>
                              )}

                              {/* Print Individual Card */}
                              <button
                                onClick={() => printCardsWindow(eventDetails, tenant, card)}
                                style={{
                                  background: 'var(--surface)',
                                  border: '1px solid var(--border)',
                                  color: 'var(--text-primary)',
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  fontSize: '11px',
                                  fontWeight: '700',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🖨️ Print Card
                              </button>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function DashboardAdmitCards() {
  return (
    <Suspense fallback={<div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>}>
      <DashboardAdmitCardsContent />
    </Suspense>
  )
}
