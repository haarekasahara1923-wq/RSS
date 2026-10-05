'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'

export default function DooperSetupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', setupKey: '' })
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/dooper-admin/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setError(data.error || 'Setup failed')
        setLoading(false)
        return
      }
      localStorage.setItem('dooper_token', data.token)
      localStorage.setItem('dooper_admin', JSON.stringify(data.admin))
      setDone(true)
    } catch {
      setError('Network error')
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#04030a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', sans-serif" }}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>✅</div>
          <h1 style={{ fontWeight: '900', fontSize: '28px', marginBottom: '12px' }}>Dooper Admin Created!</h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: '24px' }}>Your platform admin account has been set up successfully.</p>
          <button onClick={() => router.push('/dooper-admin/dashboard')}
            style={{ padding: '14px 32px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: '700', cursor: 'pointer' }}>
            → Go to Dooper Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#04030a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: "'Inter', sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');`}</style>
      <div style={{ width: '100%', maxWidth: '440px' }}>
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🛠️</div>
          <div style={{ fontSize: '12px', fontWeight: '700', color: '#f87171', letterSpacing: '3px', textTransform: 'uppercase', marginBottom: '8px' }}>SCALEVO</div>
          <h1 style={{ fontSize: '22px', fontWeight: '900', color: 'white' }}>First-Time Dooper Admin Setup</h1>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px', marginTop: '6px' }}>This page is for one-time platform admin creation only.</p>
        </div>

        <div style={{ background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '18px', padding: '28px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '14px' }}>
            {[
              { label: 'Your Name *', key: 'name', type: 'text', placeholder: 'Admin Name' },
              { label: 'Email *', key: 'email', type: 'email', placeholder: 'admin@scalevo.com' },
              { label: 'Setup Key *', key: 'setupKey', type: 'text', placeholder: 'From DOOPER_SETUP_KEY env var' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>{f.label}</label>
                <input
                  type={f.type} required
                  value={(form as any)[f.key]}
                  onChange={e => set(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'rgba(255,255,255,0.5)', marginBottom: '5px' }}>Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Min 8 characters"
                  style={{ width: '100%', padding: '10px 48px 10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)} style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '40px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>}

            <button type="submit" disabled={loading}
              style={{ padding: '12px', background: 'linear-gradient(135deg, #dc2626, #991b1b)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer' }}>
              {loading ? 'Creating...' : '🔐 Create Dooper Admin'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
