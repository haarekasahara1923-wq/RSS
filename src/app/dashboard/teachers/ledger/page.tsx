'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminPayrollLedgerPage() {
    const { token } = useAuth()
    const [ledgers, setLedgers] = useState<any[]>([])
    const [teachers, setTeachers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
    const [generating, setGenerating] = useState(false)
    const [msg, setMsg] = useState('')

    useEffect(() => {
        if (token) {
            fetchTeachers()
            fetchLedgers()
        }
    }, [token, selectedMonth, selectedYear])

    const fetchTeachers = async () => {
        try {
            const r = await fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
            const res = await r.json()
            if (res.success) setTeachers(res.data)
        } catch (e) { console.error(e) }
    }

    const fetchLedgers = async () => {
        setLoading(true)
        try {
            const r = await fetch(`/api/teachers/ledger?month=${selectedMonth}&year=${selectedYear}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) setLedgers(res.data)
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const generateAllSalaries = async () => {
        setGenerating(true)
        setMsg('')
        try {
            // Sequential generation for simplicity
            for (const teacher of teachers) {
                await fetch('/api/teachers/ledger', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ teacherId: teacher.id, month: selectedMonth, year: selectedYear })
                })
            }
            setMsg('Salaries generated successfully based on attendance and leaves.')
            fetchLedgers()
        } catch (e) {
            setMsg('Error generating salaries.')
        }
        setGenerating(false)
    }

    const paySalary = async (ledgerId: string) => {
        setMsg('')
        try {
            const r = await fetch('/api/teachers/ledger', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ ledgerId })
            })
            const res = await r.json()
            if (res.success) {
                setMsg('Salary Paid. Expense ledger updated automatically.')
                fetchLedgers()
            } else {
                setMsg(res.error || 'Failed to pay.')
            }
        } catch (e) {
            setMsg('Network error.')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Teacher Payroll & Ledger</h1>
                
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <select value={selectedMonth} onChange={e => setSelectedMonth(Number(e.target.value))} className="input">
                        {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <input type="number" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))} className="input" style={{ width: '100px' }} />
                    
                    <button onClick={generateAllSalaries} disabled={generating} className="btn btn-primary" style={{ whiteSpace: 'nowrap' }}>
                        {generating ? 'Generating...' : 'Calculate Salaries'}
                    </button>
                </div>
            </div>

            {msg && <div style={{ padding: '12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '8px', marginBottom: '24px' }}>{msg}</div>}

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Teacher</th>
                            <th style={{ padding: '12px 16px' }}>Base Salary</th>
                            <th style={{ padding: '12px 16px' }}>Deductions (Absents)</th>
                            <th style={{ padding: '12px 16px' }}>Net Payable</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center' }}>Loading ledger...</td></tr>
                        ) : ledgers.map((l: any) => (
                            <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{l.teacher?.name}</td>
                                <td style={{ padding: '12px 16px' }}>₹{l.baseSalary}</td>
                                <td style={{ padding: '12px 16px', color: 'red' }}>- ₹{l.deductions}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#16a34a' }}>₹{l.netPayable}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: l.status === 'PAID' ? '#dcfce7' : '#fee2e2',
                                        color: l.status === 'PAID' ? '#166534' : '#991b1b'
                                    }}>
                                        {l.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    {l.status === 'UNPAID' ? (
                                        <button onClick={() => paySalary(l.id)} className="btn" style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Mark Paid</button>
                                    ) : (
                                        <span style={{ color: '#64748b', fontSize: '12px' }}>Paid on {new Date(l.paidDate).toLocaleDateString()}</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && ledgers.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No salaries calculated for this month. Click Calculate Salaries.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
