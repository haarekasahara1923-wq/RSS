'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function StaffProfile() {
  const { user, token } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  
  const [editMode, setEditMode] = useState(false)
  const [form, setForm] = useState({ name: '', avatar: '' })
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    if (user) {
      setForm({ name: user.name || '', avatar: (user as any).avatar || '' })
    }
  }, [user])
  useEffect(() => {
    if (!token || !user) return
    // Match teacher profile by email
    fetch('/api/teachers', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          const myProfile = d.data.find((t: any) => t.email === user.email || t.phone === user.phone)
          if (myProfile) {
              setProfile(myProfile)
              if (myProfile.photo && !form.avatar) setForm(f => ({ ...f, avatar: myProfile.photo }))
          }
        }
      })
  }, [token, user])

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setForm({ ...form, avatar: ev.target?.result as string })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        // Update user in local storage
        const key = localStorage.getItem('scalevo_user') ? 'scalevo_user' : 'udba_user'
        const storedUser = JSON.parse(localStorage.getItem(key) || '{}')
        const updatedUser = { ...storedUser, name: form.name, avatar: form.avatar }
        localStorage.setItem(key, JSON.stringify(updatedUser))
        setEditMode(false)
        window.location.reload()
      }
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <h1 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>?? My Profile</h1>
      
      <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', display: 'flex', gap: '24px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: form.avatar ? 'transparent' : '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', color: 'white', fontWeight: 'bold', overflow: 'hidden', border: '2px solid #334155' }}>
          {form.avatar ? <img src={form.avatar} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (user?.name?.charAt(0) || 'T')}
        </div>
        
        <div style={{ flex: 1, minWidth: '250px' }}>
          {!editMode ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '24px', margin: 0, color: 'white' }}>{user?.name}</h2>
                <button onClick={() => setEditMode(true)} style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>✏️ Edit Profile</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#94a3b8', fontSize: '14px' }}>
                <div>📧 Email: {user?.email}</div>
                <div>📱 Phone: {user?.phone || profile?.phone || 'N/A'}</div>
                <div>🏷️ Role: {user?.role}</div>
              </div>
            </>
          ) : (
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Update Photo</label>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ color: 'white', fontSize: '13px' }} />
              </div>
              <div>
                <label style={{ display: 'block', color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Full Name</label>
                <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', fontSize: '14px' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" disabled={loading} style={{ background: '#10b981', color: 'white', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', flex: 1 }}>{loading ? 'Saving...' : '💾 Save Profile'}</button>
                <button type="button" onClick={() => setEditMode(false)} style={{ background: 'transparent', color: '#94a3b8', border: '1px solid #334155', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
              </div>
            </form>
          )}
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', color: '#94a3b8', fontSize: '14px', marginTop: editMode ? '20px' : '0' }}>
            
            {profile && (
              <>
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                  <div style={{ color: 'white', fontWeight: 'bold', marginBottom: '8px' }}>Teacher Details</div>
                  <div>?? Joined: {new Date(profile.joinDate).toLocaleDateString('en-IN')}</div>
                  <div>?? Subjects: {profile.subject?.join(', ') || 'None'}</div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

