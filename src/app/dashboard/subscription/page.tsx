'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState } from 'react'
import Script from 'next/script'
import Link from 'next/link'

const plans = [
    {
        name: 'Unlimited School Plan',
        price: 0,
        period: 'lifetime',
        features: ['Unlimited students', 'Unlimited teachers', 'Fee management', 'Attendance', 'Parent & Staff Portal', 'Mock tests & Exams', 'Reports & TC generation'],
        color: '#10b981',
        popular: true,
    },
]

export default function SubscriptionPage() {
    const { subscription, tenant, token } = useAuth()
    const currentPlan = 'UNLIMITED SCHOOL PLAN'
    const [loadingPlan, setLoadingPlan] = useState<string | null>(null)

    const handleUpgrade = async (planName: string, price: number) => {
        setLoadingPlan(planName)
        try {
            const res = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ amount: price, plan: planName })
            })
            const data = await res.json()

            if (data.success) {
                const options = {
                    key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                    amount: data.amount,
                    currency: data.currency,
                    name: 'UDBA',
                    description: `Upgrade to ${planName} Plan`,
                    order_id: data.orderId,
                    handler: async function (response: any) {
                        const verifyRes = await fetch('/api/razorpay/verify', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                razorpay_order_id: response.razorpay_order_id,
                                razorpay_payment_id: response.razorpay_payment_id,
                                razorpay_signature: response.razorpay_signature,
                                plan: planName
                            })
                        })
                        const verifyData = await verifyRes.json()
                        if (verifyData.success) {
                            alert('Payment Successful & Plan Upgraded!')
                            window.location.reload()
                        } else {
                            alert('Payment verification failed!')
                        }
                    },
                    prefill: {
                        name: tenant?.name || '',
                        email: tenant?.email || '',
                        contact: tenant?.phone || '',
                    },
                    theme: {
                        color: '#6366f1'
                    }
                }

                const rzp = new (window as any).Razorpay(options)
                rzp.on('payment.failed', function (response: any) {
                    alert('Payment Failed: ' + response.error.description)
                })
                rzp.open()
            } else {
                alert('Failed to initiate upgrade: ' + data.error)
            }
        } catch (error) {
            console.error('Checkout error:', error)
            alert('Something went wrong. Please try again later.')
        } finally {
            setLoadingPlan(null)
        }
    }

    const isExpired = false

    return (
        <div>
            <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />
            <div className="page-header">
                <div>
                    <h1 className="page-title">⭐ School License & Plan</h1>
                    <p className="page-subtitle">Unlimited access enabled for RSS Public School</p>
                </div>
            </div>

            {/* Current Plan */}
            <div className="card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(99,102,241,0.1))', border: '1px solid rgba(16,185,129,0.3)', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase', marginBottom: '6px' }}>Current License</div>
                        <div style={{ fontSize: '28px', fontWeight: '900', color: 'white', marginBottom: '6px' }}>
                            {currentPlan} {'✨'}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                            Status: <span style={{ color: '#10b981', fontWeight: '700' }}>ACTIVE (UNLIMITED)</span>
                            &nbsp;• Unlimited Students, Teachers & All Features Included
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '32px', fontWeight: '900', color: '#10b981' }}>
                            UNLIMITED
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No student limits</div>
                    </div>
                </div>
            </div>

            {/* Plan Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                {plans.map(plan => {
                    const isCurrentPlan = plan.name.toUpperCase() === currentPlan
                    return (
                        <div key={plan.name} style={{
                            padding: '28px', background: 'var(--surface)', border: `2px solid ${isCurrentPlan ? plan.color : 'var(--border)'}`,
                            borderRadius: '20px', position: 'relative', transition: 'all 0.3s ease',
                        }}>
                            {plan.popular && (
                                <div style={{ position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg, #ec4899, #6366f1)', padding: '4px 16px', borderRadius: '100px', fontSize: '11px', fontWeight: '700', color: 'white', whiteSpace: 'nowrap' }}>
                                    ⭐ MOST POPULAR
                                </div>
                            )}
                            {isCurrentPlan && (
                                <div style={{ position: 'absolute', top: '16px', right: '16px', padding: '4px 10px', background: `${plan.color}20`, border: `1px solid ${plan.color}`, borderRadius: '20px', fontSize: '11px', fontWeight: '700', color: plan.color }}>
                                    ✓ Current
                                </div>
                            )}
                            <div style={{ color: plan.color, fontSize: '13px', fontWeight: '700', marginBottom: '6px', textTransform: 'uppercase' }}>{plan.name}</div>
                            <div style={{ fontSize: '38px', fontWeight: '900', color: 'white', marginBottom: '20px' }}>
                                ₹{plan.price.toLocaleString('en-IN')}
                                <span style={{ fontSize: '14px', color: 'var(--text-muted)', fontWeight: '400' }}>/mo</span>
                            </div>
                            <ul style={{ listStyle: 'none', marginBottom: '24px' }}>
                                {plan.features.map(f => (
                                    <li key={f} style={{ display: 'flex', gap: '8px', marginBottom: '10px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                                        <span style={{ color: plan.color, fontWeight: '700' }}>✓</span> {f}
                                    </li>
                                ))}
                            </ul>
                            {(() => {
                                const isActiveCurrentPlan = isCurrentPlan && subscription?.status === 'ACTIVE'
                                const isTrialCurrentPlan = isCurrentPlan && subscription?.status === 'TRIAL'
                                const isDisabled = isActiveCurrentPlan || loadingPlan === plan.name

                                let btnText = `Upgrade to ${plan.name}`
                                if (loadingPlan === plan.name) btnText = 'Processing...'
                                else if (isActiveCurrentPlan) btnText = '✓ Active Plan'
                                else if (isTrialCurrentPlan) btnText = `Pay & Activate ${plan.name}`

                                return (
                                    <button
                                        className="btn"
                                        onClick={() => handleUpgrade(plan.name, plan.price)}
                                        disabled={isDisabled}
                                        style={{
                                            width: '100%', justifyContent: 'center',
                                            background: isActiveCurrentPlan ? 'var(--surface-3)' : `linear-gradient(135deg, ${plan.color}, ${plan.color}cc)`,
                                            color: isActiveCurrentPlan ? 'var(--text-muted)' : 'white',
                                            cursor: isActiveCurrentPlan ? 'not-allowed' : 'pointer',
                                            boxShadow: isActiveCurrentPlan ? 'none' : `0 4px 15px ${plan.color}40`,
                                        }}>
                                        {btnText}
                                    </button>
                                )
                            })()}
                        </div>
                    )
                })}
            </div>

            {/* Usage Stats */}
            <div className="card">
                <h3 style={{ fontWeight: '700', marginBottom: '20px', fontSize: '16px' }}>📊 Usage This Month</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                    {[
                        { label: 'Students', used: 6, limit: 500, color: '#6366f1' },
                        { label: 'Teachers', used: 3, limit: 10, color: '#ec4899' },
                        { label: 'API Calls', used: 124, limit: 10000, color: '#10b981' },
                        { label: 'WhatsApp Messages', used: 34, limit: 1000, color: '#25d366' },
                    ].map(u => (
                        <div key={u.label}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                <span style={{ fontSize: '13px', fontWeight: '600' }}>{u.label}</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{u.used}/{u.limit}</span>
                            </div>
                            <div className="progress-bar">
                                <div className="progress-fill" style={{ width: `${Math.min((u.used / u.limit) * 100, 100)}%`, background: u.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
