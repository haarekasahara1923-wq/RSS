'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function StaffLeavesPage() {
    const { token, user } = useAuth()
    const [leaves, setLeaves] = useState<any[]>([])
    const [startDate, setStartDate] = useState('')
    const [endDate, setEndDate] = useState('')
    const [reason, setReason] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [successMsg, setSuccessMsg] = useState('')

    useEffect(() => {
        if (!token || !(user as any)?.teacherProfile?.id) return
        fetchLeaves()
    }, [token, user])

    const fetchLeaves = async () => {
        try {
            const r = await fetch(`/api/teachers/leaves?teacherId=${(user as any)?.teacherProfile?.id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const res = await r.json()
            if (res.success) setLeaves(res.data)
        } catch (e) {
            console.error(e)
        }
    }

    const applyLeave = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg('')
        setSuccessMsg('')
        if (!(user as any)?.teacherProfile?.id) {
            setErrorMsg('Teacher profile not found. Please contact admin.')
            return
        }

        try {
            const r = await fetch('/api/teachers/leaves', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ teacherId: (user as any).teacherProfile.id, startDate, endDate, reason })
            })
            const res = await r.json()
            if (res.success) {
                setSuccessMsg('Leave applied successfully.')
                setStartDate('')
                setEndDate('')
                setReason('')
                fetchLeaves()
            } else {
                setErrorMsg(res.error || 'Failed to apply leave.')
            }
        } catch (e) {
            setErrorMsg('Network error.')
        }
    }

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>My Leave Applications</h1>

            {errorMsg && <div style={{ color: 'red', marginBottom: '16px' }}>{errorMsg}</div>}
            {successMsg && <div style={{ color: 'green', marginBottom: '16px' }}>{successMsg}</div>}

            <form onSubmit={applyLeave} className="card" style={{ padding: '24px', marginBottom: '32px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '600' }}>Apply for Leave</h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                        <label className="label">Start Date</label>
                        <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} className="input" />
                    </div>
                    <div>
                        <label className="label">End Date</label>
                        <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} className="input" />
                    </div>
                </div>
                <div>
                    <label className="label">Reason</label>
                    <textarea required value={reason} onChange={e => setReason(e.target.value)} className="input" rows={3} placeholder="Provide a valid reason..."></textarea>
                </div>
                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Submit Leave Application</button>
            </form>

            <div className="card" style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                    <thead>
                        <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                            <th style={{ padding: '12px 16px' }}>Start Date</th>
                            <th style={{ padding: '12px 16px' }}>End Date</th>
                            <th style={{ padding: '12px 16px' }}>Reason</th>
                            <th style={{ padding: '12px 16px' }}>Status</th>
                            <th style={{ padding: '12px 16px' }}>Applied On</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leaves.map((l: any) => (
                            <tr key={l.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                                <td style={{ padding: '12px 16px' }}>{new Date(l.startDate).toLocaleDateString()}</td>
                                <td style={{ padding: '12px 16px' }}>{new Date(l.endDate).toLocaleDateString()}</td>
                                <td style={{ padding: '12px 16px' }}>{l.reason}</td>
                                <td style={{ padding: '12px 16px' }}>
                                    <span style={{
                                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                                        backgroundColor: l.status === 'APPROVED' ? '#dcfce7' : l.status === 'REJECTED' ? '#fee2e2' : '#fef9c3',
                                        color: l.status === 'APPROVED' ? '#166534' : l.status === 'REJECTED' ? '#991b1b' : '#854d0e'
                                    }}>
                                        {l.status}
                                    </span>
                                </td>
                                <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '14px' }}>{new Date(l.createdAt).toLocaleDateString()}</td>
                            </tr>
                        ))}
                        {leaves.length === 0 && (
                            <tr><td colSpan={5} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>No leave applications found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
