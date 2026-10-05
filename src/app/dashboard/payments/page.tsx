'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { downloadCSV, downloadExcel, generateAndPrintPDF } from '@/lib/reportExport'
import DateRangeBar, { localDay, presetRange, prettyDay } from '@/components/accounts/DateRangeBar'

interface Payment {
    id: string
    studentName: string
    amount: number
    mode: string
    reference: string
    notes: string
    createdAt: string
    studentId: string
    receiptNo?: string
}

interface Income {
    id: string
    category: string
    amount: number
    date: string
    mode: string
    receivedFrom: string
    reference: string
    description: string
}

interface Student {
    id: string
    fullName: string
    phone: string
    totalFee: number
    paidFee: number
}

const MODES = [
    { v: 'CASH', l: '💵 Cash' },
    { v: 'UPI', l: '📱 UPI' },
    { v: 'BANK_TRANSFER', l: '🏦 Bank Transfer' },
    { v: 'CHEQUE', l: '📄 Cheque' },
    { v: 'CARD', l: '💳 Card' },
    { v: 'ONLINE', l: '🌐 Online' },
]

const INCOME_CATEGORIES = ['Admission Fee', 'Donation', 'Government Grant', 'Scholarship Received', 'Transport Income', 'Uniform / Book Sale', 'Event / Function', 'Rent Received', 'Bank Interest', 'Capital Introduced', 'Misc Income']

const modeColors: Record<string, string> = {
    UPI: '#8b5cf6', CASH: '#10b981', BANK_TRANSFER: '#06b6d4', CHEQUE: '#f59e0b', CARD: '#ec4899', ONLINE: '#6366f1',
}

const toDay = (iso: string) => localDay(new Date(iso))

const emptyFee = () => ({ studentId: '', amount: '', mode: 'CASH', reference: '', notes: '', date: localDay() })
const emptyIncome = () => ({ category: INCOME_CATEGORIES[0], amount: '', mode: 'CASH', receivedFrom: '', reference: '', description: '', date: localDay() })

