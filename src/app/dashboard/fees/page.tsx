'use client'
import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/lib/utils'
import { downloadCSV, generateAndPrintPDF } from '@/lib/reportExport'

interface Student {
    id: string
    fullName: string
    phone: string
    parentPhone: string
    courseName: string
    totalFee: number
    paidFee: number
    status: string
    fatherName?: string
    studentId?: string
    address?: string
}

interface DepositModal {
    open: boolean
    fee: any | null
    amount: string
    date: string
    paymentMode: string
    processing: boolean
}

// ─── Number to Words (Indian) ─────────────────────────────────────────────────
function convertToWords(amount: number): string {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
        'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
        'Seventeen', 'Eighteen', 'Nineteen']
    const tensArr = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']
    function chunk(n: number): string {
        if (n === 0) return ''
        if (n < 20) return ones[n] + ' '
        if (n < 100) return tensArr[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' '
        return ones[Math.floor(n / 100)] + ' Hundred ' + chunk(n % 100)
    }
    const rupees = Math.floor(amount)
    const paise = Math.round((amount - rupees) * 100)
    let words = ''
    if (rupees === 0) words = 'Zero'
    else {
        const cr = Math.floor(rupees / 10000000)
        const lk = Math.floor((rupees % 10000000) / 100000)
        const th = Math.floor((rupees % 100000) / 1000)
        const rest = rupees % 1000
        if (cr) words += chunk(cr) + 'Crore '
        if (lk) words += chunk(lk) + 'Lakh '
        if (th) words += chunk(th) + 'Thousand '
        if (rest) words += chunk(rest)
    }
    words = 'Rupees ' + words.trim()
    if (paise > 0) words += ` and ${chunk(paise).trim()} Paise`
    return words + ' Only'
}

