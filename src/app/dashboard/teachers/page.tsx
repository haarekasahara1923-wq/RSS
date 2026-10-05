'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

/* ═══════════════════════════════════════════════
   Types
═══════════════════════════════════════════════ */
interface Teacher {
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
}
interface Leave {
    id: string
    teacherId: string
    startDate: string
    endDate: string
    reason: string
    status: 'PENDING' | 'APPROVED' | 'REJECTED'
    createdAt: string
    teacher: { id: string; name: string; photo: string | null }
}
interface Timetable {
    id: string
    teacherId: string
    courseId: string | null
    batchId: string | null
    subject: string
    dayOfWeek: number
    startTime: string
    endTime: string
    status: string
    teacher: { id: string; name: string }
    course: { id: string; name: string } | null
    batch: { id: string; name: string } | null
}
interface AttendanceRecord {
    id: string
    teacherId: string
    date: string
    status: string
    inTime: string | null
    outTime: string | null
    notes: string | null
    teacher: { id: string; name: string; photo: string | null }
}
interface SalaryLedger {
    id: string
    teacherId: string
    month: number
    year: number
    baseSalary: number
    deductions: number
    netPayable: number
    status: 'PAID' | 'UNPAID'
    paidDate: string | null
    teacher: { id: string; name: string; salary: number }
}
interface Batch { id: string; name: string }
interface Course { id: string; name: string }

type Tab = 'staff' | 'attendance' | 'leaves' | 'timetable' | 'salary'
type Modal = 'addStaff' | 'editStaff' | 'deleteStaff' | 'addTimetable' | 'viewLeave' | null

const DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const MONTHS = ['', 'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/* ═══════════════════════════════════════════════
   Component
═══════════════════════════════════════════════ */
export default function StaffManagementPage() {
    const { token, user } = useAuth()
    const isSuperAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN'

    // ── Core data ──────────────────────────────
    const [staff, setStaff] = useState<Teacher[]>([])
    const [leaves, setLeaves] = useState<Leave[]>([])
    const [timetables, setTimetables] = useState<Timetable[]>([])
    const [attendances, setAttendances] = useState<AttendanceRecord[]>([])
    const [salaryLedger, setSalaryLedger] = useState<SalaryLedger[]>([])
    const [batches, setBatches] = useState<Batch[]>([])
    const [courses, setCourses] = useState<Course[]>([])

    // ── UI state ───────────────────────────────
    const [activeTab, setActiveTab] = useState<Tab>('staff')
    const [loading, setLoading] = useState(false)
    const [modal, setModal] = useState<Modal>(null)
    const [search, setSearch] = useState('')
    const [actionLoading, setActionLoading] = useState(false)
    const [toast, setToast] = useState({ text: '', type: 'success' as 'success' | 'error' })

    // ── Selected / Form state ──────────────────
    const [selectedStaff, setSelectedStaff] = useState<Teacher | null>(null)
    const [selectedLeave, setSelectedLeave] = useState<Leave | null>(null)

    const [staffForm, setStaffForm] = useState({ name: '', email: '', phone: '', subject: '', salary: '', joinDate: new Date().toISOString().split('T')[0] })
    const [ttForm, setTtForm] = useState({ teacherId: '', courseId: '', batchId: '', subject: '', dayOfWeek: '1', startTime: '09:00', endTime: '10:00' })

    // Attendance filter
    const [attDate, setAttDate] = useState(new Date().toISOString().split('T')[0])

    // Salary filter
    const now = new Date()
    const [salMonth, setSalMonth] = useState(now.getMonth() + 1)
    const [salYear, setSalYear] = useState(now.getFullYear())
    const [salGenerating, setSalGenerating] = useState<string | null>(null)

    // Leave filter
    const [leaveFilter, setLeaveFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')

    /* ── Toast helper ──────────────────────────── */
    const showToast = (text: string, type: 'success' | 'error' = 'success') => {
        setToast({ text, type })
        setTimeout(() => setToast({ text: '', type: 'success' }), 3500)
    }

    /* ── Fetch helpers ─────────────────────────── */
    const apiFetch = useCallback(async (url: string, opts?: RequestInit) => {
        const res = await fetch(url, { ...opts, cache: 'no-store', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts?.headers || {}) } })
        return res.json()
    }, [token])

    const fetchStaff = useCallback(async () => {
        if (!token) return
        setLoading(true)
        const d = await apiFetch(`/api/teachers?_t=${Date.now()}`)
        if (d.success) setStaff(d.data || [])
        setLoading(false)
    }, [token, apiFetch])

    const fetchLeaves = useCallback(async () => {
        if (!token) return
        setLoading(true)
        const d = await apiFetch('/api/teachers/leaves')
        if (d.success) setLeaves(d.data || [])
        setLoading(false)
    }, [token, apiFetch])

    const fetchTimetable = useCallback(async () => {
        if (!token) return
        setLoading(true)
        const d = await apiFetch('/api/teachers/timetable')
        if (d.success) setTimetables(d.data || [])
        setLoading(false)
    }, [token, apiFetch])

    const fetchAttendance = useCallback(async (date?: string) => {
        if (!token) return
        setLoading(true)
        const d = await apiFetch(`/api/teachers/attendance?date=${date || attDate}`)
        if (d.success) setAttendances(d.data || [])
        setLoading(false)
    }, [token, apiFetch, attDate])

    const fetchSalary = useCallback(async () => {
        if (!token) return
        setLoading(true)
        const d = await apiFetch(`/api/teachers/ledger?month=${salMonth}&year=${salYear}`)
        if (d.success) setSalaryLedger(d.data || [])
        setLoading(false)
    }, [token, apiFetch, salMonth, salYear])

    const fetchBatchesCourses = useCallback(async () => {
        if (!token) return
        const [bd, cd] = await Promise.all([
            apiFetch('/api/batches'),
            apiFetch('/api/courses'),
        ])
        if (bd.success) setBatches(bd.data || [])
        if (cd.success) setCourses(cd.data || [])
    }, [token, apiFetch])

    // Initial loads
    useEffect(() => { if (token) { fetchStaff(); fetchBatchesCourses() } }, [token])
    useEffect(() => { if (token && activeTab === 'leaves') fetchLeaves() }, [token, activeTab])
    useEffect(() => { if (token && activeTab === 'timetable') fetchTimetable() }, [token, activeTab])
    useEffect(() => { if (token && activeTab === 'attendance') fetchAttendance() }, [token, activeTab])
    useEffect(() => { if (token && activeTab === 'salary') fetchSalary() }, [token, activeTab, salMonth, salYear])

    /* ── Staff actions ─────────────────────────── */
    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading(true)
        const isEdit = !!selectedStaff
        const body = { ...staffForm, subject: staffForm.subject.split(',').map(s => s.trim()).filter(Boolean), ...(isEdit ? { id: selectedStaff!.id } : {}) }
        const d = await apiFetch('/api/teachers', { method: isEdit ? 'PATCH' : 'POST', body: JSON.stringify(body) })
        setActionLoading(false)
        if (d.success) { showToast(isEdit ? 'Staff updated!' : 'Staff added!'); setModal(null); fetchStaff() }
        else showToast(d.error || 'Failed', 'error')
    }

    const handleDelete = async () => {
        if (!selectedStaff) return
        setActionLoading(true)
        const d = await apiFetch(`/api/teachers?id=${selectedStaff.id}`, { method: 'DELETE' })
        setActionLoading(false)
        if (d.success) { showToast('Staff deleted'); setModal(null); fetchStaff() }
        else showToast(d.error || 'Failed', 'error')
    }

    const handleBlock = async (t: Teacher) => {
        if (!confirm(`${t.isActive ? 'Block' : 'Unblock'} "${t.name}"?`)) return
        const d = await apiFetch('/api/teachers', { method: 'PATCH', body: JSON.stringify({ id: t.id, isActive: !t.isActive }) })
        if (d.success) { showToast(`Staff ${t.isActive ? 'blocked' : 'unblocked'}`); fetchStaff() }
        else showToast(d.error || 'Failed', 'error')
    }

    /* ── Leave actions ─────────────────────────── */
    const handleLeaveAction = async (id: string, status: 'APPROVED' | 'REJECTED') => {
        setActionLoading(true)
        const d = await apiFetch('/api/teachers/leaves', { method: 'PATCH', body: JSON.stringify({ id, status }) })
        setActionLoading(false)
        if (d.success) { showToast(`Leave ${status.toLowerCase()}`); setModal(null); fetchLeaves() }
        else showToast(d.error || 'Failed', 'error')
    }

    /* ── Timetable actions ─────────────────────── */
    const handleTtSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading(true)
        const d = await apiFetch('/api/teachers/timetable', { method: 'POST', body: JSON.stringify(ttForm) })
        setActionLoading(false)
        if (d.success) { showToast('Timetable entry added'); setModal(null); fetchTimetable() }
        else showToast(d.error || 'Failed', 'error')
    }

    const handleTtStatus = async (id: string, status: string) => {
        const d = await apiFetch('/api/teachers/timetable', { method: 'PATCH', body: JSON.stringify({ id, status }) })
        if (d.success) { showToast('Timetable updated'); fetchTimetable() }
        else showToast(d.error || 'Failed', 'error')
    }

    const handleTtDelete = async (id: string) => {
        if (!confirm('Delete this timetable entry?')) return
        const d = await apiFetch(`/api/teachers/timetable?id=${id}`, { method: 'DELETE' })
        if (d.success) { showToast('Deleted'); fetchTimetable() }
    }

    /* ── Attendance actions ────────────────────── */
    const markAttendance = async (teacherId: string, status: string) => {
        const d = await apiFetch('/api/teachers/attendance', { method: 'POST', body: JSON.stringify({ teacherId, date: attDate, status }) })
        if (d.success) fetchAttendance(attDate)
        else showToast(d.error || 'Failed', 'error')
    }

    /* ── Salary actions ────────────────────────── */
    const generateSalary = async (teacherId: string) => {
        setSalGenerating(teacherId)
        const d = await apiFetch('/api/teachers/ledger', { method: 'POST', body: JSON.stringify({ teacherId, month: salMonth, year: salYear }) })
        setSalGenerating(null)
        if (d.success) { showToast('Salary generated'); fetchSalary() }
        else showToast(d.error || 'Failed', 'error')
    }

    const paySalary = async (ledgerId: string) => {
        if (!confirm('Mark this salary as PAID?')) return
        const d = await apiFetch('/api/teachers/ledger', { method: 'PATCH', body: JSON.stringify({ ledgerId }) })
        if (d.success) { showToast('Salary marked as paid'); fetchSalary() }
        else showToast(d.error || 'Failed', 'error')
    }

    /* ── Open modals ───────────────────────────── */
    const openAdd = () => {
        setSelectedStaff(null)
        setStaffForm({ name: '', email: '', phone: '', subject: '', salary: '', joinDate: new Date().toISOString().split('T')[0] })
        setModal('addStaff')
    }
    const openEdit = (t: Teacher) => {
        setSelectedStaff(t)
        setStaffForm({ name: t.name, email: t.email || '', phone: t.phone, subject: t.subject.join(', '), salary: t.salary.toString(), joinDate: t.joinDate?.split('T')[0] || '' })
        setModal('editStaff')
    }
    const openTt = () => {
        setTtForm({ teacherId: staff[0]?.id || '', courseId: '', batchId: '', subject: '', dayOfWeek: '1', startTime: '09:00', endTime: '10:00' })
        setModal('addTimetable')
    }

    /* ── Derived / Filtered ────────────────────── */
    const filteredStaff = staff.filter(t => {
        const q = search.toLowerCase()
        return t.name.toLowerCase().includes(q) || t.phone.includes(q) || (t.email || '').toLowerCase().includes(q)
    })

    const filteredLeaves = leaves.filter(l => {
        const q = search.toLowerCase()
        const matchQ = l.teacher.name.toLowerCase().includes(q)
        const matchStatus = leaveFilter === 'ALL' || l.status === leaveFilter
        return matchQ && matchStatus
    })

    const filteredTimetables = timetables.filter(t => {
        const q = search.toLowerCase()
        return t.teacher.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
    })

    const attendanceMap = attendances.reduce<Record<string, AttendanceRecord>>((acc, a) => { if (a.teacherId) acc[a.teacherId] = a; return acc }, {})
    const pendingLeaves = leaves.filter(l => l.status === 'PENDING').length
    const pendingTT = timetables.filter(t => t.status === 'PENDING_APPROVAL').length
    const monthlyOutflow = staff.reduce((s, t) => s + t.salary, 0)

    // staff with ledger entries this month
    const staffWithLedger = staff.map(t => ({
        teacher: t,
        ledger: salaryLedger.find(l => l.teacherId === t.id)
    }))

    /* ═══════════════════════════════════════════
       Render
    ═══════════════════════════════════════════ */
    return (
        <div>
            <style>{`
                .sm-tab { padding: 9px 18px; border-radius: 10px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1.5px solid transparent; transition: all 0.2s; white-space: nowrap; }
                .sm-tab.active { background: linear-gradient(135deg, var(--primary), #6d28d9); color: white; border-color: transparent; }
                .sm-tab.inactive { background: var(--surface-2); color: var(--text-muted); border-color: var(--border); }
                .sm-tab.inactive:hover { color: var(--text); border-color: var(--primary); }
                .sm-badge-count { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; font-size: 10px; background: #ef4444; color: white; margin-left: 6px; }
                .att-btn { padding: 5px 12px; border-radius: 7px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1.5px solid; transition: all 0.15s; }
                .att-btn:hover { opacity: 0.85; }
                .stat-mini { background: var(--surface-2); border-radius: 12px; padding: 14px 18px; display: flex; flex-direction: column; gap: 2px; }
                .tbl { width: 100%; border-collapse: collapse; }
                .tbl th { padding: 10px 14px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.7px; border-bottom: 1px solid var(--border); white-space: nowrap; }
                .tbl td { padding: 12px 14px; font-size: 13px; border-bottom: 1px solid var(--border); vertical-align: middle; }
                .tbl tr:hover td { background: var(--surface-2); }
                .chip { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; }
                @keyframes slideIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .slide-in { animation: slideIn 0.25s ease; }
            `}</style>

            {/* ── Page Header ── */}
            <div className="page-header" style={{ flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">👩‍🏫 Staff Management</h1>
                    <p className="page-subtitle">
                        {staff.length} staff members &nbsp;·&nbsp; Monthly payroll ₹{monthlyOutflow.toLocaleString('en-IN')}
                        {pendingLeaves > 0 && <span style={{ color: '#f59e0b' }}> &nbsp;·&nbsp; {pendingLeaves} leave(s) pending</span>}
                        {pendingTT > 0 && <span style={{ color: '#6366f1' }}> &nbsp;·&nbsp; {pendingTT} timetable(s) pending</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {activeTab === 'staff' && isSuperAdmin && <button onClick={openAdd} className="btn btn-primary">➕ Add Staff</button>}
                    {activeTab === 'timetable' && isSuperAdmin && <button onClick={openTt} className="btn btn-primary">➕ Add Timetable</button>}
                </div>
            </div>

            {/* ── Toast ── */}
            {toast.text && (
                <div className="slide-in" style={{ position: 'fixed', top: '20px', right: '20px', zIndex: 99999, maxWidth: '420px', padding: '14px 18px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', background: toast.type === 'success' ? '#052e22' : '#3b0d0d', border: `1px solid ${toast.type === 'success' ? 'rgba(16,185,129,0.6)' : 'rgba(239,68,68,0.6)'}`, color: toast.type === 'success' ? '#34d399' : '#fca5a5', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', wordBreak: 'break-word' }}>
                    {toast.type === 'success' ? '✅' : '⚠️'} {toast.text}
                </div>
            )}

            {/* ── Stats Row ── */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Staff', value: staff.length, icon: '👥', color: 'var(--primary)' },
                    { label: 'Active', value: staff.filter(t => t.isActive).length, icon: '✅', color: '#10b981' },
                    { label: 'Blocked', value: staff.filter(t => !t.isActive).length, icon: '🚫', color: '#ef4444' },
                    { label: 'Leave Pending', value: pendingLeaves, icon: '📋', color: '#f59e0b' },
                    { label: 'TT Pending', value: pendingTT, icon: '📅', color: '#6366f1' },
                    { label: 'Payroll/mo', value: `₹${(monthlyOutflow / 1000).toFixed(0)}K`, icon: '💰', color: '#10b981' },
                ].map(s => (
                    <div key={s.label} className="stat-mini">
                        <div style={{ fontSize: '18px' }}>{s.icon}</div>
                        <div style={{ fontSize: '20px', fontWeight: '900', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* ── Tabs ── */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
                {([
                    { key: 'staff', label: '👥 All Staff' },
                    { key: 'attendance', label: '✅ Attendance' },
                    { key: 'leaves', label: '📋 Leaves', count: pendingLeaves },
                    { key: 'timetable', label: '📅 Timetable', count: pendingTT },
                    { key: 'salary', label: '💰 Salary Ledger' },
                ] as { key: Tab; label: string; count?: number }[]).map(tab => (
                    <button key={tab.key} className={`sm-tab ${activeTab === tab.key ? 'active' : 'inactive'}`}
                        onClick={() => { setActiveTab(tab.key); setSearch('') }}>
                        {tab.label}
                        {tab.count && tab.count > 0 ? <span className="sm-badge-count">{tab.count}</span> : null}
                    </button>
                ))}
            </div>

            {/* ══════════════════════════════════════
                TAB: ALL STAFF
            ══════════════════════════════════════ */}
            {activeTab === 'staff' && (
                <div className="card" style={{ padding: 0 }}>
                    {/* Controls */}
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: '700', fontSize: '15px' }}>All Staff Members</h3>
                        <input placeholder="Search by name, phone, email…" value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ maxWidth: '260px', margin: 0 }} />
                    </div>

                    {loading ? <Spinner /> : filteredStaff.length === 0 ? (
                        <EmptyState icon="👩‍🏫" text={search ? 'No staff found' : 'No staff added yet'} sub={isSuperAdmin ? 'Click "Add Staff" to get started' : ''} />
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="tbl" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr>
                                        <th>#</th><th>Staff Member</th><th>Phone / Email</th><th>Subjects</th><th>Salary</th><th>Join Date</th><th>Status</th>
                                        {isSuperAdmin && <th>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStaff.map((t, i) => (
                                        <tr key={t.id}>
                                            <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{i + 1}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '15px', flexShrink: 0 }}>
                                                        {t.photo ? <img src={t.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : t.name[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '700', fontSize: '13px' }}>{t.name}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {t.id.slice(-8).toUpperCase()}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontWeight: '600', fontSize: '13px' }}>{t.phone}</div>
                                                {t.email && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.email}</div>}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', maxWidth: '180px' }}>
                                                    {t.subject.slice(0, 3).map(s => <span key={s} style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', borderRadius: '6px', fontSize: '11px', fontWeight: '600' }}>{s}</span>)}
                                                    {t.subject.length > 3 && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>+{t.subject.length - 3}</span>}
                                                </div>
                                            </td>
                                            <td style={{ fontWeight: '700', color: '#10b981' }}>₹{t.salary.toLocaleString('en-IN')}/mo</td>
                                            <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                {new Date(t.joinDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </td>
                                            <td>
                                                <span className={`badge ${t.isActive ? 'badge-success' : 'badge-gray'}`}>{t.isActive ? '● Active' : '⛔ Blocked'}</span>
                                            </td>
                                            {isSuperAdmin && (
                                                <td>
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <button onClick={() => openEdit(t)} className="btn btn-secondary btn-sm">✏️</button>
                                                        <button onClick={() => handleBlock(t)} className="btn btn-secondary btn-sm" style={{ color: t.isActive ? '#f59e0b' : '#10b981' }}>
                                                            {t.isActive ? '🚫' : '✅'}
                                                        </button>
                                                        <button onClick={() => { setSelectedStaff(t); setModal('deleteStaff') }} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }}>🗑️</button>
                                                        <a href={`https://wa.me/91${t.phone.replace(/\D/g, '')}`} target="_blank" className="btn btn-secondary btn-sm" style={{ color: '#25d366', textDecoration: 'none' }}>💬</a>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: ATTENDANCE
            ══════════════════════════════════════ */}
            {activeTab === 'attendance' && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: '700', fontSize: '15px' }}>📋 Mark & View Staff Attendance</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input type="date" value={attDate} onChange={e => { setAttDate(e.target.value); fetchAttendance(e.target.value) }} className="input" style={{ margin: 0 }} />
                            <button onClick={() => fetchAttendance(attDate)} className="btn btn-secondary btn-sm">🔄</button>
                        </div>
                    </div>

                    {loading ? <Spinner /> : staff.length === 0 ? (
                        <EmptyState icon="📅" text="No staff to mark attendance for" />
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="tbl" style={{ minWidth: '700px' }}>
                                <thead>
                                    <tr><th>#</th><th>Staff Member</th><th>Today's Status</th><th>In Time</th><th>Out Time</th>{isSuperAdmin && <th>Mark</th>}</tr>
                                </thead>
                                <tbody>
                                    {staff.filter(t => t.isActive).map((t, i) => {
                                        const att = attendanceMap[t.id]
                                        const statusColor: Record<string, string> = { PRESENT: '#10b981', ABSENT: '#ef4444', LATE: '#f59e0b', HALF_DAY: '#6366f1', LEAVE: '#8b5cf6' }
                                        return (
                                            <tr key={t.id}>
                                                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{i + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="avatar" style={{ width: '34px', height: '34px', fontSize: '13px', flexShrink: 0 }}>
                                                            {t.photo ? <img src={t.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : t.name[0]}
                                                        </div>
                                                        <div>
                                                            <div style={{ fontWeight: '700', fontSize: '13px' }}>{t.name}</div>
                                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{t.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {att ? (
                                                        <span className="chip" style={{ background: `${statusColor[att.status]}20`, color: statusColor[att.status], border: `1px solid ${statusColor[att.status]}40` }}>
                                                            {att.status}
                                                        </span>
                                                    ) : (
                                                        <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>— Not Marked</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{att?.inTime || '—'}</td>
                                                <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{att?.outTime || '—'}</td>
                                                {isSuperAdmin && (
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                                                            {[['PRESENT', '#10b981', 'P'], ['ABSENT', '#ef4444', 'A'], ['LATE', '#f59e0b', 'L'], ['HALF_DAY', '#6366f1', 'HD'], ['LEAVE', '#8b5cf6', '🏖']].map(([st, col, lbl]) => (
                                                                <button key={st} onClick={() => markAttendance(t.id, st as string)} className="att-btn"
                                                                    style={{ background: att?.status === st ? col as string : `${col}18`, borderColor: `${col}50`, color: att?.status === st ? 'white' : col as string }}>
                                                                    {lbl}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: LEAVES
            ══════════════════════════════════════ */}
            {activeTab === 'leaves' && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: '700', fontSize: '15px' }}>📋 Leave Applications</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
                                    <button key={f} onClick={() => setLeaveFilter(f)} className="att-btn"
                                        style={{ background: leaveFilter === f ? 'var(--primary)' : 'var(--surface-2)', borderColor: leaveFilter === f ? 'var(--primary)' : 'var(--border)', color: leaveFilter === f ? 'white' : 'var(--text-muted)', padding: '5px 10px' }}>
                                        {f}
                                    </button>
                                ))}
                            </div>
                            <input placeholder="Search staff…" value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ maxWidth: '200px', margin: 0 }} />
                        </div>
                    </div>

                    {loading ? <Spinner /> : filteredLeaves.length === 0 ? (
                        <EmptyState icon="📋" text="No leave applications" />
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="tbl" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr><th>#</th><th>Staff Member</th><th>Duration</th><th>Days</th><th>Reason</th><th>Applied</th><th>Status</th>{isSuperAdmin && <th>Actions</th>}</tr>
                                </thead>
                                <tbody>
                                    {filteredLeaves.map((l, i) => {
                                        const days = Math.round((new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000) + 1
                                        const sc: Record<string, any> = { PENDING: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', border: 'rgba(245,158,11,0.3)', label: '⏳ Pending' }, APPROVED: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', border: 'rgba(16,185,129,0.3)', label: '✅ Approved' }, REJECTED: { bg: 'rgba(239,68,68,0.12)', color: '#ef4444', border: 'rgba(239,68,68,0.3)', label: '❌ Rejected' } }
                                        const c = sc[l.status]
                                        return (
                                            <tr key={l.id}>
                                                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{i + 1}</td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px', flexShrink: 0 }}>
                                                            {l.teacher.photo ? <img src={l.teacher.photo} alt="" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} /> : l.teacher.name[0]}
                                                        </div>
                                                        <span style={{ fontWeight: '700' }}>{l.teacher.name}</span>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {new Date(l.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} → {new Date(l.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </td>
                                                <td>
                                                    <span style={{ background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', border: '1px solid rgba(99,102,241,0.25)', padding: '2px 8px', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>{days}d</span>
                                                </td>
                                                <td style={{ maxWidth: '200px', fontSize: '12px', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.reason}</td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{new Date(l.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                                                <td>
                                                    <span className="chip" style={{ background: c.bg, color: c.color, border: `1px solid ${c.border}` }}>{c.label}</span>
                                                </td>
                                                {isSuperAdmin && (
                                                    <td>
                                                        {l.status === 'PENDING' ? (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button onClick={() => handleLeaveAction(l.id, 'APPROVED')} disabled={actionLoading} className="att-btn" style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#10b981' }}>✅ Approve</button>
                                                                <button onClick={() => handleLeaveAction(l.id, 'REJECTED')} disabled={actionLoading} className="att-btn" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>❌ Reject</button>
                                                            </div>
                                                        ) : (
                                                            <button onClick={() => { setSelectedLeave(l); setModal('viewLeave') }} className="btn btn-secondary btn-sm">👁 View</button>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: TIMETABLE
            ══════════════════════════════════════ */}
            {activeTab === 'timetable' && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <h3 style={{ fontWeight: '700', fontSize: '15px' }}>📅 Staff Timetable</h3>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                            <input placeholder="Search staff, subject…" value={search} onChange={e => setSearch(e.target.value)} className="input" style={{ maxWidth: '220px', margin: 0 }} />
                            <button onClick={fetchTimetable} className="btn btn-secondary btn-sm">🔄</button>
                        </div>
                    </div>

                    {loading ? <Spinner /> : filteredTimetables.length === 0 ? (
                        <EmptyState icon="📅" text="No timetable entries" sub={isSuperAdmin ? 'Click "Add Timetable" to schedule classes' : ''} />
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="tbl" style={{ minWidth: '800px' }}>
                                <thead>
                                    <tr><th>#</th><th>Staff</th><th>Day</th><th>Time</th><th>Class / Batch</th><th>Subject</th><th>Status</th>{isSuperAdmin && <th>Actions</th>}</tr>
                                </thead>
                                <tbody>
                                    {filteredTimetables.map((tt, i) => {
                                        const sc: Record<string, any> = { PUBLISHED: { bg: 'rgba(16,185,129,0.12)', color: '#10b981', label: '✅ Published' }, PENDING_APPROVAL: { bg: 'rgba(245,158,11,0.12)', color: '#f59e0b', label: '⏳ Pending' }, DRAFT: { bg: 'var(--surface-2)', color: 'var(--text-muted)', label: '📝 Draft' } }
                                        const c = sc[tt.status] || sc.DRAFT
                                        return (
                                            <tr key={tt.id}>
                                                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{i + 1}</td>
                                                <td style={{ fontWeight: '700' }}>{tt.teacher.name}</td>
                                                <td style={{ fontWeight: '600', color: 'var(--primary-light)', whiteSpace: 'nowrap' }}>{DAYS[tt.dayOfWeek]}</td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{tt.startTime} – {tt.endTime}</td>
                                                <td style={{ fontSize: '12px' }}>{tt.course?.name || '—'} / {tt.batch?.name || '—'}</td>
                                                <td>
                                                    <span style={{ padding: '2px 8px', background: 'rgba(99,102,241,0.12)', color: 'var(--primary-light)', borderRadius: '6px', fontSize: '12px', fontWeight: '700' }}>{tt.subject}</span>
                                                </td>
                                                <td>
                                                    <span className="chip" style={{ background: c.bg, color: c.color }}>{c.label}</span>
                                                </td>
                                                {isSuperAdmin && (
                                                    <td>
                                                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                            {tt.status === 'PENDING_APPROVAL' && (
                                                                <>
                                                                    <button onClick={() => handleTtStatus(tt.id, 'PUBLISHED')} className="att-btn" style={{ background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.4)', color: '#10b981' }}>✅ Publish</button>
                                                                    <button onClick={() => handleTtStatus(tt.id, 'DRAFT')} className="att-btn" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#ef4444' }}>❌ Reject</button>
                                                                </>
                                                            )}
                                                            {tt.status === 'PUBLISHED' && (
                                                                <button onClick={() => handleTtStatus(tt.id, 'DRAFT')} className="att-btn" style={{ background: 'var(--surface-2)', borderColor: 'var(--border)', color: 'var(--text-muted)' }}>Unpublish</button>
                                                            )}
                                                            {tt.status === 'DRAFT' && (
                                                                <button onClick={() => handleTtStatus(tt.id, 'PUBLISHED')} className="att-btn" style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: 'var(--primary-light)' }}>Publish</button>
                                                            )}
                                                            <button onClick={() => handleTtDelete(tt.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }}>🗑️</button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ══════════════════════════════════════
                TAB: SALARY LEDGER
            ══════════════════════════════════════ */}
            {activeTab === 'salary' && (
                <div className="card" style={{ padding: 0 }}>
                    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div>
                            <h3 style={{ fontWeight: '700', fontSize: '15px' }}>💰 Salary Ledger</h3>
                            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {MONTHS[salMonth]} {salYear} &nbsp;·&nbsp;
                                Paid: {salaryLedger.filter(l => l.status === 'PAID').length} &nbsp;·&nbsp;
                                Unpaid: {salaryLedger.filter(l => l.status === 'UNPAID').length}
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                            <select value={salMonth} onChange={e => setSalMonth(+e.target.value)} className="input" style={{ margin: 0, width: '130px' }}>
                                {MONTHS.slice(1).map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                            </select>
                            <select value={salYear} onChange={e => setSalYear(+e.target.value)} className="input" style={{ margin: 0, width: '90px' }}>
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                            <button onClick={fetchSalary} className="btn btn-secondary btn-sm">🔄</button>
                        </div>
                    </div>

                    {loading ? <Spinner /> : staff.filter(t => t.isActive).length === 0 ? (
                        <EmptyState icon="💰" text="No active staff" />
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table className="tbl" style={{ minWidth: '750px' }}>
                                <thead>
                                    <tr><th>#</th><th>Staff Member</th><th>Base Salary</th><th>Deductions</th><th>Net Payable</th><th>Status</th><th>Paid On</th>{isSuperAdmin && <th>Actions</th>}</tr>
                                </thead>
                                <tbody>
                                    {staff.filter(t => t.isActive).map((t, i) => {
                                        const ledger = staffWithLedger.find(e => e.teacher.id === t.id)?.ledger
                                        return (
                                            <tr key={t.id}>
                                                <td style={{ color: 'var(--text-muted)', fontWeight: '600' }}>{i + 1}</td>
                                                <td>
                                                    <div style={{ fontWeight: '700' }}>{t.name}</div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>₹{t.salary.toLocaleString('en-IN')}/mo base</div>
                                                </td>
                                                <td style={{ fontWeight: '600', color: '#10b981' }}>{ledger ? `₹${ledger.baseSalary.toLocaleString('en-IN')}` : '—'}</td>
                                                <td style={{ color: '#ef4444', fontWeight: '600' }}>{ledger ? `₹${ledger.deductions.toLocaleString('en-IN')}` : '—'}</td>
                                                <td style={{ fontWeight: '800', color: ledger ? '#10b981' : 'var(--text-muted)' }}>{ledger ? `₹${ledger.netPayable.toLocaleString('en-IN')}` : '—'}</td>
                                                <td>
                                                    {ledger ? (
                                                        <span className="chip" style={{ background: ledger.status === 'PAID' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.12)', color: ledger.status === 'PAID' ? '#10b981' : '#f59e0b' }}>
                                                            {ledger.status === 'PAID' ? '✅ Paid' : '⏳ Unpaid'}
                                                        </span>
                                                    ) : (
                                                        <span className="chip" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Not Generated</span>
                                                    )}
                                                </td>
                                                <td style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                                                    {ledger?.paidDate ? new Date(ledger.paidDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                </td>
                                                {isSuperAdmin && (
                                                    <td>
                                                        {!ledger ? (
                                                            <button onClick={() => generateSalary(t.id)} disabled={salGenerating === t.id} className="btn btn-secondary btn-sm" style={{ color: 'var(--primary-light)', whiteSpace: 'nowrap' }}>
                                                                {salGenerating === t.id ? '⏳ ...' : '⚡ Generate'}
                                                            </button>
                                                        ) : ledger.status === 'UNPAID' ? (
                                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                                <button onClick={() => generateSalary(t.id)} className="btn btn-secondary btn-sm" title="Recalculate">🔄</button>
                                                                <button onClick={() => paySalary(ledger.id)} className="btn btn-secondary btn-sm" style={{ color: '#10b981', whiteSpace: 'nowrap' }}>💳 Pay</button>
                                                            </div>
                                                        ) : (
                                                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Completed</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Salary Summary Footer */}
                    {salaryLedger.length > 0 && (
                        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
                            {[
                                { label: 'Total Payable', value: `₹${salaryLedger.reduce((s, l) => s + l.netPayable, 0).toLocaleString('en-IN')}`, color: '#10b981' },
                                { label: 'Total Paid', value: `₹${salaryLedger.filter(l => l.status === 'PAID').reduce((s, l) => s + l.netPayable, 0).toLocaleString('en-IN')}`, color: '#10b981' },
                                { label: 'Total Pending', value: `₹${salaryLedger.filter(l => l.status === 'UNPAID').reduce((s, l) => s + l.netPayable, 0).toLocaleString('en-IN')}`, color: '#f59e0b' },
                                { label: 'Total Deductions', value: `₹${salaryLedger.reduce((s, l) => s + l.deductions, 0).toLocaleString('en-IN')}`, color: '#ef4444' },
                            ].map(item => (
                                <div key={item.label}>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>{item.label}</div>
                                    <div style={{ fontSize: '16px', fontWeight: '800', color: item.color }}>{item.value}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════
                MODALS
            ═══════════════════════════════════════════ */}

            {/* Add / Edit Staff Modal */}
            {(modal === 'addStaff' || modal === 'editStaff') && (
                <ModalOverlay onClose={() => setModal(null)}>
                    <div className="modal-header">
                        <h3 style={{ fontWeight: '700' }}>{modal === 'editStaff' ? '✏️ Edit Staff' : '➕ Add Staff'}</h3>
                        <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    </div>
                    <form onSubmit={handleStaffSubmit}>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label className="label">Full Name *</label>
                                <input className="input" placeholder="Dr. Rajesh Kumar" value={staffForm.name} onChange={e => setStaffForm({ ...staffForm, name: e.target.value })} required />
                            </div>
                            <div className="grid-cols-2">
                                <div>
                                    <label className="label">Phone *</label>
                                    <input className="input" type="tel" placeholder="9876543210" value={staffForm.phone} onChange={e => setStaffForm({ ...staffForm, phone: e.target.value })} required />
                                </div>
                                <div>
                                    <label className="label">Email</label>
                                    <input className="input" type="email" placeholder="teacher@school.com" value={staffForm.email} onChange={e => setStaffForm({ ...staffForm, email: e.target.value })} />
                                </div>
                            </div>
                            <div>
                                <label className="label">Subjects (comma separated)</label>
                                <input className="input" placeholder="Physics, Maths, Chemistry" value={staffForm.subject} onChange={e => setStaffForm({ ...staffForm, subject: e.target.value })} />
                            </div>
                            <div className="grid-cols-2">
                                <div>
                                    <label className="label">Monthly Salary (₹)</label>
                                    <input className="input" type="number" placeholder="35000" value={staffForm.salary} onChange={e => setStaffForm({ ...staffForm, salary: e.target.value })} />
                                </div>
                                <div>
                                    <label className="label">Join Date</label>
                                    <input className="input" type="date" value={staffForm.joinDate} onChange={e => setStaffForm({ ...staffForm, joinDate: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={() => setModal(null)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                {actionLoading ? '⏳ Saving...' : modal === 'editStaff' ? '✅ Save Changes' : '✅ Add Staff'}
                            </button>
                        </div>
                    </form>
                </ModalOverlay>
            )}

            {/* Delete Confirm Modal */}
            {modal === 'deleteStaff' && selectedStaff && (
                <ModalOverlay onClose={() => setModal(null)}>
                    <div className="modal-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '12px' }}>⚠️</div>
                        <h3 style={{ fontWeight: '800', fontSize: '18px', color: '#ef4444', marginBottom: '8px' }}>Delete Staff Member?</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '14px', lineHeight: '1.6', marginBottom: '24px' }}>
                            This will permanently remove <strong style={{ color: 'var(--text)' }}>{selectedStaff.name}</strong> and all their associated records (leaves, timetables, salary history). This cannot be undone.
                        </p>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button onClick={() => setModal(null)} className="btn btn-secondary" style={{ flex: 1 }}>Cancel</button>
                            <button onClick={handleDelete} disabled={actionLoading} className="btn btn-primary" style={{ flex: 1, background: '#ef4444' }}>
                                {actionLoading ? '⏳ Deleting...' : '🗑️ Yes, Delete'}
                            </button>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* View Leave Modal */}
            {modal === 'viewLeave' && selectedLeave && (
                <ModalOverlay onClose={() => setModal(null)}>
                    <div className="modal-header">
                        <h3 style={{ fontWeight: '700' }}>📋 Leave Application Details</h3>
                        <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    </div>
                    <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {[
                            { label: 'Staff Member', value: selectedLeave.teacher.name },
                            { label: 'From', value: new Date(selectedLeave.startDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) },
                            { label: 'To', value: new Date(selectedLeave.endDate).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) },
                            { label: 'Total Days', value: `${Math.round((new Date(selectedLeave.endDate).getTime() - new Date(selectedLeave.startDate).getTime()) / 86400000) + 1} day(s)` },
                            { label: 'Reason', value: selectedLeave.reason },
                            { label: 'Status', value: selectedLeave.status },
                            { label: 'Applied On', value: new Date(selectedLeave.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) },
                        ].map(row => (
                            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: '8px', gap: '12px' }}>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600' }}>{row.label}</span>
                                <span style={{ fontSize: '13px', fontWeight: '700', textAlign: 'right' }}>{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="modal-footer">
                        <button onClick={() => setModal(null)} className="btn btn-secondary">Close</button>
                    </div>
                </ModalOverlay>
            )}

            {/* Add Timetable Modal */}
            {modal === 'addTimetable' && (
                <ModalOverlay onClose={() => setModal(null)}>
                    <div className="modal-header">
                        <h3 style={{ fontWeight: '700' }}>📅 Add Timetable Entry</h3>
                        <button onClick={() => setModal(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                    </div>
                    <form onSubmit={handleTtSubmit}>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            <div>
                                <label className="label">Staff Member *</label>
                                <select className="input" value={ttForm.teacherId} onChange={e => setTtForm({ ...ttForm, teacherId: e.target.value })} required>
                                    <option value="">Select Staff…</option>
                                    {staff.filter(t => t.isActive).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>
                            <div className="grid-cols-2">
                                <div>
                                    <label className="label">Class</label>
                                    <select className="input" value={ttForm.courseId} onChange={e => setTtForm({ ...ttForm, courseId: e.target.value })}>
                                        <option value="">Select Class…</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Batch / Section</label>
                                    <select className="input" value={ttForm.batchId} onChange={e => setTtForm({ ...ttForm, batchId: e.target.value })}>
                                        <option value="">Select Batch…</option>
                                        {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="label">Subject *</label>
                                <input className="input" placeholder="Mathematics" value={ttForm.subject} onChange={e => setTtForm({ ...ttForm, subject: e.target.value })} required />
                            </div>
                            <div className="grid-cols-2">
                                <div>
                                    <label className="label">Day *</label>
                                    <select className="input" value={ttForm.dayOfWeek} onChange={e => setTtForm({ ...ttForm, dayOfWeek: e.target.value })}>
                                        {DAYS.slice(1).map((d, i) => <option key={i + 1} value={i + 1}>{d}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="label">Start → End Time *</label>
                                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                        <input type="time" className="input" style={{ margin: 0 }} value={ttForm.startTime} onChange={e => setTtForm({ ...ttForm, startTime: e.target.value })} required />
                                        <span style={{ color: 'var(--text-muted)' }}>→</span>
                                        <input type="time" className="input" style={{ margin: 0 }} value={ttForm.endTime} onChange={e => setTtForm({ ...ttForm, endTime: e.target.value })} required />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" onClick={() => setModal(null)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary" disabled={actionLoading}>
                                {actionLoading ? '⏳ Saving...' : '✅ Add Entry'}
                            </button>
                        </div>
                    </form>
                </ModalOverlay>
            )}
        </div>
    )
}

/* ═══════════════════════════════════════════
   Sub-components
═══════════════════════════════════════════ */
function Spinner() {
    return <div style={{ padding: '48px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
}

function EmptyState({ icon, text, sub }: { icon: string; text: string; sub?: string }) {
    return (
        <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>{icon}</div>
            <div style={{ fontWeight: '700', color: 'var(--text)', marginBottom: '4px' }}>{text}</div>
            {sub && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{sub}</div>}
        </div>
    )
}

function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal">{children}</div>
        </div>
    )
}