export default function PaymentsPage() {
    const { token, tenant } = useAuth()
    const [tab, setTab] = useState<'fee' | 'income'>('fee')
    const [range, setRange] = useState(presetRange('month'))
    const [payments, setPayments] = useState<Payment[]>([])
    const [incomes, setIncomes] = useState<Income[]>([])
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [toast, setToast] = useState('')
    const [saving, setSaving] = useState(false)

    const [feeModal, setFeeModal] = useState(false)
    const [feeForm, setFeeForm] = useState(emptyFee())
    const [editFeeId, setEditFeeId] = useState<string | null>(null)

    const [incModal, setIncModal] = useState(false)
    const [incForm, setIncForm] = useState(emptyIncome())
    const [editIncId, setEditIncId] = useState<string | null>(null)

    const auth = { Authorization: `Bearer ${token}` }
    const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

    const fetchData = async () => {
        if (!token) return
        setLoading(true)
        const qs = `from=${range.from}&to=${range.to}`
        const [p, i] = await Promise.all([
            fetch(`/api/payments?${qs}`, { headers: auth }).then(r => r.json()).catch(() => ({})),
            fetch(`/api/incomes?${qs}`, { headers: auth }).then(r => r.json()).catch(() => ({})),
        ])
        if (p.success) setPayments(p.data)
        if (i.success) setIncomes(i.data)
        setLoading(false)
    }

    useEffect(() => { fetchData() }, [token, range.from, range.to])
    useEffect(() => {
        if (!token) return
        fetch('/api/students', { headers: auth }).then(r => r.json()).then(s => { if (s.success) setStudents(s.data) }).catch(() => { })
    }, [token])

    const q = search.trim().toLowerCase()
    const fPayments = useMemo(() => payments.filter(p => !q || p.studentName.toLowerCase().includes(q) || (p.reference || '').toLowerCase().includes(q)), [payments, q])
    const fIncomes = useMemo(() => incomes.filter(i => !q || i.category.toLowerCase().includes(q) || (i.receivedFrom || '').toLowerCase().includes(q) || (i.description || '').toLowerCase().includes(q)), [incomes, q])

    const totalFee = fPayments.reduce((s, p) => s + p.amount, 0)
    const totalIncome = fIncomes.reduce((s, i) => s + i.amount, 0)
    const todayStr = localDay()
    const todayTotal = payments.filter(p => toDay(p.createdAt) === todayStr).reduce((s, p) => s + p.amount, 0)
        + incomes.filter(i => toDay(i.date) === todayStr).reduce((s, i) => s + i.amount, 0)

    const modeBreakdown = MODES.map(m => {
        const list = [...fPayments.map(p => ({ mode: p.mode, amount: p.amount })), ...fIncomes.map(i => ({ mode: i.mode || 'CASH', amount: i.amount }))].filter(x => x.mode === m.v)
        return { mode: m.v, amount: list.reduce((s, x) => s + x.amount, 0), count: list.length }
    }).filter(m => m.count > 0)

    /* ---------- Fee payment CRUD ---------- */
    const openFee = (p?: Payment) => {
        if (p) {
            setEditFeeId(p.id)
            setFeeForm({ studentId: p.studentId, amount: String(p.amount), mode: p.mode, reference: p.reference || '', notes: p.notes || '', date: toDay(p.createdAt) })
        } else {
            setEditFeeId(null)
            setFeeForm(emptyFee())
        }
        setFeeModal(true)
    }

    const saveFee = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/payments', {
                method: editFeeId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...auth },
                body: JSON.stringify(editFeeId ? { ...feeForm, id: editFeeId } : feeForm),
            })
            const data = await res.json()
            if (data.success) {
                setFeeModal(false)
                flash(editFeeId ? 'Fee payment updated!' : 'Fee payment recorded!')
                fetchData()
            } else alert(data.error || 'Failed to save payment')
        } catch { alert('Error saving payment') }
        setSaving(false)
    }

    const deleteFee = async (id: string) => {
        if (!confirm('Delete this fee payment? The student\'s paid balance will be adjusted.')) return
        const data = await fetch(`/api/payments?id=${id}`, { method: 'DELETE', headers: auth }).then(r => r.json())
        if (data.success) { flash('Payment deleted!'); fetchData() } else alert(data.error || 'Failed to delete')
    }

    /* ---------- Other income CRUD ---------- */
    const openIncome = (i?: Income) => {
        if (i) {
            setEditIncId(i.id)
            setIncForm({ category: i.category, amount: String(i.amount), mode: i.mode || 'CASH', receivedFrom: i.receivedFrom || '', reference: i.reference || '', description: i.description || '', date: toDay(i.date) })
        } else {
            setEditIncId(null)
            setIncForm(emptyIncome())
        }
        setIncModal(true)
    }

    const saveIncome = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/incomes', {
                method: editIncId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...auth },
                body: JSON.stringify(editIncId ? { ...incForm, id: editIncId } : incForm),
            })
            const data = await res.json()
            if (data.success) {
                setIncModal(false)
                flash(editIncId ? 'Income updated!' : 'Income recorded!')
                fetchData()
            } else alert(data.error || 'Failed to save income')
        } catch { alert('Error saving income') }
        setSaving(false)
    }

    const deleteIncome = async (id: string) => {
        if (!confirm('Delete this income entry?')) return
        const data = await fetch(`/api/incomes?id=${id}`, { method: 'DELETE', headers: auth }).then(r => r.json())
        if (data.success) { flash('Income deleted!'); fetchData() } else alert(data.error || 'Failed to delete')
    }

    /* ---------- Exports ---------- */
    const periodLabel = `${prettyDay(range.from)} to ${prettyDay(range.to)}`
    const exportRows = () => tab === 'fee'
        ? { headers: ['Date', 'Student', 'Mode', 'Reference', 'Notes', 'Amount (₹)'], rows: fPayments.map(p => [formatDate(p.createdAt), p.studentName, p.mode, p.reference || '-', p.notes || '-', p.amount]) as (string | number)[][], total: totalFee }
        : { headers: ['Date', 'Category', 'Received From', 'Mode', 'Reference', 'Description', 'Amount (₹)'], rows: fIncomes.map(i => [formatDate(i.date), i.category, i.receivedFrom || '-', i.mode || 'CASH', i.reference || '-', i.description || '-', i.amount]) as (string | number)[][], total: totalIncome }

    const title = tab === 'fee' ? 'Fee Receipts Register' : 'Other Income Register'

    const handleCSV = () => {
        const { headers, rows, total } = exportRows()
        downloadCSV(`${tab === 'fee' ? 'fee-receipts' : 'other-income'}-${range.from}-to-${range.to}.csv`, [
            [`${tenant?.name || 'School'} - ${title}`], ['Period', periodLabel], [''], headers, ...rows, [''], ['', '', '', '', '', 'TOTAL', total],
        ])
    }
    const handleExcel = () => {
        const { headers, rows, total } = exportRows()
        downloadExcel(`${tab === 'fee' ? 'fee-receipts' : 'other-income'}-${range.from}-to-${range.to}.xls`, [{
            title: `${tenant?.name || 'School'} — ${title}`, headerLines: [`Period: ${periodLabel}`], headers, rows,
            footer: [...Array(headers.length - 2).fill(''), 'TOTAL', total],
        }])
    }
    const handlePDF = () => {
        const { headers, rows, total } = exportRows()
        generateAndPrintPDF({
            title, subtitle: `Period: ${periodLabel}`,
            schoolName: tenant?.name || 'School', schoolAddress: [tenant?.address, tenant?.phone && `Ph: ${tenant.phone}`].filter(Boolean).join(' • '),
            stats: [
                { label: 'Total Received', value: formatCurrency(total), color: '#10b981' },
                { label: 'Entries', value: rows.length, color: '#6366f1' },
            ],
            tables: [{ title, headers, rows: [...rows.map(r => r.map((c, i) => i === r.length - 1 ? `₹${Number(c).toLocaleString('en-IN')}` : c)), [...Array(headers.length - 2).fill(''), 'TOTAL', `₹${total.toLocaleString('en-IN')}`]] }],
        })
    }

    const selectedStudent = students.find(s => s.id === feeForm.studentId)

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">💳 Payments & Receipts</h1>
                    <p className="page-subtitle">Record fee collections and other income date-wise — all entries flow into the School Ledger</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button id="btn-add-fee-payment" onClick={() => openFee()} className="btn btn-primary">➕ Record Fee Payment</button>
                    <button id="btn-add-other-income" onClick={() => openIncome()} className="btn btn-secondary" style={{ borderColor: '#10b981', color: '#6ee7b7' }}>➕ Add Other Income</button>
                </div>
            </div>

            {toast && <div className="toast toast-success" style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>✓ {toast}</div>}

            <DateRangeBar from={range.from} to={range.to} onChange={setRange} />

            <div className="acc-stats">
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#6366f1' }}>
                    <div className="acc-stat-label">Fee Collection</div>
                    <div className="acc-stat-value">{formatCurrency(totalFee)}</div>
                    <div className="acc-stat-sub">{fPayments.length} receipts in period</div>
                </div>
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#10b981' }}>
                    <div className="acc-stat-label">Other Income</div>
                    <div className="acc-stat-value">{formatCurrency(totalIncome)}</div>
                    <div className="acc-stat-sub">{fIncomes.length} entries in period</div>
                </div>
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#f59e0b' }}>
                    <div className="acc-stat-label">Total Receipts</div>
                    <div className="acc-stat-value">{formatCurrency(totalFee + totalIncome)}</div>
                    <div className="acc-stat-sub">{periodLabel}</div>
                </div>
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#06b6d4' }}>
                    <div className="acc-stat-label">Received Today</div>
                    <div className="acc-stat-value">{formatCurrency(todayTotal)}</div>
                    <div className="acc-stat-sub">{prettyDay(todayStr)}</div>
                </div>
            </div>

            {modeBreakdown.length > 0 && (
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    {modeBreakdown.map(m => (
                        <div key={m.mode} style={{ padding: '10px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', borderLeft: `3px solid ${modeColors[m.mode] || '#6366f1'}` }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: 'white' }}>{formatCurrency(m.amount)}</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.mode.replace('_', ' ')} • {m.count} txns</div>
                        </div>
                    ))}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div className="acc-tabs">
                    <button id="tab-fee" className={`acc-tab ${tab === 'fee' ? 'active' : ''}`} onClick={() => setTab('fee')}>🎓 Fee Receipts ({fPayments.length})</button>
                    <button id="tab-income" className={`acc-tab ${tab === 'income' ? 'active' : ''}`} onClick={() => setTab('income')}>💰 Other Income ({fIncomes.length})</button>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
                    <input id="payments-search" className="input" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '200px', padding: '8px 12px' }} />
                    <button onClick={handleCSV} className="btn btn-secondary btn-sm">⬇️ CSV</button>
                    <button onClick={handleExcel} className="btn btn-secondary btn-sm">📗 Excel</button>
                    <button onClick={handlePDF} className="btn btn-secondary btn-sm">🖨️ PDF</button>
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : tab === 'fee' ? (
                        fPayments.length === 0 ? (
                            <div className="acc-empty"><div className="acc-empty-icon">🧾</div>No fee payments in this period.<br /><button onClick={() => openFee()} className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>➕ Record Fee Payment</button></div>
                        ) : (
                            <table className="acc-table">
                                <thead><tr><th>Date</th><th>Student</th><th>Mode</th><th>Reference</th><th className="num">Amount</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {fPayments.map(p => (
                                        <tr key={p.id}>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(p.createdAt)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="avatar" style={{ width: '30px', height: '30px', fontSize: '12px' }}>{p.studentName.charAt(0)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{p.studentName}</div>
                                                        {p.notes && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.notes}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="badge" style={{ background: `${modeColors[p.mode] || '#6366f1'}20`, color: modeColors[p.mode] || '#818cf8' }}>{p.mode}</span></td>
                                            <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{p.reference || '—'}</td>
                                            <td className="num cr">+{formatCurrency(p.amount)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => openFee(p)} className="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                    <button onClick={() => deleteFee(p.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} title="Delete">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="acc-row-total"><td colSpan={4}>TOTAL</td><td className="num">{formatCurrency(totalFee)}</td><td /></tr>
                                </tbody>
                            </table>
                        )
                    ) : (
                        fIncomes.length === 0 ? (
                            <div className="acc-empty"><div className="acc-empty-icon">💰</div>No other income in this period.<br /><button onClick={() => openIncome()} className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>➕ Add Other Income</button></div>
                        ) : (
                            <table className="acc-table">
                                <thead><tr><th>Date</th><th>Category</th><th>Received From</th><th>Mode</th><th>Description</th><th className="num">Amount</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {fIncomes.map(i => (
                                        <tr key={i.id}>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(i.date)}</td>
                                            <td><span className="acc-src INCOME">{i.category}</span></td>
                                            <td style={{ fontSize: '13px' }}>{i.receivedFrom || '—'}</td>
                                            <td><span className="badge" style={{ background: `${modeColors[i.mode] || '#6366f1'}20`, color: modeColors[i.mode] || '#818cf8' }}>{i.mode || 'CASH'}</span></td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{i.description || '—'}{i.reference ? <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {i.reference}</div> : null}</td>
                                            <td className="num cr">+{formatCurrency(i.amount)}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => openIncome(i)} className="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                    <button onClick={() => deleteIncome(i.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} title="Delete">🗑️</button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className="acc-row-total"><td colSpan={5}>TOTAL</td><td className="num">{formatCurrency(totalIncome)}</td><td /></tr>
                                </tbody>
                            </table>
                        )
                    )}
                </div>
            </div>

            {/* Fee Payment Modal */}
            {feeModal && (
                <div className="modal-overlay" onClick={() => setFeeModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontWeight: '700' }}>{editFeeId ? '✏️ Edit Fee Payment' : '🎓 Record Fee Payment'}</h3>
                            <button onClick={() => setFeeModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={saveFee}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <label className="label">Student *</label>
                                    <select id="fee-student" className="input" value={feeForm.studentId} onChange={e => setFeeForm({ ...feeForm, studentId: e.target.value })} required disabled={!!editFeeId}>
                                        <option value="">Select Student</option>
                                        {students.map(s => <option key={s.id} value={s.id}>{s.fullName} — Due: {formatCurrency((s.totalFee || 0) - (s.paidFee || 0))}</option>)}
                                    </select>
                                    {selectedStudent && !editFeeId && (
                                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                                            Total: {formatCurrency(selectedStudent.totalFee || 0)} • Paid: {formatCurrency(selectedStudent.paidFee || 0)} • <b style={{ color: '#f59e0b' }}>Due: {formatCurrency((selectedStudent.totalFee || 0) - (selectedStudent.paidFee || 0))}</b>
                                        </p>
                                    )}
                                </div>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">📅 Payment Date *</label>
                                        <input id="fee-date" className="input" type="date" value={feeForm.date} max={localDay()} onChange={e => setFeeForm({ ...feeForm, date: e.target.value })} required style={{ colorScheme: 'dark' }} />
                                    </div>
                                    <div>
                                        <label className="label">Amount (₹) *</label>
                                        <input id="fee-amount" className="input" type="number" min="1" step="0.01" placeholder="5000" value={feeForm.amount} onChange={e => setFeeForm({ ...feeForm, amount: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">Payment Mode</label>
                                        <select className="input" value={feeForm.mode} onChange={e => setFeeForm({ ...feeForm, mode: e.target.value })}>
                                            {MODES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Reference / Txn ID</label>
                                        <input className="input" placeholder="UPI123456" value={feeForm.reference} onChange={e => setFeeForm({ ...feeForm, reference: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Notes</label>
                                    <input className="input" placeholder="e.g. April installment" value={feeForm.notes} onChange={e => setFeeForm({ ...feeForm, notes: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setFeeModal(false)} className="btn btn-secondary">Cancel</button>
                                <button id="fee-submit" type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : editFeeId ? '💾 Update' : '✅ Record Payment'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Other Income Modal */}
            {incModal && (
                <div className="modal-overlay" onClick={() => setIncModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontWeight: '700' }}>{editIncId ? '✏️ Edit Income' : '💰 Add Other Income'}</h3>
                            <button onClick={() => setIncModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={saveIncome}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">📅 Date *</label>
                                        <input id="income-date" className="input" type="date" value={incForm.date} max={localDay()} onChange={e => setIncForm({ ...incForm, date: e.target.value })} required style={{ colorScheme: 'dark' }} />
                                    </div>
                                    <div>
                                        <label className="label">Amount (₹) *</label>
                                        <input id="income-amount" className="input" type="number" min="1" step="0.01" placeholder="10000" value={incForm.amount} onChange={e => setIncForm({ ...incForm, amount: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">Category *</label>
                                        <input id="income-category" className="input" list="income-cats" value={incForm.category} onChange={e => setIncForm({ ...incForm, category: e.target.value })} required />
                                        <datalist id="income-cats">{INCOME_CATEGORIES.map(c => <option key={c} value={c} />)}</datalist>
                                    </div>
                                    <div>
                                        <label className="label">Mode</label>
                                        <select className="input" value={incForm.mode} onChange={e => setIncForm({ ...incForm, mode: e.target.value })}>
                                            {MODES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">Received From</label>
                                        <input className="input" placeholder="Person / Organisation" value={incForm.receivedFrom} onChange={e => setIncForm({ ...incForm, receivedFrom: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Reference / Txn ID</label>
                                        <input className="input" placeholder="Cheque no. / UTR" value={incForm.reference} onChange={e => setIncForm({ ...incForm, reference: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <input className="input" placeholder="Details..." value={incForm.description} onChange={e => setIncForm({ ...incForm, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setIncModal(false)} className="btn btn-secondary">Cancel</button>
                                <button id="income-submit" type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : editIncId ? '💾 Update' : '✅ Save Income'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
