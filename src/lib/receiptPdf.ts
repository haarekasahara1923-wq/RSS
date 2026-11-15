// Helper to convert numbers to Indian Rupee Words
export function convertToWords(amount: number): string {
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

export interface ReceiptOptions {
  receipt: any
  student: any
  tenant: any
  installmentLabel?: string
  distributions?: any[]
  isCollective?: boolean
  win?: Window | null
}

/**
 * Universal A4 Duplicate Receipt Generator
 * Renders BOTH Office Copy (top) and Parent Copy (bottom) on a SINGLE A4 Page.
 * Uses 14px bold typography and includes full details for all siblings in collective receipts.
 */
export function generateReceiptPDF(opts: ReceiptOptions) {
  const { receipt, student, tenant, installmentLabel = 'Fee Installment', distributions, isCollective, win: providedWin } = opts
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

  const hasDistributions = Boolean(distributions && distributions.length > 0)
  const collectiveFlag = isCollective || hasDistributions

  const renderReceiptCard = (copyType: 'OFFICE COPY' | 'PARENT COPY') => {
    const isOffice = copyType === 'OFFICE COPY'
    const badgeColor = isOffice ? '#1e3a8a' : '#065f46'
    const badgeBg = isOffice ? '#dbeafe' : '#d1fae5'

    let studentNameDisplay = student.fullName
    let scholarNoDisplay = student.scholarNo || student.studentId || '—'
    let classDisplay = student.courseName || student.course?.name || student.class || '—'

    if (hasDistributions) {
      studentNameDisplay = `Family / Siblings (${distributions!.length} Students: ${distributions!.map(d => d.studentName).join(', ')})`
      scholarNoDisplay = distributions!.map(d => d.scholarNo).filter(s => s && s !== '-').join(', ') || '—'
      classDisplay = Array.from(new Set(distributions!.map(d => d.class))).join(', ')
    }

    const tableHeaders = hasDistributions
      ? `<tr>
          <th style="padding:4px 6px;font-size:12.5px;text-align:center;width:24px;">#</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:left;">Student / Sibling Details</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:left;">Class</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:right;">Pre Due</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:right;">Deposited (₹)</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:right;">Remaining</th>
        </tr>`
      : `<tr>
          <th style="padding:4px 6px;font-size:12.5px;text-align:center;width:24px;">#</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:left;" colspan="2">Description</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:left;">Type</th>
          <th style="padding:4px 6px;font-size:12.5px;text-align:right;">Amount (₹)</th>
        </tr>`

    const tableBody = hasDistributions
      ? distributions!.map((d: any, i: number) => `
          <tr>
            <td style="padding:4px 6px;font-size:13px;border-bottom:1px solid #cbd5e1;text-align:center;">${i + 1}</td>
            <td style="padding:4px 6px;font-size:14px;border-bottom:1px solid #cbd5e1;font-weight:700;">
              ${d.studentName} ${d.scholarNo && d.scholarNo !== '-' ? `[Sch: ${d.scholarNo}]` : ''}
            </td>
            <td style="padding:4px 6px;font-size:13px;border-bottom:1px solid #cbd5e1;">${d.class}</td>
            <td style="padding:4px 6px;font-size:13px;border-bottom:1px solid #cbd5e1;text-align:right;color:#dc2626;">₹${(d.previousOutstanding ?? 0).toLocaleString('en-IN')}</td>
            <td style="padding:4px 6px;font-size:14px;border-bottom:1px solid #cbd5e1;text-align:right;font-weight:800;color:#059669;">₹${parseFloat(d.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
            <td style="padding:4px 6px;font-size:13px;border-bottom:1px solid #cbd5e1;text-align:right;font-weight:700;color:${(d.newOutstanding ?? 0) > 0 ? '#f59e0b' : '#059669'};">₹${(d.newOutstanding ?? 0).toLocaleString('en-IN')}</td>
          </tr>
        `).join('')
      : `
          <tr>
            <td style="padding:4px 6px;font-size:13px;border-bottom:1px solid #cbd5e1;text-align:center;">1</td>
            <td style="padding:4px 6px;font-size:14px;border-bottom:1px solid #cbd5e1;font-weight:700;" colspan="2">${installmentLabel}</td>
            <td style="padding:4px 6px;font-size:13px;border-bottom:1px solid #cbd5e1;">Fee Deposit</td>
            <td style="padding:4px 6px;font-size:14px;border-bottom:1px solid #cbd5e1;text-align:right;font-weight:800;color:#059669;">₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        `

    const tableFooter = hasDistributions
      ? `<tr>
          <td colspan="4" style="padding:4px 6px;font-size:13.5px;font-weight:700;text-align:right;">
            Total Collective Amount Received:
          </td>
          <td style="padding:4px 6px;font-size:15px;font-weight:900;color:#059669;text-align:right;">
            ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
          <td style="padding:4px 6px;font-size:13px;font-weight:800;color:#dc2626;text-align:right;">
            ₹${distributions!.reduce((sum: number, x: any) => sum + (x.newOutstanding ?? 0), 0).toLocaleString('en-IN')}
          </td>
        </tr>`
      : `<tr>
          <td colspan="4" style="padding:4px 6px;font-size:13.5px;font-weight:700;text-align:right;">
            Total Amount Received:
          </td>
          <td style="padding:4px 6px;font-size:15px;font-weight:900;color:#059669;text-align:right;">
            ₹${paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </td>
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
        <span>✦ ${collectiveFlag ? 'COLLECTIVE SIBLINGS FAMILY FEE RECEIPT' : 'STUDENT FEE PAYMENT RECEIPT'} ✦</span>
        <span class="r-band-pill">${copyType}</span>
      </div>

      <!-- Student Grid -->
      <div class="r-grid">
        <div class="r-cell" style="${hasDistributions ? 'grid-column: span 2;' : ''}">
          <span class="r-lbl">Student / Family:</span>
          <span class="r-val" style="color:#1a3c5e;">${studentNameDisplay}</span>
        </div>
        <div class="r-cell">
          <span class="r-lbl">Scholar No(s):</span>
          <span class="r-val" style="color:#1a3c5e;">${scholarNoDisplay}</span>
        </div>
        <div class="r-cell">
          <span class="r-lbl">Class:</span>
          <span class="r-val">${classDisplay}</span>
        </div>
        <div class="r-cell">
          <span class="r-lbl">Father's Name:</span>
          <span class="r-val">${student.fatherName || '—'}</span>
        </div>
        <div class="r-cell">
          <span class="r-lbl">Contact / Mode:</span>
          <span class="r-val">${student.parentPhone || student.phone || '—'} (${modeLabel})</span>
        </div>
      </div>

      <!-- Fee Table -->
      <table class="r-table">
        <thead>${tableHeaders}</thead>
        <tbody>${tableBody}</tbody>
        <tfoot>${tableFooter}</tfoot>
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
    if (!win) {
      alert('Please allow popups for this site to view and download receipts.')
      return
    }
    win.document.open()
    win.document.write(html)
    win.document.close()
  }
}
