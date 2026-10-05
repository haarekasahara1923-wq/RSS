'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { downloadCSV, downloadExcel, generateAndPrintPDF } from '@/lib/reportExport'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts'
import DateRangeBar, { presetRange, prettyDay } from '@/components/accounts/DateRangeBar'

interface Row { category: string; amount: number }
interface PnLData {
    from: string
    to: string
    income: Row[]
    expenses: Row[]
    totalIncome: number
    totalExpense: number
    netProfit: number
    isProfit: boolean
    receiptsByMode: { mode: string; amount: number }[]
    monthly: { month: string; income: number; expense: number; net: number }[]
}

const inr = (n: number) => `${n < 0 ? '-' : ''}₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const monthLabel = (m: string) => { const [y, mo] = m.split('-').map(Number); return new Date(y, mo - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }) }

export default function PnLPage() {
    const { token, tenant } = useAuth()
    const [range, setRange] = useState(presetRange('fy'))
    const [data, setData] = useState<PnLData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!token) return
        setLoading(true)
        setError('')
        fetch(`/api/accounts/pnl?from=${range.from}&to=${range.to}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(j => { if (j.success) setData(j.data); else setError(j.error || 'Failed to load') })
            .catch(() => setError('Failed to load P&L'))
            .finally(() => setLoading(false))
    }, [token, range.from, range.to])

    const schoolName = tenant?.name || 'School'
    const schoolAddress = [tenant?.address, tenant?.phone && `Ph: ${tenant.phone}`].filter(Boolean).join(' • ')
    const periodLabel = data ? `${prettyDay(data.from)} to ${prettyDay(data.to)}` : ''

    /** Traditional two-sided P&L: Expenditure (Dr) | Income (Cr), balanced with Net Profit / Loss */
    const tShape = () => {
        if (!data) return [] as (string | number)[][]
        const left: [string, number | ''][] = data.expenses.map(e => [e.category, e.amount])
        const right: [string, number | ''][] = data.income.map(i => [i.category, i.amount])
        if (data.netProfit > 0) left.push(['Net Profit (Excess of Income over Expenditure)', data.netProfit])
        if (data.netProfit < 0) right.push(['Net Loss (Excess of Expenditure over Income)', Math.abs(data.netProfit)])
        const n = Math.max(left.length, right.length)
        const rows: (string | number)[][] = []
        for (let i = 0; i < n; i++) rows.push([left[i]?.[0] ?? '', left[i]?.[1] ?? '', right[i]?.[0] ?? '', right[i]?.[1] ?? ''])
        return rows
    }
    const balancedTotal = data ? Math.max(data.totalIncome, data.totalExpense) : 0

    const handleCSV = () => {
        if (!data) return
        downloadCSV(`profit-loss-${data.from}-to-${data.to}.csv`, [
            [`${schoolName} - PROFIT & LOSS ACCOUNT`], ['Period', periodLabel], [''],
            ['Dr. EXPENDITURE', 'Amount (₹)', 'Cr. INCOME', 'Amount (₹)'],
            ...tShape(),
            ['TOTAL', balancedTotal, 'TOTAL', balancedTotal],
            [''], ['Total Income', data.totalIncome], ['Total Expenditure', data.totalExpense], [data.isProfit ? 'NET PROFIT' : 'NET LOSS', Math.abs(data.netProfit)],
            [''], ['MONTH-WISE', 'Income', 'Expenditure', 'Net'], ...data.monthly.map(m => [monthLabel(m.month), m.income, m.expense, m.net]),
        ])
    }

    const handleExcel = () => {
        if (!data) return
        downloadExcel(`profit-loss-${data.from}-to-${data.to}.xls`, [
            {
                title: `${schoolName} — Profit & Loss Account`, headerLines: [`For the period ${periodLabel}`],
                headers: ['Dr. Expenditure', 'Amount (₹)', 'Cr. Income', 'Amount (₹)'], rows: tShape(),
                footer: ['TOTAL', balancedTotal, 'TOTAL', balancedTotal],
            },
            {
                title: 'Summary', headers: ['Particulars', 'Amount (₹)'],
                rows: [['Total Income', data.totalIncome], ['Total Expenditure', data.totalExpense]],
                footer: [data.isProfit ? 'NET PROFIT' : 'NET LOSS', Math.abs(data.netProfit)],
            },
            {
                title: 'Month-wise Trend', headers: ['Month', 'Income (₹)', 'Expenditure (₹)', 'Net (₹)'],
                rows: data.monthly.map(m => [monthLabel(m.month), m.income, m.expense, m.net]),
                footer: ['TOTAL', data.totalIncome, data.totalExpense, data.netProfit],
            },
        ])
    }

    const handlePDF = () => {
        if (!data) return
        const money = (v: any) => v === '' ? '' : inr(Number(v))
        generateAndPrintPDF({
            title: 'Profit & Loss Account',
            subtitle: `For the period ${periodLabel}`,
            schoolName, schoolAddress,
            stats: [
                { label: 'Total Income', value: inr(data.totalIncome), color: '#10b981' },
                { label: 'Total Expenditure', value: inr(data.totalExpense), color: '#ef4444' },
                { label: data.isProfit ? 'Net Profit' : 'Net Loss', value: inr(Math.abs(data.netProfit)), color: data.isProfit ? '#059669' : '#dc2626' },
                { label: 'Margin', value: data.totalIncome ? `${((data.netProfit / data.totalIncome) * 100).toFixed(1)}%` : '—', color: '#6366f1' },
            ],
            tables: [
                {
                    title: 'Profit & Loss Account',
                    headers: ['Dr. Expenditure', 'Amount', 'Cr. Income', 'Amount'],
                    rows: [
                        ...tShape().map(r => [String(r[0]).startsWith('Net') ? `<b>${r[0]}</b>` : r[0], money(r[1]), String(r[2]).startsWith('Net') ? `<b>${r[2]}</b>` : r[2], money(r[3])]),
                        ['<b>TOTAL</b>', `<b>${inr(balancedTotal)}</b>`, '<b>TOTAL</b>', `<b>${inr(balancedTotal)}</b>`],
                    ],
                },
                {
                    title: 'Month-wise Income vs Expenditure',
                    headers: ['Month', 'Income', 'Expenditure', 'Net'],
                    rows: data.monthly.map(m => [monthLabel(m.month), inr(m.income), inr(m.expense), inr(m.net)]),
                },
            ],
            notes: 'Income includes fee collections and other receipts. Expenditure includes all recorded school expenses. Prepared on cash basis.',
        })
    }

    const maxIncome = Math.max(1, ...(data?.income.map(i => i.amount) || [1]))
    const maxExp = Math.max(1, ...(data?.expenses.map(i => i.amount) || [1]))

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">📊 Profit & Loss Account</h1>
                    <p className="page-subtitle">Income vs expenditure statement derived from the School Ledger</p>
                </div>
            </div>

            <DateRangeBar from={range.from} to={range.to} onChange={setRange} presets={['month', 'lastMonth', 'fy', 'all']}
                right={<>
                    <button id="pnl-csv" onClick={handleCSV} className="btn btn-secondary btn-sm" disabled={!data}>⬇️ CSV</button>
                    <button id="pnl-excel" onClick={handleExcel} className="btn btn-secondary btn-sm" disabled={!data}>📗 Excel</button>
                    <button id="pnl-pdf" onClick={handlePDF} className="btn btn-primary btn-sm" disabled={!data}>🖨️ PDF</button>
                </>} />

            {error && <div className="card" style={{ borderColor: '#ef4444', color: '#fca5a5', marginBottom: '16px' }}>⚠️ {error}</div>}

            {loading ? (
                <div style={{ padding: '60px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
            ) : data && (
                <>
                    <div className={`acc-net-banner ${data.isProfit ? 'profit' : 'loss'}`}>
                        <div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                                {data.isProfit ? '📈 Net Profit' : '📉 Net Loss'} • {periodLabel}
                            </div>
                            <div style={{ fontSize: '32px', fontWeight: 900, color: data.isProfit ? '#34d399' : '#f87171', marginTop: '4px' }}>{inr(Math.abs(data.netProfit))}</div>
                        </div>
                        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap' }}>
                            <div><div className="acc-stat-label">Total Income</div><div style={{ fontSize: '20px', fontWeight: 800, color: '#34d399' }}>{inr(data.totalIncome)}</div></div>
                            <div><div className="acc-stat-label">Total Expenditure</div><div style={{ fontSize: '20px', fontWeight: 800, color: '#f87171' }}>{inr(data.totalExpense)}</div></div>
                            <div><div className="acc-stat-label">Margin</div><div style={{ fontSize: '20px', fontWeight: 800, color: 'white' }}>{data.totalIncome ? `${((data.netProfit / data.totalIncome) * 100).toFixed(1)}%` : '—'}</div></div>
                        </div>
                    </div>

                    <div className="acc-pnl-grid">
                        <div className="card" style={{ padding: 0 }}>
                            <div className="acc-pnl-head" style={{ color: '#f87171' }}><span>Dr. EXPENDITURE</span><span>Amount</span></div>
                            {data.expenses.length === 0 && <div className="acc-empty" style={{ padding: '24px' }}>No expenses in this period</div>}
                            {data.expenses.map(e => (
                                <div key={e.category} className="acc-pnl-row" style={{ flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{e.category}</span><span className="amt">{inr(e.amount)}</span></div>
                                    <div className="acc-pnl-bar"><span style={{ width: `${(e.amount / maxExp) * 100}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)' }} /></div>
                                </div>
                            ))}
                            {data.netProfit > 0 && (
                                <div className="acc-pnl-row" style={{ background: 'rgba(16,185,129,.12)' }}>
                                    <b style={{ color: '#34d399' }}>Net Profit c/d</b><span className="amt" style={{ color: '#34d399' }}>{inr(data.netProfit)}</span>
                                </div>
                            )}
                            <div className="acc-pnl-row" style={{ background: 'rgba(26,92,56,.28)', fontWeight: 800 }}><span>TOTAL</span><span className="amt">{inr(balancedTotal)}</span></div>
                        </div>

                        <div className="card" style={{ padding: 0 }}>
                            <div className="acc-pnl-head" style={{ color: '#34d399' }}><span>Cr. INCOME</span><span>Amount</span></div>
                            {data.income.length === 0 && <div className="acc-empty" style={{ padding: '24px' }}>No income in this period</div>}
                            {data.income.map(i => (
                                <div key={i.category} className="acc-pnl-row" style={{ flexDirection: 'column' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i.category}</span><span className="amt">{inr(i.amount)}</span></div>
                                    <div className="acc-pnl-bar"><span style={{ width: `${(i.amount / maxIncome) * 100}%`, background: 'linear-gradient(90deg,#10b981,#06b6d4)' }} /></div>
                                </div>
                            ))}
                            {data.netProfit < 0 && (
                                <div className="acc-pnl-row" style={{ background: 'rgba(239,68,68,.12)' }}>
                                    <b style={{ color: '#f87171' }}>Net Loss c/d</b><span className="amt" style={{ color: '#f87171' }}>{inr(Math.abs(data.netProfit))}</span>
                                </div>
                            )}
                            <div className="acc-pnl-row" style={{ background: 'rgba(26,92,56,.28)', fontWeight: 800 }}><span>TOTAL</span><span className="amt">{inr(balancedTotal)}</span></div>
                        </div>
                    </div>

                    {data.monthly.length > 0 && (
                        <div className="card" style={{ marginBottom: '18px' }}>
                            <h3 style={{ fontWeight: 700, fontSize: '15px', marginBottom: '14px' }}>📅 Month-wise Income vs Expenditure</h3>
                            <ResponsiveContainer width="100%" height={260}>
                                <BarChart data={data.monthly.map(m => ({ ...m, label: monthLabel(m.month) }))}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                                    <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
                                    <YAxis stroke="#64748b" tick={{ fontSize: 11 }} tickFormatter={(v: any) => `₹${(Number(v) / 1000).toFixed(0)}K`} />
                                    <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }} formatter={(v: any) => inr(Number(v ?? 0))} />
                                    <Legend />
                                    <Bar dataKey="income" name="Income" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="expense" name="Expenditure" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                            <div className="table-container" style={{ marginTop: '12px' }}>
                                <table className="acc-table">
                                    <thead><tr><th>Month</th><th className="num">Income</th><th className="num">Expenditure</th><th className="num">Net</th></tr></thead>
                                    <tbody>
                                        {data.monthly.map(m => (
                                            <tr key={m.month}>
                                                <td>{monthLabel(m.month)}</td>
                                                <td className="num cr">{inr(m.income)}</td>
                                                <td className="num dr">{inr(m.expense)}</td>
                                                <td className="num" style={{ fontWeight: 700, color: m.net >= 0 ? '#34d399' : '#f87171' }}>{inr(m.net)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    )
}
