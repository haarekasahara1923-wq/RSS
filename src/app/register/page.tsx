'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'

const REGISTRABLE_ROLES = [
  { key: 'TEACHER', label: 'Teacher', icon: '👩‍🏫' },
  { key: 'PARENT', label: 'Parent', icon: '👨‍👩‍👧' },
  { key: 'STUDENT', label: 'Student', icon: '👨‍🎓' },
  { key: 'SUPER_ADMIN', label: 'Super Admin', icon: '🏫' },
]

export default function RegisterPage() {
  const router = useRouter()
  const [role, setRole] = useState('STUDENT')
  const [name, setName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [schoolCode, setSchoolCode] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [schoolCodeError, setSchoolCodeError] = useState('')

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSchoolCodeError('')

    if (!schoolCode.trim()) {
      setSchoolCodeError('School ID is required. Please enter the School ID provided by your school administration.')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long')
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    const isEmail = identifier.includes('@')
    const email = isEmail ? identifier : identifier + '@udba.local'
    const phone = isEmail ? undefined : identifier

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, password, role, schoolCode: schoolCode.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (!res.ok || !data.success) {
        if (data.error?.toLowerCase().includes('school') || data.error?.toLowerCase().includes('invalid')) {
          setSchoolCodeError(data.error)
        } else {
          setError(data.error || 'Registration failed')
        }
        setLoading(false)
        return
      }

      localStorage.setItem('scalevo_token', data.accessToken)
      localStorage.setItem('scalevo_user', JSON.stringify(data.user))
      localStorage.setItem('scalevo_tenant', JSON.stringify(data.tenant))
      localStorage.setItem('scalevo_refresh', data.refreshToken)

      if (role === 'STUDENT') router.push('/portal/student')
      else if (role === 'PARENT') router.push('/portal/parent')
      else if (role === 'TEACHER') router.push('/portal/staff')
      else router.push('/dashboard')
    } catch (err: any) {
      setError(err?.message || 'Network error occurred')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1208', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, rgba(26,92,56,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '480px', position: 'relative' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '56px', height: '56px', background: 'linear-gradient(135deg, #8b5cf6, #6366f1)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', margin: '0 auto 14px', boxShadow: '0 8px 30px rgba(139,92,246,0.4)' }}>🏫</div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>RSS Public School</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '4px' }}>School Management Portal — Account Create Karein</p>
        </div>

        <div style={{ background: '#111a0e', border: '1px solid rgba(26,92,56,0.25)', borderRadius: '20px', padding: '28px', boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}>
          
          {/* Info banner */}
          <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: '12px', padding: '12px 16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: '800', color: '#fbbf24', letterSpacing: '0.5px', marginBottom: '4px' }}>🔑 School ID Required</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.55)', lineHeight: '1.6' }}>
              You need a <strong style={{ color: 'rgba(255,255,255,0.8)' }}>Unique School ID</strong> to register. 
              Get it from your school administration (format: SCL-YEAR-XXXX).
            </div>
          </div>

          {/* Role Selector */}
          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>I am a *</label>
            <div style={{ display: 'flex', gap: '8px', background: '#172014', padding: '4px', borderRadius: '12px' }}>
              {REGISTRABLE_ROLES.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setRole(r.key)}
                  style={{
                    flex: 1, padding: '10px 4px', borderRadius: '8px', border: 'none',
                    background: role === r.key ? 'linear-gradient(135deg, #1a5c38, #0f3d26)' : 'transparent',
                    color: role === r.key ? 'white' : 'rgba(255,255,255,0.4)',
                    fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                    boxShadow: role === r.key ? '0 2px 12px rgba(26,92,56,0.4)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {role === 'SUPER_ADMIN' ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>🏫</div>
              <h3 style={{ color: 'white', fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Register Your School</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', lineHeight: '1.5', marginBottom: '24px' }}>
                As a Super Admin, you need to register your school first. Once registered, you'll receive a Unique School ID to share with your staff and students.
              </p>
              <button type="button" onClick={() => router.push('/school-signup')}
                style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #f97316, #ea580c)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 16px rgba(234,88,12,0.35)' }}>
                🚀 Proceed to School Registration
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister}>
              {/* School ID Field */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>
                  🔑 School ID *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    value={schoolCode}
                    onChange={e => { setSchoolCode(e.target.value.toUpperCase()); setSchoolCodeError('') }}
                    placeholder="e.g. SCL-2026-AB3F"
                    maxLength={14}
                    style={{
                      width: '100%', padding: '11px 14px',
                      background: schoolCodeError ? 'rgba(239,68,68,0.06)' : 'rgba(251,191,36,0.06)',
                      border: schoolCodeError ? '1.5px solid rgba(239,68,68,0.5)' : '1.5px solid rgba(251,191,36,0.35)',
                      borderRadius: '10px', color: '#fbbf24', fontSize: '15px', fontWeight: '800',
                      fontFamily: 'monospace', outline: 'none', letterSpacing: '2px', boxSizing: 'border-box' as const,
                    }}
                  />
                </div>
                {schoolCodeError && (
                  <div style={{ marginTop: '6px', fontSize: '12px', color: '#f87171', display: 'flex', alignItems: 'flex-start', gap: '5px' }}>
                    ⚠️ {schoolCodeError}
                  </div>
                )}
                {!schoolCodeError && schoolCode && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'rgba(251,191,36,0.6)' }}>
                    Your data will be linked to the school with this ID
                  </div>
                )}
              </div>

              {/* Name */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Full Name *</label>
                <input
                  type="text" required value={name} onChange={e => setName(e.target.value)}
                  placeholder="Enter full name"
                  style={{ width: '100%', padding: '10px 14px', background: '#172014', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>

              {/* Email / Phone */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Email / Mobile No. *</label>
                <input
                  type="text" required value={identifier} onChange={e => setIdentifier(e.target.value)}
                  placeholder="name@example.com or 9876543210"
                  style={{ width: '100%', padding: '10px 14px', background: '#172014', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'} required value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    style={{ width: '100%', padding: '10px 48px 10px 14px', background: '#172014', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: '6px' }}>Confirm Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'} required value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    style={{ width: '100%', padding: '10px 48px 10px 14px', background: '#172014', border: '1px solid rgba(26,92,56,0.3)', borderRadius: '10px', color: 'white', fontSize: '14px', outline: 'none', boxSizing: 'border-box' as const }}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '42px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '10px', padding: '10px', marginBottom: '14px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>
              )}

              <button type="submit" disabled={loading}
                style={{ width: '100%', padding: '13px', background: loading ? '#1a5c38' : 'linear-gradient(135deg, #1a5c38, #0f3d26)', color: 'white', border: '1px solid rgba(45,138,87,0.4)', borderRadius: '12px', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 16px rgba(26,92,56,0.35)' }}>
                {loading ? (
                  <>
                    <div style={{ width: '16px', height: '16px', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Creating Account...
                  </>
                ) : '✨ Create Account & Login'}
              </button>
            </form>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#4ade80', fontWeight: '700', textDecoration: 'none' }}>Sign In here</Link>
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.2)', marginTop: '6px' }}>
            Super Admin?{' '}
            <Link href="/school-signup" style={{ color: 'rgba(249,115,22,0.7)', textDecoration: 'none' }}>Register your school here</Link>
          </p>
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
