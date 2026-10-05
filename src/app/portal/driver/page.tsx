'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'

export default function DriverDashboard() {
  const { user, token } = useAuth()
  const [students, setStudents] = useState<any[]>([])
  const [vehicleId, setVehicleId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [tracking, setTracking] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const loadData = () => {
    fetch('/api/transport/board', { headers: h }).then(r=>r.json()).then(d => {
      setStudents(d.data || [])
      setVehicleId(d.vehicleId || '')
      setLoading(false)
    })
  }

  useEffect(() => {
    if (!token) return
    loadData()
  }, [token])

  // Live Location Tracker
  useEffect(() => {
    if (!tracking || !vehicleId || !token) return
    
    let watchId: number

    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude, speed, heading } = position.coords
          fetch('/api/transport/location', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...h },
            body: JSON.stringify({ vehicleId, latitude, longitude, speed, heading })
          }).catch(e => console.error("Tracking update failed", e))
        },
        (error) => {
          console.error("GPS Error", error)
          alert("GPS tracking failed: " + error.message)
          setTracking(false)
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
      )
    } else {
      alert("Geolocation is not supported by your browser")
      setTracking(false)
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [tracking, vehicleId, token])

  const toggleStatus = async (studentId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'IN' ? 'OUT' : 'IN'
    
    // Optimistic update
    setStudents(prev => prev.map(s => s.id === studentId ? { ...s, currentStatus: newStatus } : s))

    const res = await fetch('/api/transport/board', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...h },
      body: JSON.stringify({ studentId, vehicleId, status: newStatus })
    })
    
    if (!res.ok) {
      alert("Failed to update status")
      loadData() // Revert
    }
  }

  if (loading) return <div style={{ color: 'white', textAlign: 'center', padding: '40px' }}>Loading...</div>

  if (!vehicleId) {
    return (
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', textAlign: 'center', color: 'white' }}>
        <h2>?? No Vehicle Assigned</h2>
        <p style={{ color: '#94a3b8' }}>Please ask the admin to assign you to a bus.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)', padding: '20px', borderRadius: '16px', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: '0 0 4px 0', fontSize: '20px' }}>Hello, {user?.name}</h2>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>Students Assigned: {students.length}</p>
        </div>
        <button 
          onClick={() => setTracking(!tracking)}
          style={{ background: tracking ? '#ef4444' : '#10b981', border: 'none', borderRadius: '12px', padding: '12px 16px', color: 'white', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          {tracking ? '?? Stop Tracking' : '?? Start Tracking'}
        </button>
      </div>

      {tracking && (
        <div style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', color: '#10b981', padding: '12px', borderRadius: '10px', fontSize: '13px', textAlign: 'center' }}>
          ?? Live Location is active. Keep this app open.
        </div>
      )}

      <div style={{ marginTop: '8px' }}>
        <h3 style={{ color: 'white', fontSize: '16px', margin: '0 0 12px 0' }}>Passenger List</h3>
        {students.length === 0 ? (
           <div style={{ color: '#94a3b8', textAlign: 'center', padding: '20px', background: '#1e293b', borderRadius: '12px' }}>No students assigned to this route.</div>
        ) : (
          students.map(s => (
            <div key={s.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ color: 'white', fontWeight: '600', fontSize: '15px' }}>{s.fullName}</div>
                <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>{s.batch?.name} • {s.course?.name}</div>
              </div>
              <button 
                onClick={() => toggleStatus(s.id, s.currentStatus)}
                style={{ 
                  background: s.currentStatus === 'IN' ? 'rgba(239,68,68,0.15)' : 'rgba(16,185,129,0.15)', 
                  border: `1px solid ${s.currentStatus === 'IN' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
                  color: s.currentStatus === 'IN' ? '#ef4444' : '#10b981',
                  borderRadius: '10px', padding: '10px 16px', fontWeight: 'bold', cursor: 'pointer' 
                }}
              >
                {s.currentStatus === 'IN' ? 'Mark OUT' : 'Mark IN'}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

