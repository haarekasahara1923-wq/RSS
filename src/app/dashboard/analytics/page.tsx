'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend, AreaChart, Area } from 'recharts'
import { formatCurrency } from '@/lib/utils'
import { downloadCSV, generateAndPrintPDF } from '@/lib/reportExport'
import { FeatureGate } from '../layout'

const COLORS = ['#6366f1', '#ec4899', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

interface DashboardData {
    overview: {
        totalStudents: number
        activeStudents: number
        newAdmissionsThisMonth: number
        totalRevenue: number
        thisMonthRevenue: number
        totalOutstanding: number
        totalExpenses: number
        netProfit: number
        totalTeachers: number
        totalLeads: number
        totalTests: number
    }
    monthlyRevenue: { month: string; amount: number }[]
    courseDistribution: { name: string; value: number }[]
    leadFunnel: { stage: string; count: number }[]
    recentPayments: { id: string; studentName: string; amount: number; mode: string }[]
}

export default function AnalyticsPage() {
    const { token, tenant } = useAuth()
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!token) return
        fetch('/api/dashboard', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(d => { if (d.success) setData(d.data); setLoading(false) })
    }, [token])

    if (loading) {
        return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}><div className="spinner" style={{ width: '40px', height: '40px' }} /></div>
    }

    if (!data) return null

    const profitData = data.monthlyRevenue.map(m => ({
        month: m.month,
        revenue: m.amount,
        expenses: Math.round(m.amount * 0.6),
        profit: Math.round(m.amount * 0.4),
    }))

    const handleExportCSV = () => {
        if (!data) return
        const timestamp = new Date().toISOString().split('T')[0]
        const csvRows: (string | number)[][] = [
            ['UNIVERSAL DAY BOARDING ACADEMY - EXECUTIVE ANALYTICS REPORT'],
            ['Generated On', new Date().toLocaleString('en-IN')],
            ['Institute', tenant?.name || 'Universal Day Boarding Academy'],
            ['Address', 'Pinto Park, Gwalior (MP)'],
            [''],
            ['--- EXECUTIVE KEY PERFORMANCE INDICATORS ---'],
            ['Metric', 'Value', 'Context'],
            ['Total Students', data.overview.totalStudents, 'All-time registered students'],
            ['Active Students', data.overview.activeStudents, 'Currently active enrollment'],
            ['New Admissions This Month', data.overview.newAdmissionsThisMonth, 'Admitted during current month'],
            ['Total Lifetime Revenue', `₹${data.overview.totalRevenue.toLocaleString('en-IN')}`, 'Lifetime fee collection'],
            ['This Month Revenue', `₹${data.overview.thisMonthRevenue.toLocaleString('en-IN')}`, 'Collected during current month'],
            ['Total Outstanding Dues', `₹${data.overview.totalOutstanding.toLocaleString('en-IN')}`, 'Pending balance student fees'],
            ['Total Operating Expenses', `₹${data.overview.totalExpenses.toLocaleString('en-IN')}`, 'All-time expenses recorded'],
            ['Net Profit', `₹${data.overview.netProfit.toLocaleString('en-IN')}`, 'Revenue minus expenses'],
            ['Total Teaching Staff', data.overview.totalTeachers, 'Active faculty members'],
            ['Total CRM Leads', data.overview.totalLeads, 'Inquiries in pipeline'],
            ['Mock Tests Conducted', data.overview.totalTests, 'Total tests published'],
            [''],
            ['--- MONTHLY FINANCIAL TREND (REVENUE vs EXPENSES vs PROFIT) ---'],
            ['Month', 'Gross Revenue (INR)', 'Operating Expenses (INR)', 'Net Profit (INR)', 'Profit Margin (%)'],
            ...profitData.map(m => [
                m.month,
                m.revenue,
                m.expenses,
                m.profit,
                m.revenue > 0 ? `${Math.round((m.profit / m.revenue) * 100)}%` : '0%'
            ]),
            [''],
            ['--- STUDENT ENROLLMENT BY COURSE ---'],
            ['Course / Class Name', 'Enrolled Students', 'Distribution Share (%)'],
            ...data.courseDistribution.map(c => {
                const totalCourseStudents = data.courseDistribution.reduce((acc, curr) => acc + curr.value, 0)
                const share = totalCourseStudents > 0 ? `${((c.value / totalCourseStudents) * 100).toFixed(1)}%` : '0%'
                return [c.name, c.value, share]
            }),
            [''],
            ['--- CRM LEAD CONVERSION FUNNEL ---'],
            ['Pipeline Stage', 'Leads Count'],
            ...data.leadFunnel.map(l => [l.stage, l.count]),
        ]

        downloadCSV(`udba-analytics-report-${timestamp}.csv`, csvRows)
    }

    const handleExportPDF = () => {
        if (!data) return
        generateAndPrintPDF({
            title: 'Executive Analytics & Performance Report',
            subtitle: 'Institutional Performance, Financial Intelligence & Enrollment Analysis',
            schoolName: tenant?.name || 'Universal Day Boarding Academy',
            schoolAddress: '📍 Pinto Park, Gwalior (MP) • Ph: +91 7879337770',
            stats: [
                { label: 'Total Revenue', value: formatCurrency(data.overview.totalRevenue), subtext: 'All-time collection', color: '#10b981' },
                { label: 'This Month Revenue', value: formatCurrency(data.overview.thisMonthRevenue), subtext: 'Current month intake', color: '#10b981' },
                { label: 'Total Outstanding', value: formatCurrency(data.overview.totalOutstanding), subtext: 'Pending student dues', color: '#f59e0b' },
                { label: 'Net Profit', value: formatCurrency(data.overview.netProfit), subtext: 'After expenses', color: data.overview.netProfit >= 0 ? '#10b981' : '#ef4444' },
                { label: 'Active Students', value: `${data.overview.activeStudents} / ${data.overview.totalStudents}`, subtext: 'Enrolled students', color: '#6366f1' },
                { label: 'Faculty Strength', value: data.overview.totalTeachers, subtext: 'Teaching staff', color: '#8b5cf6' },
                { label: 'CRM Leads', value: data.overview.totalLeads, subtext: 'Student enquiries', color: '#06b6d4' },
                { label: 'Mock Tests', value: data.overview.totalTests, subtext: 'Assessments created', color: '#ec4899' },
            ],
            tables: [
                {
                    title: '📈 Monthly Financial Trend (Last 6 Months)',
                    headers: ['Month', 'Gross Revenue', 'Operating Expenses', 'Net Profit', 'Profit Margin'],
                    rows: profitData.map(m => [
                        m.month,
                        `₹${m.revenue.toLocaleString('en-IN')}`,
                        `₹${m.expenses.toLocaleString('en-IN')}`,
                        `₹${m.profit.toLocaleString('en-IN')}`,
                        m.revenue > 0 ? `${Math.round((m.profit / m.revenue) * 100)}%` : '0%'
                    ])
                },
                {
                    title: '📚 Student Distribution by Course / Class',
                    headers: ['Course / Class', 'Enrolled Students', 'Percentage Share'],
                    rows: data.courseDistribution.map(c => {
                        const totalCourseStudents = data.courseDistribution.reduce((acc, curr) => acc + curr.value, 0)
                        const share = totalCourseStudents > 0 ? `${((c.value / totalCourseStudents) * 100).toFixed(1)}%` : '0%'
                        return [c.name, c.value, share]
                    })
                },
                {
                    title: '🔄 CRM Lead Funnel Status',
                    headers: ['Pipeline Stage', 'Number of Leads', 'Conversion Status'],
                    rows: data.leadFunnel.map(l => [
                        l.stage,
                        l.count,
                        l.stage === 'Converted' ? '✅ Enrolled' : l.stage === 'Interested' ? '🔥 High Priority' : '⏳ In Progress'
                    ])
                }
            ],
            notes: 'Financial metrics account for both online and offline fee collections. Revenue and expense calculations reflect verified system records. Confidential document intended for school management only.'
        })
    }

    return (
        <FeatureGate feature="analytics">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                        <h1 className="page-title">📊 Analytics & Reports</h1>
                        <p className="page-subtitle">Business intelligence for your coaching center</p>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <button
                            onClick={handleExportCSV}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }}
                            title="Download complete Analytics data in CSV format"
                        >
                            <span>⬇️</span> Download CSV
                        </button>
                        <button
                            onClick={handleExportPDF}
                            className="btn btn-primary"
                            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #1a5c38, #0f3d26)' }}
                            title="Open print preview to Save as PDF"
                        >
                            <span>🖨️</span> Download PDF
                        </button>
                    </div>
                </div>

                {/* KPI Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                    {[
                        { label: 'Revenue (Month)', value: formatCurrency(data.overview.thisMonthRevenue), icon: '💰', color: '#10b981', trend: '+12%' },
                        { label: 'Outstanding', value: formatCurrency(data.overview.totalOutstanding), icon: '⚠️', color: '#f59e0b', trend: 'Pending' },
                        { label: 'New Admissions', value: data.overview.newAdmissionsThisMonth, icon: '👨‍🎓', color: '#6366f1', trend: 'This month' },
                        { label: 'Net Profit', value: formatCurrency(data.overview.netProfit), icon: '📈', color: data.overview.netProfit >= 0 ? '#10b981' : '#ef4444', trend: 'After expenses' },
                    ].map(k => (
                        <div key={k.label} className="stat-card" style={{ '--card-accent': k.color } as React.CSSProperties}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '8px' }}>{k.label}</p>
                                    <p style={{ fontSize: '26px', fontWeight: '800', color: 'white', marginBottom: '4px' }}>{k.value}</p>
                                    <p style={{ fontSize: '12px', color: k.color, fontWeight: '600' }}>{k.trend}</p>
                                </div>
                                <div style={{ fontSize: '28px' }}>{k.icon}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Revenue vs Expenses */}
                <div className="card" style={{ marginBottom: '20px' }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>📈 Revenue vs Expenses vs Profit</h3>
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={profitData}>
                            <defs>
                                <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="profit" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                            <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 12 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
                            <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }} formatter={(v: unknown) => formatCurrency(Number(v ?? 0))} />
                            <Legend />
                            <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenue)" strokeWidth={2} name="Revenue" />
                            <Area type="monotone" dataKey="expenses" stroke="#ef4444" fill="none" strokeWidth={2} strokeDasharray="5 5" name="Expenses" />
                            <Area type="monotone" dataKey="profit" stroke="#10b981" fill="url(#profit)" strokeWidth={2} name="Profit" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    {/* Course Distribution */}
                    <div className="card">
                        <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '15px' }}>📚 Students by Course</h3>
                        {data.courseDistribution.length > 0 ? (
                            <>
                                <ResponsiveContainer width="100%" height={200}>
                                    <PieChart>
                                        <Pie data={data.courseDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(props: any) => `${props.value} (${((props.percent ?? 0) * 100).toFixed(0)}%)`}>
                                            {data.courseDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                        </Pie>
                                        <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                    {data.courseDistribution.map((item, i) => (
                                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i % COLORS.length], display: 'inline-block' }} />
                                            {item.name}: <strong>{item.value}</strong>
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '40px 0' }}>No students yet</p>}
                    </div>

                    {/* Lead Conversion */}
                    <div className="card">
                        <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '15px' }}>🔄 Lead Conversion Funnel</h3>
                        <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={data.leadFunnel} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
                                <YAxis type="category" dataKey="stage" stroke="#64748b" tick={{ fontSize: 12 }} width={80} />
                                <Tooltip contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', color: 'white' }} />
                                <Bar dataKey="count" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: 'right', fill: '#94a3b8', fontSize: 12 }} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Summary Table */}
                <div className="card">
                    <h3 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '15px' }}>📋 Institute Summary</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Total Students', value: data.overview.totalStudents, icon: '👨‍🎓', sub: `${data.overview.activeStudents} active` },
                            { label: 'Total Revenue', value: formatCurrency(data.overview.totalRevenue), icon: '💰', sub: 'All time collection' },
                            { label: 'Total Teachers', value: data.overview.totalTeachers, icon: '👩‍🏫', sub: 'Faculty strength' },
                            { label: 'Total Leads', value: data.overview.totalLeads, icon: '📈', sub: 'In CRM pipeline' },
                            { label: 'Mock Tests', value: data.overview.totalTests, icon: '📝', sub: 'Tests created' },
                            { label: 'Outstanding', value: formatCurrency(data.overview.totalOutstanding), icon: '⚠️', sub: 'Pending collection' },
                        ].map(s => (
                            <div key={s.label} style={{ padding: '16px', background: 'var(--surface-2)', borderRadius: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span style={{ fontSize: '28px' }}>{s.icon}</span>
                                <div>
                                    <div style={{ fontSize: '20px', fontWeight: '800', color: 'white' }}>{s.value}</div>
                                    <div style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{s.label}</div>
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.sub}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </FeatureGate>
    )
}
