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
    previousDueFee?: number
    status: string
    fatherName?: string
    studentId?: string
    scholarNo?: string
    address?: string
    hasSiblings?: boolean
    siblingsCount?: number
    siblingGroupId?: string | null
}

interface DepositModal {
    open: boolean
    fee: any | null
    amount: string
    date: string
    paymentMode: string
    processing: boolean
}

interface SiblingMember {
    id: string
    fullName: string
    scholarNo?: string
    courseName?: string
    batchName?: string
    fatherName?: string
    phone?: string
    parentPhone?: string
    totalFee: number
    paidFee: number
    previousDueFee?: number
    outstanding: number
    isCurrent?: boolean
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

// ─── PDF Receipt Generator (Single A4 Page: Office Copy + Parent Copy) ───────
function generateReceiptPDF(opts: {
    receipt: any
    student: Student
    tenant: any
    installmentLabel: string
    distributions?: any[]
    isCollective?: boolean
    win?: Window | null
}) {
    const { receipt, student, tenant, installmentLabel, distributions, isCollective, win: providedWin } = opts
    const schoolName = tenant?.name || process.env.NEXT_PUBLIC_SCHOOL_NAME || 'RSS Public School'
    const schoolAddress = tenant?.address || process.env.NEXT_PUBLIC_SCHOOL_ADDRESS || 'Ayodhya Nagari, AB Road, Gol Pahadiya, Lashkar, Gwalior (MP)'
    const schoolPhone = tenant?.phone || process.env.NEXT_PUBLIC_SCHOOL_PHONE || '917489315077'
    const schoolEmail = tenant?.email || process.env.NEXT_PUBLIC_SCHOOL_EMAIL || 'rsspublic1979@gmail.com'
    const logoUrl = tenant?.logo || ''
    const directorSign = tenant?.directorSign || ''
    const schoolCode = tenant?.schoolCode || ''

    const depositDate = receipt.createdAt
        ? new Date(receipt.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
        : new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

    const paidAmount = parseFloat(receipt.amount || 0)
    const modeLabels: Record<string, string> = {
        CASH: 'Cash', UPI: 'UPI', BANK_TRANSFER: 'Bank Transfer',
        CHEQUE: 'Cheque', CARD: 'Card', ONLINE: 'Online',
    }
    const modeLabel = modeLabels[receipt.mode] || receipt.mode || 'Cash'
    const amtWords = convertToWords(paidAmount)

    const renderReceiptCard = (copyType: 'OFFICE COPY' | 'PARENT COPY') => {
        const isOffice = copyType === 'OFFICE COPY'
        const badgeColor = isOffice ? '#1e3a8a' : '#065f46'
        const badgeBg = isOffice ? '#dbeafe' : '#d1fae5'

        const tableBody = (distributions && distributions.length > 0)
            ? distributions.map((d: any, i: number) => `
                <tr>
                    <td style="padding:3px 6px;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:center;">${i + 1}</td>
                    <td style="padding:3px 6px;font-size:13.5px;border-bottom:1px solid #e2e8f0;font-weight:700;">
                        ${d.studentName} ${d.scholarNo && d.scholarNo !== '-' ? `(Sch: ${d.scholarNo})` : ''} • ${d.class}
                    </td>
                    <td style="padding:3px 6px;font-size:13px;border-bottom:1px solid #e2e8f0;">Sibling Fee Allocation</td>
                    <td style="padding:3px 6px;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:right;">₹${(d.previousOutstanding ?? 0).toLocaleString('en-IN')}</td>
                    <td style="padding:3px 6px;font-size:14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:800;color:#059669;">₹${parseFloat(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
            `).join('')
            : `
                <tr>
                    <td style="padding:3px 6px;font-size:13px;border-bottom:1px solid #e2e8f0;text-align:center;">1</td>
                    <td style="padding:3px 6px;font-size:14px;border-bottom:1px solid #e2e8f0;font-weight:700;" colspan="2">${installmentLabel}</td>
                    <td style="padding:3px 6px;font-size:13px;border-bottom:1px solid #e2e8f0;">Fee Deposit</td>
                    <td style="padding:3px 6px;font-size:14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:800;color:#059669;">₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                </tr>
            `

        const tableHeaders = (distributions && distributions.length > 0)
            ? `<tr>
                <th style="padding:3px 6px;font-size:12.5px;text-align:center;width:24px;">#</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:left;">Student / Sibling Details</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:left;">Type</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:right;">Pre Due</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:right;">Amount (₹)</th>
              </tr>`
            : `<tr>
                <th style="padding:3px 6px;font-size:12.5px;text-align:center;width:24px;">#</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:left;" colspan="2">Description</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:left;">Type</th>
                <th style="padding:3px 6px;font-size:12.5px;text-align:right;">Amount (₹)</th>
              </tr>`

        return `
        <div class="receipt-card">
            <!-- Header -->
            <div class="r-head">
                <div class="r-logo">
                    ${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.parentElement.textContent='🏫'"/>` : '🏫'}
                </div>
                <div class="r-school">
                    <div class="r-school-name">${schoolName.toUpperCase()}</div>
                    <div class="r-school-sub">
                        ${schoolAddress ? `📍 ${schoolAddress}` : ''}
                        ${schoolPhone ? ` &nbsp;•&nbsp; 📞 ${schoolPhone}` : ''}
                        ${schoolCode ? ` &nbsp;•&nbsp; Code: ${schoolCode}` : ''}
                    </div>
                </div>
                <div class="r-rec-badge">
                    <div class="r-copy-tag" style="background:${badgeBg};color:${badgeColor};border:1.5px solid ${badgeColor};">${copyType}</div>
                    <div class="r-rec-no">${receipt.receiptNo || 'N/A'}</div>
                    <div class="r-rec-dt">${depositDate}</div>
                </div>
            </div>

            <!-- Title band -->
            <div class="r-band">
                <span>✦ ${isCollective ? 'COLLECTIVE SIBLING FAMILY FEE RECEIPT' : 'STUDENT FEE PAYMENT RECEIPT'} ✦</span>
                <span class="r-band-pill">${copyType}</span>
            </div>

            <!-- Student Grid -->
            <div class="r-grid">
                <div class="r-cell"><span class="r-lbl">Scholar No:</span><span class="r-val" style="color:#1a3c5e;">${student.scholarNo || student.studentId || '—'}</span></div>
                <div class="r-cell"><span class="r-lbl">Student:</span><span class="r-val">${student.fullName}</span></div>
                <div class="r-cell"><span class="r-lbl">Class:</span><span class="r-val">${student.courseName}</span></div>
                <div class="r-cell"><span class="r-lbl">Father's Name:</span><span class="r-val">${student.fatherName || '—'}</span></div>
                <div class="r-cell"><span class="r-lbl">Contact:</span><span class="r-val">${student.parentPhone || student.phone || '—'}</span></div>
                <div class="r-cell"><span class="r-lbl">Payment Mode:</span><span class="r-val">${modeLabel}</span></div>
            </div>

            <!-- Fee Table -->
            <table class="r-table">
                <thead>${tableHeaders}</thead>
                <tbody>${tableBody}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="${distributions && distributions.length > 0 ? 4 : 4}" style="padding:3px 6px;font-size:13.5px;font-weight:700;text-align:right;">
                            Total Amount Received:
                        </td>
                        <td style="padding:3px 6px;font-size:15px;font-weight:900;color:#059669;text-align:right;">
                            ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                    </tr>
                </tfoot>
            </table>

            <!-- Words -->
            <div class="r-words">
                <strong>Amount in Words:</strong> ${amtWords}
            </div>

            <!-- Footer -->
            <div class="r-foot">
                <div class="r-stamp">PAID</div>
                <div class="r-note">
                    • Computer-generated duplicate receipt. Valid for school records.<br/>
                    • Retain this receipt for fee clearance confirmation.
                </div>
                <div class="r-sig">
                    <div class="r-sig-line">
                        ${directorSign ? `<img src="${directorSign}" alt="Sign"/>` : ''}
                    </div>
                    <div class="r-sig-lbl">Authorized Signatory</div>
                    <div class="r-sig-sub">${schoolName}</div>
                </div>
            </div>
        </div>
        `
    }

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Fee Receipt – ${receipt.receiptNo || 'N/A'}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#f1f5f9;font-family:'Inter',-apple-system,sans-serif;color:#0f172a;-webkit-print-color-adjust:exact;print-color-adjust:exact}

.no-print {
    background:#1e293b;
    color:#fff;
    padding:8px 16px;
    display:flex;
    align-items:center;
    justify-content:center;
    gap:16px;
    font-size:13px;
    box-shadow:0 2px 8px rgba(0,0,0,0.2);
}
.no-print button {
    background:#10b981;
    color:#fff;
    border:none;
    padding:6px 18px;
    border-radius:6px;
    font-size:13px;
    font-weight:700;
    cursor:pointer;
    box-shadow:0 2px 4px rgba(0,0,0,0.2);
}
.no-print button:hover {
    background:#059669;
}

.a4-container{
    width:200mm;
    max-width:200mm;
    height:285mm;
    max-height:285mm;
    margin:6px auto;
    background:#fff;
    padding:0;
    box-sizing:border-box;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    box-shadow:0 4px 24px rgba(0,0,0,0.12);
    overflow:hidden;
    page-break-inside:avoid;
    break-inside:avoid;
    page-break-after:avoid;
    break-after:avoid;
}
.receipt-card{
    border:1.5px solid #334155;
    border-radius:6px;
    background:#ffffff;
    padding:6px 10px;
    display:flex;
    flex-direction:column;
    justify-content:space-between;
    height:137mm;
    max-height:137mm;
    box-sizing:border-box;
    position:relative;
    overflow:hidden;
    page-break-inside:avoid;
    break-inside:avoid;
    page-break-after:avoid;
    break-after:avoid;
}
.r-head{
    display:flex;
    align-items:center;
    gap:8px;
    border-bottom:1.5px solid #1a3c5e;
    padding-bottom:3px;
    margin-bottom:2px;
}
.r-logo{
    width:36px;
    height:36px;
    border-radius:6px;
    background:#f8fafc;
    border:1px solid #cbd5e1;
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:20px;
    flex-shrink:0;
    overflow:hidden;
}
.r-logo img{width:100%;height:100%;object-fit:cover}
.r-school{flex:1;line-height:1.2}
.r-school-name{font-size:16.5px;font-weight:900;color:#1a3c5e;letter-spacing:0.3px}
.r-school-sub{font-size:11px;color:#475569;margin-top:2px}
.r-rec-badge{text-align:right;flex-shrink:0}
.r-copy-tag{display:inline-block;padding:2px 7px;border-radius:4px;font-size:12px;font-weight:900;letter-spacing:0.5px}
.r-rec-no{font-size:14px;font-weight:900;color:#1a3c5e;margin-top:2px}
.r-rec-dt{font-size:12px;color:#475569;font-weight:600}

.r-band{
    background:#1a3c5e;
    color:#fff;
    padding:2.5px 8px;
    font-size:12.5px;
    font-weight:800;
    letter-spacing:0.8px;
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-radius:3px;
    margin-bottom:3px;
}
.r-band-pill{
    background:#fbbf24;
    color:#1a3c5e;
    font-size:11px;
    padding:1px 6px;
    border-radius:3px;
    font-weight:900;
}

.r-grid{
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    gap:2px 8px;
    background:#f8fafc;
    border:1px solid #cbd5e1;
    border-radius:4px;
    padding:3px 8px;
    margin-bottom:3px;
}
.r-cell{font-size:14px;line-height:1.25;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.r-lbl{color:#475569;font-weight:700;font-size:11.5px;text-transform:uppercase;margin-right:4px}
.r-val{color:#0f172a;font-weight:800;font-size:14px}

.r-table{
    width:100%;
    border-collapse:collapse;
    margin-bottom:2px;
}
.r-table th{
    background:#f1f5f9;
    color:#334155;
    border:1px solid #94a3b8;
    font-weight:800;
}
.r-table td{
    border:1px solid #cbd5e1;
}
.r-table tfoot td{
    border-top:1.5px solid #10b981;
    background:#ecfdf5;
}

.r-words{
    background:#fffbeb;
    border:1px dashed #f59e0b;
    border-radius:4px;
    padding:2px 6px;
    font-size:13.5px;
    color:#78350f;
    margin-bottom:3px;
    line-height:1.2;
}
.r-words strong{font-size:13px;color:#92400e}

.r-foot{
    display:flex;
    justify-content:space-between;
    align-items:flex-end;
    border-top:1px solid #cbd5e1;
    padding-top:2px;
    position:relative;
}
.r-stamp{
    position:absolute;
    left:50%;
    bottom:2px;
    transform:translateX(-50%) rotate(-6deg);
    border:1.5px solid #10b981;
    color:#10b981;
    font-size:12px;
    font-weight:900;
    padding:1px 8px;
    border-radius:4px;
    letter-spacing:2px;
    opacity:0.85;
}
.r-note{font-size:10.5px;color:#64748b;line-height:1.25;max-width:320px}
.r-sig{text-align:center;min-width:130px}
.r-sig-line{width:130px;height:20px;border-bottom:1px solid #334155;margin-bottom:2px;display:flex;align-items:flex-end;justify-content:center}
.r-sig-line img{max-height:18px;max-width:120px;object-fit:contain}
.r-sig-lbl{font-size:12px;font-weight:800;color:#0f172a;text-transform:uppercase}
.r-sig-sub{font-size:10.5px;color:#64748b}

.cut-line{
    display:flex;
    align-items:center;
    justify-content:center;
    font-size:11px;
    font-weight:700;
    color:#64748b;
    height:5mm;
    max-height:5mm;
    line-height:5mm;
    margin:1mm 0;
    user-select:none;
    box-sizing:border-box;
    page-break-inside:avoid;
    break-inside:avoid;
}

@page {
    size: A4 portrait;
    margin: 4mm 5mm;
}

@media print{
    html, body{
        background:#fff !important;
        margin:0 !important;
        padding:0 !important;
        width:100% !important;
        height:100% !important;
        max-height:297mm !important;
        overflow:hidden !important;
    }
    .no-print{
        display:none !important;
    }
    .a4-container{
        width:100% !important;
        max-width:200mm !important;
        height:285mm !important;
        max-height:285mm !important;
        margin:0 auto !important;
        padding:0 !important;
        box-shadow:none !important;
        border:none !important;
        display:flex !important;
        flex-direction:column !important;
        justify-content:space-between !important;
        page-break-inside:avoid !important;
        break-inside:avoid !important;
        page-break-after:avoid !important;
        break-after:avoid !important;
        page-break-before:avoid !important;
        break-before:avoid !important;
        overflow:hidden !important;
    }
    .receipt-card{
        height:137mm !important;
        max-height:137mm !important;
        page-break-inside:avoid !important;
        break-inside:avoid !important;
        page-break-after:avoid !important;
        break-after:avoid !important;
        overflow:hidden !important;
        box-sizing:border-box !important;
    }
    .cut-line{
        height:5mm !important;
        max-height:5mm !important;
        line-height:5mm !important;
        margin:1mm 0 !important;
        page-break-inside:avoid !important;
        break-inside:avoid !important;
        page-break-after:avoid !important;
        break-after:avoid !important;
        box-sizing:border-box !important;
    }
}
</style>
</head>
<body>
<div class="no-print">
    <span><strong>Single A4 Page:</strong> Office Copy (top) + Parent Copy (bottom)</span>
    <button onclick="window.print()">🖨️ Print / Save as PDF</button>
</div>
<div class="a4-container">
    ${renderReceiptCard('OFFICE COPY')}
    <div class="cut-line">
        <span>✂ - - - - - - - - - - - - - - - - - - - - - - - - Cut Along This Line - - - - - - - - - - - - - - - - - - - - - - - - ✂</span>
    </div>
    ${renderReceiptCard('PARENT COPY')}
</div>
<script>
window.onload = function() {
    setTimeout(function() {
        window.print();
    }, 400);
};
</script>
</body>
</html>`
    if (providedWin) {
        providedWin.document.open()
        providedWin.document.write(html)
        providedWin.document.close()
    } else {
        const win = window.open('', '_blank', 'width=960,height=720')
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
    const [searchQuery, setSearchQuery] = useState('')
    const [toast, setToast] = useState('')

    // Installments Modal State
    const [selectedStudentForFees, setSelectedStudentForFees] = useState<Student | null>(null)
    const [studentFees, setStudentFees] = useState<any[]>([])
    const [feesLoading, setFeesLoading] = useState(false)
    const [paymentMode, setPaymentMode] = useState('CASH')

    // Siblings Group State
    const [siblingGroup, setSiblingGroup] = useState<SiblingMember[]>([])
    const [loadingSiblings, setLoadingSiblings] = useState(false)

    // Deposit Modal
    const [depositModal, setDepositModal] = useState<DepositModal>({
        open: false,
        fee: null,
        amount: '',
        date: '',
        paymentMode: 'CASH',
        processing: false,
    })

    // Collective Sibling Deposit Modal
    const [collectiveDepositModal, setCollectiveDepositModal] = useState({
        open: false,
        amount: '',
        date: '',
        paymentMode: 'CASH',
        notes: '',
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
        setLoadingSiblings(true)

        // 1. Fetch individual student installments
        fetch(`/api/fees?studentId=${student.id}`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => { if (data.success) setStudentFees(data.data); setFeesLoading(false) })
            .catch(() => setFeesLoading(false))

        // 2. Fetch linked siblings for this student
        try {
            const sibRes = await fetch(`/api/students/siblings?studentId=${student.id}`, { headers: { Authorization: `Bearer ${token}` } })
            const sibData = await sibRes.json()
            if (sibData.success && sibData.siblings && sibData.siblings.length > 0) {
                const cur: SiblingMember = {
                    id: student.id,
                    fullName: student.fullName,
                    scholarNo: student.scholarNo || student.studentId || '',
                    courseName: student.courseName || '',
                    fatherName: student.fatherName || '',
                    phone: student.phone,
                    parentPhone: student.parentPhone,
                    totalFee: student.totalFee,
                    paidFee: student.paidFee,
                    previousDueFee: student.previousDueFee || 0,
                    outstanding: Math.max(0, student.totalFee - student.paidFee),
                    isCurrent: true,
                }
                const others: SiblingMember[] = sibData.siblings.map((s: any) => ({
                    id: s.id,
                    fullName: s.fullName,
                    scholarNo: s.scholarNo || s.studentId || '',
                    courseName: s.courseName || '',
                    batchName: s.batchName || '',
                    fatherName: s.fatherName || '',
                    phone: s.phone,
                    parentPhone: s.parentPhone,
                    totalFee: s.totalFee,
                    paidFee: s.paidFee,
                    previousDueFee: s.previousDueFee || 0,
                    outstanding: Math.max(0, s.totalFee - s.paidFee),
                    isCurrent: false,
                }))
                setSiblingGroup([cur, ...others])
            } else {
                setSiblingGroup([])
            }
        } catch {
            setSiblingGroup([])
        }
        setLoadingSiblings(false)
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
        const printWindow = window.open('', '_blank', 'width=960,height=720')
        if (printWindow) {
            printWindow.document.write('<div style="font-family:sans-serif;padding:40px;text-align:center;">Generating A4 duplicate receipt, please wait...</div>')
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
                setToast('✅ Payment recorded! Generating A4 duplicate receipt…')
                setTimeout(() => setToast(''), 4000)

                // Generate PDF receipt (Office Copy + Parent Copy on 1 A4 page)
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

    // Collective Sibling Fee Deposit
    const handleCollectiveDepositSubmit = async () => {
        const { amount, date, paymentMode: mode, notes } = collectiveDepositModal
        if (!amount || parseFloat(amount) <= 0) { alert('Please enter a valid amount'); return }
        if (!date) { alert('Please select or enter the Date of Deposit'); return }

        const printWindow = window.open('', '_blank', 'width=960,height=720')
        if (printWindow) {
            printWindow.document.write('<div style="font-family:sans-serif;padding:40px;text-align:center;">Generating Sibling Group A4 Duplicate Receipt, please wait...</div>')
        }

        setCollectiveDepositModal(prev => ({ ...prev, processing: true }))
        try {
            const res = await fetch('/api/reports/fee-ledger', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    studentId: selectedStudentForFees!.id,
                    siblingGroupId: selectedStudentForFees!.siblingGroupId,
                    parentPhone: selectedStudentForFees!.parentPhone || selectedStudentForFees!.phone,
                    totalAmount: parseFloat(amount),
                    mode,
                    date,
                    notes: notes || 'Collective Sibling Group Fee Installment',
                    receivedBy: tenant?.name || 'School Office',
                })
            })
            const data = await res.json()
            if (data.success) {
                setToast(`✅ ${data.message}`)
                setTimeout(() => setToast(''), 5000)

                // Generate A4 duplicate receipt
                generateReceiptPDF({
                    receipt: {
                        receiptNo: data.parentReceiptNo,
                        amount: parseFloat(amount),
                        mode,
                        createdAt: date,
                    },
                    student: {
                        ...selectedStudentForFees!,
                        fullName: `${selectedStudentForFees!.fullName} & Sibling Group`,
                        courseName: `${siblingGroup.length} Sibling Members`,
                    },
                    tenant,
                    installmentLabel: 'Collective Sibling Fee Installment',
                    distributions: data.distributions,
                    isCollective: true,
                    win: printWindow,
                })

                // Refresh views
                fetchStudents()
                openInstallments(selectedStudentForFees!)
                setCollectiveDepositModal(prev => ({ ...prev, open: false, processing: false }))
            } else {
                alert(data.error || 'Collective fee deposit failed')
                if (printWindow) printWindow.close()
                setCollectiveDepositModal(prev => ({ ...prev, processing: false }))
            }
        } catch {
            alert('Network error. Please try again.')
            if (printWindow) printWindow.close()
            setCollectiveDepositModal(prev => ({ ...prev, processing: false }))
        }
    }

    const filterList = (list: Student[]) => {
        if (!searchQuery.trim()) return list
        const q = searchQuery.toLowerCase().trim()
        return list.filter(s =>
            (s.scholarNo || '').toLowerCase().includes(q) ||
            (s.fullName || '').toLowerCase().includes(q) ||
            (s.studentId || '').toLowerCase().includes(q) ||
            (s.phone || '').includes(q)
        )
    }

    const getCurrentList = () => {
        const base = activeTab === 'outstanding' ? outstanding : activeTab === 'paid' ? paid : students
        return filterList(base)
    }

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
            ['Scholar No.', 'Student Name', 'Phone', 'Parent Phone', 'Course', 'Prev Due (INR)', 'Total Fee (INR)', 'Paid Fee (INR)', 'Pending Due (INR)', 'Payment %', 'Status']
        ]
        list.forEach(s => {
            const pending = s.totalFee - s.paidFee
            const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
            rows.push([s.scholarNo || s.studentId || '-', s.fullName, s.phone || '-', s.parentPhone || '-', s.courseName || '-', s.previousDueFee || 0, s.totalFee, s.paidFee, Math.max(0, pending), `${pct}%`, s.status])
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
                headers: ['Scholar No.', 'Student Name', 'Phone', 'Course', 'Prev Due', 'Total Fee', 'Paid', 'Pending Due', 'Payment %'],
                rows: list.map(s => {
                    const pending = s.totalFee - s.paidFee
                    const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                    return [s.scholarNo || s.studentId || '-', s.fullName, s.parentPhone || s.phone || '-', s.courseName, formatCurrency(s.previousDueFee || 0), formatCurrency(s.totalFee), formatCurrency(s.paidFee), pending > 0 ? formatCurrency(pending) : '✅ Clear', `${pct}%`]
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

            {/* Tabs & Search */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px', marginBottom: '16px' }}>
                <div className="tabs" style={{ marginBottom: 0 }}>
                    <button className={`tab ${activeTab === 'outstanding' ? 'active' : ''}`} onClick={() => setActiveTab('outstanding')}>⚠️ Outstanding ({outstanding.length})</button>
                    <button className={`tab ${activeTab === 'paid' ? 'active' : ''}`} onClick={() => setActiveTab('paid')}>✅ Paid ({paid.length})</button>
                    <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>👥 All Students ({students.length})</button>
                </div>

                {/* Instant Student Search Box */}
                <div style={{ position: 'relative', minWidth: '280px', flex: '1', maxWidth: '440px' }}>
                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', color: 'var(--text-muted)' }}>🔍</span>
                    <input
                        type="text"
                        className="input"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search by Scholar No. or Student Name..."
                        style={{
                            paddingLeft: '36px',
                            paddingRight: searchQuery ? '32px' : '12px',
                            fontSize: '13px',
                            borderRadius: '10px',
                            height: '40px',
                            background: 'var(--surface)',
                        }}
                    />
                    {searchQuery && (
                        <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{
                                position: 'absolute',
                                right: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '13px',
                                padding: '2px',
                            }}
                            title="Clear search"
                        >
                            ✕
                        </button>
                    )}
                </div>
            </div>

            {searchQuery && (
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Showing <strong>{getCurrentList().length}</strong> student(s) matching &quot;{searchQuery}&quot; (by Scholar No. or Name)
                </div>
            )}

            <div className="card" style={{ padding: 0 }}>
                <div className="table-container">
                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th style={{ width: '130px' }}>Scholar No.</th>
                                    <th>Student Name</th>
                                    <th>Course</th>
                                    <th>Total Fee</th>
                                    <th>Paid</th>
                                    <th>Pending</th>
                                    <th>Payment %</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {getCurrentList().length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            {searchQuery
                                                ? `🔍 No students found matching "${searchQuery}" by Scholar No. or Student Name`
                                                : 'No students in this list.'}
                                        </td>
                                    </tr>
                                ) : (
                                    getCurrentList().map(s => {
                                        const pending = s.totalFee - s.paidFee
                                        const pct = s.totalFee > 0 ? Math.round((s.paidFee / s.totalFee) * 100) : 0
                                        return (
                                            <tr key={s.id}>
                                                <td>
                                                    <span style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px',
                                                        padding: '4px 8px',
                                                        background: s.scholarNo ? 'rgba(99,102,241,0.12)' : 'var(--surface-2)',
                                                        border: `1px solid ${s.scholarNo ? 'rgba(99,102,241,0.3)' : 'var(--border)'}`,
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        color: s.scholarNo ? '#6366f1' : 'var(--text-muted)',
                                                        fontFamily: 'monospace',
                                                    }}>
                                                        {s.scholarNo ? `🏷️ ${s.scholarNo}` : (s.studentId ? `ID: ${s.studentId}` : '—')}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <div className="avatar" style={{ width: '32px', height: '32px', fontSize: '12px' }}>{s.fullName.charAt(0)}</div>
                                                        <div>
                                                            <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                                                                {s.scholarNo && (
                                                                    <span style={{ color: '#6366f1', fontWeight: '800', marginRight: '6px', fontSize: '12px' }}>
                                                                        [{s.scholarNo}]
                                                                    </span>
                                                                )}
                                                                <span>{s.fullName}</span>
                                                                {s.hasSiblings && (
                                                                    <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                                                        👨‍👩‍👧 Siblings ({(s.siblingsCount || 0) + 1})
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.phone}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.courseName}</td>
                                                <td style={{ fontWeight: '600', fontSize: '14px' }}>
                                                    <div>{formatCurrency(s.totalFee)}</div>
                                                    {s.previousDueFee && s.previousDueFee > 0 ? (
                                                        <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: '700', marginTop: '2px' }} title="Previous Year Due included">
                                                            Incl. Prev: {formatCurrency(s.previousDueFee)}
                                                        </div>
                                                    ) : null}
                                                </td>
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
                                                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                        <button onClick={() => openInstallments(s)} className="btn btn-primary btn-sm" style={{ padding: '5px 10px', fontSize: '11px', fontWeight: '700' }}>
                                                            {s.hasSiblings ? '👨‍👩‍👧 Installments / Siblings' : '📜 Installments'}
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
                                    })
                                )}
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
                    <div className="modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontWeight: '700', fontSize: '18px' }}>📜 Fee Installments</h3>
                                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                                    {selectedStudentForFees.scholarNo && (
                                        <span style={{ color: '#6366f1', fontWeight: '800', marginRight: '6px' }}>
                                            [Sch: {selectedStudentForFees.scholarNo}]
                                        </span>
                                    )}
                                    {selectedStudentForFees.fullName} • {selectedStudentForFees.courseName}
                                </p>
                            </div>
                            <button onClick={() => setSelectedStudentForFees(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body">
                            {/* ── Linked Siblings Family Banner ─────────────────────────────────── */}
                            {siblingGroup.length > 1 && (
                                <div style={{
                                    background: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(139,92,246,0.08))',
                                    border: '1.5px solid rgba(99,102,241,0.35)',
                                    borderRadius: '12px',
                                    padding: '14px 16px',
                                    marginBottom: '16px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '14px', fontWeight: '800', color: '#818cf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <span>👨‍👩‍👧 Linked Siblings Group ({siblingGroup.length} Children)</span>
                                            </div>
                                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                All attached siblings studying in this school with joint fee breakdown
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const totalFamDue = siblingGroup.reduce((sum, s) => sum + s.outstanding, 0)
                                                setCollectiveDepositModal({
                                                    open: true,
                                                    amount: totalFamDue > 0 ? String(totalFamDue) : '',
                                                    date: new Date().toISOString().split('T')[0],
                                                    paymentMode: 'CASH',
                                                    notes: '',
                                                    processing: false,
                                                })
                                            }}
                                            className="btn btn-sm"
                                            style={{
                                                background: 'linear-gradient(135deg, #10b981, #059669)',
                                                color: '#fff',
                                                border: 'none',
                                                fontWeight: '800',
                                                fontSize: '12px',
                                                padding: '8px 16px',
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                boxShadow: '0 4px 12px rgba(16,185,129,0.3)',
                                            }}
                                        >
                                            💰 Deposit Sibling Collective Fee
                                        </button>
                                    </div>

                                    {/* Sibling family quick cards */}
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px', marginTop: '12px' }}>
                                        {siblingGroup.map(sib => {
                                            const isCurrent = sib.id === selectedStudentForFees.id
                                            return (
                                                <div
                                                    key={sib.id}
                                                    onClick={() => {
                                                        if (!isCurrent) {
                                                            const found = students.find(s => s.id === sib.id) || {
                                                                id: sib.id,
                                                                fullName: sib.fullName,
                                                                scholarNo: sib.scholarNo,
                                                                courseName: sib.courseName,
                                                                totalFee: sib.totalFee,
                                                                paidFee: sib.paidFee,
                                                                previousDueFee: sib.previousDueFee,
                                                                status: 'ACTIVE',
                                                                fatherName: sib.fatherName,
                                                                phone: sib.phone || '',
                                                                parentPhone: sib.parentPhone || '',
                                                                hasSiblings: true,
                                                                siblingGroupId: selectedStudentForFees.siblingGroupId,
                                                            }
                                                            openInstallments(found as Student)
                                                        }
                                                    }}
                                                    style={{
                                                        padding: '10px 12px',
                                                        borderRadius: '8px',
                                                        border: isCurrent ? '2px solid #6366f1' : '1px solid var(--border)',
                                                        background: isCurrent ? 'rgba(99,102,241,0.2)' : 'var(--surface)',
                                                        cursor: isCurrent ? 'default' : 'pointer',
                                                        transition: 'all 0.2s',
                                                    }}
                                                    title={isCurrent ? 'Viewing this sibling' : 'Click to switch and view installments for this sibling'}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontSize: '12px', fontWeight: '800', color: isCurrent ? '#a5b4fc' : 'var(--text-primary)' }}>
                                                            {isCurrent ? '👑 ' : '👫 '} {sib.fullName}
                                                        </span>
                                                        {isCurrent && (
                                                            <span style={{ fontSize: '9px', background: '#6366f1', color: '#fff', padding: '1px 5px', borderRadius: '4px', fontWeight: '800' }}>Active</span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                        {sib.courseName} {sib.scholarNo ? `• [${sib.scholarNo}]` : ''}
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', fontWeight: '700' }}>
                                                        <span style={{ color: '#10b981' }}>Paid: {formatCurrency(sib.paidFee)}</span>
                                                        <span style={{ color: sib.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                                                            {sib.outstanding > 0 ? `Due: ${formatCurrency(sib.outstanding)}` : '✓ Clear'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Family collective summary */}
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', padding: '8px 12px', background: 'rgba(0,0,0,0.18)', borderRadius: '6px', fontSize: '11.5px', fontWeight: '700' }}>
                                        <span>Family Total: {formatCurrency(siblingGroup.reduce((s, x) => s + x.totalFee, 0))}</span>
                                        <span style={{ color: '#10b981' }}>Total Paid: {formatCurrency(siblingGroup.reduce((s, x) => s + x.paidFee, 0))}</span>
                                        <span style={{ color: '#ef4444' }}>Total Due: {formatCurrency(siblingGroup.reduce((s, x) => s + x.outstanding, 0))}</span>
                                    </div>
                                </div>
                            )}
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
                                    <div style={{ padding: '14px 16px', background: 'var(--surface-2)', borderRadius: '12px', border: '1px solid var(--border)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: selectedStudentForFees.previousDueFee && selectedStudentForFees.previousDueFee > 0 ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
                                            {selectedStudentForFees.previousDueFee && selectedStudentForFees.previousDueFee > 0 ? (
                                                <>
                                                    <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Current Session</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>{formatCurrency(Math.max(0, selectedStudentForFees.totalFee - (selectedStudentForFees.previousDueFee || 0)))}</div>
                                                    </div>
                                                    <div style={{ padding: '8px', background: 'rgba(245,158,11,0.08)', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.25)' }}>
                                                        <div style={{ fontSize: '10px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: '800' }}>Previous Due</div>
                                                        <div style={{ fontSize: '14px', fontWeight: '800', color: '#f59e0b' }}>{formatCurrency(selectedStudentForFees.previousDueFee)}</div>
                                                    </div>
                                                </>
                                            ) : (
                                                <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Total Fee</div>
                                                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--primary)' }}>{formatCurrency(selectedStudentForFees.totalFee)}</div>
                                                </div>
                                            )}
                                            <div style={{ padding: '8px', background: 'var(--surface)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                                                <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: '800' }}>Paid So Far</div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#10b981' }}>{formatCurrency(selectedStudentForFees.paidFee)}</div>
                                            </div>
                                            <div style={{ padding: '8px', background: 'rgba(239,68,68,0.08)', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.25)' }}>
                                                <div style={{ fontSize: '10px', color: '#ef4444', textTransform: 'uppercase', fontWeight: '800' }}>Remaining</div>
                                                <div style={{ fontSize: '14px', fontWeight: '800', color: '#ef4444' }}>{formatCurrency(Math.max(0, selectedStudentForFees.totalFee - selectedStudentForFees.paidFee))}</div>
                                            </div>
                                        </div>
                                        {selectedStudentForFees.previousDueFee && selectedStudentForFees.previousDueFee > 0 ? (
                                            <div style={{ marginTop: '10px', fontSize: '11px', color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '6px 12px', borderRadius: '6px', fontWeight: '600' }}>
                                                ⚠️ Previous session due fee of {formatCurrency(selectedStudentForFees.previousDueFee)} is merged into total payable balance ({formatCurrency(selectedStudentForFees.totalFee)}). Any installment deposit clears this overall balance.
                                            </div>
                                        ) : null}
                                        <div className="progress-bar" style={{ marginTop: '12px', height: '6px' }}>
                                            <div className="progress-fill" style={{ width: `${Math.min(100, (selectedStudentForFees.paidFee / (selectedStudentForFees.totalFee || 1)) * 100)}%`, background: 'var(--primary)' }} />
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
                                    {selectedStudentForFees?.scholarNo && (
                                        <span style={{ color: '#6366f1', fontWeight: '800', marginRight: '6px' }}>
                                            [Sch: {selectedStudentForFees.scholarNo}]
                                        </span>
                                    )}
                                    {selectedStudentForFees?.fullName} — {depositModal.fee?.notes || 'Installment'}
                                </p>
                            </div>
                            <button onClick={() => !depositModal.processing && setDepositModal(prev => ({ ...prev, open: false }))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                            {/* Student Preview */}
                            <div style={{ padding: '12px 16px', background: 'var(--surface-2)', borderRadius: '10px' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '13px' }}>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Scholar No.</div>
                                        <div style={{ fontWeight: '800', color: '#6366f1' }}>{selectedStudentForFees?.scholarNo || '—'}</div>
                                    </div>
                                    <div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', marginBottom: '2px' }}>Student Name</div>
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

            {/* ── Collective Sibling Fee Deposit Modal ─────────────────────────────── */}
            {collectiveDepositModal.open && (
                <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={() => !collectiveDepositModal.processing && setCollectiveDepositModal(prev => ({ ...prev, open: false }))}>
                    <div className="modal" style={{ maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <div>
                                <h3 style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)' }}>
                                    👨‍👩‍👧 Collective Sibling Fee Deposit
                                </h3>
                                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                    Deposit gross fee installment distributed proportionately across all siblings' remaining dues
                                </p>
                            </div>
                            <button onClick={() => !collectiveDepositModal.processing && setCollectiveDepositModal(prev => ({ ...prev, open: false }))} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Sibling Proportion Breakdown Table */}
                            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
                                <div style={{ padding: '8px 12px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                                    Family Sibling Proportionate Allocation Preview
                                </div>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
                                            <th style={{ padding: '6px 10px', textAlign: 'left' }}>Student</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'left' }}>Class</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Remaining Due</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'right' }}>Share (%)</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'right', color: '#10b981' }}>Allocated (₹)</th>
                                            <th style={{ padding: '6px 10px', textAlign: 'right', color: '#6366f1' }}>New Due</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            const totalFamOutstanding = siblingGroup.reduce((sum, s) => sum + s.outstanding, 0)
                                            const grossInput = parseFloat(collectiveDepositModal.amount || '0')
                                            const siblingsWithDues = siblingGroup.filter(s => s.outstanding > 0)
                                            let runningAlloc = 0

                                            return siblingGroup.map((sib) => {
                                                let sibAlloc = 0
                                                let sharePct = 0
                                                if (totalFamOutstanding > 0 && sib.outstanding > 0 && grossInput > 0) {
                                                    const isLastWithDues = sib.id === siblingsWithDues[siblingsWithDues.length - 1]?.id
                                                    if (isLastWithDues) {
                                                        sibAlloc = Math.max(0, Math.round((grossInput - runningAlloc) * 100) / 100)
                                                    } else {
                                                        const prop = sib.outstanding / totalFamOutstanding
                                                        sibAlloc = Math.round(grossInput * prop * 100) / 100
                                                        runningAlloc += sibAlloc
                                                    }
                                                    sharePct = Math.round((sib.outstanding / totalFamOutstanding) * 100)
                                                }
                                                const newDue = Math.max(0, sib.outstanding - sibAlloc)

                                                return (
                                                    <tr key={sib.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                                        <td style={{ padding: '6px 10px', fontWeight: '700' }}>
                                                            {sib.fullName} {sib.scholarNo ? `[${sib.scholarNo}]` : ''}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', color: 'var(--text-muted)' }}>{sib.courseName}</td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: sib.outstanding > 0 ? '#ef4444' : '#10b981' }}>
                                                            {formatCurrency(sib.outstanding)}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                                            {sharePct}%
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: '#10b981' }}>
                                                            {formatCurrency(sibAlloc)}
                                                        </td>
                                                        <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '700', color: newDue > 0 ? '#f59e0b' : '#10b981' }}>
                                                            {formatCurrency(newDue)}
                                                        </td>
                                                    </tr>
                                                )
                                            })
                                        })()}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ background: 'rgba(16,185,129,0.08)', fontWeight: '800' }}>
                                            <td colSpan={2} style={{ padding: '6px 10px' }}>Total Family Balance</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: '#ef4444' }}>
                                                {formatCurrency(siblingGroup.reduce((s, x) => s + x.outstanding, 0))}
                                            </td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right' }}>100%</td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: '#10b981' }}>
                                                {formatCurrency(parseFloat(collectiveDepositModal.amount || '0'))}
                                            </td>
                                            <td style={{ padding: '6px 10px', textAlign: 'right', color: '#6366f1' }}>
                                                {formatCurrency(Math.max(0, siblingGroup.reduce((s, x) => s + x.outstanding, 0) - parseFloat(collectiveDepositModal.amount || '0')))}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Amount */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    Collective Gross Amount (₹) <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', fontWeight: '700', color: 'var(--text-muted)' }}>₹</span>
                                    <input
                                        type="number"
                                        className="input"
                                        style={{ paddingLeft: '30px', fontSize: '18px', fontWeight: '800' }}
                                        placeholder="0.00"
                                        value={collectiveDepositModal.amount}
                                        onChange={e => setCollectiveDepositModal(prev => ({ ...prev, amount: e.target.value }))}
                                        min="0" step="0.01"
                                    />
                                </div>
                                {collectiveDepositModal.amount && parseFloat(collectiveDepositModal.amount) > 0 && (
                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                                        {convertToWords(parseFloat(collectiveDepositModal.amount))}
                                    </div>
                                )}
                            </div>

                            {/* Date of Deposit */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>
                                    📅 Date of Deposit <span style={{ color: '#ef4444' }}>*</span>
                                </label>
                                <input
                                    type="date"
                                    className="input"
                                    value={collectiveDepositModal.date}
                                    onChange={e => setCollectiveDepositModal(prev => ({ ...prev, date: e.target.value }))}
                                    max={new Date().toISOString().split('T')[0]}
                                    style={{ fontSize: '14px', fontWeight: '600' }}
                                />
                            </div>

                            {/* Payment Mode */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>Payment Mode</label>
                                <select className="input" value={collectiveDepositModal.paymentMode} onChange={e => setCollectiveDepositModal(prev => ({ ...prev, paymentMode: e.target.value }))}>
                                    <option value="CASH">💵 Cash</option>
                                    <option value="UPI">📱 UPI</option>
                                    <option value="BANK_TRANSFER">🏦 Bank Transfer</option>
                                    <option value="CHEQUE">💳 Cheque</option>
                                    <option value="CARD">💳 Card</option>
                                    <option value="ONLINE">🌐 Online</option>
                                </select>
                            </div>

                            {/* Notes */}
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-secondary)' }}>Notes / Reference (Optional)</label>
                                <input
                                    type="text"
                                    className="input"
                                    placeholder="e.g. Sibling collective deposit / UPI Reference"
                                    value={collectiveDepositModal.notes}
                                    onChange={e => setCollectiveDepositModal(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>

                            {/* Note */}
                            <div style={{ padding: '10px 14px', background: 'rgba(16,185,129,0.08)', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.25)', fontSize: '12px', color: '#059669', fontWeight: '600' }}>
                                🧾 An A4 PDF receipt with duplicate copies (Office Copy &amp; Parent Copy) containing the full sibling distribution will be printed upon confirmation.
                            </div>

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
                                <button
                                    onClick={() => !collectiveDepositModal.processing && setCollectiveDepositModal(prev => ({ ...prev, open: false }))}
                                    className="btn btn-secondary"
                                    style={{ flex: 1 }}
                                    disabled={collectiveDepositModal.processing}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCollectiveDepositSubmit}
                                    className="btn btn-primary"
                                    disabled={collectiveDepositModal.processing || !collectiveDepositModal.amount || !collectiveDepositModal.date}
                                    style={{ flex: 2, background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontWeight: '800' }}
                                >
                                    {collectiveDepositModal.processing
                                        ? <><div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px', margin: 0 }} /> Allocating &amp; Depositing…</>
                                        : <>💳 Deposit &amp; Print A4 Duplicate Receipt</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
