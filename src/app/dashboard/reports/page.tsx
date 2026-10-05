'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { downloadCSV, generateAndPrintPDF } from '@/lib/reportExport'

export default function ReportsPage() {
  const { token, tenant } = useAuth()
  const [activeTab, setActiveTab] = useState<'fee' | 'attendance' | 'students'>('fee')
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const h = { Authorization: `Bearer ${token}` }

  const loadReport = async (type: string) => {
    setLoading(true)
    const res = await fetch(`/api/reports?type=${type}`, { headers: h })
    const d = await res.json()
    setData(d)
    setLoading(false)
  }

  useEffect(() => { if (token) loadReport(activeTab) }, [token, activeTab])

  const tabs = [
    { key: 'fee', label: '💰 Fee Report', icon: '💰' },
    { key: 'attendance', label: '✅ Attendance', icon: '✅' },
    { key: 'students', label: '👨‍🎓 Students Directory', icon: '👨‍🎓' },
  ]

  const handleDownloadFeeCSV = () => {
    if (!data?.payments) return
    const timestamp = new Date().toISOString().split('T')[0]
    const rows = [
      ['UNIVERSAL DAY BOARDING ACADEMY - FEE COLLECTION REPORT'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Total Collection', `₹${(data.totalCollection || 0).toLocaleString('en-IN')}`],
      ['This Month Collection', `₹${(data.todayCollection || 0).toLocaleString('en-IN')}`],
      ['Total Records', data.payments.length],
      [''],
      ['Student Name', 'Student ID', 'Amount (INR)', 'Payment Mode', 'Date']
    ]
    data.payments.forEach((p: any) => {
      rows.push([
        p.student?.fullName || '-',
        p.student?.studentId || '-',
        p.amount,
        p.mode,
        new Date(p.createdAt).toLocaleDateString('en-IN')
      ])
    })
    downloadCSV(`udba-fee-report-${timestamp}.csv`, rows)
  }

  const handleDownloadFeePDF = () => {
    if (!data?.payments) return
    generateAndPrintPDF({
      title: 'Fee Collection & Transactions Report',
      subtitle: 'Comprehensive Fee Receipts & Financial Inflow Summary',
      schoolName: tenant?.name || 'Universal Day Boarding Academy',
      schoolAddress: '📍 Pinto Park, Gwalior (MP) • Ph: +91 7879337770',
      stats: [
        { label: 'Total Collection', value: `₹${(data.totalCollection || 0).toLocaleString('en-IN')}`, subtext: 'Lifetime collection', color: '#10b981' },
        { label: 'This Month', value: `₹${(data.todayCollection || 0).toLocaleString('en-IN')}`, subtext: 'Current month receipts', color: '#f59e0b' },
        { label: 'Total Transactions', value: data.payments.length, subtext: 'Payment entries', color: '#6366f1' },
      ],
      tables: [
        {
          title: 'Fee Payment Records',
          headers: ['Student Name', 'Student ID', 'Amount (₹)', 'Mode', 'Date'],
          rows: data.payments.map((p: any) => [
            p.student?.fullName || '-',
            p.student?.studentId || '-',
            `₹${p.amount.toLocaleString('en-IN')}`,
            p.mode,
            new Date(p.createdAt).toLocaleDateString('en-IN'),
          ])
        }
      ]
    })
  }

  const handleDownloadAttendanceCSV = () => {
    if (!data?.records) return
    const timestamp = new Date().toISOString().split('T')[0]
    const rows = [
      ['UNIVERSAL DAY BOARDING ACADEMY - ATTENDANCE REPORT'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Present Count', data.present || 0],
      ['Absent Count', data.absent || 0],
      ['Total Records', data.total || 0],
      [''],
      ['Student Name', 'Student ID', 'Batch / Class', 'Status', 'Date']
    ]
    data.records.forEach((r: any) => {
      rows.push([
        r.student?.fullName || '-',
        r.student?.studentId || '-',
        r.batch?.name || '-',
        r.status,
        new Date(r.date).toLocaleDateString('en-IN'),
      ])
    })
    downloadCSV(`udba-attendance-report-${timestamp}.csv`, rows)
  }

  const handleDownloadAttendancePDF = () => {
    if (!data?.records) return
    generateAndPrintPDF({
      title: 'Daily Attendance Report',
      subtitle: `Official Attendance Roster - Generated on ${new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
      schoolName: tenant?.name || 'Universal Day Boarding Academy',
      schoolAddress: '📍 Pinto Park, Gwalior (MP) • Ph: +91 7879337770',
      stats: [
        { label: 'Present Today', value: data.present || 0, subtext: 'Attended sessions', color: '#10b981' },
        { label: 'Absent Today', value: data.absent || 0, subtext: 'Marked absent', color: '#ef4444' },
        { label: 'Total Records', value: data.total || 0, subtext: 'Students tracked', color: '#6366f1' },
        { label: 'Attendance Rate', value: data.total > 0 ? `${Math.round(((data.present || 0) / data.total) * 100)}%` : '0%', subtext: 'Today ratio', color: '#10b981' },
      ],
      tables: [
        {
          title: 'Student Attendance Register',
          headers: ['Student Name', 'Student ID', 'Batch / Class', 'Status', 'Date'],
          rows: data.records.map((r: any) => [
            r.student?.fullName || '-',
            r.student?.studentId || '-',
            r.batch?.name || '-',
            r.status,
            new Date(r.date).toLocaleDateString('en-IN'),
          ])
        }
      ]
    })
  }

  const handleDownloadStudentsCSV = () => {
    if (!data?.students) return
    const timestamp = new Date().toISOString().split('T')[0]
    const rows = [
      ['UNIVERSAL DAY BOARDING ACADEMY - STUDENTS ENROLLMENT DIRECTORY'],
      ['Generated On', new Date().toLocaleString('en-IN')],
      ['Total Students', data.students.length],
      [''],
      ['Full Name', 'Student ID', 'Class / Course', 'Section / Batch', 'Phone', 'Father Name', 'Total Fee (INR)', 'Paid Fee (INR)', 'Due Fee (INR)', 'Status']
    ]
    data.students.forEach((s: any) => {
      rows.push([
        s.fullName,
        s.studentId || '-',
        s.course?.name || '-',
        s.batch?.name || '-',
        s.phone || '-',
        s.fatherName || '-',
        s.totalFee || 0,
        s.paidFee || 0,
        Math.max(0, (s.totalFee || 0) - (s.paidFee || 0)),
        s.status,
      ])
    })
    downloadCSV(`udba-students-report-${timestamp}.csv`, rows)
  }

  const handleDownloadStudentsPDF = () => {
    if (!data?.students) return
    const totalFees = data.students.reduce((sum: number, s: any) => sum + (s.totalFee || 0), 0)
    const paidFees = data.students.reduce((sum: number, s: any) => sum + (s.paidFee || 0), 0)
    generateAndPrintPDF({
      title: 'Students Directory & Fee Dues Report',
      subtitle: 'Complete Institutional Enrollment & Accounts Profile',
      schoolName: tenant?.name || 'Universal Day Boarding Academy',
      schoolAddress: '📍 Pinto Park, Gwalior (MP) • Ph: +91 7879337770',
      stats: [
        { label: 'Total Enrolled', value: data.students.length, subtext: 'Registered students', color: '#6366f1' },
        { label: 'Total Billed', value: `₹${totalFees.toLocaleString('en-IN')}`, subtext: 'Course fees', color: '#10b981' },
        { label: 'Total Collected', value: `₹${paidFees.toLocaleString('en-IN')}`, subtext: 'Received so far', color: '#10b981' },
        { label: 'Total Outstanding', value: `₹${(totalFees - paidFees).toLocaleString('en-IN')}`, subtext: 'Pending dues', color: '#ef4444' },
      ],
      tables: [
        {
          title: 'Students Roster',
          headers: ['Student Name', 'ID', 'Class', 'Section', 'Phone', 'Total Fee', 'Paid Fee', 'Due Fee', 'Status'],
          rows: data.students.map((s: any) => [
            s.fullName,
            s.studentId || '-',
            s.course?.name || '-',
            s.batch?.name || '-',
            s.phone || '-',
            `₹${(s.totalFee || 0).toLocaleString('en-IN')}`,
            `₹${(s.paidFee || 0).toLocaleString('en-IN')}`,
            `₹${Math.max(0, (s.totalFee || 0) - (s.paidFee || 0)).toLocaleString('en-IN')}`,
            s.status
          ])
        }
      ]
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="page-title">📊 Reports</h1>
          <p className="page-subtitle">Download fee, attendance and student reports in CSV or PDF format</p>
        </div>
        <Link href="/dashboard/analytics" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none', fontSize: '13px' }}>
          <span>📈</span> View Analytics
        </Link>
      </div>

      {/* Summary Cards for Fee */}
      {activeTab === 'fee' && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Collection</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '8px 0' }}>₹{(data.totalCollection || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#f59e0b' } as React.CSSProperties}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>This Month</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '8px 0' }}>₹{(data.todayCollection || 0).toLocaleString('en-IN')}</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#6366f1' } as React.CSSProperties}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Transactions</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '8px 0' }}>{data.payments?.length || 0}</div>
          </div>
        </div>
      )}

      {/* Attendance Summary */}
      {activeTab === 'attendance' && data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div className="stat-card" style={{ '--card-accent': '#10b981' } as React.CSSProperties}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Present Today</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '8px 0' }}>{data.present}</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#ef4444' } as React.CSSProperties}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Absent Today</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '8px 0' }}>{data.absent}</div>
          </div>
          <div className="stat-card" style={{ '--card-accent': '#6366f1' } as React.CSSProperties}>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', textTransform: 'uppercase' }}>Total Records</div>
            <div style={{ fontSize: '22px', fontWeight: '800', color: 'white', margin: '8px 0' }}>{data.total}</div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key as any)}
            style={{ padding: '10px 16px', border: 'none', background: 'transparent', color: activeTab === t.key ? 'var(--primary-light)' : 'var(--text-muted)', fontWeight: activeTab === t.key ? '700' : '400', fontSize: '14px', cursor: 'pointer', borderBottom: activeTab === t.key ? '2px solid var(--primary-light)' : '2px solid transparent', marginBottom: '-1px' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Download Buttons */}
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
        <button
          className="btn btn-secondary"
          onClick={
            activeTab === 'fee'
              ? handleDownloadFeeCSV
              : activeTab === 'attendance'
              ? handleDownloadAttendanceCSV
              : handleDownloadStudentsCSV
          }
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px' }}
        >
          <span>⬇️</span> Download CSV
        </button>
        <button
          className="btn btn-primary"
          onClick={
            activeTab === 'fee'
              ? handleDownloadFeePDF
              : activeTab === 'attendance'
              ? handleDownloadAttendancePDF
              : handleDownloadStudentsPDF
          }
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', fontSize: '13px', background: 'linear-gradient(135deg, #1a5c38, #0f3d26)' }}
        >
          <span>🖨️</span> Download PDF
        </button>
      </div>

      {/* Data Table */}
      {loading ? <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading report...</div> : (
        <div className="card" style={{ padding: 0 }}>
          <div className="table-container">
            <table>
              {activeTab === 'fee' && data?.payments && (
                <><thead><tr><th>Student</th><th>Amount</th><th>Mode</th><th>Date</th></tr></thead>
                <tbody>{data.payments.map((p: any) => (
                  <tr key={p.id}>
                    <td><div>{p.student?.fullName}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.student?.studentId}</div></td>
                    <td style={{ fontWeight: '700', color: '#10b981' }}>₹{p.amount.toLocaleString('en-IN')}</td>
                    <td><span style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8', borderRadius: '6px', padding: '2px 8px', fontSize: '11px' }}>{p.mode}</span></td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(p.createdAt).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}</tbody></>
              )}
              {activeTab === 'attendance' && data?.records && (
                <><thead><tr><th>Student</th><th>Batch</th><th>Status</th><th>Date</th></tr></thead>
                <tbody>{data.records.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.student?.fullName || '-'}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{r.batch?.name}</td>
                    <td><span style={{ background: r.status === 'PRESENT' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: r.status === 'PRESENT' ? '#10b981' : '#ef4444', borderRadius: '6px', padding: '2px 8px', fontSize: '11px' }}>{r.status}</span></td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                  </tr>
                ))}</tbody></>
              )}
              {activeTab === 'students' && data?.students && (
                <><thead><tr><th>Student</th><th>Class</th><th>Section</th><th>Fee Status</th></tr></thead>
                <tbody>{data.students.map((s: any) => (
                  <tr key={s.id}>
                    <td><div>{s.fullName}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{s.studentId}</div></td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.course?.name}</td>
                    <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.batch?.name}</td>
                    <td>
                      <div style={{ fontSize: '12px' }}>Paid: <span style={{ color: '#10b981', fontWeight: '700' }}>₹{s.paidFee.toLocaleString()}</span></div>
                      <div style={{ fontSize: '12px' }}>Due: <span style={{ color: s.totalFee - s.paidFee > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>₹{(s.totalFee - s.paidFee).toLocaleString()}</span></div>
                    </td>
                  </tr>
                ))}</tbody></>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
