'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AdminTeacherLeavesPage() {
    const { token } = useAuth()
    const [leaves, setLeaves] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => {
        if (token) fetchLeaves()
    }, [token])

    const fetchLeaves = async () => {
        setLoading(true)
        try {
            const r = await fetch('/api/teachers/leaves', {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) setLeaves(res.data)
        } catch (e) {
            console.error(e)
            setErrorMsg('Failed to fetch leaves')
        }
        setLoading(false)
    }

    const updateStatus = async (id: string, status: string) => {
        setErrorMsg('')
        setSuccessMsg('')
        try {
            const r = await fetch('/api/teachers/leaves', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id, status })
            })
            const res = await r.json()
            if (res.success) {
                setSuccessMsg(`Leave ${status.toLowerCase()} successfully.`)
                fetchLeaves()
            } else {
                setErrorMsg(res.error || 'Failed to update status.')
            }
        } catch (e) {
            setErrorMsg('Network error.')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Teacher Leave Approvals</h1>

            {errorMsg && <div style={{ color: 'red', marginBottom: '16px' }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: 'green', marginBottom: '16px' }}>{successMsg}</div>}

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Teacher</th>
                            <th style={{ padding: '12px 16px' }}>Start Date</th>
                            <th style={{ padding: '12px 16px' }}>End Date</th>
                            <th style={{ padding: '12px 16px' }}>Reason</th>
                            <th style={{ padding: '12px 16px' }}>Applied On</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center' }}>Loading...</td></tr>
                        ) : leaves.map((l: any) => (
                            <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px', fontWeight: 'bold' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        {l.teacher?.photo ? (
                                            <img src={l.teacher.photo} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }} />
                                        ) : (
                                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{l.teacher?.name?.[0]}</div>
                                        )}
                                        {l.teacher?.name || 'Unknown'}
                                    </div>
                                </td>
                                <td style={{ padding: '12px 16px' }}>{new Date(l.startDate).toLocaleDateString()}</td>
                                <td style={{ padding: '12px 16px' }}>{new Date(l.endDate).toLocaleDateString()}</td>
                                <td style={{ padding: '12px 16px', maxWidth: '200px' }}>{l.reason}</td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '14px' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: l.status === 'APPROVED' ? '#dcfce7' : l.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                                        color: l.status === 'APPROVED' ? '#166534' : l.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                                    }}>
                                        {l.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px' }}>
                                    {l.status === 'PENDING' ? (
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => updateStatus(l.id, 'APPROVED')} className="btn" style={{ padding: '6px 12px', background: '#22c55e', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Approve</button>
                                            <button onClick={() => updateStatus(l.id, 'REJECTED')} className="btn" style={{ padding: '6px 12px', background: '#ef4444', color: 'white', borderRadius: '6px', fontSize: '12px', border: 'none', cursor: 'pointer' }}>Reject</button>
                                        </div>
                                    ) : (
                                        <span style={{ color: '#94a3b8', fontSize: '14px' }}>Resolved</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {!loading && leaves.length === 0 && (
                            <tr><td colSpan={7} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>No leave applications found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
