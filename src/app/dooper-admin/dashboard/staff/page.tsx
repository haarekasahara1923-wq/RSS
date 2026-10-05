'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

/* ─── Types ─────────────────────────────────────────────── */
interface StaffMember {
  id: string
  name: string
  email: string | null
  phone: string
  subject: string[]
  salary: number
  joinDate: string
  photo: string | null
  isActive: boolean
  createdAt: string
  tenantId: string
  tenant: { id: string; name: string; schoolCode: string | null; isActive: boolean }
  _count: { leaveApplications: number; timeTables: number; attendances: number }
}

interface LeaveRecord {
  id: string
  teacherId: string
  tenantId: string
  startDate: string
  endDate: string
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  teacher: { id: string; name: string; phone: string; photo: string | null }
  tenant: { id: string; name: string; schoolCode: string | null }
}

interface TimetableRecord {
  id: string
  teacherId: string
  tenantId: string
  subject: string
  dayOfWeek: number
  startTime: string
  endTime: string
  status: string
  createdAt: string
  teacher: { id: string; name: string; photo: string | null }
  tenant: { id: string; name: string; schoolCode: string | null }
  course: { id: string; name: string } | null
  batch: { id: string; name: string } | null
}

interface StaffStats {
  totalStaff: number
  activeStaff: number
  inactiveStaff: number
  totalSchoolsWithStaff: number
}

