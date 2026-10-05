'use client'
import { useState } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage('')
        setError('')
        try {
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            })
            const data = await res.json()
            if (data.success) {
                setMessage(data.message)
            } else {
                setError(data.error || 'Something went wrong. Please try again.')
            }
        } catch {
            setError('Network error. Please check your connection and try again.')
        }
        setLoading(false)
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0a1208', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(26,92,56,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

            <div style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
                {/* Header */}
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{ width: '64px', height: '64px', background: 'linear-gradient(135deg, #1a5c38, #f97316)', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', margin: '0 auto 14px', boxShadow: '0 8px 32px rgba(26,92,56,0.4)' }}>🔑</div>
                    <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white', lineHeight: 1.2 }}>Forgot Password?</h1>
                    <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '6px' }}>
                        RSS Public School — Management System
                    </p>
                </div>

                <div style={{ background: '#111a0e', border: '1px solid rgba(26,92,56,0.25)', borderRadius: '20px', padding: '32px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
                    {message ? (
                        // Success state
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '56px', marginBottom: '16px' }}>📧</div>
                            <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: '0 0 10px 0' }}>
                                Check Your Email!
                            </h2>
                            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6, marginBottom: '8px' }}>
                                {message}
                            </p>
                            <div style={{ background: 'rgba(26,92,56,0.1)', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', padding: '12px', margin: '16px 0', fontSize: '12px', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                                💡 <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Tip:</strong> If you don't see the email in your inbox, check your <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Spam / Junk</strong> folder. The link expires in 1 hour.
                            </div>
                            <Link href="/login"
                                style={{ display: 'block', width: '100%', padding: '12px', background: 'linear-gradient(135deg, #1a5c38, #0f3d26)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', textDecoration: 'none', textAlign: 'center', marginTop: '8px', boxShadow: '0 4px 16px rgba(26,92,56,0.35)' }}>
                                ← Return to Login
                            </Link>
                        </div>
                    ) : (
                        // Form state
                        <>
                            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '20px', lineHeight: 1.6 }}>
                                Enter your registered email address below. We'll send you a secure link to reset your password.
                            </p>

                            <form onSubmit={handleSubmit}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>
                                        📧 Registered Email Address
                                    </label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        placeholder="name@example.com"
                                        required
                                        style={{
                                            width: '100%', padding: '12px 14px',
                                            background: '#172014', border: '1px solid rgba(26,92,56,0.3)',
                                            borderRadius: '10px', color: 'white', fontSize: '14px',
                                            outline: 'none', fontFamily: 'inherit',
                                        }}
                                        onFocus={e => e.target.style.borderColor = '#2d8a57'}
                                        onBlur={e => e.target.style.borderColor = 'rgba(26,92,56,0.3)'}
                                    />
                                </div>

                                {error && (
                                    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '13px', color: '#fca5a5' }}>
                                        ⚠️ {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    style={{
                                        width: '100%', padding: '13px',
                                        background: loading ? '#1a5c38' : 'linear-gradient(135deg, #1a5c38, #0f3d26)',
                                        color: 'white', border: '1px solid rgba(45,138,87,0.4)',
                                        borderRadius: '12px', fontSize: '14px', fontWeight: '700',
                                        cursor: loading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                                        boxShadow: '0 4px 16px rgba(26,92,56,0.35)',
                                        opacity: loading ? 0.8 : 1,
                                    }}
                                >
                                    {loading ? (
                                        <>
                                            <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                                            Sending reset link...
                                        </>
                                    ) : '📨 Send Password Reset Link'}
                                </button>
                            </form>
                        </>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)' }}>
                        Remember your password?{' '}
                        <Link href="/login" style={{ color: '#4ade80', fontWeight: '700', textDecoration: 'none' }}>
                            Sign In here
                        </Link>
                    </p>
                    <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '10px' }}>
                        Need help?{' '}
                        <a href="https://wa.me/917879337770" target="_blank" rel="noopener noreferrer" style={{ color: '#25d366', fontWeight: '600', textDecoration: 'none' }}>
                            WhatsApp: +91 7879337770
                        </a>
                    </p>
                </div>
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}
