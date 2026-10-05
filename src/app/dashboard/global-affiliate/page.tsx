'use client'
import { useState, useEffect } from 'react'

export default function AffiliateDashboard() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('udba_token')
            const res = await fetch('/api/global-affiliate/dashboard', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const result = await res.json()
            if (result.success) setData(result)
        } catch (error) {
            console.error(error)
        }
        setLoading(false)
    }

    if (loading) return <div style={{ padding: '20px', color: 'var(--text-secondary)' }}>Loading your dashboard...</div>
    if (!data) return <div style={{ padding: '20px', color: '#ef4444' }}>Failed to load dashboard</div>

    const currentDomain = typeof window !== 'undefined' ? window.location.origin : ''
    const affiliateLink = `${currentDomain}/register?ref=${data.affiliateCode}`

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px 0', color: 'white' }}>Affiliate Dashboard</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Track your referrals and earnings</p>
                </div>
                <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--surface-2)' }}>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Your Referral Link</div>
                        <div style={{ fontSize: '15px', fontWeight: '600', color: 'var(--primary-light)' }}>{affiliateLink}</div>
                    </div>
                    <button
                        className="btn btn-secondary"
                        onClick={() => { navigator.clipboard.writeText(affiliateLink); alert('Copied!') }}
                    >
                        Copy
                    </button>
                </div>
            </div>

            <div className="stats-grid" style={{ marginBottom: '24px' }}>
                <div className="stat-card">
                    <div className="stat-value">{data.stats.totalReferred}</div>
                    <div className="stat-label">Total Referrals</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{data.stats.activeTenants} Active</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">₹{data.stats.totalEarned.toLocaleString()}</div>
                    <div className="stat-label">Total Earnings</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: '#fbbf24' }}>₹{data.stats.pendingPayouts.toLocaleString()}</div>
                    <div className="stat-label">Pending Payout</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--success)' }}>₹{data.stats.paidPayouts.toLocaleString()}</div>
                    <div className="stat-label">Total Paid</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '24px' }}>
                <div className="card" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Monthly Earnings Breakup</h2>
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Month</th>
                                <th>Sub Commission</th>
                                <th>Marketplace</th>
                                <th style={{ textAlign: 'right' }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.monthlyEarnings.map((m: any, i: number) => (
                                <tr key={i}>
                                    <td>{m.month}</td>
                                    <td>₹{m.sub.toLocaleString()}</td>
                                    <td>₹{m.mkt.toLocaleString()}</td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', color: 'var(--primary-light)' }}>₹{m.total.toLocaleString()}</td>
                                </tr>
                            ))}
                            {data.monthlyEarnings.length === 0 && (
                                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No earnings yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="card" style={{ padding: '24px' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Payout History</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {data.payouts.map((p: any) => (
                            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px', background: 'var(--surface-2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{p.month}</div>
                                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status: {p.payoutStatus}</div>
                                </div>
                                <div style={{ fontWeight: '700', color: 'white' }}>₹{p.totalPayoutAmount.toLocaleString()}</div>
                            </div>
                        ))}
                        {data.payouts.length === 0 && (
                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No payouts yet</div>
                        )}
                    </div>
                </div>
            </div>

            <div className="card" style={{ padding: '24px', marginTop: '24px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Your Referrals</h2>
                <table className="table">
                    <thead>
                        <tr>
                            <th>Coaching Name</th>
                            <th>Signup Date</th>
                            <th style={{ textAlign: 'right' }}>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.referrals.map((r: any) => (
                            <tr key={r.id}>
                                <td>{r.tenantName}</td>
                                <td>{new Date(r.referralDate).toLocaleDateString()}</td>
                                <td style={{ textAlign: 'right' }}>
                                    <span className={`badge ${r.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                                        {r.status}
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {data.referrals.length === 0 && (
                            <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>No referrals yet. Share your link!</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    )
}
