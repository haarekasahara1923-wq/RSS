'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import Link from 'next/link'
import Script from 'next/script'
import { formatDate, formatCurrency } from '@/lib/utils'

interface Student {
    id: string
    studentId: string
    fullName: string
    phone: string
    email: string
    gender: string
    courseName: string
    batchName: string
    totalFee: number
    paidFee: number
    status: string
    admissionDate: string
    fatherName: string
    parentPhone: string
    aadhaarNo?: string
    penId?: string
    aparId?: string
    samagraId?: string
    parentEmail?: string
    parentPassword?: string
    examResults?: any[]
    courseSubjects?: string[]
    scholarNo?: string
    caste?: string
    dobInWords?: string
    medium?: string
    firstAdmissionClass?: string
    firstAdmissionDate?: string
    scholarshipScheme?: string
    bankName?: string
    bankAccountNo?: string
    ifsc?: string
    dob?: string
    address?: string
    motherName?: string
}

const statusColors: Record<string, string> = {
    ACTIVE: 'badge-success',
    INACTIVE: 'badge-gray',
    DROPOUT: 'badge-danger',
    PASSED: 'badge-info',
}

export default function StudentsPage() {
    const { token, user, tenant, handleUnauthorized } = useAuth()
    const canEditOrDelete = user?.role === 'SUPER_ADMIN' || user?.role === 'COACHING_ADMIN'
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<any>({})
    const [actionLoading, setActionLoading] = useState(false)

    const downloadPDF = (elementId: string, title: string) => {
        const original = document.getElementById(elementId)
        if (!original) return

        const clone = original.cloneNode(true) as HTMLElement
        clone.style.background = '#ffffff'
        clone.style.color = '#000000'
        clone.style.width = '210mm'
        clone.style.padding = '20mm'
        clone.style.boxSizing = 'border-box'

        const ths = clone.querySelectorAll('th')
        ths.forEach(th => {
          th.style.background = '#f1f5f9'
          th.style.color = '#000000'
          th.style.borderColor = '#000000'
        })
        const tds = clone.querySelectorAll('td')
        tds.forEach(td => {
          if (td.style.color !== 'rgb(16, 185, 129)' && td.style.color !== '#10b981') td.style.color = '#000000'
          td.style.borderColor = '#000000'
        })
        
        const allEls = clone.querySelectorAll('*')
        allEls.forEach((el: any) => {
            const color = el.style.color
            if (color === 'white' || color === 'rgb(255, 255, 255)' || color === '#94a3b8' || color === 'rgb(148, 163, 184)' || color === '#cbd5e1') el.style.color = '#000000'
            if (el.style.borderTopColor === '#334155' || el.style.borderTopColor === 'rgb(51, 65, 85)') el.style.borderTopColor = '#000000'
            if (el.style.borderBottomColor === '#334155' || el.style.borderBottomColor === 'rgb(51, 65, 85)') el.style.borderBottomColor = '#000000'
        })

        const wrapper = document.createElement('div')
        wrapper.style.position = 'absolute'
        wrapper.style.left = '-9999px'
        wrapper.style.top = '0'
        wrapper.appendChild(clone)
        document.body.appendChild(wrapper)

        const opt = {
          margin: 0,
          filename: `${title.replace(/\s+/g, '_')}_Report_Card.pdf`,
          image: { type: 'jpeg', quality: 1 },
          html2canvas: { scale: 2, useCORS: true, scrollY: 0 },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        }
        
        // @ts-ignore
        window.html2pdf().set(opt).from(clone).save().then(() => document.body.removeChild(wrapper)).catch(() => document.body.removeChild(wrapper))
    }

    const fetchStudents = async () => {
        if (!token) return
        const params = new URLSearchParams()
        if (search) params.set('search', search)
        const res = await fetch(`/api/students?${params}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setStudents(data.data)
        setLoading(false)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this student?')) return
        setActionLoading(true)
        try {
            const res = await fetch(`/api/students?id=${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            if (res.status === 401 || data?.error === 'Unauthorized') { handleUnauthorized(); return }
            if (data.success) {
                alert('Student deleted successfully')
                fetchStudents()
            } else {
                alert(data.error || 'Failed to delete student')
            }
        } catch (err) {
            alert('Error deleting student')
        }
        setActionLoading(false)
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        setActionLoading(true)
        try {
            const res = await fetch('/api/students', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(editForm)
            })
            const data = await res.json()
            if (res.status === 401 || data?.error === 'Unauthorized') { handleUnauthorized(); return }
            if (data.success) {
                alert('Student updated successfully')
                setIsEditing(false)
                setSelectedStudent(data.data)
                fetchStudents()
            } else {
                alert(data.error || 'Failed to update student')
            }
        } catch (err) {
            alert('Error updating student')
        }
        setActionLoading(false)
    }

    const toggleBlock = async (student: Student) => {
        const newStatus = student.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE'
        if (!confirm(`Are you sure you want to ${newStatus === 'ACTIVE' ? 'unblock' : 'block'} this student?`)) return
        
        setActionLoading(true)
        try {
            const res = await fetch('/api/students', {
                method: 'PATCH',
                headers: { 
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({ id: student.id, status: newStatus })
            })
            const data = await res.json()
            if (data.success) {
                alert(`Student ${newStatus === 'ACTIVE' ? 'unblocked' : 'blocked'} successfully`)
                if (selectedStudent?.id === student.id) setSelectedStudent(data.data)
                fetchStudents()
            }
        } catch (err) {
            alert('Error updating status')
        }
        setActionLoading(false)
    }

    useEffect(() => { fetchStudents() }, [token, search])

    return (
        <div>
            <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" />
            <div className="page-header">
                <div>
                    <h1 className="page-title">👨‍🎓 Students</h1>
                    <p className="page-subtitle">{students.length} students registered</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link href="/dashboard/students/add" className="btn btn-primary">➕ Add Student</Link>
                </div>
            </div>

            {/* Search & Filter */}
            <div className="card" style={{ marginBottom: '20px', padding: '16px' }}>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: '200px', display: 'flex', gap: '8px' }}>
                        <input
                            className="input"
                            style={{ flex: 1 }}
                            placeholder="🔍 Search by student name or mobile no..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && fetchStudents()}
                        />
                        <button className="btn btn-primary" onClick={fetchStudents} style={{ whiteSpace: 'nowrap' }}>
                            🔍 Search
                        </button>
                    </div>
                    <button className="btn btn-secondary" onClick={() => { setSearch(''); setTimeout(fetchStudents, 0); }}>🔄 Refresh</button>
                </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                {[
                    { label: 'Total', value: students.length, color: '#6366f1' },
                    { label: 'Active', value: students.filter(s => s.status === 'ACTIVE').length, color: '#10b981' },
                    { label: 'Dropout', value: students.filter(s => s.status === 'DROPOUT').length, color: '#ef4444' },
                    { label: 'With Dues', value: students.filter(s => s.totalFee > s.paidFee).length, color: '#f59e0b' },
                ].map(s => (
                    <div key={s.label} style={{ padding: '14px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', textAlign: 'center' }}>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: s.color }}>{s.value}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}>
                            <div className="spinner" style={{ margin: '0 auto 12px', width: '32px', height: '32px' }} />
                            <p style={{ color: 'var(--text-muted)' }}>Loading students...</p>
                        </div>
                    ) : students.length === 0 ? (
                        <div style={{ padding: '60px', textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👨‍🎓</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '16px' }}>No students found</p>
                            <Link href="/dashboard/students/add" className="btn btn-primary">Add First Student</Link>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Class / Section</th>
                                    <th>Phone</th>
                                    <th>Parent Login</th>
                                    <th>Fee Status</th>
                                    <th>Status</th>
                                    <th>Admission</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {students.map(s => {
                                    const owing = s.totalFee - s.paidFee
                                    const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                                    return (
                                        <tr key={s.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar">
                                                        {s.fullName.charAt(0)}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{s.fullName}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.studentId}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px', fontWeight: '600' }}>{s.courseName}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.batchName}</div>
                                            </td>
                                            <td>
                                                <div style={{ fontSize: '13px' }}>{s.phone}</div>
                                                {s.parentPhone && <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>P: {s.parentPhone}</div>}
                                            </td>
                                            <td>
                                                {s.parentEmail ? (
                                                    <div style={{ fontSize: '12px' }}>
                                                        <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{s.parentEmail}</div>
                                                        <div style={{ color: 'var(--text-muted)' }}>Pass: {s.parentPassword || '***'}</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Not linked</div>
                                                )}
                                            </td>
                                            <td>
                                                <div style={{ marginBottom: '4px' }}>
                                                    <div className="progress-bar" style={{ height: '4px' }}>
                                                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444' }} />
                                                    </div>
                                                </div>
                                                <div style={{ fontSize: '11px', color: owing > 0 ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                                                    {pct}% paid {owing > 0 ? `• Due: ${formatCurrency(owing)}` : '✓'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${statusColors[s.status] || 'badge-gray'}`}>{s.status}</span>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                                {s.admissionDate ? formatDate(s.admissionDate) : '-'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => setSelectedStudent(s)} className="btn btn-secondary btn-sm" title="View">👁️</button>
                                                    {canEditOrDelete && (
                                                        <>
                                                            <button onClick={() => { setSelectedStudent(s); setEditForm(s); setIsEditing(true); }} className="btn btn-secondary btn-sm" title="Edit">✏️</button>
                                                            <button onClick={() => toggleBlock(s)} className={`btn btn-sm ${s.status === 'ACTIVE' ? 'btn-secondary' : 'btn-success'}`} title={s.status === 'ACTIVE' ? 'Block' : 'Unblock'}>
                                                                {s.status === 'ACTIVE' ? '🚫' : '✅'}
                                                            </button>
                                                            <button onClick={() => handleDelete(s.id)} className="btn btn-secondary btn-sm" style={{ color: '#ef4444' }} title="Delete">🗑️</button>
                                                        </>
                                                    )}
                                                    <a href={`https://wa.me/${s.parentPhone?.replace(/\D/g, '') || s.phone?.replace(/\D/g, '')}`} target="_blank" className="btn btn-sm" style={{ background: '#25d366', color: 'white', textDecoration: 'none' }} title="WhatsApp">💬</a>
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Student Detail / Edit Modal */}
            {selectedStudent && (
                <div className="modal-overlay" onClick={() => { setSelectedStudent(null); setIsEditing(false); }}>
                    <div className="modal" style={{ maxWidth: isEditing ? '600px' : '750px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div className="avatar" style={{ width: '48px', height: '48px', fontSize: '20px' }}>{selectedStudent.fullName.charAt(0)}</div>
                                <div>
                                    <h3 style={{ fontWeight: '700', fontSize: '18px' }}>{isEditing ? 'Edit Student' : selectedStudent.fullName}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{selectedStudent.studentId}</p>
                                </div>
                            </div>
                            <button onClick={() => { setSelectedStudent(null); setIsEditing(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                            {isEditing ? (
                                <form onSubmit={handleUpdate} className="grid-cols-2" style={{ gap: '16px' }}>
                                    <div><label className="label">Scholar No.</label><input className="input" value={editForm.scholarNo || ''} onChange={e => setEditForm({...editForm, scholarNo: e.target.value})} /></div>
                                    <div><label className="label">Full Name</label><input className="input" value={editForm.fullName || ''} onChange={e => setEditForm({...editForm, fullName: e.target.value})} /></div>
                                    <div><label className="label">Phone</label><input className="input" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} /></div>
                                    <div><label className="label">Parent Phone</label><input className="input" value={editForm.parentPhone || ''} onChange={e => setEditForm({...editForm, parentPhone: e.target.value})} /></div>
                                    <div><label className="label">Father's Name</label><input className="input" value={editForm.fatherName || ''} onChange={e => setEditForm({...editForm, fatherName: e.target.value})} /></div>
                                    <div><label className="label">Mother's Name</label><input className="input" value={editForm.motherName || ''} onChange={e => setEditForm({...editForm, motherName: e.target.value})} /></div>
                                    <div><label className="label">DOB</label><input type="date" className="input" value={editForm.dob ? new Date(editForm.dob).toISOString().split('T')[0] : ''} onChange={e => setEditForm({...editForm, dob: e.target.value})} /></div>
                                    <div><label className="label">DOB in words</label><input className="input" value={editForm.dobInWords || ''} onChange={e => setEditForm({...editForm, dobInWords: e.target.value})} /></div>
                                    <div>
                                        <label className="label">Gender</label>
                                        <select className="input" value={editForm.gender || 'MALE'} onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                                            <option value="MALE">Male</option>
                                            <option value="FEMALE">Female</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Caste</label>
                                        <select className="input" value={editForm.caste || 'General'} onChange={e => setEditForm({...editForm, caste: e.target.value})}>
                                            <option value="General">General</option>
                                            <option value="SC">SC</option>
                                            <option value="ST">ST</option>
                                            <option value="OBC">OBC</option>
                                            <option value="OTHER">OTHER</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="label">Medium</label>
                                        <select className="input" value={editForm.medium || 'Hindi'} onChange={e => setEditForm({...editForm, medium: e.target.value})}>
                                            <option value="Hindi">Hindi</option>
                                            <option value="English">English</option>
                                        </select>
                                    </div>
                                    <div><label className="label">Aadhaar No</label><input className="input" value={editForm.aadhaarNo || ''} onChange={e => setEditForm({...editForm, aadhaarNo: e.target.value})} /></div>
                                    <div><label className="label">Samagra ID</label><input className="input" value={editForm.samagraId || ''} onChange={e => setEditForm({...editForm, samagraId: e.target.value})} /></div>
                                    <div><label className="label">PEN ID</label><input className="input" value={editForm.penId || ''} onChange={e => setEditForm({...editForm, penId: e.target.value})} /></div>
                                    <div><label className="label">APAR ID</label><input className="input" value={editForm.aparId || ''} onChange={e => setEditForm({...editForm, aparId: e.target.value})} /></div>
                                    <div><label className="label">Total Fee</label><input type="number" className="input" value={editForm.totalFee || ''} onChange={e => setEditForm({...editForm, totalFee: e.target.value})} /></div>
                                    <div>
                                        <label className="label">Status</label>
                                        <select className="input" value={editForm.status || 'ACTIVE'} onChange={e => setEditForm({...editForm, status: e.target.value})}>
                                            <option value="ACTIVE">ACTIVE</option>
                                            <option value="INACTIVE">INACTIVE</option>
                                            <option value="DROPOUT">DROPOUT</option>
                                            <option value="PASSED">PASSED</option>
                                        </select>
                                    </div>
                                    <div><label className="label">Bank Name</label><input className="input" value={editForm.bankName || ''} onChange={e => setEditForm({...editForm, bankName: e.target.value})} /></div>
                                    <div><label className="label">Bank Account No.</label><input className="input" value={editForm.bankAccountNo || ''} onChange={e => setEditForm({...editForm, bankAccountNo: e.target.value})} /></div>
                                    <div className="col-span-2"><label className="label">IFSC Code</label><input className="input" value={editForm.ifsc || ''} onChange={e => setEditForm({...editForm, ifsc: e.target.value})} /></div>
                                    <div className="col-span-2" style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                        <button type="submit" className="btn btn-primary" disabled={actionLoading} style={{ flex: 1 }}>
                                            {actionLoading ? 'Saving...' : '💾 Save Changes'}
                                        </button>
                                        <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary">Cancel</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="grid-cols-2">
                                    {[
                                        ['📱 Phone', selectedStudent.phone],
                                        ['👨 Father', selectedStudent.fatherName || 'N/A'],
                                        ['📧 Email', selectedStudent.email || 'N/A'],
                                        ['📞 Parent Phone', selectedStudent.parentPhone || 'N/A'],
                                        ['📚 Class', selectedStudent.courseName],
                                        ['🕐 Section', selectedStudent.batchName],
                                        ['💰 Total Fee', formatCurrency(selectedStudent.totalFee)],
                                        ['✅ Paid', formatCurrency(selectedStudent.paidFee)],
                                        ['⚠️ Pending', formatCurrency(selectedStudent.totalFee - selectedStudent.paidFee)],
                                        ['📅 Admission', selectedStudent.admissionDate ? formatDate(selectedStudent.admissionDate) : 'N/A'],
                                        ['🚩 Status', selectedStudent.status],
                                        ['🪪 Aadhaar No.', selectedStudent.aadhaarNo || 'N/A'],
                                        ['🆔 PEN ID', selectedStudent.penId || 'N/A'],
                                        ['🆔 APAR ID', selectedStudent.aparId || 'N/A'],
                                        ['🆔 Samagra ID', selectedStudent.samagraId || 'N/A'],
                                    ].map(([label, value]) => (
                                        <div key={label} style={{ padding: '10px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>{label}</div>
                                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>{value}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Report Cards Section */}
                            {!isEditing && selectedStudent.examResults && selectedStudent.examResults.length > 0 && (
                                <div style={{ marginTop: '24px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                                    <h4 style={{ fontWeight: '700', marginBottom: '16px' }}>📑 Student Report Cards</h4>
                                    {Object.entries(
                                        selectedStudent.examResults.reduce((acc: any, er: any) => {
                                            const title = er.exam?.title || 'Unknown Exam'
                                            if (!acc[title]) acc[title] = []
                                            acc[title].push(er)
                                            return acc
                                        }, {})
                                    ).map(([examTitle, results]: any, index) => {
                                        let grandTotalMax = 0
                                        let grandTotalObtained = 0
                                        const courseSubjects = selectedStudent.courseSubjects || []
                                        
                                        const subjectRows = courseSubjects.map((subject: string) => {
                                            const res = results.find((r: any) => r.exam?.subject === subject)
                                            if (res) {
                                                grandTotalMax += res.exam?.maxMarks || 0
                                                grandTotalObtained += res.marksObtained || 0
                                            }
                                            return { subject, max: res ? res.exam?.maxMarks : '-', obtained: res ? res.marksObtained : '-', remarks: res?.remarks || '-' }
                                        })
                                        results.forEach((r: any) => {
                                            if (r.exam?.subject && !courseSubjects.includes(r.exam.subject)) {
                                                grandTotalMax += r.exam?.maxMarks || 0
                                                grandTotalObtained += r.marksObtained || 0
                                                subjectRows.push({ subject: r.exam.subject, max: r.exam.maxMarks, obtained: r.marksObtained, remarks: r.remarks || '-' })
                                            }
                                        })
                                        const percentage = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : 0
                                        const reportCardId = `report-card-${index}`

                                        return (
                                            <div key={examTitle} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
                                                <div id={reportCardId} style={{ padding: '24px', background: '#1e293b', color: 'white' }}>
                                                    <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '16px' }}>
                                                        <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>School Admin Report</h2>
                                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#10b981' }}>{examTitle}</h3>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
                                                        <div>
                                                            <p style={{ margin: '4px 0' }}><strong>Student:</strong> {selectedStudent.fullName}</p>
                                                            <p style={{ margin: '4px 0' }}><strong>Class:</strong> {selectedStudent.courseName}</p>
                                                        </div>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ margin: '4px 0' }}><strong>Section:</strong> {selectedStudent.batchName}</p>
                                                            <p style={{ margin: '4px 0' }}><strong>ID:</strong> {selectedStudent.studentId || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #334155' }}>
                                                        <thead>
                                                            <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                                                                <th style={{ padding: '10px', border: '1px solid #334155', textAlign: 'left', color: '#cbd5e1', fontSize: '12px' }}>Subject</th>
                                                                <th style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', color: '#cbd5e1', fontSize: '12px' }}>Max</th>
                                                                <th style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', color: '#cbd5e1', fontSize: '12px' }}>Obtained</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {subjectRows.map((row: any, i: number) => (
                                                                <tr key={i}>
                                                                    <td style={{ padding: '10px', border: '1px solid #334155', fontSize: '13px', fontWeight: '600' }}>{row.subject}</td>
                                                                    <td style={{ padding: '10px', border: '1px solid #334155', fontSize: '13px', textAlign: 'center' }}>{row.max}</td>
                                                                    <td style={{ padding: '10px', border: '1px solid #334155', fontSize: '13px', textAlign: 'center', fontWeight: '700', color: row.obtained !== '-' ? '#10b981' : 'inherit' }}>{row.obtained}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                        <tfoot>
                                                            <tr style={{ background: 'rgba(16,185,129,0.1)' }}>
                                                                <td style={{ padding: '10px', border: '1px solid #334155', fontWeight: '800', textAlign: 'right', fontSize: '13px' }}>TOTAL ({percentage}%)</td>
                                                                <td style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', fontWeight: '800', fontSize: '13px' }}>{grandTotalMax}</td>
                                                                <td style={{ padding: '10px', border: '1px solid #334155', textAlign: 'center', fontWeight: '800', color: '#10b981', fontSize: '13px' }}>{grandTotalObtained}</td>
                                                            </tr>
                                                        </tfoot>
                                                    </table>
                                                </div>
                                                <div style={{ padding: '12px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                                                    <button onClick={() => downloadPDF(reportCardId, `${selectedStudent.fullName}_${examTitle}`)} className="btn btn-secondary btn-sm" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                                                        📄 Download PDF
                                                    </button>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}

                        </div>
                        {!isEditing && (
                            <div className="modal-footer">
                                {canEditOrDelete && (
                                    <button onClick={() => { setEditForm(selectedStudent); setIsEditing(true); }} className="btn btn-secondary">✏️ Edit Details</button>
                                )}
                                <button onClick={() => downloadPDF('admission-form-content', `${selectedStudent.fullName}_Admission_Form`)} className="btn btn-primary">📄 Admission Form</button>
                                <a href={`https://wa.me/${(selectedStudent.parentPhone || selectedStudent.phone)?.replace(/\D/g, '')}?text=Dear Parent, This is regarding ${selectedStudent.fullName} from our school.`} target="_blank" className="btn btn-success">💬 WhatsApp Parent</a>
                                <button onClick={() => setSelectedStudent(null)} className="btn btn-secondary">Close</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Hidden Admission Form for PDF */}
            {selectedStudent && (
                <div style={{ display: 'none' }}>
                    <div id="admission-form-content" style={{ padding: '20px', fontFamily: 'sans-serif' }}>
                        <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '10px' }}>
                            {tenant?.logo && <img src={tenant.logo} alt="Logo" style={{ height: '60px', marginBottom: '10px' }} />}
                            <h1 style={{ margin: 0, fontSize: '24px', textTransform: 'uppercase' }}>{tenant?.name || 'SCHOOL NAME'}</h1>
                            <p style={{ margin: '5px 0' }}>{tenant?.address || 'School Address'}</p>
                            <p style={{ margin: '0' }}>Phone: {tenant?.phone || '-'} | Email: {tenant?.email || '-'}</p>
                            <h2 style={{ marginTop: '15px', textDecoration: 'underline' }}>ADMISSION FORM</h2>
                        </div>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%', fontWeight: 'bold' }}>Scholar No.</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{selectedStudent.scholarNo || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%', fontWeight: 'bold' }}>Admission Date</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', width: '25%' }}>{selectedStudent.admissionDate ? formatDate(selectedStudent.admissionDate) : '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Student Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }} colSpan={3}>{selectedStudent.fullName}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Date of Birth</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.dob ? formatDate(selectedStudent.dob) : '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>DOB (In Words)</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.dobInWords || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Gender</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.gender || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Caste / Medium</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{(selectedStudent.caste || '-') + ' / ' + (selectedStudent.medium || '-')}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Class & Section</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.courseName} - {selectedStudent.batchName}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Phone Number</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.phone || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Father's Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.fatherName || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Mother's Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.motherName || '-'}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Parent Phone</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.parentPhone || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Aadhaar / Samagra</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{(selectedStudent.aadhaarNo || '-') + ' / ' + (selectedStudent.samagraId || '-')}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>Bank Name</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{selectedStudent.bankName || '-'}</td>
                                    <td style={{ border: '1px solid #000', padding: '8px', fontWeight: 'bold' }}>A/C & IFSC</td>
                                    <td style={{ border: '1px solid #000', padding: '8px' }}>{(selectedStudent.bankAccountNo || '-') + ' / ' + (selectedStudent.ifsc || '-')}</td>
                                </tr>
                            </tbody>
                        </table>
                        
                        <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', padding: '0 20px' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px' }}></div>
                                <p style={{ margin: 0 }}>Parent/Guardian Signature</p>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderBottom: '1px solid #000', width: '150px', marginBottom: '5px' }}></div>
                                <p style={{ margin: 0 }}>Authorized Signatory</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