type Tab = 'staff' | 'leaves' | 'timetable'
type ModalType = 'edit' | 'delete' | 'view' | null

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/* ─── Component ─────────────────────────────────────────── */
export default function DooperStaffPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [admin, setAdmin] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<Tab>('staff')

  // Staff state
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [staffStats, setStaffStats] = useState<StaffStats>({ totalStaff: 0, activeStaff: 0, inactiveStaff: 0, totalSchoolsWithStaff: 0 })
  const [leaves, setLeaves] = useState<LeaveRecord[]>([])
  const [timetables, setTimetables] = useState<TimetableRecord[]>([])

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterSchool, setFilterSchool] = useState('all')
  const [message, setMessage] = useState({ text: '', type: 'success' as 'success' | 'error' })

  // Modal
  const [modal, setModal] = useState<ModalType>(null)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [actionLoading, setActionLoading] = useState(false)

  /* ─── Auth ───────────────────────────────────────────── */
  useEffect(() => {
    const t = localStorage.getItem('dooper_token')
    const a = localStorage.getItem('dooper_admin')
    if (!t) { router.replace('/dooper-admin'); return }
    setToken(t)
    if (a) setAdmin(JSON.parse(a))
  }, [router])

  /* ─── Fetch helpers ──────────────────────────────────── */
  const fetchStaff = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/dooper-admin/staff?type=staff', { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401) { localStorage.removeItem('dooper_token'); router.replace('/dooper-admin'); return }
      const data = await res.json()
      if (data.success) { setStaff(data.staff || []); setStaffStats(data.stats || {}) }
    } catch { }
    setLoading(false)
  }, [token, router])

  const fetchLeaves = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/dooper-admin/staff?type=leaves', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setLeaves(data.leaves || [])
    } catch { }
    setLoading(false)
  }, [token])

  const fetchTimetable = useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch('/api/dooper-admin/staff?type=timetable', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) setTimetables(data.timetables || [])
    } catch { }
    setLoading(false)
  }, [token])

  useEffect(() => {
    if (!token) return
    if (activeTab === 'staff') fetchStaff()
    else if (activeTab === 'leaves') fetchLeaves()
    else if (activeTab === 'timetable') fetchTimetable()
  }, [token, activeTab, fetchStaff, fetchLeaves, fetchTimetable])

  /* ─── Actions ────────────────────────────────────────── */
  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMessage({ text, type })
    setTimeout(() => setMessage({ text: '', type: 'success' }), 3500)
  }

  const callApi = async (method: string, url: string, body?: any) => {
    setActionLoading(true)
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        ...(body ? { body: JSON.stringify(body) } : {})
      })
      const data = await res.json()
      setActionLoading(false)
      return data
    } catch {
      setActionLoading(false)
      return { success: false, error: 'Network error' }
    }
  }

  const handleBlockToggle = async (s: StaffMember) => {
    if (!confirm(`${s.isActive ? 'Block' : 'Unblock'} "${s.name}"?`)) return
    const data = await callApi('PATCH', '/api/dooper-admin/staff', { id: s.id, action: s.isActive ? 'block' : 'unblock' })
    if (data.success) { showMsg(data.message); fetchStaff() }
    else showMsg(data.error || 'Failed', 'error')
  }

  const handleDeleteStaff = async () => {
    if (!selectedStaff) return
    const data = await callApi('DELETE', `/api/dooper-admin/staff?id=${selectedStaff.id}`)
    if (data.success) { showMsg(data.message); setModal(null); fetchStaff() }
    else showMsg(data.error || 'Failed to delete', 'error')
  }

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return
    const data = await callApi('PUT', '/api/dooper-admin/staff', { id: selectedStaff.id, ...editForm })
    if (data.success) { showMsg(data.message); setModal(null); fetchStaff() }
    else showMsg(data.error || 'Failed to update', 'error')
  }

  const handleLeaveAction = async (id: string, action: 'approve_leave' | 'reject_leave') => {
    const data = await callApi('PATCH', '/api/dooper-admin/staff', { id, action })
    if (data.success) { showMsg(data.message); fetchLeaves() }
    else showMsg(data.error || 'Failed', 'error')
  }

  const handleTimetableAction = async (id: string, action: 'approve_timetable' | 'reject_timetable') => {
    const data = await callApi('PATCH', '/api/dooper-admin/staff', { id, action })
    if (data.success) { showMsg(data.message); fetchTimetable() }
    else showMsg(data.error || 'Failed', 'error')
  }

  const openEdit = (s: StaffMember) => {
    setSelectedStaff(s)
    setEditForm({
      name: s.name,
      email: s.email || '',
      phone: s.phone,
      subject: s.subject.join(', '),
      salary: s.salary,
      joinDate: s.joinDate ? s.joinDate.split('T')[0] : '',
    })
    setModal('edit')
  }

  /* ─── Filtered data ──────────────────────────────────── */
  const allSchools = [...new Map(staff.map(s => [s.tenant.id, s.tenant])).values()]

  const filteredStaff = staff.filter(s => {
    const q = search.toLowerCase()
    const matchSearch = s.name.toLowerCase().includes(q) || s.phone.includes(q) || (s.email || '').toLowerCase().includes(q) || s.tenant.name.toLowerCase().includes(q)
    const matchSchool = filterSchool === 'all' || s.tenantId === filterSchool
    return matchSearch && matchSchool
  })

  const filteredLeaves = leaves.filter(l => {
    const q = search.toLowerCase()
    return l.teacher.name.toLowerCase().includes(q) || l.tenant.name.toLowerCase().includes(q)
  })

  const filteredTimetables = timetables.filter(t => {
    const q = search.toLowerCase()
    return t.teacher.name.toLowerCase().includes(q) || t.tenant.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
  })

  /* ─── Styles ─────────────────────────────────────────── */
  const s = {
    page: { minHeight: '100vh', background: '#04030a', color: 'white', fontFamily: "'Inter', sans-serif" } as const,
    header: { position: 'sticky' as const, top: 0, zIndex: 100, background: 'rgba(4,3,10,0.95)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(220,38,38,0.15)', padding: '0 24px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    main: { padding: '28px 24px', maxWidth: '1500px', margin: '0 auto' },
    statCard: (color: string) => ({ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}25`, borderRadius: '14px', padding: '20px', borderLeft: `3px solid ${color}` }),
    tab: (active: boolean) => ({ padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: 'none', background: active ? 'linear-gradient(135deg,#dc2626,#991b1b)' : 'rgba(255,255,255,0.05)', color: active ? 'white' : 'rgba(255,255,255,0.5)', transition: 'all 0.2s' }),
    input: { padding: '8px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit' },
    btn: (color: string, bg: string, border: string) => ({ padding: '5px 10px', background: bg, border: `1px solid ${border}`, borderRadius: '6px', color, fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' as const }),
    badge: (active: boolean) => ({ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: active ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', color: active ? '#34d399' : '#f87171', border: `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }),
    modalOverlay: { position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' },
    modalBox: { background: '#0d0b14', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '18px', padding: '28px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' as const },
    formInput: { width: '100%', padding: '10px 12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' as const },
    th: { padding: '10px 14px', textAlign: 'left' as const, fontSize: '11px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' as const, letterSpacing: '0.8px', background: 'rgba(220,38,38,0.06)', borderBottom: '1px solid rgba(220,38,38,0.15)', whiteSpace: 'nowrap' as const },
    td: { padding: '13px 14px', fontSize: '13px', borderBottom: '1px solid rgba(255,255,255,0.04)', verticalAlign: 'middle' as const },
  }

  /* ─── Render ─────────────────────────────────────────── */
  return (
    <div style={s.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        tr:hover td { background: rgba(220,38,38,0.03); }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(-8px); } to { opacity:1; transform:translateY(0); } }
        select option { background: #1a1525; }
      `}</style>

      {/* ── Header ── */}
      <header style={s.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button onClick={() => router.push('/dooper-admin/dashboard')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'rgba(255,255,255,0.7)', padding: '6px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
            ← Back
          </button>
          <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>👥</div>
          <div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: 'white', lineHeight: 1 }}>All Staff</div>
            <div style={{ fontSize: '10px', color: '#f87171', fontWeight: '600', letterSpacing: '1px' }}>DOOPER ADMIN · STAFF MANAGEMENT</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {message.text && (
            <div style={{ padding: '6px 14px', background: message.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, borderRadius: '8px', fontSize: '12px', color: message.type === 'success' ? '#34d399' : '#f87171', animation: 'fadeIn 0.3s ease' }}>
              {message.type === 'success' ? '✅' : '⚠️'} {message.text}
            </div>
          )}
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>👤 {admin?.name || 'Admin'}</div>
          <button onClick={() => { localStorage.removeItem('dooper_token'); router.push('/dooper-admin') }}
            style={{ padding: '7px 14px', background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '8px', color: '#f87171', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>
            🚪 Logout
          </button>
        </div>
      </header>

      <main style={s.main}>
        {/* ── Stats Row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {[
            { label: 'Total Staff', value: staffStats.totalStaff, icon: '👥', color: '#a78bfa' },
            { label: 'Active Staff', value: staffStats.activeStaff, icon: '✅', color: '#34d399' },
            { label: 'Inactive Staff', value: staffStats.inactiveStaff, icon: '⛔', color: '#f87171' },
            { label: 'Schools with Staff', value: staffStats.totalSchoolsWithStaff, icon: '🏫', color: '#fbbf24' },
            { label: 'Leave Requests', value: leaves.filter(l => l.status === 'PENDING').length, icon: '📋', color: '#38bdf8' },
            { label: 'Pending Timetables', value: timetables.filter(t => t.status === 'PENDING_APPROVAL').length, icon: '📅', color: '#fb923c' },
          ].map(item => (
            <div key={item.label} style={s.statCard(item.color)}>
              <div style={{ fontSize: '24px', marginBottom: '4px' }}>{item.icon}</div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: item.color, lineHeight: 1 }}>{item.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '3px', fontWeight: '600' }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {(['staff', 'leaves', 'timetable'] as Tab[]).map(tab => (
            <button key={tab} style={s.tab(activeTab === tab)} onClick={() => { setActiveTab(tab); setSearch('') }}>
              {tab === 'staff' ? '👥 All Staff' : tab === 'leaves' ? '📋 Leave Requests' : '📅 Timetables'}
              {tab === 'leaves' && leaves.filter(l => l.status === 'PENDING').length > 0 && (
                <span style={{ marginLeft: '6px', background: '#dc2626', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                  {leaves.filter(l => l.status === 'PENDING').length}
                </span>
              )}
              {tab === 'timetable' && timetables.filter(t => t.status === 'PENDING_APPROVAL').length > 0 && (
                <span style={{ marginLeft: '6px', background: '#dc2626', borderRadius: '10px', padding: '1px 6px', fontSize: '10px' }}>
                  {timetables.filter(t => t.status === 'PENDING_APPROVAL').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Table Card ── */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(220,38,38,0.15)', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Table header controls */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(220,38,38,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <h2 style={{ fontWeight: '800', fontSize: '16px', color: 'white' }}>
                {activeTab === 'staff' ? '👥 All Staff Members' : activeTab === 'leaves' ? '📋 Leave Applications' : '📅 Timetable Submissions'}
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
                {activeTab === 'staff' ? `${filteredStaff.length} staff across all schools` : activeTab === 'leaves' ? `${filteredLeaves.length} leave applications` : `${filteredTimetables.length} timetable entries`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
              {activeTab === 'staff' && (
                <select value={filterSchool} onChange={e => setFilterSchool(e.target.value)} style={{ ...s.input, padding: '8px 12px' }}>
                  <option value="all">All Schools</option>
                  {allSchools.map(sch => <option key={sch.id} value={sch.id}>{sch.name}</option>)}
                </select>
              )}
              <input placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} style={{ ...s.input, width: '220px' }} />
              <button onClick={() => activeTab === 'staff' ? fetchStaff() : activeTab === 'leaves' ? fetchLeaves() : fetchTimetable()} style={s.btn('#f87171', 'rgba(220,38,38,0.1)', 'rgba(220,38,38,0.3)')}>
                🔄 Refresh
              </button>
            </div>
          </div>

          {/* ═══ STAFF TABLE ═══ */}
          {activeTab === 'staff' && (
            loading ? <LoadingSpinner text="Loading staff..." /> : filteredStaff.length === 0 ? <EmptyState text={search ? 'No staff matching search' : 'No staff registered yet'} /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1100px' }}>
                  <thead>
                    <tr>
                      {['#', 'Staff Member', 'School', 'Phone / Email', 'Subjects', 'Salary', 'Join Date', 'Status', 'Stats', 'Actions'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((m, i) => (
                      <tr key={m.id}>
                        <td style={{ ...s.td, color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{i + 1}</td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg,#dc2626,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: '800', flexShrink: 0 }}>
                              {m.photo ? <img src={m.photo} alt="" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} /> : m.name[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: '700', color: 'white', fontSize: '13px' }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>ID: {m.id.slice(-8)}</div>
                            </div>
                          </div>
                        </td>
                        <td style={s.td}>
                          <div style={{ fontWeight: '700', color: '#e2e8f0', fontSize: '12px' }}>{m.tenant.name}</div>
                          {m.tenant.schoolCode && <div style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace', fontWeight: '800' }}>{m.tenant.schoolCode}</div>}
                        </td>
                        <td style={s.td}>
                          <div style={{ color: '#a5b4fc', fontWeight: '600', fontSize: '12px' }}>{m.phone}</div>
                          {m.email && <div style={{ color: '#7dd3fc', fontSize: '11px' }}>{m.email}</div>}
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '160px' }}>
                            {m.subject.slice(0, 3).map(sub => (
                              <span key={sub} style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', color: '#c4b5fd', fontWeight: '600' }}>{sub}</span>
                            ))}
                            {m.subject.length > 3 && <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>+{m.subject.length - 3}</span>}
                          </div>
                        </td>
                        <td style={{ ...s.td, color: '#34d399', fontWeight: '700' }}>₹{m.salary.toLocaleString('en-IN')}</td>
                        <td style={{ ...s.td, fontSize: '12px', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap' }}>
                          {new Date(m.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>
                        <td style={s.td}><span style={s.badge(m.isActive)}>{m.isActive ? '● Active' : '⛔ Blocked'}</span></td>
                        <td style={s.td}>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                            <div>📋 {m._count.leaveApplications} leaves</div>
                            <div>📅 {m._count.timeTables} timetables</div>
                          </div>
                        </td>
                        <td style={s.td}>
                          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                            <button onClick={() => openEdit(m)} style={s.btn('#a5b4fc', 'rgba(99,102,241,0.15)', 'rgba(99,102,241,0.3)')}>✏️ Edit</button>
                            <button onClick={() => handleBlockToggle(m)} disabled={actionLoading} style={s.btn(m.isActive ? '#f87171' : '#34d399', m.isActive ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', m.isActive ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)')}>
                              {m.isActive ? '⛔ Block' : '🟢 Unblock'}
                            </button>
                            <button onClick={() => { setSelectedStaff(m); setModal('delete') }} style={s.btn('#f87171', 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.25)')}>🗑️ Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ═══ LEAVES TABLE ═══ */}
          {activeTab === 'leaves' && (
            loading ? <LoadingSpinner text="Loading leaves..." /> : filteredLeaves.length === 0 ? <EmptyState text="No leave applications found" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr>
                      {['#', 'Staff Member', 'School', 'Duration', 'Reason', 'Applied On', 'Status', 'Actions'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeaves.map((l, i) => {
                      const days = Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1
                      const statusColor = l.status === 'APPROVED' ? { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' } : l.status === 'REJECTED' ? { bg: 'rgba(239,68,68,0.15)', color: '#f87171', border: 'rgba(239,68,68,0.3)' } : { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' }
                      return (
                        <tr key={l.id}>
                          <td style={{ ...s.td, color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{i + 1}</td>
                          <td style={s.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg,#7c3aed,#dc2626)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '800', flexShrink: 0 }}>
                                {l.teacher.photo ? <img src={l.teacher.photo} alt="" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} /> : l.teacher.name[0]}
                              </div>
                              <div>
                                <div style={{ fontWeight: '700', fontSize: '13px' }}>{l.teacher.name}</div>
                                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>{l.teacher.phone}</div>
                              </div>
                            </div>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: '600', fontSize: '12px', color: '#e2e8f0' }}>{l.tenant.name}</div>
                            {l.tenant.schoolCode && <div style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace', fontWeight: '800' }}>{l.tenant.schoolCode}</div>}
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: '600', fontSize: '12px', color: '#a5b4fc' }}>{new Date(l.startDate).toLocaleDateString('en-IN')} → {new Date(l.endDate).toLocaleDateString('en-IN')}</div>
                            <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: '700' }}>{days} day{days !== 1 ? 's' : ''}</div>
                          </td>
                          <td style={{ ...s.td, maxWidth: '200px' }}>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: '1.4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</div>
                          </td>
                          <td style={{ ...s.td, fontSize: '12px', color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap' }}>
                            {new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                          <td style={s.td}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: statusColor.bg, color: statusColor.color, border: `1px solid ${statusColor.border}` }}>
                              {l.status === 'PENDING' ? '⏳ Pending' : l.status === 'APPROVED' ? '✅ Approved' : '❌ Rejected'}
                            </span>
                          </td>
                          <td style={s.td}>
                            {l.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => handleLeaveAction(l.id, 'approve_leave')} disabled={actionLoading} style={s.btn('white', 'rgba(16,185,129,0.8)', 'rgba(16,185,129,0.5)')}>✅ Approve</button>
                                <button onClick={() => handleLeaveAction(l.id, 'reject_leave')} disabled={actionLoading} style={s.btn('white', 'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.4)')}>❌ Reject</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>Resolved</span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ═══ TIMETABLE TABLE ═══ */}
          {activeTab === 'timetable' && (
            loading ? <LoadingSpinner text="Loading timetables..." /> : filteredTimetables.length === 0 ? <EmptyState text="No timetable entries found" /> : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
                  <thead>
                    <tr>
                      {['#', 'Staff Member', 'School', 'Day & Time', 'Class / Batch', 'Subject', 'Status', 'Actions'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTimetables.map((t, i) => {
                      const statusColor = t.status === 'PUBLISHED' ? { bg: 'rgba(16,185,129,0.15)', color: '#34d399', border: 'rgba(16,185,129,0.3)' } : t.status === 'PENDING_APPROVAL' ? { bg: 'rgba(251,191,36,0.15)', color: '#fbbf24', border: 'rgba(251,191,36,0.3)' } : { bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', border: 'rgba(255,255,255,0.1)' }
                      return (
                        <tr key={t.id}>
                          <td style={{ ...s.td, color: 'rgba(255,255,255,0.3)', fontWeight: '600' }}>{i + 1}</td>
                          <td style={s.td}>
                            <div style={{ fontWeight: '700', fontSize: '13px' }}>{t.teacher.name}</div>
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: '600', fontSize: '12px', color: '#e2e8f0' }}>{t.tenant.name}</div>
                            {t.tenant.schoolCode && <div style={{ fontSize: '10px', color: '#fbbf24', fontFamily: 'monospace', fontWeight: '800' }}>{t.tenant.schoolCode}</div>}
                          </td>
                          <td style={s.td}>
                            <div style={{ fontWeight: '700', color: '#a5b4fc', fontSize: '13px' }}>{DAYS[t.dayOfWeek]}</div>
                            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>{t.startTime} – {t.endTime}</div>
                          </td>
                          <td style={{ ...s.td, fontSize: '12px', color: 'rgba(255,255,255,0.6)' }}>
                            {t.course?.name || '—'} / {t.batch?.name || '—'}
                          </td>
                          <td style={s.td}>
                            <span style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', borderRadius: '6px', padding: '3px 8px', fontSize: '12px', color: '#c4b5fd', fontWeight: '600' }}>{t.subject}</span>
                          </td>
                          <td style={s.td}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: statusColor.bg, color: statusColor.color, border: `1px solid ${statusColor.border}` }}>
                              {t.status === 'PUBLISHED' ? '✅ Published' : t.status === 'PENDING_APPROVAL' ? '⏳ Pending' : '📝 Draft'}
                            </span>
                          </td>
                          <td style={s.td}>
                            {t.status === 'PENDING_APPROVAL' ? (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button onClick={() => handleTimetableAction(t.id, 'approve_timetable')} disabled={actionLoading} style={s.btn('white', 'rgba(16,185,129,0.8)', 'rgba(16,185,129,0.5)')}>✅ Approve</button>
                                <button onClick={() => handleTimetableAction(t.id, 'reject_timetable')} disabled={actionLoading} style={s.btn('white', 'rgba(239,68,68,0.7)', 'rgba(239,68,68,0.4)')}>❌ Reject</button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                                {t.status === 'PUBLISHED' ? 'Published' : 'Draft'}
                              </span>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </main>

      {/* ══ Edit Modal ══ */}
      {modal === 'edit' && selectedStaff && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={s.modalBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <h3 style={{ fontWeight: '800', fontSize: '17px' }}>✏️ Edit Staff — {selectedStaff.name}</h3>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '20px' }}>✕</button>
            </div>
            <form onSubmit={handleEditSubmit}>
              <div style={{ display: 'grid', gap: '14px' }}>
                {[
                  { label: 'Full Name *', key: 'name', required: true },
                  { label: 'Email', key: 'email' },
                  { label: 'Phone *', key: 'phone', required: true },
                  { label: 'Subjects (comma separated)', key: 'subject' },
                  { label: 'Salary (₹)', key: 'salary', type: 'number' },
                  { label: 'Join Date', key: 'joinDate', type: 'date' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>{f.label}</label>
                    <input required={f.required} type={f.type || 'text'} value={editForm[f.key] || ''} onChange={e => setEditForm((p: any) => ({ ...p, [f.key]: e.target.value }))} style={s.formInput} />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, padding: '11px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', cursor: 'pointer', fontWeight: '600' }}>
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} style={{ flex: 2, padding: '11px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer' }}>
                  {actionLoading ? 'Saving...' : '✅ Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══ Delete Modal ══ */}
      {modal === 'delete' && selectedStaff && (
        <div style={s.modalOverlay} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ ...s.modalBox, maxWidth: '440px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
            <h3 style={{ fontWeight: '900', fontSize: '19px', color: '#f87171', marginBottom: '8px' }}>Delete Staff Member?</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
              You are about to permanently delete <strong style={{ color: 'white' }}>{selectedStaff.name}</strong> from <strong style={{ color: '#fbbf24' }}>{selectedStaff.tenant.name}</strong>. All their leaves, timetables and records will be removed.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModal(null)} style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', color: 'rgba(255,255,255,0.6)', fontSize: '14px', cursor: 'pointer', fontWeight: '600' }}>Cancel</button>
              <button onClick={handleDeleteStaff} disabled={actionLoading} style={{ flex: 1, padding: '12px', background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
                {actionLoading ? 'Deleting...' : '🗑️ Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Helpers ────────────────────────────────────────────── */
function LoadingSpinner({ text }: { text: string }) {
  return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid rgba(220,38,38,0.2)', borderTopColor: '#dc2626', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
      {text}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: '60px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>
      👥 {text}
    </div>
  )
}
