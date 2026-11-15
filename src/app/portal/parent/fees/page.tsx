'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import { generateReceiptPDF } from '@/lib/receiptPdf'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number) {
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 0 })
}

function fmtDate(d: string | Date | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
  return 'Rupees ' + words.trim() + ' Only'
}

// ─── PDF Generator ────────────────────────────────────────────────────────────
function generateFeeLedgerPDF(children: any[], school: any, isCombined: boolean) {
  const schoolName = school?.name || 'School'
  const schoolAddress = school?.address || ''
  const schoolPhone = school?.phone || ''
  const schoolEmail = school?.email || ''
  const logoUrl = school?.logo || ''
  const schoolCode = school?.schoolCode || ''
  const directorSign = school?.directorSign || ''
  const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })

  // Combined totals
  const combinedTotal = children.reduce((s: number, c: any) => s + c.totalFee, 0)
  const combinedPaid = children.reduce((s: number, c: any) => s + c.paidFee, 0)
  const combinedDue = Math.max(0, combinedTotal - combinedPaid)

  // Build rows per child
  const childrenRows = children.map((child: any) => {
    const installmentRows = child.installments.map((inst: any, idx: number) => {
      const statusColor =
        inst.status === 'PAID' ? '#059669' :
        inst.status === 'OVERDUE' ? '#dc2626' :
        inst.status === 'PARTIAL' ? '#d97706' : '#6366f1'
      const statusBg =
        inst.status === 'PAID' ? '#ecfdf5' :
        inst.status === 'OVERDUE' ? '#fef2f2' :
        inst.status === 'PARTIAL' ? '#fffbeb' : '#eef2ff'
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${inst.notes || 'Fee Installment'}</td>
          <td>${fmtDate(inst.dueDate)}</td>
          <td>${inst.paidDate ? fmtDate(inst.paidDate) : '—'}</td>
          <td>₹${inst.amount.toLocaleString('en-IN')}</td>
          <td>${inst.lateFee > 0 ? '₹' + inst.lateFee.toLocaleString('en-IN') : '—'}</td>
          <td><span style="background:${statusBg};color:${statusColor};padding:2px 8px;border-radius:12px;font-size:10px;font-weight:700;">${inst.status}</span></td>
        </tr>`
    }).join('')

    const paymentRows = child.payments.map((p: any, idx: number) => `
      <tr>
        <td>${idx + 1}</td>
        <td style="font-weight:700;color:#1a3c5e;">${p.receiptNo || 'N/A'}</td>
        <td>${fmtDate(p.createdAt)}</td>
        <td>${p.mode || 'CASH'}</td>
        <td style="font-weight:700;color:#059669;">₹${p.amount.toLocaleString('en-IN')}</td>
        <td>${p.notes || '—'}</td>
      </tr>`
    ).join('')

    const dueAmt = Math.max(0, child.totalFee - child.paidFee)

    return `
      <div class="child-block">
        <div class="child-header">
          <div class="child-name">${child.fullName}</div>
          <div class="child-sub">${child.course}${child.batch ? ' • ' + child.batch : ''}${child.scholarNo ? ' • Scholar: ' + child.scholarNo : ''}</div>
        </div>
        <div class="summary-boxes">
          <div class="sbox"><div class="sbox-lbl">Total Fee</div><div class="sbox-val">₹${child.totalFee.toLocaleString('en-IN')}</div></div>
          <div class="sbox paid"><div class="sbox-lbl">Paid</div><div class="sbox-val" style="color:#059669;">₹${child.paidFee.toLocaleString('en-IN')}</div></div>
          <div class="sbox due"><div class="sbox-lbl">Due</div><div class="sbox-val" style="color:${dueAmt > 0 ? '#dc2626' : '#059669'};">₹${dueAmt.toLocaleString('en-IN')}</div></div>
        </div>

        ${child.installments.length > 0 ? `
        <div class="section-title">Fee Installments</div>
        <table class="data-table">
          <thead><tr><th>#</th><th>Description</th><th>Due Date</th><th>Paid Date</th><th>Amount</th><th>Late Fee</th><th>Status</th></tr></thead>
          <tbody>${installmentRows}</tbody>
        </table>` : ''}

        ${child.payments.length > 0 ? `
        <div class="section-title">Payment History</div>
        <table class="data-table">
          <thead><tr><th>#</th><th>Receipt No.</th><th>Date</th><th>Mode</th><th>Amount</th><th>Notes</th></tr></thead>
          <tbody>${paymentRows}</tbody>
        </table>` : `<div class="no-records">No payments recorded yet.</div>`}
      </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<title>Fee Ledger – ${schoolName}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Inter',sans-serif;background:#f0f4f8;padding:20px;display:flex;justify-content:center}
.page{width:210mm;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,0.12);border-radius:8px;overflow:hidden}
.header{background:linear-gradient(135deg,#1a3c5e 0%,#0f2540 100%);color:#fff;padding:24px 32px;display:flex;align-items:center;gap:20px}
.logo-box{width:68px;height:68px;border-radius:12px;background:rgba(255,255,255,0.12);display:flex;align-items:center;justify-content:center;font-size:36px;flex-shrink:0;overflow:hidden}
.logo-box img{width:100%;height:100%;object-fit:cover}
.school-info{flex:1}
.school-name{font-size:18px;font-weight:800;letter-spacing:.5px}
.school-sub{font-size:11px;color:rgba(255,255,255,.72);margin-top:5px;line-height:1.6}
.title-band{background:#6366f1;text-align:center;padding:7px;font-size:11px;font-weight:800;letter-spacing:3px;text-transform:uppercase;color:#fff}
.body{padding:24px 32px}
.child-block{margin-bottom:32px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden}
.child-header{background:#1e3a5f;color:#fff;padding:14px 20px}
.child-name{font-size:16px;font-weight:800}
.child-sub{font-size:11px;color:rgba(255,255,255,.7);margin-top:3px}
.summary-boxes{display:flex;gap:0;border-bottom:1px solid #e2e8f0}
.sbox{flex:1;padding:12px 16px;border-right:1px solid #e2e8f0;text-align:center;background:#f8fafc}
.sbox:last-child{border-right:none}
.sbox-lbl{font-size:9px;text-transform:uppercase;letter-spacing:1px;color:#64748b;font-weight:700;margin-bottom:3px}
.sbox-val{font-size:15px;font-weight:800;color:#0f172a}
.section-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#1a3c5e;padding:10px 16px;background:#f1f5f9;border-bottom:1px solid #e2e8f0;border-top:1px solid #e2e8f0}
.data-table{width:100%;border-collapse:collapse}
.data-table thead tr{background:#1a3c5e;color:#fff}
.data-table th{padding:9px 12px;font-size:10px;text-align:left;font-weight:700;letter-spacing:.4px}
.data-table tbody tr:nth-child(even){background:#f8fafc}
.data-table td{padding:9px 12px;font-size:11px;border-bottom:1px solid #f1f5f9}
.no-records{padding:16px;font-size:12px;color:#94a3b8;text-align:center;font-style:italic}
.combined-summary{background:linear-gradient(135deg,#1e3a5f,#2d5a9e);color:#fff;border-radius:12px;padding:20px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:center}
.cs-item{text-align:center}
.cs-lbl{font-size:10px;color:rgba(255,255,255,.7);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px}
.cs-val{font-size:18px;font-weight:800}
.footer{padding:20px 32px;border-top:1px solid #e2e8f0;display:flex;justify-content:space-between;align-items:flex-end}
.note{font-size:10px;color:#64748b;max-width:260px;line-height:1.7}
.sig{text-align:center}
.sig-line{width:180px;height:50px;border-bottom:1.5px solid #0f172a;margin-bottom:5px;display:flex;align-items:flex-end;justify-content:center}
.sig-line img{max-height:48px;max-width:160px;object-fit:contain}
.sig-lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.4px}
.meta-bar{display:flex;justify-content:space-between;margin-bottom:20px;font-size:11px;color:#64748b}
@media print{body{background:#fff;padding:0}.page{width:100%;box-shadow:none}@page{margin:0;size:A4}}
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo-box">${logoUrl ? `<img src="${logoUrl}" alt="Logo" onerror="this.parentElement.textContent='🏫'"/>` : '🏫'}</div>
    <div class="school-info">
      <div class="school-name">${schoolName.toUpperCase()}</div>
      <div class="school-sub">
        ${schoolAddress ? `📍 ${schoolAddress}<br/>` : ''}
        ${schoolPhone ? `📞 ${schoolPhone}` : ''}${schoolPhone && schoolEmail ? ' &nbsp;|&nbsp; ' : ''}${schoolEmail ? `✉ ${schoolEmail}` : ''}
        ${schoolCode ? `<br/>School Code: ${schoolCode}` : ''}
      </div>
    </div>
  </div>
  <div class="title-band">✦ &nbsp; Student Fee Ledger ${isCombined ? '— Combined (Siblings)' : ''} &nbsp; ✦</div>
  <div class="body">
    <div class="meta-bar">
      <span>Generated on: <strong>${generatedOn}</strong></span>
      <span>Children: <strong>${children.length}</strong></span>
    </div>
    ${isCombined ? `
    <div class="combined-summary">
      <div class="cs-item"><div class="cs-lbl">Total Fee (All Children)</div><div class="cs-val">₹${combinedTotal.toLocaleString('en-IN')}</div></div>
      <div class="cs-item"><div class="cs-lbl">Total Paid</div><div class="cs-val" style="color:#4ade80;">₹${combinedPaid.toLocaleString('en-IN')}</div></div>
      <div class="cs-item"><div class="cs-lbl">Total Due</div><div class="cs-val" style="color:${combinedDue > 0 ? '#fca5a5' : '#4ade80'};">₹${combinedDue.toLocaleString('en-IN')}</div></div>
    </div>` : ''}
    ${childrenRows}
    <div class="footer">
      <div class="note">
        <strong>Note:</strong><br/>
        • This is a computer-generated fee ledger.<br/>
        • Please retain this for your records.<br/>
        • For queries, contact the school office.
      </div>
      <div class="sig">
        <div class="sig-line">${directorSign ? `<img src="${directorSign}" alt="Signature"/>` : ''}</div>
        <div class="sig-lbl">Auth. Signatory</div>
        <div style="font-size:10px;color:#64748b;margin-top:2px;">${schoolName}</div>
      </div>
    </div>
  </div>
</div>
<script>window.onload=function(){window.print()}</script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) { alert('Please allow popups for this site to download the ledger.'); return }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ParentFeesPage() {
  const { token, tenant } = useAuth()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedChild, setExpandedChild] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const [collectiveDepositModal, setCollectiveDepositModal] = useState({
    open: false,
    amount: '',
    paymentMode: 'UPI',
    date: new Date().toISOString().split('T')[0],
    processing: false,
  })

  const fetchLedger = () => {
    if (!token) return
    setLoading(true)
    fetch('/api/parent/fee-ledger', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d)
          if (d.children?.length === 1) setExpandedChild(d.children[0].studentId)
        } else {
          setError(d.error || 'Failed to load fee data')
        }
        setLoading(false)
      })
      .catch(() => { setError('Network error. Please try again.'); setLoading(false) })
  }

  useEffect(() => {
    fetchLedger()
  }, [token])

  const handleCollectiveDepositSubmit = async () => {
    const { amount, paymentMode, date } = collectiveDepositModal
    if (!amount || parseFloat(amount) <= 0) { alert('Please enter a valid amount'); return }
    if (!date) { alert('Please select a date'); return }

    const printWindow = window.open('', '_blank', 'width=960,height=720')
    if (printWindow) {
      printWindow.document.write('<div style="font-family:sans-serif;padding:40px;text-align:center;">Generating Sibling Group A4 Duplicate Receipt, please wait...</div>')
    }

    setCollectiveDepositModal((prev) => ({ ...prev, processing: true }))
    try {
      const res = await fetch('/api/parent/fee-ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          totalAmount: parseFloat(amount),
          mode: paymentMode,
          date,
          notes: 'Parent Portal Sibling Collective Deposit',
        }),
      })
      const resp = await res.json()
      if (resp.success) {
        setToast(`✅ ${resp.message}`)
        setTimeout(() => setToast(''), 5000)

        // Generate A4 Duplicate Receipt with all siblings
        generateReceiptPDF({
          receipt: {
            receiptNo: resp.parentReceiptNo,
            amount: parseFloat(amount),
            mode: paymentMode,
            createdAt: date,
          },
          student: {
            fullName: `${data.children[0]?.fullName || 'Student'} & Siblings`,
            fatherName: data.children[0]?.fatherName,
            parentPhone: data.children[0]?.parentPhone || data.children[0]?.phone,
          },
          tenant: data.school || tenant,
          installmentLabel: 'Collective Sibling Fee Deposit',
          distributions: resp.distributions,
          isCollective: true,
          win: printWindow,
        })

        fetchLedger()
        setCollectiveDepositModal({ open: false, amount: '', paymentMode: 'UPI', date: new Date().toISOString().split('T')[0], processing: false })
      } else {
        alert(resp.error || 'Payment failed')
        if (printWindow) printWindow.close()
        setCollectiveDepositModal((prev) => ({ ...prev, processing: false }))
      }
    } catch {
      alert('Network error. Please try again.')
      if (printWindow) printWindow.close()
      setCollectiveDepositModal((prev) => ({ ...prev, processing: false }))
    }
  }

  const handleDownloadSingleReceipt = (child: any, payment: any) => {
    generateReceiptPDF({
      receipt: payment,
      student: {
        ...child,
        courseName: child.course,
      },
      tenant: data.school || tenant,
      installmentLabel: payment.notes || 'Fee Installment',
    })
  }

  const handleDownloadCollectiveReceipt = (rec: any) => {
    generateReceiptPDF({
      receipt: {
        receiptNo: rec.receiptNo,
        amount: rec.totalAmount,
        mode: rec.mode,
        createdAt: rec.createdAt,
      },
      student: {
        fullName: `Family Sibling Group (${rec.distributions?.length || data.children.length} Children)`,
        fatherName: data.children[0]?.fatherName,
        parentPhone: data.children[0]?.parentPhone || data.children[0]?.phone,
      },
      tenant: data.school || tenant,
      installmentLabel: 'Collective Sibling Fee Installment',
      distributions: rec.distributions,
      isCollective: true,
    })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 0', flexDirection: 'column', gap: '14px' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid #6366f1', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ color: '#64748b', fontSize: '14px' }}>Loading fee details…</span>
    </div>
  )

  if (error) return (
    <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '12px', padding: '20px', color: '#ef4444', fontSize: '14px' }}>
      ⚠️ {error}
    </div>
  )

  if (!data || data.children?.length === 0) return (
    <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '32px', textAlign: 'center' }}>
      <div style={{ fontSize: '40px', marginBottom: '12px' }}>💳</div>
      <div style={{ color: '#94a3b8', fontSize: '14px' }}>No children linked yet. Please link your children first.</div>
    </div>
  )

  const { children, summary, school } = data
  const isSibling = children.length > 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', background: '#10b981', color: '#fff', padding: '12px 20px', borderRadius: '12px', fontWeight: '700', fontSize: '14px', zIndex: 9999, boxShadow: '0 8px 32px rgba(16,185,129,0.4)' }}>
          {toast}
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>💳 Fee Ledger &amp; Receipts</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          {isSibling ? 'Combined view for all your children with collective fee payments and duplicate receipts' : 'Your child\'s complete fee record and printable receipts'}
        </p>
      </div>

      {/* ── Combined Summary Card (Siblings) ─────────────────────────── */}
      {isSibling ? (
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a9e 100%)',
          borderRadius: '16px', padding: '18px', border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>
            Combined Summary ({children.length} Children)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { label: 'Total Fee', val: summary.totalFee, color: '#fff' },
              { label: 'Paid', val: summary.paidFee, color: '#4ade80' },
              { label: 'Due', val: summary.dueAmount, color: summary.dueAmount > 0 ? '#f87171' : '#4ade80' },
            ].map((item) => (
              <div key={item.label} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: item.color }}>
                  {fmt(item.val)}
                </div>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px', flexWrap: 'wrap' }}>
            {summary.dueAmount > 0 && (
              <button
                onClick={() => setCollectiveDepositModal({
                  open: true,
                  amount: String(summary.dueAmount),
                  paymentMode: 'UPI',
                  date: new Date().toISOString().split('T')[0],
                  processing: false,
                })}
                style={{
                  flex: 1, minWidth: '180px', background: 'linear-gradient(135deg, #10b981, #059669)',
                  border: 'none', borderRadius: '10px', padding: '11px',
                  color: 'white', fontSize: '13px', fontWeight: '800', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: '8px', boxShadow: '0 4px 14px rgba(16,185,129,0.35)',
                }}
              >
                💰 Deposit Sibling Collective Fee
              </button>
            )}
            <button
              onClick={() => generateFeeLedgerPDF(children, school, true)}
              style={{
                flex: 1, minWidth: '180px', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '11px',
                color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center', gap: '8px',
              }}
            >
              📥 Download Combined Ledger (PDF)
            </button>
          </div>
        </div>
      ) : (
        /* Single child compact summary */
        <div style={{
          background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2540 100%)',
          borderRadius: '16px', padding: '18px', border: '1px solid rgba(99,102,241,0.3)',
        }}>
          <div style={{ fontSize: '14px', fontWeight: '800', color: 'white', marginBottom: '12px' }}>
            {children[0].fullName}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
            {[
              { label: 'Total Fee', val: children[0].totalFee, color: '#fff' },
              { label: 'Paid', val: children[0].paidFee, color: '#4ade80' },
              { label: 'Due', val: children[0].dueAmount, color: children[0].dueAmount > 0 ? '#f87171' : '#4ade80' },
            ].map((item) => (
              <div key={item.label} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: '10px', padding: '10px 8px', textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>{item.label}</div>
                <div style={{ fontSize: '14px', fontWeight: '800', color: item.color }}>{fmt(item.val)}</div>
              </div>
            ))}
          </div>
          <button
            onClick={() => generateFeeLedgerPDF(children, school, false)}
            style={{
              width: '100%', background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '10px',
              color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            📥 Download Fee Ledger (PDF)
          </button>
        </div>
      )}

      {/* ── Family Collective Receipts (Siblings) ────────────────────── */}
      {data.collectiveReceipts && data.collectiveReceipts.length > 0 && (
        <div style={{ background: '#1e293b', border: '1.5px solid rgba(99,102,241,0.35)', borderRadius: '14px', padding: '18px' }}>
          <div style={{ fontSize: '13px', fontWeight: '800', color: '#818cf8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>👨‍👩‍👧 Family Collective Receipts ({data.collectiveReceipts.length})</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.collectiveReceipts.map((rec: any) => (
              <div key={rec.receiptNo} style={{ background: '#0f172a', borderRadius: '12px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', border: '1px solid #334155' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>🧾 Receipt: {rec.receiptNo}</span>
                    <span style={{ fontSize: '10px', background: 'rgba(99,102,241,0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px' }}>
                      Collective Sibling Deposit
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                    {fmtDate(rec.createdAt)} &nbsp;•&nbsp; {rec.mode || 'CASH'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#cbd5e1', marginTop: '6px' }}>
                    Distributed among: {rec.distributions?.map((d: any) => `${d.studentName} (${fmt(d.amount)})`).join(', ')}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '900', color: '#10b981' }}>{fmt(rec.totalAmount)}</div>
                    <div style={{ fontSize: '10px', color: '#64748b' }}>Total Deposited</div>
                  </div>
                  <button
                    onClick={() => handleDownloadCollectiveReceipt(rec)}
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '8px',
                      fontSize: '12px', fontWeight: '700', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '6px', boxShadow: '0 2px 8px rgba(99,102,241,0.3)',
                    }}
                  >
                    🧾 Download A4 Duplicate Receipt
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Per-Child Detail Cards ──────────────────────────────────────── */}
      {children.map((child: any) => {
        const isExpanded = expandedChild === child.studentId
        const dueAmt = child.dueAmount

        return (
          <div key={child.studentId} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', overflow: 'hidden' }}>
            {/* Child Card Header */}
            <button
              onClick={() => setExpandedChild(isExpanded ? null : child.studentId)}
              style={{
                width: '100%', background: 'none', border: 'none', padding: '16px',
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                👦
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>{child.fullName}</div>
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{child.course}{child.batch ? ' • ' + child.batch : ''}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '15px', fontWeight: '800', color: dueAmt > 0 ? '#f87171' : '#4ade80' }}>{fmt(dueAmt)}</div>
                <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>Due</div>
              </div>
              <div style={{ fontSize: '18px', color: '#475569', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</div>
            </button>

            {/* Expanded Details */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid #334155' }}>
                {/* Mini stats */}
                <div style={{ display: 'flex', borderBottom: '1px solid #334155' }}>
                  {[
                    { label: 'Total Fee', val: child.totalFee, color: '#cbd5e1' },
                    { label: 'Paid', val: child.paidFee, color: '#4ade80' },
                    { label: 'Due', val: dueAmt, color: dueAmt > 0 ? '#f87171' : '#4ade80' },
                  ].map((item, i) => (
                    <div key={item.label} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < 2 ? '1px solid #334155' : 'none' }}>
                      <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '3px' }}>{item.label}</div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: item.color }}>{fmt(item.val)}</div>
                    </div>
                  ))}
                </div>

                {/* Fee Installments */}
                {child.installments.length > 0 && (
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                      Fee Installments
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {child.installments.map((inst: any, idx: number) => {
                        const statusColor =
                          inst.status === 'PAID' ? '#10b981' :
                          inst.status === 'OVERDUE' ? '#ef4444' :
                          inst.status === 'PARTIAL' ? '#f59e0b' : '#6366f1'
                        const statusBg =
                          inst.status === 'PAID' ? 'rgba(16,185,129,0.15)' :
                          inst.status === 'OVERDUE' ? 'rgba(239,68,68,0.15)' :
                          inst.status === 'PARTIAL' ? 'rgba(245,158,11,0.15)' : 'rgba(99,102,241,0.15)'
                        return (
                          <div key={inst.id} style={{ background: '#0f172a', borderRadius: '10px', padding: '12px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #1e293b' }}>
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>{inst.notes || `Installment ${idx + 1}`}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                Due: {fmtDate(inst.dueDate)}
                                {inst.paidDate && <> &nbsp;·&nbsp; Paid: {fmtDate(inst.paidDate)}</>}
                              </div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: '14px', fontWeight: '800', color: 'white' }}>₹{inst.amount.toLocaleString('en-IN')}</div>
                              <div style={{ marginTop: '4px' }}>
                                <span style={{ background: statusBg, color: statusColor, fontSize: '10px', fontWeight: '700', padding: '2px 8px', borderRadius: '20px' }}>
                                  {inst.status}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Payment History */}
                <div style={{ padding: '0 16px 14px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
                    Payment History
                  </div>
                  {child.payments.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', padding: '16px 0', fontStyle: 'italic' }}>
                      No payments recorded yet
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {child.payments.map((p: any, idx: number) => (
                        <div key={p.id} style={{ background: '#0f172a', borderRadius: '10px', padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap', border: '1px solid #1e293b' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#4ade80' }}>
                              Receipt: {p.receiptNo || 'N/A'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {fmtDate(p.createdAt)} &nbsp;·&nbsp; {p.mode || 'CASH'}
                              {p.notes && <span style={{ marginLeft: '6px', color: '#94a3b8' }}>• {p.notes}</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ fontSize: '15px', fontWeight: '800', color: '#4ade80' }}>
                              +₹{p.amount.toLocaleString('en-IN')}
                            </div>
                            <button
                              onClick={() => handleDownloadSingleReceipt(child, p)}
                              style={{
                                background: 'rgba(99,102,241,0.15)', border: '1px solid #6366f1',
                                borderRadius: '8px', color: '#818cf8', fontSize: '11px', fontWeight: '700',
                                padding: '5px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                              }}
                            >
                              🧾 Receipt (PDF)
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Individual PDF Download */}
                <div style={{ padding: '0 16px 16px' }}>
                  <button
                    onClick={() => generateFeeLedgerPDF([child], school, false)}
                    style={{
                      width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none', borderRadius: '10px', padding: '11px',
                      color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    }}
                  >
                    📥 Download {child.fullName}'s Ledger
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Due Alert */}
      {summary.dueAmount > 0 && (
        <div style={{
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '12px', padding: '14px 16px', display: 'flex', gap: '12px', alignItems: 'flex-start',
        }}>
          <div style={{ fontSize: '20px' }}>⚠️</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: '700', color: '#f87171' }}>Outstanding Fee Due</div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '3px' }}>
              A total of {fmt(summary.dueAmount)} is pending. You can deposit a collective fee above to proportionately clear dues across all your children.
            </div>
          </div>
        </div>
      )}

      {/* ── Parent Sibling Collective Deposit Modal ───────────────────── */}
      {collectiveDepositModal.open && (
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.7)', zIndex: 1200, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => !collectiveDepositModal.processing && setCollectiveDepositModal((prev) => ({ ...prev, open: false }))}
        >
          <div
            style={{
              background: '#1e293b', border: '1.5px solid #334155', borderRadius: '16px',
              maxWidth: '560px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '90vh', overflowY: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'white' }}>
                  💰 Deposit Sibling Collective Fee
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Amount will be proportionately distributed across all {children.length} children
                </p>
              </div>
              <button
                onClick={() => !collectiveDepositModal.processing && setCollectiveDepositModal((prev) => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Live Distribution Preview Table */}
            <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '12px' }}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#818cf8', textTransform: 'uppercase', marginBottom: '8px' }}>
                Proportionate Allocation Preview
              </div>
              <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse', color: '#cbd5e1' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #334155', color: '#94a3b8' }}>
                    <th style={{ textAlign: 'left', padding: '6px' }}>Child</th>
                    <th style={{ textAlign: 'right', padding: '6px' }}>Current Due</th>
                    <th style={{ textAlign: 'right', padding: '6px', color: '#4ade80' }}>Allocated Deposit</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((child: any) => {
                    const totalDueAll = children.reduce((s: number, c: any) => s + c.dueAmount, 0)
                    const grossInput = parseFloat(collectiveDepositModal.amount || '0')
                    const childrenWithDues = children.filter((c: any) => c.dueAmount > 0)
                    const isLast = childrenWithDues[childrenWithDues.length - 1]?.studentId === child.studentId
                    let alloc = 0
                    if (totalDueAll > 0 && child.dueAmount > 0 && grossInput > 0) {
                      if (isLast) {
                        const sumOthers = childrenWithDues
                          .slice(0, -1)
                          .reduce((s: number, c: any) => s + Math.round(grossInput * (c.dueAmount / totalDueAll) * 100) / 100, 0)
                        alloc = Math.max(0, Math.round((grossInput - sumOthers) * 100) / 100)
                      } else {
                        alloc = Math.round(grossInput * (child.dueAmount / totalDueAll) * 100) / 100
                      }
                    }
                    return (
                      <tr key={child.studentId} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '8px 6px', fontWeight: '600' }}>{child.fullName}</td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', color: child.dueAmount > 0 ? '#f87171' : '#4ade80' }}>
                          {fmt(child.dueAmount)}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: '800', color: '#4ade80' }}>
                          {fmt(alloc)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Amount Input */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                Total Collective Amount (₹) *
              </label>
              <input
                type="number"
                value={collectiveDepositModal.amount}
                onChange={(e) => setCollectiveDepositModal((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="Enter collective fee amount"
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid #334155',
                  borderRadius: '8px', padding: '10px 14px', color: 'white',
                  fontSize: '16px', fontWeight: '700', boxSizing: 'border-box',
                }}
                min="1"
                step="0.01"
              />
              {collectiveDepositModal.amount && parseFloat(collectiveDepositModal.amount) > 0 && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                  {convertToWords(parseFloat(collectiveDepositModal.amount))}
                </div>
              )}
            </div>

            {/* Date Input */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                Payment Date *
              </label>
              <input
                type="date"
                value={collectiveDepositModal.date}
                onChange={(e) => setCollectiveDepositModal((prev) => ({ ...prev, date: e.target.value }))}
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid #334155',
                  borderRadius: '8px', padding: '10px 14px', color: 'white',
                  fontSize: '14px', fontWeight: '600', boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Mode Select */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#cbd5e1', marginBottom: '6px' }}>
                Payment Mode
              </label>
              <select
                value={collectiveDepositModal.paymentMode}
                onChange={(e) => setCollectiveDepositModal((prev) => ({ ...prev, paymentMode: e.target.value }))}
                style={{
                  width: '100%', background: '#0f172a', border: '1px solid #334155',
                  borderRadius: '8px', padding: '10px 14px', color: 'white',
                  fontSize: '14px', fontWeight: '600', boxSizing: 'border-box',
                }}
              >
                <option value="UPI">📱 UPI / QR</option>
                <option value="ONLINE">🌐 Net Banking / Online</option>
                <option value="CARD">💳 Debit / Credit Card</option>
                <option value="CASH">💵 Cash at School Counter</option>
              </select>
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
              <button
                onClick={() => !collectiveDepositModal.processing && setCollectiveDepositModal((prev) => ({ ...prev, open: false }))}
                style={{
                  flex: 1, padding: '11px', background: '#334155', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer',
                }}
                disabled={collectiveDepositModal.processing}
              >
                Cancel
              </button>
              <button
                onClick={handleCollectiveDepositSubmit}
                style={{
                  flex: 2, padding: '11px', background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white', border: 'none', borderRadius: '8px', fontWeight: '800',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                disabled={collectiveDepositModal.processing || !collectiveDepositModal.amount || !collectiveDepositModal.date}
              >
                {collectiveDepositModal.processing ? 'Processing Payment…' : '💳 Confirm & Generate A4 Duplicate Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
