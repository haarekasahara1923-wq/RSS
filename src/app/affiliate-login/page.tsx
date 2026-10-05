'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

export default function AffiliateLoginPage() {
    const [form, setForm] = useState({ email: '', password: '' })
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError('')

        try {
            const res = await fetch('/api/affiliates/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            })
            const data = await res.json()

            if (!data.success) {
                setError(data.error || 'Login failed')
                setLoading(false)
                return
            }

            // Store auth data
            localStorage.setItem('udba_token', data.accessToken)
            localStorage.setItem('udba_user', JSON.stringify(data.user))
            localStorage.setItem('udba_refresh', data.refreshToken)
            localStorage.removeItem('udba_tenant')
            localStorage.removeItem('udba_subscription')

            window.location.href = '/dashboard/global-affiliate'
        } catch {
            setError('Network error. Please try again.')
            setLoading(false)
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at top right, rgba(16, 185, 129, 0.1) 0%, transparent 60%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 16px' }}>💰</div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', color: 'white' }}>Affiliate Login</h1>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '6px', fontSize: '14px' }}>Welcome back to UDBA Partner Program</p>
                </div>

                <div className="card" style={{ borderRadius: '20px', padding: '32px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '16px' }}>
                            <label className="label">Email / Mobile No.</label>
                            <input type="text" className="input" placeholder="rahul@example.com or 9876543210" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label className="label">Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="input"
                                    style={{ paddingRight: '48px' }}
                                    placeholder="••••••••"
                                    value={form.password}
                                    onChange={e => setForm({ ...form, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '4px',
                                        top: '0',
                                        bottom: '0',
                                        width: '42px',
                                        background: 'transparent',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: showPassword ? '#10b981' : 'rgba(255, 255, 255, 0.8)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '8px',
                                        zIndex: 10,
                                        transition: 'all 0.2s',
                                    }}
                                    onMouseEnter={e => {
                                        e.currentTarget.style.color = '#10b981'
                                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'
                                    }}
                                    onMouseLeave={e => {
                                        e.currentTarget.style.color = showPassword ? '#10b981' : 'rgba(255, 255, 255, 0.8)'
                                        e.currentTarget.style.background = 'transparent'
                                    }}
                                    title={showPassword ? 'Hide password' : 'Show password'}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '14px', color: '#fca5a5' }}>
                                ⚠️ {error}
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', fontSize: '15px', padding: '13px', background: 'linear-gradient(135deg, #10b981, #059669)' }}>
                            {loading ? <><div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Signing in...</> : 'Sign In'}
                        </button>
                    </form>

                    <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                        Don't have an affiliate account?{' '}
                        <Link href="/affiliate-register" style={{ color: '#10b981', fontWeight: '600' }}>Become a Partner</Link>
                    </p>
                </div>

                <p style={{ textAlign: 'center', marginTop: '16px', fontSize: '14px', color: 'var(--text-muted)' }}>
                    <Link href="/" style={{ color: 'var(--text-secondary)' }}>← Back to UDBA Home</Link>
                </p>
            </div>
        </div>
    )
}
