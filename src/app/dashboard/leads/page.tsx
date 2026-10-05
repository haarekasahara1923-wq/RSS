'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { FeatureGate } from '../layout'

interface Lead {
    id: string
    name: string
    phone: string
    email: string
    course: string
    source: string
    status: string
    followUpDate: string
    notes: string
    createdAt: string
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
    NEW: { color: '#06b6d4', bg: 'rgba(6,182,212,0.15)', label: 'New 🆕' },
    CONTACTED: { color: '#6366f1', bg: 'rgba(99,102,241,0.15)', label: 'Contacted 📞' },
    INTERESTED: { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)', label: 'Interested ⭐' },
    NOT_INTERESTED: { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Not Interested ❌' },
    CONVERTED: { color: '#10b981', bg: 'rgba(16,185,129,0.15)', label: 'Converted ✅' },
    DROPPED: { color: '#ef4444', bg: 'rgba(239,68,68,0.15)', label: 'Dropped 🗑️' },
}

const SOURCES = ['Website', 'WhatsApp', 'Referral', 'Instagram', 'Facebook', 'Google Ads', 'Walk-in', 'Phone']

export default function LeadsPage() {
    const { token } = useAuth()
    const [leads, setLeads] = useState<Lead[]>([])
    const [loading, setLoading] = useState(true)
    const [showAdd, setShowAdd] = useState(false)
    const [activeStatus, setActiveStatus] = useState('ALL')
    const [form, setForm] = useState({ name: '', phone: '', email: '', course: '', source: 'Website', followUpDate: '', notes: '' })
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState('')

    const fetchLeads = async () => {
        if (!token) return
        const res = await fetch('/api/leads', { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setLeads(data.data)
        setLoading(false)
    }

    useEffect(() => { fetchLeads() }, [token])

    const filteredLeads = activeStatus === 'ALL' ? leads : leads.filter(l => l.status === activeStatus)

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)
        const res = await fetch('/api/leads', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify(form),
        })
        const data = await res.json()
        setSaving(false)
        if (data.success) {
            setToast('Lead added!')
            setShowAdd(false)
            setForm({ name: '', phone: '', email: '', course: '', source: 'Website', followUpDate: '', notes: '' })
            fetchLeads()
            setTimeout(() => setToast(''), 3000)
        }
    }

    const updateStatus = async (id: string, status: string) => {
        await fetch('/api/leads', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id, status }),
        })
        fetchLeads()
    }

    return (
        <FeatureGate feature="leadManagement">
            <div>
                <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <h1 className="page-title">📈 Lead Management</h1>
                        <p className="page-subtitle">CRM — {leads.length} total leads</p>
                    </div>
                    <button onClick={() => setShowAdd(true)} className="btn btn-primary">➕ Add Lead</button>
                </div>

                {toast && <div className="toast toast-success" style={{ position: 'relative', marginBottom: '16px', maxWidth: '100%' }}>✓ {toast}</div>}

                {/* Funnel Summary */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {[{ key: 'ALL', label: 'All', count: leads.length, color: '#6366f1' },
                    ...Object.entries(statusConfig).map(([key, c]) => ({
                        key, label: c.label, count: leads.filter(l => l.status === key).length, color: c.color
                    }))].map(s => (
                        <button key={s.key} onClick={() => setActiveStatus(s.key)}
                            className="btn btn-secondary"
                            style={{ background: activeStatus === s.key ? `${s.color}20` : undefined, borderColor: activeStatus === s.key ? s.color : undefined, color: activeStatus === s.key ? s.color : undefined }}>
                            {s.label} <span style={{ marginLeft: '6px', background: `${s.color}20`, padding: '1px 8px', borderRadius: '10px', fontSize: '11px' }}>{s.count}</span>
                        </button>
                    ))}
                </div>

                {/* Kanban / List View */}
                <div className="card" style={{ padding: 0 }}>
                    <div className="table-container">
                        <table>
                            <thead>
                                <tr>
                                    <th>Lead</th>
                                    <th>Course</th>
                                    <th>Source</th>
                                    <th>Follow-up</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
                                ) : filteredLeads.map(lead => {
                                    const sc = statusConfig[lead.status] || statusConfig.NEW
                                    return (
                                        <tr key={lead.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px', background: `linear-gradient(135deg, ${sc.color}, ${sc.color}88)` }}>{lead.name.charAt(0)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{lead.name}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{lead.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{lead.course || '—'}</td>
                                            <td>
                                                <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)' }}>{lead.source || '—'}</span>
                                            </td>
                                            <td style={{ fontSize: '13px', color: lead.followUpDate && new Date(lead.followUpDate) < new Date() ? '#ef4444' : 'var(--text-secondary)' }}>
                                                {lead.followUpDate ? new Date(lead.followUpDate).toLocaleDateString('en-IN') : '—'}
                                            </td>
                                            <td>
                                                <span style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '700', background: sc.bg, color: sc.color }}>{sc.label}</span>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <select value={lead.status} onChange={e => updateStatus(lead.id, e.target.value)}
                                                        style={{ padding: '4px 8px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px', cursor: 'pointer' }}>
                                                        {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                                    </select>
                                                    <a href={`https://wa.me/91${lead.phone}?text=Hello ${lead.name}, We have a great program for you at our school!`} target="_blank"
                                                        style={{ padding: '4px 8px', background: '#25d36620', border: '1px solid #25d36640', borderRadius: '6px', color: '#25d366', fontSize: '11px', textDecoration: 'none', fontWeight: '700' }}>
                                                        💬 WA
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {showAdd && (
                    <div className="modal-overlay">
                        <div className="modal">
                            <div className="modal-header">
                                <h3 style={{ fontWeight: '700' }}>📈 Add New Lead</h3>
                                <button onClick={() => setShowAdd(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                    <div className="grid-cols-2">
                                        <div><label className="label">Name *</label><input className="input" placeholder="Rahul Gupta" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
                                        <div><label className="label">Phone *</label><input className="input" type="tel" placeholder="917879337770" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required /></div>
                                    </div>
                                    <div className="grid-cols-2">
                                        <div><label className="label">Email</label><input className="input" type="email" placeholder="email@example.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                                        <div><label className="label">Interested In</label><input className="input" placeholder="JEE Foundation" value={form.course} onChange={e => setForm({ ...form, course: e.target.value })} /></div>
                                    </div>
                                    <div className="grid-cols-2">
                                        <div><label className="label">Lead Source</label>
                                            <select className="input" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                                                {SOURCES.map(s => <option key={s}>{s}</option>)}
                                            </select></div>
                                        <div><label className="label">Follow-up Date</label><input className="input" type="date" value={form.followUpDate} onChange={e => setForm({ ...form, followUpDate: e.target.value })} /></div>
                                    </div>
                                    <div><label className="label">Notes</label><textarea className="input" rows={2} placeholder="Details about the inquiry..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} style={{ resize: 'none' }} /></div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" onClick={() => setShowAdd(false)} className="btn btn-secondary">Cancel</button>
                                    <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? '⏳' : '✅ Add Lead'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </FeatureGate>
    )
}
