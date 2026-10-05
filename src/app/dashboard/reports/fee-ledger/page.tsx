'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect, useCallback } from 'react'
import { Search, Download, FileSpreadsheet, Filter, X, Users, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react'

// ----- Helpers -----
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

const STATUS_COLOR: Record<string, string> = {
  CLEAR: '#10b981',
  PARTIAL: '#f59e0b',
  PENDING: '#ef4444',
}

// ----- Main Component -----
export default function FeeLedgerPage() {
  const { token } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [courseId, setCourseId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null)
  const [siblingPayModal, setSiblingPayModal] = useState<any>(null)
  const [siblingPayForm, setSiblingPayForm] = useState({ amount: '', mode: 'CASH', notes: '' })
  const [siblingLoading, setSiblingLoading] = useState(false)
  const [siblingResult, setSiblingResult] = useState<any>(null)
  const [searched, setSearched] = useState(false)

  // Load courses for filter
  useEffect(() => {
    if (!token) return
    fetch('/api/courses', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => setCourses(d.data || []))
  }, [token])

  const fetchLedger = useCallback(async (params: any = {}) => {
    if (!token) return
    setLoading(true)
    const qp = new URLSearchParams()
    if (params.search || search) qp.set('search', params.search ?? search)
    if (params.courseId || courseId) qp.set('courseId', params.courseId ?? courseId)
    if (params.dateFrom || dateFrom) qp.set('dateFrom', params.dateFrom ?? dateFrom)
    if (params.dateTo || dateTo) qp.set('dateTo', params.dateTo ?? dateTo)

    try {
      const res = await fetch(`/api/reports/fee-ledger?${qp}`, { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (data.success) {
        setStudents(data.students)
        setSummary(data.summary)
        setSearched(true)
      }
    } catch { }
    setLoading(false)
  }, [token, search, courseId, dateFrom, dateTo])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLedger()
  }

  // ---- Export to Excel ----
  const exportExcel = () => {
    if (students.length === 0) return
    const rows = [
      ['Fee Ledger — Universal Day Boarding Academy'],
      ['Generated on:', new Date().toLocaleDateString('en-IN')],
      [],
      ['Sr#', 'Student ID', 'Name', 'Father Name', 'Class', 'Section', 'Phone', 'Parent Phone',
       'Total Fee', 'Total Paid', 'Outstanding', 'Status', 'Has Siblings'],
      ...students.map((s, i) => [
        i + 1, s.studentId, s.fullName, s.fatherName, s.class, s.section,
        s.phone, s.parentPhone, s.totalFee, s.totalPaid, s.outstanding, s.status,
        s.hasSiblings ? 'YES' : 'NO',
      ]),
    ]
    const csv = rows.map(r => r.map((c: any) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `UDBA_Fee_Ledger_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  // ---- Print/PDF ----
  const printLedger = (studentId?: string) => {
    const data = studentId ? students.filter(s => s.id === studentId) : students
    const html = buildPrintHTML(data, summary)
    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) return
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 800)
  }

  // ---- Sibling pay submission ----
  const submitSiblingPay = async () => {
    if (!siblingPayModal || !siblingPayForm.amount) return
    setSiblingLoading(true)
    setSiblingResult(null)
    const res = await fetch('/api/reports/fee-ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        parentPhone: siblingPayModal.parentPhone || siblingPayModal.phone,
        totalAmount: parseFloat(siblingPayForm.amount),
        mode: siblingPayForm.mode,
        notes: siblingPayForm.notes,
      }),
    })
    const data = await res.json()
    setSiblingLoading(false)
    setSiblingResult(data)
    if (data.success) {
      fetchLedger()
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '0 0 40px 0' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1a5c38, #0f3d26)', borderRadius: '16px', padding: '20px 24px', color: 'white' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '800', margin: 0 }}>📒 Fee Ledger & Accounts</h1>
        <p style={{ fontSize: '12px', opacity: 0.75, margin: '4px 0 0 0' }}>
          Student-wise fee tracking, sibling accounts, and payment history
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '18px' }}>
        <form onSubmit={handleSearch}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '10px', alignItems: 'end', flexWrap: 'wrap' }}>
            {/* Search */}
            <div style={{ gridColumn: '1 / 3' }}>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', fontWeight: '600' }}>
                🔍 Search (Name / Mobile / Receipt No.)
              </label>
              <div style={{ position: 'relative' }}>
                <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Student name, 9876543210, or REC-00001"
                  style={{ width: '100%', padding: '9px 12px 9px 32px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            {/* Class filter */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', fontWeight: '600' }}>Class</label>
              <select
                value={courseId}
                onChange={e => setCourseId(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}
              >
                <option value="">All Classes</option>
                {courses.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {/* Date range */}
            <div>
              <label style={{ display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '5px', fontWeight: '600' }}>Date Range</label>
              <div style={{ display: 'flex', gap: '6px' }}>
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  style={{ flex: 1, padding: '9px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '12px', outline: 'none' }} />
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  style={{ flex: 1, padding: '9px 8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '12px', outline: 'none' }} />
              </div>
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={loading}
                style={{ padding: '9px 20px', background: 'linear-gradient(135deg, #1a5c38, #0f3d26)', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {loading ? '...' : 'Search'}
              </button>
              <button type="button" onClick={() => { setSearch(''); setCourseId(''); setDateFrom(''); setDateTo(''); setStudents([]); setSummary(null); setSearched(false) }}
                style={{ padding: '9px 12px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Students', value: summary.totalStudents, color: '#6366f1', icon: '👨‍🎓' },
            { label: 'Total Billed', value: fmt(summary.totalBilled), color: '#3b82f6', icon: '📋' },
            { label: 'Collected', value: fmt(summary.totalCollected), color: '#10b981', icon: '✅' },
            { label: 'Outstanding', value: fmt(summary.totalOutstanding), color: '#ef4444', icon: '⏳' },
          ].map(card => (
            <div key={card.label} style={{ background: '#1e293b', border: `1px solid ${card.color}25`, borderRadius: '12px', padding: '14px 16px' }}>
              <div style={{ fontSize: '20px', marginBottom: '4px' }}>{card.icon}</div>
              <div style={{ fontSize: '16px', fontWeight: '800', color: card.color }}>{card.value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{card.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Export Buttons */}
      {students.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={exportExcel}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#059669', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          <button onClick={() => printLedger()}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '700', fontSize: '13px', cursor: 'pointer' }}>
            <Download size={15} /> All Students PDF
          </button>
        </div>
      )}

      {/* Ledger Table */}
      {searched && students.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '50px', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🔍</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>No records found</div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Try searching by student name, mobile number, or receipt number</p>
        </div>
      ) : students.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {students.map(student => (
            <StudentLedgerCard
              key={student.id}
              student={student}
              expanded={expandedStudent === student.id}
              onToggle={() => setExpandedStudent(expandedStudent === student.id ? null : student.id)}
              onPrintStudent={() => printLedger(student.id)}
              onSiblingPay={() => { setSiblingPayModal(student); setSiblingResult(null); setSiblingPayForm({ amount: '', mode: 'CASH', notes: '' }) }}
            />
          ))}
        </div>
      ) : (
        <div style={{ background: '#1e293b', border: '1px dashed #334155', borderRadius: '14px', padding: '50px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '8px' }}>📒</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#64748b' }}>Use the search bar above to find student fee ledgers</div>
          <p style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>Search by name, mobile number, or receipt number</p>
        </div>
      )}

      {/* Sibling Payment Modal */}
      {siblingPayModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '17px', fontWeight: '800', color: 'white' }}>👨‍👩‍👧 Sibling Group Payment</h2>
              <button onClick={() => setSiblingPayModal(null)} style={{ background: '#334155', border: 'none', color: '#94a3b8', borderRadius: '6px', padding: '6px', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>

            {siblingResult ? (
              siblingResult.success ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>✅</div>
                  <p style={{ color: '#10b981', fontWeight: '700', fontSize: '15px' }}>{siblingResult.message}</p>
                  <p style={{ color: '#64748b', fontSize: '12px', marginTop: '4px' }}>Parent Receipt: {siblingResult.parentReceiptNo}</p>
                  <div style={{ marginTop: '16px', background: '#0f172a', borderRadius: '10px', padding: '14px' }}>
                    {siblingResult.distributions?.map((d: any) => (
                      <div key={d.studentId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#cbd5e1', padding: '4px 0' }}>
                        <span>{d.receiptNo}</span>
                        <span style={{ color: '#10b981', fontWeight: '700' }}>{fmt(d.amount)}</span>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setSiblingPayModal(null)}
                    style={{ marginTop: '16px', padding: '10px 20px', background: '#334155', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                    Close
                  </button>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0' }}>
                  <p style={{ color: '#ef4444' }}>⚠️ {siblingResult.error}</p>
                </div>
              )
            ) : (
              <>
                {/* Sibling list */}
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
                    SIBLINGS IN THIS GROUP (Parent: {siblingPayModal.parentPhone || siblingPayModal.phone})
                  </div>
                  <div style={{ background: '#0f172a', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Main student */}
                    <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #1e293b' }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '700', color: 'white' }}>{siblingPayModal.fullName}</div>
                        <div style={{ fontSize: '11px', color: '#818cf8' }}>{siblingPayModal.class} • {siblingPayModal.section}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>Due: {fmt(siblingPayModal.outstanding)}</div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>of {fmt(siblingPayModal.totalFee)}</div>
                      </div>
                    </div>
                    {/* Siblings */}
                    {siblingPayModal.siblings?.map((sib: any) => (
                      <div key={sib.id} style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', background: 'rgba(245,158,11,0.05)', borderBottom: '1px solid #1e293b' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '700', color: '#fde68a' }}>👫 {sib.fullName}</div>
                          <div style={{ fontSize: '11px', color: '#818cf8' }}>{sib.class} • {sib.section}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#ef4444', fontWeight: '700' }}>Due: {fmt(sib.balance)}</div>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>of {fmt(sib.totalFee)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment form */}
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: '600' }}>Total Amount to Deposit (₹) *</label>
                  <input type="number" value={siblingPayForm.amount}
                    onChange={e => setSiblingPayForm({ ...siblingPayForm, amount: e.target.value })}
                    placeholder="e.g. 10000"
                    style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '14px', outline: 'none' }} />
                  <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                    Amount will be split proportionally based on each sibling's outstanding balance.
                  </p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: '600' }}>Payment Mode</label>
                    <select value={siblingPayForm.mode} onChange={e => setSiblingPayForm({ ...siblingPayForm, mode: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}>
                      {['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'ONLINE'].map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '5px', fontWeight: '600' }}>Notes (optional)</label>
                    <input type="text" value={siblingPayForm.notes}
                      onChange={e => setSiblingPayForm({ ...siblingPayForm, notes: e.target.value })}
                      placeholder="e.g. Quarterly fee"
                      style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }} />
                  </div>
                </div>
                <button onClick={submitSiblingPay} disabled={siblingLoading || !siblingPayForm.amount}
                  style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '800', fontSize: '14px', cursor: 'pointer', opacity: (!siblingPayForm.amount || siblingLoading) ? 0.6 : 1 }}>
                  {siblingLoading ? 'Processing...' : '✅ Distribute Payment Proportionally'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ----- Student Ledger Card -----
function StudentLedgerCard({ student, expanded, onToggle, onPrintStudent, onSiblingPay }: any) {
  const pct = student.totalFee > 0 ? Math.round((student.totalPaid / student.totalFee) * 100) : 0

  return (
    <div style={{
      background: '#1e293b',
      border: `1px solid ${student.hasSiblings ? 'rgba(245,158,11,0.35)' : '#334155'}`,
      borderRadius: '14px',
      overflow: 'hidden',
    }}>
      {/* Sibling badge */}
      {student.hasSiblings && (
        <div style={{ background: 'rgba(245,158,11,0.1)', borderBottom: '1px solid rgba(245,158,11,0.2)', padding: '5px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Users size={12} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: '11px', color: '#fde68a', fontWeight: '700' }}>
            SIBLING FAMILY — {student.siblings.length + 1} students linked to this parent
          </span>
          {student.siblings.map((s: any) => (
            <span key={s.id} style={{ fontSize: '10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#fde68a', padding: '1px 6px', borderRadius: '4px' }}>
              {s.fullName} ({s.class})
            </span>
          ))}
        </div>
      )}

      {/* Card header */}
      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer', flexWrap: 'wrap' }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: '180px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>{student.fullName}</span>
            {student.studentId && (
              <span style={{ fontSize: '10px', background: '#334155', color: '#94a3b8', padding: '2px 7px', borderRadius: '4px' }}>{student.studentId}</span>
            )}
            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '700', background: `${STATUS_COLOR[student.status]}20`, color: STATUS_COLOR[student.status], border: `1px solid ${STATUS_COLOR[student.status]}40` }}>
              {student.status}
            </span>
          </div>
          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
            {student.class} • {student.section} &nbsp;|&nbsp; 📱 {student.phone}
            {student.parentPhone && student.parentPhone !== student.phone && ` | Parent: ${student.parentPhone}`}
          </div>
        </div>

        {/* Fee bar */}
        <div style={{ width: '140px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '4px' }}>
            <span style={{ color: '#10b981', fontWeight: '700' }}>{fmt(student.totalPaid)}</span>
            <span style={{ color: '#64748b' }}>{pct}%</span>
          </div>
          <div style={{ height: '5px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444', borderRadius: '3px' }} />
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '3px' }}>of {fmt(student.totalFee)}</div>
        </div>

        {/* Outstanding */}
        <div style={{ textAlign: 'right', minWidth: '90px' }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: student.outstanding > 0 ? '#ef4444' : '#10b981' }}>
            {student.outstanding > 0 ? fmt(student.outstanding) : '✓ Clear'}
          </div>
          <div style={{ fontSize: '10px', color: '#64748b' }}>Outstanding</div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
          {student.hasSiblings && (
            <button onClick={onSiblingPay}
              style={{ padding: '6px 10px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '7px', color: '#f59e0b', fontSize: '11px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              👨‍👩‍👧 Pay Group
            </button>
          )}
          <button onClick={onPrintStudent}
            style={{ padding: '6px 10px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '7px', color: '#ef4444', fontSize: '11px', fontWeight: '700', cursor: 'pointer' }}>
            PDF
          </button>
          <div style={{ padding: '6px', color: '#64748b' }}>
            {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          </div>
        </div>
      </div>

      {/* Expanded Ledger */}
      {expanded && (
        <div style={{ borderTop: '1px solid #334155', overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ background: 'rgba(99,102,241,0.08)' }}>
                {['Date', 'Particulars', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Receipt No.', 'Mode'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h.includes('₹') ? 'right' : 'left', color: '#94a3b8', fontWeight: '700', whiteSpace: 'nowrap', borderBottom: '1px solid #334155' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {student.ledger.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>No ledger entries yet</td></tr>
              ) : student.ledger.map((entry: any, i: number) => (
                <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(15,23,42,0.3)', borderBottom: '1px solid #1e293b' }}>
                  <td style={{ padding: '9px 14px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</td>
                  <td style={{ padding: '9px 14px', color: '#e2e8f0' }}>{entry.particulars}</td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: entry.debit > 0 ? '#ef4444' : '#475569', fontWeight: entry.debit > 0 ? '700' : '400' }}>
                    {entry.debit > 0 ? fmt(entry.debit) : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', color: entry.credit > 0 ? '#10b981' : '#475569', fontWeight: entry.credit > 0 ? '700' : '400' }}>
                    {entry.credit > 0 ? fmt(entry.credit) : '—'}
                  </td>
                  <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: '800', color: entry.balance > 0 ? '#ef4444' : '#10b981' }}>
                    {fmt(Math.abs(entry.balance))}{entry.balance > 0 ? ' Dr' : ' Cr'}
                  </td>
                  <td style={{ padding: '9px 14px', color: '#6366f1', fontSize: '11px', fontFamily: 'monospace' }}>{entry.receiptNo || '—'}</td>
                  <td style={{ padding: '9px 14px', color: '#64748b', fontSize: '11px' }}>{entry.mode || '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: 'rgba(16,185,129,0.06)', borderTop: '2px solid #334155' }}>
                <td colSpan={2} style={{ padding: '10px 14px', fontWeight: '800', color: 'white' }}>TOTAL</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#ef4444', fontWeight: '800' }}>{fmt(student.totalFee)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: '#10b981', fontWeight: '800' }}>{fmt(student.totalPaid)}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: student.outstanding > 0 ? '#ef4444' : '#10b981', fontWeight: '800' }}>
                  {fmt(student.outstanding)} {student.outstanding > 0 ? 'Dr' : 'Cr'}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}

// ----- Print HTML builder -----
function buildPrintHTML(students: any[], summary: any) {
  const now = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  const studentRows = students.map(s => `
    <div class="student-block" style="page-break-inside:avoid;margin-bottom:32px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
      <div style="background:#1a5c38;color:white;padding:12px 16px;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <strong style="font-size:15px;">${s.fullName}</strong>
          ${s.studentId ? `<span style="font-size:11px;margin-left:8px;opacity:0.8;">${s.studentId}</span>` : ''}
          ${s.hasSiblings ? `<span style="background:#f59e0b;color:#000;font-size:10px;padding:1px 6px;border-radius:3px;margin-left:6px;">SIBLING FAMILY</span>` : ''}
        </div>
        <div style="text-align:right;font-size:12px;opacity:0.9;">
          ${s.class} • ${s.section} | ${s.phone}
        </div>
      </div>
      <div style="display:flex;justify-content:space-between;padding:10px 16px;background:#f8fafc;font-size:12px;">
        <span>Total Fee: <strong>₹${s.totalFee.toLocaleString('en-IN')}</strong></span>
        <span>Paid: <strong style="color:#059669;">₹${s.totalPaid.toLocaleString('en-IN')}</strong></span>
        <span>Outstanding: <strong style="color:${s.outstanding > 0 ? '#dc2626' : '#059669'};">₹${s.outstanding.toLocaleString('en-IN')}</strong></span>
        <span>Status: <strong style="color:${s.outstanding <= 0 ? '#059669' : '#dc2626'}">${s.status}</strong></span>
      </div>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead>
          <tr style="background:#f1f5f9;">
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0;">Date</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0;">Particulars</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;">Debit (₹)</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;">Credit (₹)</th>
            <th style="padding:8px 12px;text-align:right;border-bottom:1px solid #e2e8f0;">Balance (₹)</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:1px solid #e2e8f0;">Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${s.ledger.map((e: any, i: number) => `
            <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'};">
              <td style="padding:7px 12px;color:#475569;">${new Date(e.date).toLocaleDateString('en-IN')}</td>
              <td style="padding:7px 12px;">${e.particulars}</td>
              <td style="padding:7px 12px;text-align:right;color:${e.debit > 0 ? '#dc2626' : '#9ca3af'};">${e.debit > 0 ? '₹' + e.debit.toLocaleString('en-IN') : '—'}</td>
              <td style="padding:7px 12px;text-align:right;color:${e.credit > 0 ? '#059669' : '#9ca3af'};">${e.credit > 0 ? '₹' + e.credit.toLocaleString('en-IN') : '—'}</td>
              <td style="padding:7px 12px;text-align:right;font-weight:700;color:${e.balance > 0 ? '#dc2626' : '#059669'};">₹${Math.abs(e.balance).toLocaleString('en-IN')} ${e.balance > 0 ? 'Dr' : 'Cr'}</td>
              <td style="padding:7px 12px;color:#6366f1;font-size:10px;">${e.receiptNo || '—'}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background:#f1f5f9;font-weight:700;">
            <td colspan="2" style="padding:9px 12px;">TOTAL</td>
            <td style="padding:9px 12px;text-align:right;color:#dc2626;">₹${s.totalFee.toLocaleString('en-IN')}</td>
            <td style="padding:9px 12px;text-align:right;color:#059669;">₹${s.totalPaid.toLocaleString('en-IN')}</td>
            <td style="padding:9px 12px;text-align:right;color:${s.outstanding > 0 ? '#dc2626' : '#059669'};">₹${s.outstanding.toLocaleString('en-IN')} ${s.outstanding > 0 ? 'Dr' : 'Cr'}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `).join('')

  return `<!DOCTYPE html><html><head>
    <meta charset="utf-8"/>
    <title>Fee Ledger — UDBA</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #1e293b; }
      @media print { body { padding: 0; } .no-print { display: none; } }
    </style>
  </head><body>
    <div style="text-align:center;margin-bottom:24px;border-bottom:2px solid #1a5c38;padding-bottom:16px;">
      <h1 style="margin:0;font-size:22px;color:#1a5c38;">Universal Day Boarding Academy</h1>
      <p style="margin:4px 0 0;font-size:13px;color:#64748b;">📍 Pinto Park, Gwalior (MP) | Fee Account Ledger</p>
      <p style="margin:4px 0 0;font-size:12px;color:#94a3b8;">Generated: ${now}</p>
    </div>
    ${summary ? `
    <div style="display:flex;gap:16px;margin-bottom:20px;padding:14px;background:#f1f5f9;border-radius:8px;font-size:13px;">
      <span>Students: <strong>${summary.totalStudents}</strong></span>
      <span>Total Billed: <strong>₹${summary.totalBilled?.toLocaleString('en-IN')}</strong></span>
      <span>Collected: <strong style="color:#059669;">₹${summary.totalCollected?.toLocaleString('en-IN')}</strong></span>
      <span>Outstanding: <strong style="color:#dc2626;">₹${summary.totalOutstanding?.toLocaleString('en-IN')}</strong></span>
    </div>` : ''}
    ${studentRows}
    <p style="text-align:center;color:#9ca3af;font-size:11px;margin-top:24px;">This is a computer generated document. — UDBA, Gwalior</p>
  </body></html>`
}
