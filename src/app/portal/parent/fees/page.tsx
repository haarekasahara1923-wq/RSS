'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

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

  useEffect(() => {
    if (!token) return
    fetch('/api/parent/fee-ledger', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d)
          // Auto-expand if single child
          if (d.children?.length === 1) setExpandedChild(d.children[0].studentId)
        } else {
          setError(d.error || 'Failed to load fee data')
        }
        setLoading(false)
      })
      .catch(() => { setError('Network error. Please try again.'); setLoading(false) })
  }, [token])

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
      {/* Page Title */}
      <div>
        <h1 style={{ fontSize: '18px', fontWeight: '800', color: 'white', margin: 0 }}>💳 Fee Ledger</h1>
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
          {isSibling ? 'Combined view for all your children' : 'Your child\'s complete fee record'}
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
          {/* Combined Download Button */}
          <button
            onClick={() => generateFeeLedgerPDF(children, school, true)}
            style={{
              marginTop: '12px', width: '100%', background: 'rgba(255,255,255,0.15)',
              border: '1px solid rgba(255,255,255,0.3)', borderRadius: '10px', padding: '10px',
              color: 'white', fontSize: '13px', fontWeight: '700', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}
          >
            📥 Download Combined Ledger (PDF)
          </button>
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
                        <div key={p.id} style={{ background: '#0f172a', borderRadius: '10px', padding: '11px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '12px', fontWeight: '700', color: '#4ade80' }}>
                              Receipt: {p.receiptNo || 'N/A'}
                            </div>
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                              {fmtDate(p.createdAt)} &nbsp;·&nbsp; {p.mode || 'CASH'}
                            </div>
                          </div>
                          <div style={{ fontSize: '15px', fontWeight: '800', color: '#4ade80' }}>
                            +₹{p.amount.toLocaleString('en-IN')}
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
              A total of {fmt(summary.dueAmount)} is pending. Please contact the school office to clear dues.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