// ─── PDF Receipt Generator ────────────────────────────────────────────────────
function generateReceiptPDF(opts: {
    receipt: any
    student: Student
    tenant: any
    installmentLabel: string
    win?: Window | null
}) {
    const { receipt, student, tenant, installmentLabel, win: providedWin } = opts
    const schoolName = tenant?.name || 'School'
    const schoolAddress = tenant?.address || ''
    const schoolPhone = tenant?.phone || ''
    const schoolEmail = tenant?.email || ''
    const logoUrl = tenant?.logo || ''
    const directorSign = tenant?.directorSign || ''
    const schoolCode = tenant?.schoolCode || ''

    const depositDate = receipt.createdAt
        ? new Date(receipt.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

    const paidAmount = parseFloat(receipt.amount || 0)
    const modeLabels: Record<string, string> = {
        CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer',
        CHEQUE: 'Cheque', CARD: 'Card', ONLINE: 'Online',
    }
    const modeLabel = modeLabels[receipt.mode] || receipt.mode || 'Cash'
    const amtWords = convertToWords(paidAmount)

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Fee Receipt – ${receipt.receiptNo || 'N/A'}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f0f4f8;display:flex;justify-content:center;padding:20px}
.page{width:210mm;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,0.12);border-radius:8px;overflow:hidden}
.header{background:linear-gradient(135deg,#1a3c5e 0%,#0f2540 100%);color:#fff;padding:24px 32px;display:flex;align-items:center;gap:20px}
.logo-box{width:68px;height:68px;border-radius:12px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;overflow:hidden}
.logo-box img{width:100%;height:100%;object-fit:cover}
.school-info{flex:1}
.school-name{font-size:19px;font-weight:800;letter-spacing:.5px;line-height:1.2}
.school-sub{font-size:11px;color:rgba(255,255,255,.72);margin-top:5px;line-height:1.6}
.rec-badge{background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.28);border-radius:12px;padding:12px 18px;text-align:center;flex-shrink:0}
.rec-badge-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:rgba(255,255,255,.65)}
.rec-badge-no{font-size:17px;font-weight:800;color:#fbbf24;margin-top:3px}
.rec-badge-dt{font-size:10px;color:rgba(255,255,255,.7);margin-top:2px}
.title-band{background:#fbbf24;text-align:center;padding:6px;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#1a3c5e}
.body{padding:24px 32px}
.stu-grid{display:grid;grid-template-columns:1fr 1fr;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;margin-bottom:20px}
.stu-cell{padding:10px 16px;border-bottom:1px solid #e2e8f0}
.stu-cell:nth-child(odd){border-right:1px solid #e2e8f0;background:#f8fafc}
.stu-cell:last-child,.stu-cell:nth-last-child(2){border-bottom:none}
.lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin-bottom:2px}
.val{font-size:13px;font-weight:600;color:#0f172a}
table.fee{width:100%;border-collapse:collapse;margin-bottom:18px}
table.fee thead tr{background:#1a3c5e;color:#fff}
table.fee th{padding:10px 14px;font-size:11px;text-align:left;font-weight:700;letter-spacing:.4px}
table.fee th:last-child{text-align:right}
table.fee tbody tr:nth-child(even){background:#f8fafc}
table.fee td{padding:10px 14px;font-size:13px;border-bottom:1px solid #e2e8f0}
table.fee td:last-child{text-align:right;font-weight:700}
table.fee tfoot tr{background:#ecfdf5}
table.fee tfoot td{padding:12px 14px;font-weight:800;font-size:14px;border-top:2px solid #10b981}
table.fee tfoot td:last-child{color:#059669;text-align:right}
.words{background:#fffbeb;border:1px dashed #f59e0b;border-radius:8px;padding:10px 16px;margin-bottom:20px;font-size:12px;color:#78350f}
.words strong{font-weight:700}
.footer{display:flex;justify-content:space-between;align-items:flex-end;margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;position:relative}
.note{font-size:10px;color:#64748b;max-width:260px;line-height:1.6}
.sig{text-align:center;min-width:180px}
.sig-line{width:180px;height:55px;border-bottom:1.5px solid #0f172a;margin-bottom:5px;display:flex;align-items:flex-end;justify-content:center}
.sig-line img{max-height:52px;max-width:160px;object-fit:contain}
.sig-lbl{font-size:10px;font-weight:800;color:#0f172a;text-transform:uppercase;letter-spacing:.4px}
.sig-sub{font-size:9px;color:#64748b;margin-top:1px}
.stamp{position:absolute;top:-10px;right:0;border:3px solid #10b981;border-radius:8px;padding:4px 14px;font-size:20px;font-weight:900;color:#10b981;transform:rotate(-8deg);letter-spacing:3px;opacity:.85}
@media print{body{background:#fff;padding:0}.page{width:100%;box-shadow:none}@page{margin:0;size:A5 landscape}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-box">
      ${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.parentElement.textContent='🏫'"/>` : '🏫'}
    </div>
    <div class="school-info">
      <div class="school-name">${schoolName.toUpperCase()}</div>
      <div class="school-sub">
        ${schoolAddress ? `📍 ${schoolAddress}<br/>` : ''}
        ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
        ${schoolCode ? `<br/>School Code: ${schoolCode}` : ''}
      </div>
    </div>
    <div class="rec-badge">
      <div class="rec-badge-lbl">Receipt No.</div>
      <div class="rec-badge-no">${receipt.receiptNo || 'N/A'}</div>
      <div class="rec-badge-dt">${depositDate}</div>
    </div>
  </div>
  <div class="title-band">✦ &nbsp; Fee Payment Receipt &nbsp; ✦</div>
  <div class="body">
    <div class="stu-grid">
      <div class="stu-cell"><div class="lbl">Student Name</div><div class="val">${student.fullName}</div></div>
      <div class="stu-cell"><div class="lbl">Father's Name</div><div class="val">${student.fatherName || '—'}</div></div>
      <div class="stu-cell"><div class="lbl">Class / Course</div><div class="val">${student.courseName}</div></div>
      <div class="stu-cell"><div class="lbl">Contact</div><div class="val">${student.parentPhone || student.phone || '—'}</div></div>
      ${student.studentId ? `<div class="stu-cell"><div class="lbl">Student ID</div><div class="val">${student.studentId}</div></div>` : '<div class="stu-cell"><div class="lbl">Date of Deposit</div><div class="val">${depositDate}</div></div>'}
      <div class="stu-cell"><div class="lbl">Payment Mode</div><div class="val">${modeLabel}</div></div>
    </div>
    <table class="fee">
      <thead><tr><th>#</th><th>Description</th><th>Type</th><th>Date</th><th>Amount (₹)</th></tr></thead>
      <tbody>
        <tr><td>1</td><td>${installmentLabel}</td><td>Fee Deposit</td><td>${depositDate}</td><td>₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr>
      </tbody>
      <tfoot><tr><td colspan="4">Total Amount Received</td><td>₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td></tr></tfoot>
    </table>
    <div class="words"><strong>Amount in Words:</strong> ${amtWords}</div>
    <div class="footer">
      <span class="stamp">PAID</span>
      <div class="note">
        <strong>Note:</strong><br/>
        • This is a computer-generated receipt.<br/>
        • Please retain this receipt for your records.<br/>
        • Valid without physical stamp if system-generated.
      </div>
      <div class="sig">
        <div class="sig-line">
          ${directorSign ? `<img src="${directorSign}" alt="Signature"/>` : ''}
        </div>
        <div class="sig-lbl">Auth. Signatory</div>
        <div class="sig-sub">${schoolName}</div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`
    if (providedWin) {
        providedWin.document.open()
        providedWin.document.write(html)
        providedWin.document.close()
    } else {
        const win = window.open('', '_blank', 'width=960,height=680')
        if (!win) { alert('Please allow popups for this site to download receipts.'); return }
        win.document.open()
        win.document.write(html)
        win.document.close()
    }
}

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function FeesPage() {
    const { token, tenant } = useAuth()
    const [students, setStudents] = useState<Student[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('outstanding')
    const [toast, setToast] = useState('')

    // Installments Modal State
    const [selectedStudentForFees, setSelectedStudentForFees] = useState<Student | null>(null)
    const [studentFees, setStudentFees] = useState<any[]>([])
    const [feesLoading, setFeesLoading] = useState(false)
    const [paymentMode, setPaymentMode] = useState('CASH')

    // Deposit Modal
    const [depositModal, setDepositModal] = useState<DepositModal>({
        open: false,
        fee: null,
        amount: '',
        date: '',
        paymentMode: 'CASH',
        processing: false,
    })

    const fetchStudents = () => {
        fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => { if (data.success) setStudents(data.data); setLoading(false) })
    }

    useEffect(() => {
        if (!token) return
        fetchStudents()
    }, [token])

    const outstanding = students.filter(s => s.totalFee > s.paidFee).sort((a, b) => (b.totalFee - b.paidFee) - (a.totalFee - a.paidFee))
    const paid = students.filter(s => s.paidFee >= s.totalFee)
    const totalDue = outstanding.reduce((s, st) => s + (st.totalFee - st.paidFee), 0)
    const totalCollected = students.reduce((s, st) => s + st.paidFee, 0)

    const sendWhatsAppReminder = (student: Student) => {
        const due = formatCurrency(student.totalFee - student.paidFee)
        const msg = `Dear Parent, This is a gentle reminder that ${student.fullName}'s fee of ${due} is pending at our school. Please arrange payment at your earliest convenience. Thank you!`
        window.open(`https://wa.me/91${(student.parentPhone || student.phone).replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    }

    const openInstallments = async (student: Student) => {
        setSelectedStudentForFees(student)
        setFeesLoading(true)
        const res = await fetch(`/api/fees?studentId=${student.id}`, { headers: { Authorization: `Bearer ${token}` } })
        const data = await res.json()
        if (data.success) setStudentFees(data.data)
        setFeesLoading(false)
    }

    const openDepositModal = (fee: any) => {
        setDepositModal({
            open: true,
            fee,
            amount: fee.amount > 0 ? String(fee.amount) : '',
            date: '',   // NO default — user must choose
            paymentMode: paymentMode,
            processing: false,
        })
    }

    const handleDepositSubmit = async () => {
        const { fee, amount, date, paymentMode: mode } = depositModal
        if (!fee || !amount || parseFloat(amount) <= 0) { alert('Please enter a valid amount'); return }
        if (!date) { alert('Please select or enter the Date of Deposit'); return }

        // Pre-open window before async to bypass popup blockers
        const printWindow = window.open('', '_blank', 'width=960,height=680')
        if (printWindow) {
            printWindow.document.write('<div style="font-family:sans-serif;padding:40px;text-align:center;">Generating receipt, please wait...</div>')
        }

        setDepositModal(prev => ({ ...prev, processing: true }))
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    studentId: fee.studentId,
                    feeId: fee.id,
                    amount: parseFloat(amount),
                    mode,
                    date,
                    notes: `Fee Deposit – ${fee.notes || 'Installment'}`,
                })
            })
            const data = await res.json()
            if (data.success) {
                setToast('✅ Payment recorded! Generating receipt…')
                setTimeout(() => setToast(''), 4000)

                // Generate PDF receipt
                generateReceiptPDF({
                    receipt: { ...data.data, amount: parseFloat(amount) },
                    student: selectedStudentForFees!,
                    tenant,
                    installmentLabel: fee.notes || 'Fee Installment',
                    win: printWindow
                })

                // Refresh
                openInstallments(selectedStudentForFees!)
                fetchStudents()
                setDepositModal(prev => ({ ...prev, processing: false, open: false }))
            } else {
                alert(data.error || 'Payment failed')
                if (printWindow) printWindow.close()
                setDepositModal(prev => ({ ...prev, processing: false }))
            }
        } catch {
            alert('Network error. Please try again.')
            if (printWindow) printWindow.close()
            setDepositModal(prev => ({ ...prev, processing: false }))
        }
    }

    const getCurrentList = () => activeTab === 'outstanding' ? outstanding : activeTab === 'paid' ? paid : students

    const handleExportCSV = () => {
        const list = getCurrentList()
        const timestamp = new Date().toISOString().split('T')[0]
        const tabTitle = activeTab === 'outstanding' ? 'OUTSTANDING DUES' : activeTab === 'paid' ? 'PAID FEES' : 'ALL STUDENTS'
        const rows: (string | number)[][] = [
            [`${tenant?.name || 'SCHOOL'} - FEE REPORT (${tabTitle})`],
            ['Generated On', new Date().toLocaleString('en-IN')],
            ['Total Students In List', list.length],
            ['Total Outstanding Dues', formatCurrency(totalDue)],
            ['Total Collected', formatCurrency(totalCollected)],
            [],
            ['Student Name', 'Phone', 'Parent Phone', 'Course', 'Total Fee (INR)', 'Paid Fee (INR)', 'Pending Due (INR)', 'Payment %', 'Status']
        ]
        list.forEach(s => {
            const pending = s.totalFee - s.paidFee
            const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
            rows.push([s.fullName, s.phone || '-', s.parentPhone || '-', s.courseName || '-', s.totalFee, s.paidFee, Math.max(0, pending), `${pct}%`, s.status])
        })
        downloadCSV(`fees-${activeTab}-${timestamp}.csv`, rows)
    }

    const handleExportPDF = () => {
        const list = getCurrentList()
        const tabTitle = activeTab === 'outstanding' ? 'Outstanding Fees Report' : activeTab === 'paid' ? 'Paid Fees Report' : 'Student Fee Accounts Report'
        generateAndPrintPDF({
            title: tabTitle,
            subtitle: `Filter: ${activeTab.toUpperCase()} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
            schoolName: tenant?.name || 'School',
            schoolAddress: tenant?.address || '',
            stats: [
                { label: 'Total Collected', value: formatCurrency(totalCollected), subtext: 'Received so far', color: '#10b981' },
                { label: 'Total Outstanding', value: formatCurrency(totalDue), subtext: 'Pending balance', color: '#f59e0b' },
                { label: 'Students with Dues', value: outstanding.length, subtext: 'Unpaid installments', color: '#ef4444' },
                { label: 'Fully Paid Students', value: paid.length, subtext: 'Completed payments', color: '#6366f1' },
            ],
            tables: [{
                title: `Fee Accounts (${list.length} Students)`,
                headers: ['Student Name', 'Phone', 'Course', 'Total Fee', 'Paid', 'Pending Due', 'Payment %'],
                rows: list.map(s => {
                    const pending = s.totalFee - s.paidFee
                    const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                    return [s.fullName, s.parentPhone || s.phone || '-', s.courseName, formatCurrency(s.totalFee), formatCurrency(s.paidFee), pending > 0 ? formatCurrency(pending) : '✅ Clear', `${pct}%`]
                })
            }]
        })
    }

    return (
        <div>
            <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                    <h1 className="page-title">💰 Fee Management</h1>
                    <p className="page-subtitle">Track and manage student fees</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleExportCSV} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 14px' }}>
                        <span>⬇️</span> Download CSV
                    </button>
                    <button onClick={handleExportPDF} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '9px 14px', background: 'linear-gradient(135deg, #1a5c38, #0f3d26)' }}>
                        <span>🖨️</span> Download PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Total Collected', value: formatCurrency(totalCollected), icon: '✅', color: '#10b981' },
                    { label: 'Total Outstanding', value: formatCurrency(totalDue), icon: '⚠️', color: '#f59e0b' },
                    { label: 'Students with Dues', value: outstanding.length, icon: '👥', color: '#ef4444' },
                    { label: 'Fully Paid Students', value: paid.length, icon: '🎉', color: '#6366f1' },
                ].map(c => (
                    <div key={c.label} style={{ padding: '20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', borderLeft: `4px solid ${c.color}` }}>
                        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{c.icon}</div>
                        <div style={{ fontSize: '22px', fontWeight: '800', color: c.color, marginBottom: '4px' }}>{c.value}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{c.label}</div>
                    </div>
                ))}
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button className={`tab ${activeTab === 'outstanding' ? 'active' : ''}`} onClick={() => setActiveTab('outstanding')}>⚠️ Outstanding ({outstanding.length})</button>
                <button className={`tab ${activeTab === 'paid' ? 'active' : ''}`} onClick={() => setActiveTab('paid')}>✅ Paid ({paid.length})</button>
                <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>👥 All Students</button>
            </div>

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th><th>Course</th><th>Total Fee</th>
                                    <th>Paid</th><th>Pending</th><th>Payment %</th><th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(activeTab === 'outstanding' ? outstanding : activeTab === 'paid' ? paid : students).map(s => {
                                    const pending = s.totalFee - s.paidFee
                                    const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                                    return (
                                        <tr key={s.id}>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{s.fullName.charAt(0)}</div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{s.fullName}</div>
                                                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.courseName}</td>
                                            <td style={{ fontWeight: '600', fontSize: '14px' }}>{formatCurrency(s.totalFee)}</td>
                                            <td style={{ color: '#10b981', fontWeight: '700' }}>{formatCurrency(s.paidFee)}</td>
                                            <td style={{ color: pending > 0 ? '#ef4444' : '#10b981', fontWeight: '700' }}>
                                                {pending > 0 ? formatCurrency(pending) : '✅ Clear'}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div className="progress-bar" style={{ flex: 1 }}>
                                                        <div className="progress-fill" style={{ width: `${pct}%`, background: pct >= 100 ? '#10b981' : pct > 50 ? '#f59e0b' : '#ef4444' }} />
                                                    </div>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', minWidth: '32px' }}>{pct}%</span>
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px' }}>
                                                    <button onClick={() => openInstallments(s)} className="btn btn-primary btn-sm" style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700' }}>
                                                        📜 Installments
                                                    </button>
                                                    {pending > 0 && (
                                                        <button onClick={() => sendWhatsAppReminder(s)} style={{ padding: '5px 10px', background: '#25d36615', border: '1px solid #25d36640', borderRadius: '6px', color: '#25d366', fontSize: '11px', cursor: 'pointer', fontWeight: '700' }}>
                                                            💬 Remind
                                                        </button>
                                                    )}
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

            {/* Toast */}
            {toast && (
                <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', zIndex: 9999, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>
                    {toast}
                </div>
            )}

            {/* ── Installments Modal ──────────────────────────────────────────── */}
            {selectedStudentForFees && (
                <div className="modal-overlay" onClick={() => setSelectedStudentForFees(null)}>
                    <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontWeight: '700', fontSize: '18px' }}>📜 Fee Installments</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedStudentForFees.fullName} • {selectedStudentForFees.courseName}</p>
                            </div>
                            <button onClick={() => setSelectedStudentForFees(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body">
                            {feesLoading ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                            ) : studentFees.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center' }}>
                                    <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No installments found! This usually happens for students added before installment tracking was enabled.</p>
                                    <button className="btn btn-primary" onClick={async () => {
                                        setFeesLoading(true)
                                        try {
                                            const res = await fetch('/api/fees/generate', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({ studentId: selectedStudentForFees.id })
                                            })
                                            const data = await res.json()
                                            if (data.success) { setToast('Installments generated!'); openInstallments(selectedStudentForFees) }
                                            else { alert(data.error || 'Failed to generate'); setFeesLoading(false) }
                                        } catch { alert('Error'); setFeesLoading(false) }
                                    }}>
                                        ⚙️ Auto-Generate Installments
                                    </button>
                                </div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    {/* Summary bar */}
                                    <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '12px' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                            <div>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Total Fee</div>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: 'var(--primary)' }}>{formatCurrency(selectedStudentForFees.totalFee)}</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Remaining</div>
                                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#ef4444' }}>{formatCurrency(selectedStudentForFees.totalFee - selectedStudentForFees.paidFee)}</div>
                                            </div>
                                        </div>
                                        <div className="progress-bar" style={{ marginTop: '12px', height: '6px' }}>
                                            <div className="progress-fill" style={{ width: `${(selectedStudentForFees.paidFee / selectedStudentForFees.totalFee) * 100}%`, background: 'var(--primary)' }} />
                                        </div>
                                    </div>

                                    {/* Installment list with Deposit buttons */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {studentFees.map((fee: any, idx: number) => {
                                            const isPaid = fee.status === 'PAID'
                                            const isPartial = fee.status === 'PARTIAL'
                                            return (
                                                <div key={fee.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '12px',
                                                    padding: '14px 16px',
                                                    background: isPaid ? 'rgba(16,185,129,0.06)' : 'var(--surface)',
                                                    border: `1px solid ${isPaid ? '#10b98140' : isPartial ? '#f59e0b40' : 'var(--border)'}`,
                                                    borderRadius: '12px',
                                                }}>
                                                    <div style={{
                                                        width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                                                        background: isPaid ? '#10b981' : isPartial ? '#f59e0b' : 'var(--surface-2)',
                                                        color: (isPaid || isPartial) ? '#fff' : 'var(--text-muted)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontSize: '13px', fontWeight: '800'
                                                    }}>
                                                        {isPaid ? '✓' : idx + 1}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontSize: '13px', fontWeight: '700' }}>{fee.notes || `Installment ${idx + 1}`}</div>
                                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            Due: {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString('en-IN') : '—'}
                                                            {fee.paidDate && ` • Paid: ${new Date(fee.paidDate).toLocaleDateString('en-IN')}`}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right', marginRight: '8px' }}>
                                                        <div style={{ fontSize: '15px', fontWeight: '800', color: isPaid ? '#10b981' : 'var(--text-primary)' }}>
                                                            {formatCurrency(fee.amount)}
                                                        </div>
                                                        <div style={{ fontSize: '10px', fontWeight: '700', color: isPaid ? '#10b981' : isPartial ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>
                                                            {fee.status}
                                                        </div>
                                                    </div>
                                                    {!isPaid ? (
                                                        <button
                                                            onClick={() => openDepositModal(fee)}
                                                            style={{
                                                                padding: '8px 14px', flexShrink: 0, whiteSpace: 'nowrap',
                                                                background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                                                                color: '#fff', border: 'none', borderRadius: '8px',
                                                                fontSize: '12px', fontWeight: '700', cursor: 'pointer',
                                                                boxShadow: '0 2px 8px rgba(99,102,241,0.35)',
                                                            }}
                                                        >
                                                            💳 Deposit
                                                        </button>
                                                    ) : (
                                                        <div style={{ display: 'flex', gap: '8px' }}>
                                                            {fee.payments && fee.payments.length > 0 && (
                                                                <button
                                                                    onClick={() => {
                                                                        generateReceiptPDF({
                                                                            receipt: fee.payments[0],
                                                                            student: selectedStudentForFees!,
                                                                            tenant,
                                                                            installmentLabel: fee.notes || 'Fee Installment',
                                                                        })
                                                                    }}
                                                                    style={{ padding: '8px 14px', flexShrink: 0, background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}
                                                                >
                                                                    🧾 Receipt
                                                                </button>
                                                            )}
                                                            <div style={{ padding: '8px 14px', flexShrink: 0, background: 'rgba(16,185,129,0.1)', color: '#10b981', borderRadius: '8px', fontSize: '12px', fontWeight: '700' }}>
                                                                ✅ Cleared
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Slot amount editor (legacy) */}
                                    <details style={{ marginTop: '4px' }}>
                                        <summary style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none', padding: '4px' }}>
                                            ⚙️ Edit Slot Amounts (Advanced)
                                        </summary>
                                        <div style={{ marginTop: '12px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px', marginBottom: '10px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-secondary)' }}>Payment Mode</div>
                                                <select className="input" style={{ width: 'auto', padding: '6px 12px', fontSize: '13px', borderRadius: '8px' }} value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                                                    <option value="CASH">💵 Cash</option>
                                                    <option value="UPI">📱 UPI</option>
                                                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                                    <option value="CHEQUE">💳 Cheque</option>
                                                    <option value="CARD">💳 Card</option>
                                                </select>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                                                {[0, 1, 2, 3, 4, 5].map(idx => {
                                                    const fee = studentFees[idx]
                                                    return (
                                                        <div key={idx} style={{ padding: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                                                            <div style={{ fontSize: '12px', fontWeight: '700', marginBottom: '8px', color: 'var(--text-secondary)' }}>Slot {idx + 1}</div>
                                                            <div style={{ position: 'relative' }}>
                                                                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '13px', color: 'var(--text-muted)' }}>₹</span>
                                                                <input type="number" className="input" style={{ paddingLeft: '24px', fontWeight: '700' }} placeholder="0.00"
                                                                    defaultValue={fee?.amount || 0}
                                                                    onBlur={async (e) => {
                                                                        const val = parseFloat(e.target.value) || 0
                                                                        if (fee && val === fee.amount) return
                                                                        if (!fee) { alert('Please generate slots first!'); return }
                                                                        setFeesLoading(true)
                                                                        try {
                                                                            const res = await fetch('/api/fees', {
                                                                                method: 'PATCH',
                                                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                                                body: JSON.stringify({ id: fee.id, amount: val, mode: paymentMode })
                                                                            })
                                                                            const data = await res.json()
                                                                            if (data.success) {
                                                                                const resStudents = await fetch('/api/students', { headers: { Authorization: `Bearer ${token}` } })
                                                                                const dataStudents = await resStudents.json()
                                                                                if (dataStudents.success) {
                                                                                    setStudents(dataStudents.data)
                                                                                    const updatedStu = dataStudents.data.find((s: any) => s.id === selectedStudentForFees.id)
                                                                                    if (updatedStu) setSelectedStudentForFees(updatedStu)
                                                                                }
                                                                                const resFees = await fetch(`/api/fees?studentId=${selectedStudentForFees.id}`, { headers: { Authorization: `Bearer ${token}` } })
                                                                                const dataFees = await resFees.json()
                                                                                if (dataFees.success) setStudentFees(dataFees.data)
                                                                                setToast(`Slot ${idx + 1} updated!`)
                                                                                setTimeout(() => setToast(''), 3000)
                                                                            }
                                                                        } catch { alert('Update failed') }
                                                                        setFeesLoading(false)
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '8px' }}>
                                                * Enter amount in any slot. Dashboard will update in real-time.
                                            </div>
                                        </div>
                                    </details>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ── Deposit Modal ───────────────────────────────────────────────── */}
            {depositModal.open && (
                <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !depositModal.processing && setDepositModal(prev => ({ ...prev, open: false }))}>
                    <div className="modal" style={{ maxWidth: '440px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontWeight: '700', fontSize: '18px' }}>💳 Deposit Fee</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {selectedStudentForFees?.fullName} — {depositModal.fee?.notes || 'Installment'}
                                </p>
                            </div>
                            <button onClick={() => !depositModal.processing && setDepositModal(prev => ({ ...prev, open: false }))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Student Preview */}
                            <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Student</div>
                                        <div style={{ fontWeight: '700' }}>{selectedStudentForFees?.fullName}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Course</div>
                                        <div style={{ fontWeight: '700' }}>{selectedStudentForFees?.courseName}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Contact</div>
                                        <div style={{ fontWeight: '600' }}>{selectedStudentForFees?.parentPhone || selectedStudentForFees?.phone || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Installment</div>
                                        <div style={{ fontWeight: '600' }}>{depositModal.fee?.notes || 'Fee Installment'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ paddingLeft: '30px', fontSize: '18px', fontWeight: '800' }}
                                        placeholder="0.00"
                                        value={depositModal.amount}
                                        onChange={e => setDepositModal(prev => ({ ...prev, amount: e.target.value }))}
                                        min="0" step="0.01"
                                    />
                                </div>
                                {depositModal.amount && parseFloat(depositModal.amount) > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                        {convertToWords(parseFloat(depositModal.amount))}
                                    </div>
                                )}
                            </div>

                            {/* Date of Deposit — NO default value */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    📅 Date of Deposit <span style={{ color: '#ef4444' }}>*</span>
                                    <span style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-muted)', marginLeft: '8px' }}>Select from calendar or type</span>
                                </label>
                                <input
                                    type="date"
                                    className="input"
                                    value={depositModal.date}
                                    onChange={e => setDepositModal(prev => ({ ...prev, date: e.target.value }))}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={{ fontSize: '14px', fontWeight: '600' }}
                                />
                                <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                                    {[{ label: 'Today', days: 0 }, { label: 'Yesterday', days: -1 }].map(d => {
                                        const dt = new Date()
                                        dt.setDate(dt.getDate() + d.days)
                                        const val = dt.toISOString().split('T')[0]
                                        return (
                                            <button key={d.label} type="button"
                                                onClick={() => setDepositModal(prev => ({ ...prev, date: val }))}
                                                style={{
                                                    padding: '4px 12px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                                                    border: `1px solid ${depositModal.date === val ? '#6366f1' : 'var(--border)'}`,
                                                    background: depositModal.date === val ? 'rgba(99,102,241,0.12)' : 'var(--surface-2)',
                                                    color: depositModal.date === val ? '#6366f1' : 'var(--text-muted)',
                                                    borderRadius: '6px',
                                                }}>
                                                {d.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Payment Mode */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>Payment Mode</label>
                                <select className="input" value={depositModal.paymentMode} onChange={e => setDepositModal(prev => ({ ...prev, paymentMode: e.target.value }))}>
                                    <option value="CASH">💵 Cash</option>
                                    <option value="UPI">📱 UPI</option>
                                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                    <option value="CHEQUE">💳 Cheque</option>
                                    <option value="CARD">💳 Card</option>
                                    <option value="ONLINE">🌐 Online</option>
                                </select>
                            </div>

                            {/* Receipt note */}
                            <div style={{ padding: '10px 14px', background: 'rgba(99,102,241,0.07)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.18)', fontSize: '12px', color: '#4f46e5', fontWeight: '600' }}>
                                🧾 A branded PDF receipt will be auto-generated and printed on submission.
                            </div>

                            {/* Buttons */}
                            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                                <button onClick={() => !depositModal.processing && setDepositModal(prev => ({ ...prev, open: false }))} className="btn btn-secondary" style={{ flex: 1 }} disabled={depositModal.processing}>
                                    Cancel
                                </button>
                                <button onClick={handleDepositSubmit} className="btn btn-primary"
                                    disabled={depositModal.processing || !depositModal.amount || !depositModal.date}
                                    style={{ flex: 2, background: 'linear-gradient(135deg,#6366f1,#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                    {depositModal.processing
                                        ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }} /> Processing…</>
                                        : <>💳 Deposit &amp; Generate Receipt</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
