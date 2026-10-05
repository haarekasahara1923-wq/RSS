'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { downloadCSV, downloadExcel, generateAndPrintPDF } from '@/lib/reportExport'
import DateRangeBar, { localDay, presetRange, prettyDay } from '@/components/accounts/DateRangeBar'

interface LedgerEntry {
    id: string
    date: string
    source: 'FEE' | 'INCOME' | 'EXPENSE'
    type: 'CREDIT' | 'DEBIT'
    category: string
    particulars: string
    mode: string
    reference: string
    credit: number
    debit: number
    balance: number
}
interface DailySummary { date: string; opening: number; credit: number; debit: number; closing: number; count: number }
interface LedgerData {
    from: string
    to: string
    baseOpening: number
    baseOpeningDate: string | null
    openingBalance: number
    totalCredit: number
    totalDebit: number
    closingBalance: number
    entries: LedgerEntry[]
    daily: DailySummary[]
}

const SRC_LABEL: Record<string, string> = { FEE: 'FEE', INCOME: 'INCOME', EXPENSE: 'EXPENSE' }
const inr = (n: number) => `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const fmtDT = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

export default function SchoolLedgerPage() {
    const { token, tenant, user } = useAuth()
    const [range, setRange] = useState(presetRange('month'))
    const [data, setData] = useState<LedgerData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [view, setView] = useState<'detail' | 'daily'>('detail')
    const [srcFilter, setSrcFilter] = useState<'' | 'FEE' | 'INCOME' | 'EXPENSE'>('')
    const [hideEmptyDays, setHideEmptyDays] = useState(true)
    const [showSettings, setShowSettings] = useState(false)
    const [settings, setSettings] = useState({ openingBalance: '0', openingDate: '' })
    const [saving, setSaving] = useState(false)
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

    const canEditOpening = user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN'
    const auth = { Authorization: `Bearer ${token}` }

    const fetchLedger = async (silent = false) => {
        if (!token) return
        if (!silent) setLoading(true)
        setError('')
        try {
            const res = await fetch(`/api/accounts/ledger?from=${range.from}&to=${range.to}`, { headers: auth })
            const json = await res.json()
            if (json.success) { setData(json.data); setLastUpdated(new Date()) }
            else setError(json.error || 'Failed to load ledger')
        } catch { setError('Failed to load ledger') }
        setLoading(false)
    }

    useEffect(() => { fetchLedger() }, [token, range.from, range.to])

    // Keep ledger live & current-dated: refresh every minute; roll "To" date forward after midnight
    useEffect(() => {
        const t = setInterval(() => {
            const today = localDay()
            if (range.to < today && range.to === localDay(new Date(Date.now() - 86400000))) {
                setRange(r => ({ ...r, to: today }))
            } else fetchLedger(true)
        }, 60000)
        return () => clearInterval(t)
    }, [token, range.from, range.to])

    const openSettings = async () => {
        const res = await fetch('/api/accounts/settings', { headers: auth }).then(r => r.json()).catch(() => ({}))
        setSettings({ openingBalance: String(res?.data?.openingBalance ?? 0), openingDate: res?.data?.openingDate || '' })
        setShowSettings(true)
    }

    const saveSettings = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const res = await fetch('/api/accounts/settings', {
            method: 'PATCH', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify(settings),
        }).then(r => r.json()).catch(() => ({ error: 'Failed' }))
        setSaving(false)
        if (res.success) { setShowSettings(false); fetchLedger() } else alert(res.error || 'Failed to save')
    }

    const entries = useMemo(() => (data?.entries || []).filter(e => !srcFilter || e.source === srcFilter), [data, srcFilter])
    const daily = useMemo(() => (data?.daily || []).filter(d => !hideEmptyDays || d.count > 0), [data, hideEmptyDays])
    const today = data?.daily.find(d => d.date === localDay())

    const periodLabel = data ? `${prettyDay(data.from)} to ${prettyDay(data.to)}` : ''
    const schoolName = tenant?.name || 'School'
    const schoolAddress = [tenant?.address, tenant?.phone && `Ph: ${tenant.phone}`].filter(Boolean).join(' • ')

    /* ---------------- Exports ---------------- */
    const detailRows = (): (string | number)[][] => {
        if (!data) return []
        return [
            [prettyDay(data.from), 'Opening Balance b/f', '', '', '', '', '', '', data.openingBalance],
            ...entries.map(e => [fmtDT(e.date), e.particulars, SRC_LABEL[e.source], e.category, e.mode.replace('_', ' '), e.reference || '', e.credit || '', e.debit || '', e.balance]),
        ]
    }
    const detailHeaders = ['Date', 'Particulars', 'Type', 'Category', 'Mode', 'Ref / Receipt', 'Credit (₹)', 'Debit (₹)', 'Balance (₹)']
    const dailyHeaders = ['Date', 'Opening (₹)', 'Credit / Receipts (₹)', 'Debit / Payments (₹)', 'Closing (₹)', 'Txns']
    const dailyRows = () => daily.map(d => [prettyDay(d.date), d.opening, d.credit, d.debit, d.closing, d.count])

    const handleCSV = () => {
        if (!data) return
        const head = [[`${schoolName} - SCHOOL LEDGER (CASH BOOK)`], ['Period', periodLabel], ['Opening Balance', data.openingBalance], ['Total Credit', data.totalCredit], ['Total Debit', data.totalDebit], ['Closing Balance', data.closingBalance], ['']]
        const body = view === 'detail'
            ? [detailHeaders, ...detailRows(), ['', 'TOTAL', '', '', '', '', data.totalCredit, data.totalDebit, ''], ['', 'Closing Balance c/f', '', '', '', '', '', '', data.closingBalance]]
            : [dailyHeaders, ...dailyRows(), ['TOTAL', '', data.totalCredit, data.totalDebit, data.closingBalance, '']]
        downloadCSV(`school-ledger-${view}-${data.from}-to-${data.to}.csv`, [...head, ...body])
    }

    const handleExcel = () => {
        if (!data) return
        const headerLines = [`Period: ${periodLabel}`, `Opening Balance: ${inr(data.openingBalance)}`, `Closing Balance: ${inr(data.closingBalance)}`]
        downloadExcel(`school-ledger-${data.from}-to-${data.to}.xls`, [
            {
                title: `${schoolName} — School Ledger (Cash Book)`, headerLines, headers: detailHeaders,
                rows: [...detailRows(), ['', 'Closing Balance c/f', '', '', '', '', '', '', data.closingBalance]],
                footer: ['', 'TOTAL', '', '', '', '', data.totalCredit, data.totalDebit, data.closingBalance],
            },
            {
                title: 'Day-wise Summary', headers: dailyHeaders, rows: (data.daily.filter(d => !hideEmptyDays || d.count > 0)).map(d => [prettyDay(d.date), d.opening, d.credit, d.debit, d.closing, d.count]),
                footer: ['TOTAL', data.openingBalance, data.totalCredit, data.totalDebit, data.closingBalance, data.entries.length],
            },
        ])
    }

    const handlePDF = () => {
        if (!data) return
        const money = (v: any) => (v === '' || v === null || v === undefined) ? '' : inr(Number(v))
        const tables = view === 'detail'
            ? [{
                title: 'Ledger Entries (Cash Book)',
                headers: ['Date', 'Particulars', 'Type', 'Mode', 'Credit', 'Debit', 'Balance'],
                rows: [
                    [prettyDay(data.from), '<b>Opening Balance b/f</b>', '', '', '', '', `<b>${inr(data.openingBalance)}</b>`],
                    ...entries.map(e => [fmtDT(e.date), e.particulars, e.source, e.mode.replace('_', ' '), money(e.credit || ''), money(e.debit || ''), inr(e.balance)]),
                    ['', '<b>TOTAL</b>', '', '', `<b>${inr(data.totalCredit)}</b>`, `<b>${inr(data.totalDebit)}</b>`, ''],
                    [prettyDay(data.to), '<b>Closing Balance c/f</b>', '', '', '', '', `<b>${inr(data.closingBalance)}</b>`],
                ],
            }]
            : [{
                title: 'Day-wise Ledger Summary',
                headers: ['Date', 'Opening', 'Credit', 'Debit', 'Closing', 'Txns'],
                rows: [...daily.map(d => [prettyDay(d.date), inr(d.opening), inr(d.credit), inr(d.debit), inr(d.closing), d.count]),
                ['<b>TOTAL</b>', `<b>${inr(data.openingBalance)}</b>`, `<b>${inr(data.totalCredit)}</b>`, `<b>${inr(data.totalDebit)}</b>`, `<b>${inr(data.closingBalance)}</b>`, data.entries.length]],
            }]
        generateAndPrintPDF({
            title: 'School Ledger (Cash Book)',
            subtitle: `Period: ${periodLabel}`,
            schoolName, schoolAddress,
            stats: [
                { label: 'Opening Balance', value: inr(data.openingBalance), color: '#6366f1' },
                { label: 'Total Credit', value: inr(data.totalCredit), subtext: 'Receipts', color: '#10b981' },
                { label: 'Total Debit', value: inr(data.totalDebit), subtext: 'Payments', color: '#ef4444' },
                { label: 'Closing Balance', value: inr(data.closingBalance), color: '#f59e0b' },
            ],
            tables,
            notes: 'Credit = money received (fee collection & other income). Debit = money paid out (expenses). Balance = Opening + Credit − Debit.',
        })
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">📗 School Ledger</h1>
                    <p className="page-subtitle">
                        Daily cash book — fee & income credited, expenses debited
                        {lastUpdated && <span style={{ marginLeft: '8px', color: '#34d399' }}>● Live • updated {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <Link href="/dashboard/payments" className="btn btn-secondary btn-sm">➕ Receipt</Link>
                    <Link href="/dashboard/expenses" className="btn btn-secondary btn-sm">➖ Expense</Link>
                    {canEditOpening && <button id="btn-opening-balance" onClick={openSettings} className="btn btn-secondary btn-sm">⚙️ Opening Balance</button>}
                    <button onClick={() => fetchLedger()} className="btn btn-secondary btn-sm" title="Refresh">🔄</button>
                </div>
            </div>

            <DateRangeBar from={range.from} to={range.to} onChange={setRange}
                right={<>
                    <button id="ledger-csv" onClick={handleCSV} className="btn btn-secondary btn-sm" disabled={!data}>⬇️ CSV</button>
                    <button id="ledger-excel" onClick={handleExcel} className="btn btn-secondary btn-sm" disabled={!data}>📗 Excel</button>
                    <button id="ledger-pdf" onClick={handlePDF} className="btn btn-primary btn-sm" disabled={!data}>🖨️ PDF</button>
                </>} />

            {error && <div className="card" style={{ borderColor: '#ef4444', color: '#fca5a5', marginBottom: '16px' }}>⚠️ {error}</div>}

            {data && (
                <div className="acc-stats">
                    <div className="acc-stat" style={{ ['--acc-color' as any]: '#6366f1' }}>
                        <div className="acc-stat-label">Opening Balance</div>
                        <div className="acc-stat-value">{inr(data.openingBalance)}</div>
                        <div className="acc-stat-sub">as on {prettyDay(data.from)}</div>
                    </div>
                    <div className="acc-stat" style={{ ['--acc-color' as any]: '#10b981' }}>
                        <div className="acc-stat-label">Total Credit (Receipts)</div>
                        <div className="acc-stat-value" style={{ color: '#34d399' }}>+{inr(data.totalCredit)}</div>
                        <div className="acc-stat-sub">{data.entries.filter(e => e.type === 'CREDIT').length} entries</div>
                    </div>
                    <div className="acc-stat" style={{ ['--acc-color' as any]: '#ef4444' }}>
                        <div className="acc-stat-label">Total Debit (Payments)</div>
                        <div className="acc-stat-value" style={{ color: '#f87171' }}>−{inr(data.totalDebit)}</div>
                        <div className="acc-stat-sub">{data.entries.filter(e => e.type === 'DEBIT').length} entries</div>
                    </div>
                    <div className="acc-stat" style={{ ['--acc-color' as any]: data.closingBalance >= 0 ? '#f59e0b' : '#ef4444' }}>
                        <div className="acc-stat-label">Closing Balance</div>
                        <div className="acc-stat-value" style={{ color: data.closingBalance >= 0 ? '#fbbf24' : '#f87171' }}>{inr(data.closingBalance)}</div>
                        <div className="acc-stat-sub">as on {prettyDay(data.to)}</div>
                    </div>
                    {today && (
                        <div className="acc-stat" style={{ ['--acc-color' as any]: '#06b6d4' }}>
                            <div className="acc-stat-label">Today ({prettyDay(today.date)})</div>
                            <div className="acc-stat-value" style={{ fontSize: '16px' }}>
                                <span style={{ color: '#34d399' }}>+{inr(today.credit)}</span> / <span style={{ color: '#f87171' }}>−{inr(today.debit)}</span>
                            </div>
                            <div className="acc-stat-sub">Closing today: {inr(today.closing)}</div>
                        </div>
                    )}
                </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <div className="acc-tabs">
                    <button id="view-detail" className={`acc-tab ${view === 'detail' ? 'active' : ''}`} onClick={() => setView('detail')}>📜 Detailed Ledger</button>
                    <button id="view-daily" className={`acc-tab ${view === 'daily' ? 'active' : ''}`} onClick={() => setView('daily')}>📆 Day-wise Summary</button>
                </div>
                <div style={{ marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                    {view === 'detail' ? (
                        <select id="ledger-src-filter" className="input" value={srcFilter} onChange={e => setSrcFilter(e.target.value as any)} style={{ padding: '8px 12px', width: '200px' }}>
                            <option value="">All Transactions</option>
                            <option value="FEE">🎓 Fee Receipts</option>
                            <option value="INCOME">💰 Other Income</option>
                            <option value="EXPENSE">📉 Expenses</option>
                        </select>
                    ) : (
                        <label style={{ display: 'flex', gap: '6px', alignItems: 'center', fontSize: '13px', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <input type="checkbox" checked={hideEmptyDays} onChange={e => setHideEmptyDays(e.target.checked)} /> Hide days with no transactions
                        </label>
                    )}
                </div>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : !data ? null : view === 'detail' ? (
                        <table className="acc-table">
                            <thead>
                                <tr><th>Date</th><th>Particulars</th><th>Type</th><th>Mode</th><th>Ref</th><th className="num">Credit (₹)</th><th className="num">Debit (₹)</th><th className="num">Balance (₹)</th></tr>
                            </thead>
                            <tbody>
                                <tr className="acc-row-highlight">
                                    <td>{prettyDay(data.from)}</td><td colSpan={6}>Opening Balance b/f</td><td className="num">{inr(data.openingBalance)}</td>
                                </tr>
                                {entries.length === 0 && (
                                    <tr><td colSpan={8}><div className="acc-empty" style={{ padding: '24px' }}>No transactions in this period.</div></td></tr>
                                )}
                                {entries.map(e => (
                                    <tr key={`${e.source}-${e.id}`}>
                                        <td style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{fmtDT(e.date)}</td>
                                        <td style={{ fontSize: '13px', maxWidth: '340px' }}>{e.particulars}</td>
                                        <td><span className={`acc-src ${e.source}`}>{e.source}</span></td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.mode.replace('_', ' ')}</td>
                                        <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{e.reference || '—'}</td>
                                        <td className="num cr">{e.credit ? inr(e.credit) : ''}</td>
                                        <td className="num dr">{e.debit ? inr(e.debit) : ''}</td>
                                        <td className="num" style={{ fontWeight: 700, color: e.balance < 0 ? '#f87171' : 'white' }}>{inr(e.balance)}</td>
                                    </tr>
                                ))}
                                <tr className="acc-row-total">
                                    <td colSpan={5}>TOTAL {srcFilter && `(${srcFilter} only)`}</td>
                                    <td className="num">{inr(entries.reduce((s, e) => s + e.credit, 0))}</td>
                                    <td className="num">{inr(entries.reduce((s, e) => s + e.debit, 0))}</td>
                                    <td />
                                </tr>
                                <tr className="acc-row-highlight">
                                    <td>{prettyDay(data.to)}</td><td colSpan={6}>Closing Balance c/f</td><td className="num">{inr(data.closingBalance)}</td>
                                </tr>
                            </tbody>
                        </table>
                    ) : (
                        <table className="acc-table">
                            <thead>
                                <tr><th>Date</th><th className="num">Opening (₹)</th><th className="num">Credit (₹)</th><th className="num">Debit (₹)</th><th className="num">Closing (₹)</th><th className="num">Txns</th></tr>
                            </thead>
                            <tbody>
                                {daily.length === 0 && <tr><td colSpan={6}><div className="acc-empty" style={{ padding: '24px' }}>No transactions in this period.</div></td></tr>}
                                {daily.map(d => (
                                    <tr key={d.date} style={d.date === localDay() ? { outline: '1px solid #06b6d4' } : undefined}>
                                        <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{prettyDay(d.date)} {d.date === localDay() && <span className="acc-src FEE" style={{ marginLeft: 6 }}>TODAY</span>}</td>
                                        <td className="num">{inr(d.opening)}</td>
                                        <td className="num cr">{d.credit ? inr(d.credit) : '—'}</td>
                                        <td className="num dr">{d.debit ? inr(d.debit) : '—'}</td>
                                        <td className="num" style={{ fontWeight: 700, color: d.closing < 0 ? '#f87171' : 'white' }}>{inr(d.closing)}</td>
                                        <td className="num" style={{ color: 'var(--text-muted)' }}>{d.count}</td>
                                    </tr>
                                ))}
                                <tr className="acc-row-total">
                                    <td>TOTAL</td>
                                    <td className="num">{inr(data.openingBalance)}</td>
                                    <td className="num">{inr(data.totalCredit)}</td>
                                    <td className="num">{inr(data.totalDebit)}</td>
                                    <td className="num">{inr(data.closingBalance)}</td>
                                    <td className="num">{data.entries.length}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {showSettings && (
                <div className="modal-overlay" onClick={() => setShowSettings(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 style={{ fontWeight: '700' }}>⚙️ Ledger Opening Balance</h3>
                            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <form onSubmit={saveSettings}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                    Set the cash/bank balance the school had when you started using this ledger. Transactions before the start date will be ignored.
                                </p>
                                <div className="grid-cols-2">
                                    <div>
                                        <label className="label">Opening Balance (₹) *</label>
                                        <input id="opening-balance" className="input" type="number" step="0.01" value={settings.openingBalance} onChange={e => setSettings({ ...settings, openingBalance: e.target.value })} required />
                                    </div>
                                    <div>
                                        <label className="label">📅 Ledger Start Date</label>
                                        <input id="opening-date" className="input" type="date" value={settings.openingDate} max={localDay()} onChange={e => setSettings({ ...settings, openingDate: e.target.value })} style={{ colorScheme: 'dark' }} />
                                    </div>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Leave the start date empty to include all historical transactions.</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" onClick={() => setShowSettings(false)} className="btn btn-secondary">Cancel</button>
                                <button id="opening-save" type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳ Saving...' : '💾 Save'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
