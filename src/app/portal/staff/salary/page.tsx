'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function StaffSalaryLedgerPage() {
    const { token, user } = useAuth()
    const [ledgers, setLedgers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (token && (user as any)?.teacherProfile?.id) {
            fetchLedgers()
        }
    }, [token, user])

    const fetchLedgers = async () => {
        setLoading(true)
        try {
            const r = await fetch(`/api/teachers/ledger?teacherId=${(user as any)?.teacherProfile?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) {
                setLedgers(res.data)
            }
        } catch (e) {
            console.error(e)
        }
        setLoading(false)
    }

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"
    ]

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>My Salary Ledger</h1>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Month/Year</th>
                            <th style={{ padding: '12px 16px' }}>Base Salary</th>
                            <th style={{ padding: '12px 16px' }}>Deductions</th>
                            <th style={{ padding: '12px 16px' }}>Net Payable</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Paid Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : ledgers.map((l: any) => (
                            <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>{monthNames[l.month - 1]} {l.year}</td>
                                <td style={{ padding: '12px 16px' }}>₹{l.baseSalary}</td>
                                <td style={{ padding: '12px 16px', color: '#ef4444' }}>-₹{l.deductions}</td>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold', color: '#10b981' }}>₹{l.netPayable}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: l.status === 'PAID' ? '#dcfce7' : '#fef9c3',
                                        color: l.status === 'PAID' ? '#166534' : '#854d0e'
                                    }}>
                                        {l.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b' }}>
                                    {l.paidDate ? new Date(l.paidDate).toLocaleDateString() : '-'}
                                </td>
                            </tr>
                        ))}
                        {!loading && ledgers.length === 0 && (
                            <tr><td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No salary records found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
