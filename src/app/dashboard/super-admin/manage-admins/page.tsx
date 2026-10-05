'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { Eye, EyeOff, Trash2, ShieldOff, ShieldCheck, Plus, X } from 'lucide-react'

const ADMIN_SUB_ROLES = [
  { key: 'ADMIN_OPERATION', label: 'Admin Operation', icon: '⚙️', color: '#6366f1', desc: 'Class, Batch, Student, Staff, Fee management' },
  { key: 'ADMIN_LIBRARY', label: 'Admin Library', icon: '📚', color: '#10b981', desc: 'Library management, add students to library' },
  { key: 'ADMIN_SPORTS', label: 'Admin Sports', icon: '🏆', color: '#f59e0b', desc: 'Sports management, assign students' },
  { key: 'ADMIN_TRANSPORT', label: 'Admin Transport', icon: '🚌', color: '#ef4444', desc: 'Vehicle & driver management, assign routes' },
]

export default function ManageAdminsPage() {
  const { token, user } = useAuth()
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', password: '', role: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchAdmins = async () => {
    if (!token) return
    const res = await fetch('/api/admin-management', { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    if (data.success) setAdmins(data.admins)
    setLoading(false)
  }

  useEffect(() => { fetchAdmins() }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    if (!form.role) { setError('Please select an admin role'); setSubmitting(false); return }

    const res = await fetch('/api/admin-management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSubmitting(false)

    if (!data.success) {
      setError(data.error || 'Failed to create admin')
    } else {
      setSuccess(`✅ ${form.name} created successfully as ${form.role.replace('_', ' ')}!`)
      setForm({ name: '', phone: '', password: '', role: '' })
      setShowForm(false)
      fetchAdmins()
    }
  }

  const handleToggleBlock = async (adminId: string, currentStatus: boolean) => {
    await fetch('/api/admin-management', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ adminId, isActive: !currentStatus }),
    })
    fetchAdmins()
  }

  const handleDelete = async (adminId: string, adminName: string) => {
    if (!confirm(`Are you sure you want to delete ${adminName}? This action cannot be undone.`)) return
    await fetch(`/api/admin-management?adminId=${adminId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    })
    fetchAdmins()
  }

  const roleInfo = (role: string) => ADMIN_SUB_ROLES.find(r => r.key === role)

  return (
    <div style={{ padding: '20px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: 'white', margin: 0 }}>👑 Manage Sub-Admins</h1>
          <p style={{ fontSize: '13px', color: '#64748b', margin: '4px 0 0 0' }}>
            Create and manage up to 5 admin portals • {admins.length}/5 used
          </p>
        </div>
        {admins.length < 5 && (
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '10px 18px', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: 'pointer' }}
          >
            <Plus size={16} /> Create Admin
          </button>
        )}
      </div>

      {/* Role Permission Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {ADMIN_SUB_ROLES.map(r => (
          <div key={r.key} style={{ background: '#1e293b', border: `1px solid ${r.color}30`, borderRadius: '12px', padding: '14px' }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>{r.icon}</div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: 'white', marginBottom: '4px' }}>{r.label}</div>
            <div style={{ fontSize: '11px', color: '#64748b' }}>{r.desc}</div>
            <div style={{ marginTop: '8px', fontSize: '10px', color: '#f87171', fontWeight: '600' }}>
              ⛔ Cannot: Edit / Delete / Block
            </div>
          </div>
        ))}
      </div>

      {/* Success */}
      {success && (
        <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#6ee7b7', display: 'flex', justifyContent: 'space-between' }}>
          {success}
          <button onClick={() => setSuccess('')} style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer' }}><X size={16} /></button>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: '0 0 16px 0' }}>+ Create New Admin</h3>
          <form onSubmit={handleCreate}>
            {/* Role Selection */}
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '8px' }}>Select Admin Role *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {ADMIN_SUB_ROLES.map(r => (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => setForm({ ...form, role: r.key })}
                    style={{
                      padding: '10px', borderRadius: '10px', border: `2px solid ${form.role === r.key ? r.color : '#334155'}`,
                      background: form.role === r.key ? `${r.color}20` : '#0f172a',
                      color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: '600'
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>{r.icon}</span>
                    <div style={{ textAlign: 'left' }}>
                      <div>{r.label}</div>
                      <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '400' }}>{r.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Full Name *</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Admin's full name"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Mobile Number *</label>
                <input
                  type="text" required value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#94a3b8', marginBottom: '6px' }}>Set Password *</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 6 characters"
                  style={{ width: '100%', padding: '10px 48px 10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '13px', outline: 'none' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: '4px', top: 0, bottom: 0, width: '40px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px', marginBottom: '12px', fontSize: '13px', color: '#fca5a5' }}>⚠️ {error}</div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="submit" disabled={submitting}
                style={{ flex: 1, padding: '11px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '14px', cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                {submitting ? 'Creating...' : '✅ Create Admin'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); setError('') }}
                style={{ padding: '11px 16px', background: '#334155', color: '#94a3b8', border: 'none', borderRadius: '10px', fontWeight: '600', fontSize: '14px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Admins List */}
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #334155' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', margin: 0 }}>Active Admins ({admins.length})</h2>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading...</div>
        ) : admins.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏛️</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>No sub-admins created yet</div>
            <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Create up to 5 specialized admin accounts for your school.</p>
          </div>
        ) : (
          admins.map((admin: any) => {
            const info = roleInfo(admin.role)
            return (
              <div key={admin.id} style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '42px', height: '42px', background: `${info?.color || '#6366f1'}20`, border: `2px solid ${info?.color || '#6366f1'}40`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                    {info?.icon || '👤'}
                  </div>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{admin.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      <span style={{ color: info?.color || '#6366f1', fontWeight: '600' }}>{info?.label || admin.role}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'white', marginTop: '8px', background: '#0f172a', padding: '6px 10px', borderRadius: '6px', border: '1px solid #334155', display: 'flex', gap: '16px', alignItems: 'center' }}>
                      <div>📱 <span style={{ fontWeight: '700', color: '#4ade80' }}>{admin.phone}</span></div>
                      <div>🔑 <span style={{ fontWeight: '700', color: '#facc15' }}>{admin.plainPassword || '••••••'}</span></div>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: admin.isActive ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: admin.isActive ? '#10b981' : '#ef4444', border: `1px solid ${admin.isActive ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}` }}>
                    {admin.isActive ? '✅ Active' : '🔴 Blocked'}
                  </span>
                  <button onClick={() => handleToggleBlock(admin.id, admin.isActive)}
                    style={{ padding: '7px', background: 'rgba(99,102,241,0.1)', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer', color: admin.isActive ? '#f59e0b' : '#10b981', display: 'flex', alignItems: 'center' }}
                    title={admin.isActive ? 'Block Admin' : 'Unblock Admin'}>
                    {admin.isActive ? <ShieldOff size={16} /> : <ShieldCheck size={16} />}
                  </button>
                  <button onClick={() => handleDelete(admin.id, admin.name)}
                    style={{ padding: '7px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center' }}
                    title="Delete Admin">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
