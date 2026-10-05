'use client'
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/utils'
import { downloadCSV, downloadExcel, generateAndPrintPDF } from '@/lib/reportExport'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import DateRangeBar, { localDay, presetRange, prettyDay } from '@/components/accounts/DateRangeBar'

interface Expense {
    id: string
    category: string
    amount: number
    date: string
    description: string
    paidTo: string
    mode?: string
    reference?: string
}

const CATEGORIES = ['Salary', 'Rent', 'Electricity', 'Water', 'Internet', 'Telephone', 'Stationery', 'Office Supplies', 'Maintenance', 'Repairs', 'Transport / Fuel', 'Marketing', 'Exam Expenses', 'Events / Functions', 'Furniture', 'Computer / IT', 'Taxes & Fees', 'Bank Charges', 'Misc']
const PALETTE = ['#6366f1', '#ec4899', '#f59e0b', '#06b6d4', '#10b981', '#8b5cf6', '#ef4444', '#14b8a6', '#f97316', '#84cc16', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e', '#eab308', '#94a3b8']
const colorFor = (cat: string) => {
    let h = 0
    for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0
    return PALETTE[h % PALETTE.length]
}
const MODES = [
    { v: 'CASH', l: '💵 Cash' },
    { v: 'UPI', l: '📱 UPI' },
    { v: 'BANK_TRANSFER', l: '🏦 Bank Transfer' },
    { v: 'CHEQUE', l: '📄 Cheque' },
    { v: 'CARD', l: '💳 Card' },
    { v: 'ONLINE', l: '🌐 Online' },
]

const emptyForm = () => ({ category: 'Salary', amount: '', date: localDay(), description: '', paidTo: '', mode: 'CASH', reference: '' })

export default function ExpensesPage() {
    const { token, tenant } = useAuth()
    const [range, setRange] = useState(presetRange('month'))
    const [expenses, setExpenses] = useState<Expense[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [editId, setEditId] = useState<string | null>(null)
    const [form, setForm] = useState(emptyForm())
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')
    const [catFilter, setCatFilter] = useState('')
    const [search, setSearch] = useState('')

    const auth = { Authorization: `Bearer ${token}` }
    const flash = (m: string) => { setToast(m); setTimeout(() => setToast(''), 3000) }

    const fetchExpenses = async () => {
        if (!token) return
        setLoading(true)
        const res = await fetch(`/api/expenses?from=${range.from}&to=${range.to}`, { headers: auth })
        const data = await res.json().catch(() => ({}))
        if (data.success) setExpenses(data.data)
        setLoading(false)
    }

    useEffect(() => { fetchExpenses() }, [token, range.from, range.to])

    const q = search.trim().toLowerCase()
    const list = useMemo(() => expenses.filter(e =>
        (!catFilter || e.category === catFilter) &&
        (!q || e.category.toLowerCase().includes(q) || (e.paidTo || '').toLowerCase().includes(q) || (e.description || '').toLowerCase().includes(q))
    ), [expenses, catFilter, q])

    const total = list.reduce((s, e) => s + e.amount, 0)
    const todayStr = localDay()
    const todayTotal = expenses.filter(e => localDay(new Date(e.date)) === todayStr).reduce((s, e) => s + e.amount, 0)
    const allCats = Array.from(new Set([...CATEGORIES, ...expenses.map(e => e.category)]))
    const byCat = Array.from(new Set(list.map(e => e.category)))
        .map(name => ({ name, amount: list.filter(e => e.category === name).reduce((s, e) => s + e.amount, 0) }))
        .sort((a, b) => b.amount - a.amount)

    const openForm = (e?: Expense) => {
        if (e) {
            setEditId(e.id)
            setForm({ category: e.category, amount: String(e.amount), date: localDay(new Date(e.date)), description: e.description || '', paidTo: e.paidTo || '', mode: e.mode || 'CASH', reference: e.reference || '' })
        } else {
            setEditId(null)
            setForm(emptyForm())
        }
        setShowAdd(true)
    }

    const handleSave = async (ev: React.FormEvent) => {
        ev.preventDefault()
        setSaving(true)
        try {
            const res = await fetch('/api/expenses', {
                method: editId ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json', ...auth },
                body: JSON.stringify(editId ? { ...form, id: editId } : form),
            })
            const data = await res.json()
            if (data.success) {
                setShowAdd(false)
                flash(editId ? 'Expense updated!' : 'Expense added!')
                fetchExpenses()
            } else alert(data.error || 'Failed to save expense')
        } catch { alert('Error saving expense') }
        setSaving(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this expense entry?')) return
        const data = await fetch(`/api/expenses?id=${id}`, { method: 'DELETE', headers: auth }).then(r => r.json())
        if (data.success) { flash('Expense deleted!'); fetchExpenses() } else alert(data.error || 'Failed to delete')
    }

    const periodLabel = `${prettyDay(range.from)} to ${prettyDay(range.to)}`
    const headers = ['Date', 'Category', 'Paid To', 'Mode', 'Reference', 'Description', 'Amount (₹)']
    const rows = () => list.map(e => [formatDate(e.date), e.category, e.paidTo || '-', e.mode || 'CASH', e.reference || '-', e.description || '-', e.amount]) as (string | number)[][]

    const handleExportCSV = () => {
        downloadCSV(`expenses-${range.from}-to-${range.to}.csv`, [
            [`${tenant?.name || 'School'} - EXPENSES REPORT`], ['Period', periodLabel], ['Total Expenses', total], [''], headers, ...rows(), [''], ['', '', '', '', '', 'TOTAL', total],
        ])
    }
    const handleExportExcel = () => {
        downloadExcel(`expenses-${range.from}-to-${range.to}.xls`, [
            { title: `${tenant?.name || 'School'} — Expenses Register`, headerLines: [`Period: ${periodLabel}`], headers, rows: rows(), footer: ['', '', '', '', '', 'TOTAL', total] },
            { title: 'Category Summary', headers: ['Category', 'Amount (₹)', 'Share %'], rows: byCat.map(c => [c.name, c.amount, total ? `${((c.amount / total) * 100).toFixed(1)}%` : '0%']), footer: ['TOTAL', total, '100%'] },
        ])
    }
    const handleExportPDF = () => {
        generateAndPrintPDF({
            title: 'Expenses Report',
            subtitle: `Period: ${periodLabel}`,
            schoolName: tenant?.name || 'School',
            schoolAddress: [tenant?.address, tenant?.phone && `Ph: ${tenant.phone}`].filter(Boolean).join(' • '),
            stats: [
                { label: 'Total Expenses', value: formatCurrency(total), color: '#ef4444' },
                { label: 'Entries', value: list.length, color: '#6366f1' },
                { label: 'Top Category', value: byCat[0]?.name || '-', subtext: formatCurrency(byCat[0]?.amount || 0), color: '#f59e0b' },
            ],
            tables: [
                { title: 'Category Breakdown', headers: ['Category', 'Total (₹)', 'Share'], rows: byCat.map(c => [c.name, `₹${c.amount.toLocaleString('en-IN')}`, total ? `${((c.amount / total) * 100).toFixed(1)}%` : '0%']) },
                { title: 'Detailed Expense Records', headers, rows: [...rows().map(r => r.map((c, i) => i === 6 ? `₹${Number(c).toLocaleString('en-IN')}` : c)), ['', '', '', '', '', 'TOTAL', `₹${total.toLocaleString('en-IN')}`]] },
            ],
        })
    }

    const tooltipStyle = { background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">📉 Expense Management</h1>
                    <p className="page-subtitle">Record school expenses date-wise — every entry is debited in the School Ledger</p>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button onClick={handleExportCSV} className="btn btn-secondary btn-sm">⬇️ CSV</button>
                    <button onClick={handleExportExcel} className="btn btn-secondary btn-sm">📗 Excel</button>
                    <button onClick={handleExportPDF} className="btn btn-secondary btn-sm">🖨️ PDF</button>
                    <button id="btn-add-expense" onClick={() => openForm()} className="btn btn-primary">➕ Add Expense</button>
                </div>
            </div>

            {toast && <div className="toast toast-success" style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>✓ {toast}</div>}

            <DateRangeBar from={range.from} to={range.to} onChange={setRange} />

            <div className="acc-stats">
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#ef4444' }}>
                    <div className="acc-stat-label">Total Expenses</div>
                    <div className="acc-stat-value">{formatCurrency(total)}</div>
                    <div className="acc-stat-sub">{periodLabel}</div>
                </div>
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#6366f1' }}>
                    <div className="acc-stat-label">Entries</div>
                    <div className="acc-stat-value">{list.length}</div>
                    <div className="acc-stat-sub">{byCat.length} categories</div>
                </div>
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#f59e0b' }}>
                    <div className="acc-stat-label">Top Category</div>
                    <div className="acc-stat-value" style={{ fontSize: '18px' }}>{byCat[0]?.name || '—'}</div>
                    <div className="acc-stat-sub">{formatCurrency(byCat[0]?.amount || 0)}</div>
                </div>
                <div className="acc-stat" style={{ ['--acc-color' as any]: '#06b6d4' }}>
                    <div className="acc-stat-label">Spent Today</div>
                    <div className="acc-stat-value">{formatCurrency(todayTotal)}</div>
                    <div className="acc-stat-sub">{prettyDay(todayStr)}</div>
                </div>
            </div>

            {byCat.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px', marginBottom: '18px' }}>
                    <div className="card">
                        <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>📊 Category Breakdown</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={byCat}>
                                <XAxis dataKey="name" stroke="#64748b" tick={{ fontSize: 10 }} />
                                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(Number(v) / 1000).toFixed(0)}K`} />
                                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v ?? 0))} />
                                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                                    {byCat.map((c, i) => <Cell key={i} fill={colorFor(c.name)} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="card">
                        <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>🔄 Distribution</h3>
                        <ResponsiveContainer width="100%" height={160}>
                            <PieChart>
                                <Pie data={byCat} dataKey="amount" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70}>
                                    {byCat.map((c, i) => <Cell key={i} fill={colorFor(c.name)} />)}
                                </Pie>
                                <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => formatCurrency(Number(v ?? 0))} />
                            </PieChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                            {byCat.map(c => (
                                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: colorFor(c.name), display: 'inline-block' }} />{c.name}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                <input id="expense-search" className="input" placeholder="🔍 Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ width: '220px', padding: '8px 12px' }} />
                <select id="expense-cat-filter" className="input" value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ width: '200px', padding: '8px 12px' }}>
                    <option value="">All Categories</option>
                    {allCats.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : list.length === 0 ? (
                        <div className="acc-empty"><div className="acc-empty-icon">🧾</div>No expenses in this period.<br /><button onClick={() => openForm()} className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>➕ Add Expense</button></div>
                    ) : (
                        <table className="acc-table">
                            <thead><tr><th>Date</th><th>Category</th><th>Paid To</th><th>Mode</th><th>Description</th><th className="num">Amount</th><th>Actions</th></tr></thead>
                            <tbody>
                                {list.map(e => (
                                    <tr key={e.id}>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{formatDate(e.date)}</td>
                                        <td>
                                            <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '700', background: `${colorFor(e.category)}20`, color: colorFor(e.category) }}>{e.category}</span>
                                        </td>
                                        <td style={{ fontSize: '13px' }}>{e.paidTo || '—'}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(e.mode || 'CASH').replace('_', ' ')}</td>
                                        <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{e.description || '—'}{e.reference ? <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ref: {e.reference}</div> : null}</td>
                                        <td className="num dr">−{formatCurrency(e.amount)}</td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '6px' }}>
                                                <button onClick={() => openForm(e)} className="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                <button onClick={() => handleDelete(e.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} title="Delete">🗑️</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                <tr className="acc-row-total"><td colSpan={5}>TOTAL</td><td className="num">{formatCurrency(total)}</td><td /></tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showAdd && (
                <div className="modal-overlay" onClick={() => setShowAdd(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontWeight: '700' }}>{editId ? '✏️ Edit Expense' : '📉 Add Expense'}</h3>
                            <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">📅 Expense Date *</label>
                                        <input id="expense-date" className="input" type="date" value={form.date} max={localDay()} onChange={e => setForm({ ...form, date: e.target.value })} required style={{ colorScheme: 'dark' }} />
                                    </div>
                                    <div>
                                        <label className="label">Amount (₹) *</label>
                                        <input id="expense-amount" className="input" type="number" min="1" step="0.01" placeholder="5000" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">Category *</label>
                                        <input id="expense-category" className="input" list="expense-cats" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} required />
                                        <datalist id="expense-cats">{allCats.map(c => <option key={c} value={c} />)}</datalist>
                                    </div>
                                    <div>
                                        <label className="label">Payment Mode</label>
                                        <select className="input" value={form.mode} onChange={e => setForm({ ...form, mode: e.target.value })}>
                                            {MODES.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">Paid To</label>
                                        <input className="input" placeholder="Vendor / Person name" value={form.paidTo} onChange={e => setForm({ ...form, paidTo: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="label">Reference / Bill No.</label>
                                        <input className="input" placeholder="Bill / Cheque / UTR" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label">Description</label>
                                    <input className="input" placeholder="Details about the expense" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
                                <button id="expense-submit" type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : editId ? '💾 Update' : '💾 Save Expense'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
