'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Eye, EyeOff } from 'lucide-react'

export default function TransportDashboard() {
  const { token } = useAuth()
  const [activeTab, setActiveTab] = useState<'VEHICLES' | 'DRIVERS' | 'TRACKING'>('VEHICLES')
  
  const [vehicles, setVehicles] = useState<any[]>([])
  const [drivers, setDrivers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])

  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const [vForm, setVForm] = useState({ registrationNo: '', routeDetails: '', capacity: '40' })
  const [dForm, setDForm] = useState({ name: '', phone: '', email: '', password: '', licenseNo: '', vehicleId: '' })
  const [showDriverPassword, setShowDriverPassword] = useState(false)

  const loadVehicles = () => fetch('/api/transport/vehicle', { headers: h }).then(r=>r.json()).then(d => setVehicles(d.data||[]))
  const loadDrivers = () => fetch('/api/transport/driver', { headers: h }).then(r=>r.json()).then(d => setDrivers(d.data||[]))
  const loadLocations = () => fetch('/api/transport/location', { headers: h }).then(r=>r.json()).then(d => setLocations(d.data||[]))

  useEffect(() => {
    if(!token) return
    if(activeTab === 'VEHICLES') loadVehicles()
    if(activeTab === 'DRIVERS') { loadDrivers(); loadVehicles() }
    if(activeTab === 'TRACKING') loadLocations()
  }, [activeTab, token])

  const createVehicle = async(e: any) => {
    e.preventDefault()
    await fetch('/api/transport/vehicle', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json'}, body: JSON.stringify(vForm) })
    setVForm({ registrationNo: '', routeDetails: '', capacity: '40' })
    loadVehicles()
  }

  const createDriver = async(e: any) => {
    e.preventDefault()
    await fetch('/api/transport/driver', { method: 'POST', headers: { ...h, 'Content-Type': 'application/json'}, body: JSON.stringify(dForm) })
    setDForm({ name: '', phone: '', email: '', password: '', licenseNo: '', vehicleId: '' })
    loadDrivers()
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">?? Transport Management</h1>
          <p className="page-subtitle">Manage buses, drivers, and live tracking</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '16px', borderBottom: '1px solid var(--border-color)', marginBottom: '24px' }}>
        {['VEHICLES', 'DRIVERS', 'TRACKING'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            style={{ padding: '12px 24px', background: 'none', border: 'none', borderBottom: activeTab === tab ? '3px solid var(--primary)' : '3px solid transparent', color: activeTab === tab ? 'white' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }}>
            {tab.charAt(0) + tab.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {activeTab === 'VEHICLES' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '16px' }}>Vehicles List</h3>
            <table className="table">
              <thead><tr><th>Registration</th><th>Route</th><th>Capacity</th><th>Students</th></tr></thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 'bold', color: 'var(--primary-light)' }}>{v.registrationNo}</td>
                    <td>{v.routeDetails}</td>
                    <td>{v.capacity}</td>
                    <td>{v._count?.students || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card" style={{ width: '350px' }}>
            <h3 style={{ marginBottom: '16px' }}>Add Vehicle</h3>
            <form onSubmit={createVehicle} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="input" placeholder="Registration No (e.g. MH 12 AB 1234)" value={vForm.registrationNo} onChange={e=>setVForm({...vForm, registrationNo: e.target.value})} required />
              <input className="input" placeholder="Route Details (e.g. City Center to School)" value={vForm.routeDetails} onChange={e=>setVForm({...vForm, routeDetails: e.target.value})} />
              <input className="input" type="number" placeholder="Capacity" value={vForm.capacity} onChange={e=>setVForm({...vForm, capacity: e.target.value})} required />
              <button className="btn btn-primary" type="submit">Add Vehicle</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'DRIVERS' && (
        <div style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
          <div className="card" style={{ flex: 1 }}>
            <h3 style={{ marginBottom: '16px' }}>Drivers List</h3>
            <table className="table">
              <thead><tr><th>Name</th><th>Phone</th><th>License</th><th>Assigned Bus</th></tr></thead>
              <tbody>
                {drivers.map(d => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 'bold' }}>{d.user?.name}</td>
                    <td>{d.user?.phone}</td>
                    <td>{d.licenseNo}</td>
                    <td>{d.vehicle?.registrationNo || 'Unassigned'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="card" style={{ width: '350px' }}>
            <h3 style={{ marginBottom: '16px' }}>Add Driver</h3>
            <form onSubmit={createDriver} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input className="input" placeholder="Driver Name" value={dForm.name} onChange={e=>setDForm({...dForm, name: e.target.value})} required />
              <input className="input" placeholder="Phone" value={dForm.phone} onChange={e=>setDForm({...dForm, phone: e.target.value})} required />
              <input className="input" placeholder="Email (Optional)" value={dForm.email} onChange={e=>setDForm({...dForm, email: e.target.value})} />
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  placeholder="Password for Login"
                  type={showDriverPassword ? 'text' : 'password'}
                  style={{ paddingRight: '42px' }}
                  value={dForm.password}
                  onChange={e=>setDForm({...dForm, password: e.target.value})}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowDriverPassword(!showDriverPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px',
                    borderRadius: '6px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                  title={showDriverPassword ? 'Hide password' : 'Show password'}
                  aria-label={showDriverPassword ? 'Hide password' : 'Show password'}
                >
                  {showDriverPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <input className="input" placeholder="License Number" value={dForm.licenseNo} onChange={e=>setDForm({...dForm, licenseNo: e.target.value})} />
              <select className="input" value={dForm.vehicleId} onChange={e=>setDForm({...dForm, vehicleId: e.target.value})}>
                <option value="">-- Assign Vehicle --</option>
                {vehicles.map(v => <option key={v.id} value={v.id}>{v.registrationNo}</option>)}
              </select>
              <button className="btn btn-primary" type="submit">Add Driver</button>
            </form>
          </div>
        </div>
      )}

      {activeTab === 'TRACKING' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3>Live Vehicle Locations</h3>
            <button className="btn btn-secondary btn-sm" onClick={loadLocations}>?? Refresh</button>
          </div>
          {locations.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No live tracking data available for today.</p> : (
            <table className="table">
              <thead><tr><th>Vehicle</th><th>Route</th><th>Last Updated</th><th>Location</th><th>Speed</th></tr></thead>
              <tbody>
                {locations.map(loc => (
                  <tr key={loc.id}>
                    <td style={{ fontWeight: 'bold' }}>{loc.vehicle?.registrationNo}</td>
                    <td>{loc.vehicle?.routeDetails}</td>
                    <td>{new Date(loc.timestamp).toLocaleTimeString()}</td>
                    <td>
                      <a href={`https://maps.google.com/?q=${loc.latitude},${loc.longitude}`} target="_blank" style={{ color: 'var(--primary-light)' }}>View on Map</a>
                    </td>
                    <td>{loc.speed ? `${Math.round(loc.speed)} km/h` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

