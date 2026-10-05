'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function ParentChildren() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  
  const [courses, setCourses] = useState<any[]>([])
  const [batches, setBatches] = useState<any[]>([])
  
  const [selectedCourse, setSelectedCourse] = useState('')
  const [selectedBatch, setSelectedBatch] = useState('')
  
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [selected, setSelected] = useState<string[]>([])
  
  const [loading, setLoading] = useState(true)
  const [fetchingStudents, setFetchingStudents] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  
  const h = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    if (!token) return
    Promise.all([
      fetch('/api/parent', { headers: h }).then(r => r.json()),
      fetch('/api/courses', { headers: h }).then(r => r.json()),
      fetch('/api/batches', { headers: h }).then(r => r.json()),
    ]).then(([p, c, b]) => {
      setProfile(p.profile)
      setSelected(p.profile?.children?.map((c: any) => c.id) || [])
      setCourses(c.data || [])
      setBatches(b.data || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [token])

  useEffect(() => {
    if (!token || !selectedCourse || !selectedBatch) {
        setAllStudents([])
        return
    }
    setFetchingStudents(true)
    fetch(`/api/students?courseId=${selectedCourse}&batchId=${selectedBatch}`, { headers: h })
      .then(r => r.json())
      .then(d => {
        setAllStudents(d.data || [])
        setFetchingStudents(false)
      })
      .catch(err => {
        console.error(err)
        setFetchingStudents(false)
      })
  }, [selectedCourse, selectedBatch, token])

  const toggleStudent = (id: string) => {
    setSelected(prev => prev.includes(id) ? prev.filter(s => s !== id) : prev.length < 3 ? [...prev, id] : prev)
  }

  const save = async () => {
    setSaving(true)
    setMsg('')
    try {
        const res = await fetch('/api/parent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...h },
        body: JSON.stringify({ studentIds: selected }),
        })
        const d = await res.json()
        setSaving(false)
        if (d.success) {
            setMsg('✅ Children linked successfully!')
            setProfile(d.profile)
        } else {
            setMsg(d.error || 'Failed to link children')
        }
    } catch (err) {
        setSaving(false)
        setMsg('An error occurred while saving')
    }
  }

  const filteredBatches = batches.filter(b => b.courseId === selectedCourse)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>👶 Link Children</h1>
        <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>Select up to 3 children from the list below</p>
      </div>

      {msg && (
        <div style={{ 
          background: msg.startsWith('✅') ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)', 
          border: `1px solid ${msg.startsWith('✅') ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`, 
          borderRadius: '10px', 
          padding: '12px', 
          fontSize: '13px', 
          color: msg.startsWith('✅') ? '#10b981' : '#ef4444' 
        }}>
          {msg}
        </div>
      )}

      {loading ? <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading...</div> : (
        <>
            <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#cbd5e1' }}>Select Class</label>
                    <select 
                        value={selectedCourse} 
                        onChange={(e) => { setSelectedCourse(e.target.value); setSelectedBatch(''); }}
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', outline: 'none' }}
                    >
                        <option value="">-- Select Class --</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                
                {selectedCourse && (
                    <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', color: '#cbd5e1' }}>Select Section</label>
                        <select 
                            value={selectedBatch} 
                            onChange={(e) => setSelectedBatch(e.target.value)}
                            style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', outline: 'none' }}
                        >
                            <option value="">-- Select Section --</option>
                            {filteredBatches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                    </div>
                )}
            </div>

            {selectedCourse && selectedBatch && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                    {fetchingStudents ? <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>Loading students...</div> : 
                    allStudents.length === 0 ? <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No students found in this class/section</div> :
                    allStudents.map((s: any) => {
                        const isSelected = selected.includes(s.id)
                        return (
                        <div key={s.id} onClick={() => toggleStudent(s.id)}
                        style={{ background: isSelected ? 'rgba(99,102,241,0.15)' : '#1e293b', border: `1px solid ${isSelected ? '#6366f1' : '#334155'}`, borderRadius: '12px', padding: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: `2px solid ${isSelected ? '#6366f1' : '#475569'}`, background: isSelected ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', flexShrink: 0 }}>
                            {isSelected ? '✓' : ''}
                        </div>
                        <div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{s.fullName}</div>
                            <div style={{ fontSize: '12px', color: '#64748b' }}>{s.courseName} • {s.batchName} {s.studentId ? `• ID: ${s.studentId}` : ''}</div>
                        </div>
                        </div>
                    )})}
                </div>
            )}
        </>
      )}

      <button onClick={save} disabled={saving || selected.length === 0}
        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', border: 'none', borderRadius: '12px', padding: '14px', color: 'white', fontWeight: '700', fontSize: '15px', cursor: selected.length === 0 ? 'not-allowed' : 'pointer', opacity: saving || selected.length === 0 ? 0.6 : 1 }}>
        {saving ? 'Saving...' : `💾 Save (${selected.length} selected)`}
      </button>

      {/* Show currently linked children outside of the search */}
      {!loading && profile?.children?.length > 0 && (
        <div style={{ marginTop: '24px' }}>
          <h2 style={{ fontSize: '15px', fontWeight: '700', color: 'white', marginBottom: '12px' }}>Currently Linked Children</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {profile.children.map((c: any) => (
              <div key={c.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '14px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                  👦
                </div>
                <div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: 'white' }}>{c.fullName}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>{c.course?.name} • {c.batch?.name} {c.studentId ? `• ID: ${c.studentId}` : ''}</div>
                </div>
                <button 
                  onClick={() => {
                    const newSelected = selected.filter(id => id !== c.id);
                    setSelected(newSelected);
                    // Automatically save when unlinking? Better to let user click save
                  }}
                  style={{ marginLeft: 'auto', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', padding: '6px 12px', fontSize: '12px', cursor: 'pointer' }}
                >
                  Unlink
                </button>
              </div>
            ))}
            {selected.length !== profile.children.length && (
              <div style={{ fontSize: '12px', color: '#fbbf24', marginTop: '8px' }}>
                ⚠️ You have pending changes. Click Save to apply.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
