'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function AffiliateDashboard() {
    const { tenant, token } = useAuth()
    const [data, setData] = useState<any>(null)
    const [withdrawals, setWithdrawals] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const [bankData, setBankData] = useState({ upiId: '', bankAccountNo: '', ifscCode: '' })
    const [amountOptions, setAmountOptions] = useState({ amount: 0 })

    const authHeaders = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }

    useEffect(() => {
        if (tenant) fetchData()
    }, [tenant])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/coaching/affiliate', { headers: authHeaders })
            const json = await res.json()
            if (!json.error) {
                setData(json.details)
                setWithdrawals(json.withdrawals)
                setBankData({
                    upiId: json.details.upiId || '',
                    bankAccountNo: json.details.bankAccountNo || '',
                    ifscCode: json.details.ifscCode || ''
                })
            }
        } catch (e) { console.error(e) }
        setLoading(false)
    }

    const handleUpdateBank = async () => {
        try {
            const res = await fetch('/api/coaching/affiliate/bank', {
                method: 'POST', headers: authHeaders, body: JSON.stringify(bankData)
            })
            if (res.ok) alert('Bank details updated successfully!')
        } catch (e) { console.error(e) }
    }

    const handleWithdrawalRequest = async () => {
        if (amountOptions.amount <= 0 || amountOptions.amount > data.availableBalance) {
            alert('Invalid amount'); return
        }
        if (!bankData.upiId && (!bankData.bankAccountNo || !bankData.ifscCode)) {
            alert('Please save your UPI ID or Bank Details first.'); return
        }
        try {
            const res = await fetch('/api/coaching/affiliate/withdraw', {
                method: 'POST', headers: authHeaders, body: JSON.stringify({ amount: amountOptions.amount })
            })
            if (res.ok) { alert('Withdrawal requested successfully!'); setAmountOptions({ amount: 0 }); fetchData() }
            else { const err = await res.json(); alert('Error: ' + err.error) }
        } catch (e) { console.error(e) }
    }

    const handlePaySubscription = async () => {
        const selectElement = document.getElementById('pay-sub-plan') as HTMLSelectElement
        const [targetPlan, targetCost] = selectElement.value.split(',')
        const cost = Number(targetCost)
        if (data.availableBalance < cost) { alert('Insufficient balance.'); return }
        if (!window.confirm(`Pay ₹${cost} for 1 month of ${targetPlan} plan?`)) return
        try {
            const res = await fetch('/api/coaching/affiliate/pay-subscription', {
                method: 'POST', headers: authHeaders, body: JSON.stringify({ plan: targetPlan, cost })
            })
            if (res.ok) { alert('Subscription successfully activated!'); fetchData() }
            else { const err = await res.json(); alert(err.error || 'Failed') }
        } catch (e) { console.error(e) }
    }

    const affiliateLink = typeof window !== 'undefined' ? `${window.location.origin}/gyankosh?ref=${tenant?.id}` : ''

    if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading Affiliate details...</div>
    if (!data) return <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Could not load affiliate data. Please try again later.</div>

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {/* Banner */}
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px', padding: '32px', marginBottom: '24px', color: 'white' }}>
                <h2 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '8px' }}>Gyankosh Affiliate Program</h2>
                <p style={{ opacity: 0.9, marginBottom: '20px' }}>Share your unique link with students. Earn flat 20% on every purchase!</p>
                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ flex: 1, wordBreak: 'break-all' }}>
                        <span style={{ fontSize: '13px', opacity: 0.8, display: 'block', marginBottom: '4px' }}>Your Affiliate Link</span>
                        <strong style={{ fontSize: '16px' }}>{affiliateLink}</strong>
                    </div>
                    <button style={{ background: 'white', color: '#10b981', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                        onClick={() => { navigator.clipboard.writeText(affiliateLink); alert('Link copied!') }}>Copy Link</button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px', marginBottom: '24px' }}>
                {/* Earnings Card */}
                <div className="card">
                    <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Earnings Balance</h3>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Total Earnings (Lifetime)</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold' }}>₹{data.totalEarnings || 0}</div>
                    </div>
                    <div style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Available to Withdraw</div>
                        <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>₹{data.availableBalance || 0}</div>
                    </div>
                    <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', marginTop: '24px' }}>
                        <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Request Payout</h4>
                        <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                            <input type="number" className="input" placeholder="Amount" value={amountOptions.amount} onChange={e => setAmountOptions({ amount: Number(e.target.value) })} style={{ flex: 1 }} />
                            <button className="btn btn-primary" onClick={handleWithdrawalRequest}>Withdraw</button>
                        </div>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>* Payouts processed on 10th of every month.</p>
                    </div>
                    <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '8px', marginTop: '16px' }}>
                        <h4 style={{ fontSize: '14px', marginBottom: '12px' }}>Pay Subscription with Earnings</h4>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <select className="input" style={{ flex: 1 }} id="pay-sub-plan">
                                <option value="BASIC,999">Basic - ₹999/mo</option>
                                <option value="PRO,2999">Pro - ₹2999/mo</option>
                                <option value="ELITE,5999">Elite - ₹5999/mo</option>
                            </select>
                            <button className="btn" style={{ background: '#10b981', color: 'white', border: 'none', fontWeight: 'bold' }} onClick={handlePaySubscription}>Pay & Upgrade</button>
                        </div>
                    </div>
                </div>

                {/* Bank Details Card */}
                <div className="card">
                    <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Payout Preferences</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>UPI ID</label>
                            <input type="text" className="input" style={{ width: '100%' }} value={bankData.upiId} onChange={e => setBankData({ ...bankData, upiId: e.target.value })} placeholder="example@upi" />
                        </div>
                        <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>OR BANK ACCOUNT</div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Account Number</label>
                            <input type="text" className="input" style={{ width: '100%' }} value={bankData.bankAccountNo} onChange={e => setBankData({ ...bankData, bankAccountNo: e.target.value })} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '4px' }}>IFSC Code</label>
                            <input type="text" className="input" style={{ width: '100%' }} value={bankData.ifscCode} onChange={e => setBankData({ ...bankData, ifscCode: e.target.value })} />
                        </div>
                        <button className="btn btn-secondary" onClick={handleUpdateBank} style={{ alignSelf: 'flex-start' }}>Save Details</button>
                    </div>
                </div>
            </div>

            {/* Withdrawal History */}
            <div className="card">
                <h3 style={{ fontSize: '16px', color: 'var(--text-secondary)', marginBottom: '16px' }}>Withdrawal History</h3>
                {withdrawals.length === 0 ? (
                    <div style={{ color: 'var(--text-muted)' }}>No withdrawals requested yet.</div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead><tr><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                            <tbody>
                                {withdrawals.map(w => (
                                    <tr key={w.id}>
                                        <td>{new Date(w.requestedAt).toLocaleDateString()}</td>
                                        <td>₹{w.amount}</td>
                                        <td><span className={`badge ${w.status === 'PENDING' ? 'badge-warning' : w.status === 'PAID' ? 'badge-success' : 'badge-danger'}`}>{w.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
