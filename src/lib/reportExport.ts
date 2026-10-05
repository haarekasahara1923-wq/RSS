/**
 * Report Export Utilities for UDBA
 * Supports CSV export (with UTF-8 BOM for Excel) and printable PDF generation with professional styling.
 */

export function downloadCSV(filename: string, content: string | (string | number)[][]) {
    let csvData = ''
    if (typeof content === 'string') {
        csvData = content
    } else {
        csvData = content.map(row =>
            row.map(cell => {
                const str = cell !== null && cell !== undefined ? String(cell) : ''
                return `"${str.replace(/"/g, '""')}"`
            }).join(',')
        ).join('\n')
    }

    // Prepend UTF-8 BOM so Excel opens INR symbols and special characters correctly
    const blob = new Blob(['\uFEFF' + csvData], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

/**
 * Download an Excel-compatible workbook (.xls, SpreadsheetML via HTML tables).
 * Opens natively in MS Excel / LibreOffice / Google Sheets with formatting.
 */
export function downloadExcel(
    filename: string,
    sheets: { title?: string; headerLines?: string[]; headers: string[]; rows: (string | number)[][]; footer?: (string | number)[] }[]
) {
    const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    const cell = (v: any, tag = 'td', style = '') => {
        const isNum = typeof v === 'number'
        return `<${tag} style="border:1px solid #cbd5e1;padding:4px 8px;${isNum ? 'mso-number-format:\\#\\,\\#\\#0\\.00;text-align:right;' : ''}${style}">${esc(v)}</${tag}>`
    }
    const body = sheets.map(s => `
        ${s.title ? `<h3 style="font-family:Calibri;color:#0f3d26">${esc(s.title)}</h3>` : ''}
        ${(s.headerLines || []).map(l => `<div style="font-family:Calibri">${esc(l)}</div>`).join('')}
        <table style="border-collapse:collapse;font-family:Calibri;font-size:11pt">
            <thead><tr>${s.headers.map(h => cell(h, 'th', 'background:#1a5c38;color:#fff;font-weight:bold;')).join('')}</tr></thead>
            <tbody>${s.rows.map(r => `<tr>${r.map(c => cell(c)).join('')}</tr>`).join('')}</tbody>
            ${s.footer ? `<tfoot><tr>${s.footer.map(c => cell(c, 'td', 'font-weight:bold;background:#ecfdf5;')).join('')}</tr></tfoot>` : ''}
        </table><br/>`).join('')
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="UTF-8"/></head><body>${body}</body></html>`
    const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.xls') ? filename : `${filename}.xls`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
}

export interface ReportPDFStat {
    label: string
    value: string | number
    subtext?: string
    color?: string
}

export interface ReportPDFTable {
    title?: string
    headers: string[]
    rows: (string | number)[][]
}

export interface ReportPDFOptions {
    title: string
    subtitle?: string
    schoolName?: string
    schoolAddress?: string
    stats?: ReportPDFStat[]
    tables: ReportPDFTable[]
    notes?: string
}

export function generateAndPrintPDF(options: ReportPDFOptions) {
    const {
        title,
        subtitle = 'Confidential Management Report',
        schoolName = 'Universal Day Boarding Academy',
        schoolAddress = '📍 Pinto Park, Gwalior (MP) • Ph: +91 7879337770',
        stats = [],
        tables = [],
        notes = '',
    } = options

    const generatedDate = new Date().toLocaleString('en-IN', {
        dateStyle: 'full',
        timeStyle: 'medium',
    })

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title} - ${schoolName}</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            padding: 24px;
            font-size: 13px;
            line-height: 1.5;
        }

        /* Top Action Bar (hidden on print) */
        .no-print {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #0f3d26;
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 10px;
            margin-bottom: 24px;
            box-shadow: 0 4px 12px rgba(15, 61, 38, 0.2);
        }
        .no-print h2 {
            font-size: 14px;
            font-weight: 700;
        }
        .btn-group {
            display: flex;
            gap: 10px;
        }
        .print-btn {
            background: #10b981;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background 0.2s;
        }
        .print-btn:hover {
            background: #059669;
        }
        .close-btn {
            background: rgba(255,255,255,0.15);
            color: white;
            border: 1px solid rgba(255,255,255,0.25);
            padding: 8px 14px;
            border-radius: 6px;
            font-weight: 600;
            font-size: 13px;
            cursor: pointer;
        }

        /* Header */
        .report-header {
            border-bottom: 2px solid #1a5c38;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .school-title {
            font-size: 22px;
            font-weight: 900;
            color: #0f3d26;
            letter-spacing: -0.02em;
        }
        .school-subtitle {
            font-size: 12px;
            color: #64748b;
            margin-top: 3px;
        }
        .report-main-title {
            font-size: 16px;
            font-weight: 800;
            color: #1a5c38;
            margin-top: 8px;
        }
        .header-meta {
            text-align: right;
            font-size: 11px;
            color: #64748b;
        }
        .badge {
            display: inline-block;
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            padding: 3px 8px;
            border-radius: 9999px;
            font-size: 11px;
            font-weight: 700;
            margin-bottom: 6px;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }
        .stat-box {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-left: 4px solid #1a5c38;
            border-radius: 8px;
            padding: 12px;
        }
        .stat-label {
            font-size: 11px;
            font-weight: 700;
            color: #64748b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .stat-value {
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            margin-top: 4px;
        }
        .stat-sub {
            font-size: 10px;
            color: #94a3b8;
            margin-top: 2px;
        }

        /* Table Section */
        .section-header {
            font-size: 14px;
            font-weight: 800;
            color: #0f3d26;
            margin: 24px 0 10px 0;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 12px;
        }
        th {
            background: #1a5c38;
            color: #ffffff;
            font-weight: 700;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #1a5c38;
        }
        td {
            padding: 7px 10px;
            border: 1px solid #e2e8f0;
            color: #334155;
        }
        tr:nth-child(even) td {
            background: #f8fafc;
        }

        /* Notes & Footer */
        .report-notes {
            background: #f0fdf4;
            border: 1px dashed #86efac;
            border-radius: 8px;
            padding: 12px 16px;
            margin: 20px 0;
            font-size: 11px;
            color: #166534;
        }
        .report-footer {
            margin-top: 32px;
            padding-top: 12px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #94a3b8;
        }

        @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            @page {
                size: A4;
                margin: 12mm;
            }
        }
    </style>
</head>
<body>
    <!-- Top Action Bar (Screen Only) -->
    <div class="no-print">
        <div>
            <h2>📄 Print Preview • ${title}</h2>
            <p style="font-size: 12px; opacity: 0.85;">Tip: Click "Save as PDF" to download or print this report.</p>
        </div>
        <div class="btn-group">
            <button class="print-btn" onclick="window.print()">🖨️ Save as PDF / Print</button>
            <button class="close-btn" onclick="window.close()">✕ Close</button>
        </div>
    </div>

    <!-- Printable Report Content -->
    <div class="report-header">
        <div>
            <div class="school-title">🏫 ${schoolName}</div>
            <div class="school-subtitle">${schoolAddress}</div>
            <div class="report-main-title">${title}</div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${subtitle}</div>
        </div>
        <div class="header-meta">
            <div class="badge">Official Report</div>
            <div><strong>Generated:</strong> ${generatedDate}</div>
            <div><strong>System:</strong> UDBA ERP Portal</div>
        </div>
    </div>

    ${stats.length > 0 ? `
    <div class="stats-grid">
        ${stats.map(s => `
        <div class="stat-box" style="${s.color ? `border-left-color: ${s.color};` : ''}">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value" style="${s.color ? `color: ${s.color};` : ''}">${s.value}</div>
            ${s.subtext ? `<div class="stat-sub">${s.subtext}</div>` : ''}
        </div>
        `).join('')}
    </div>
    ` : ''}

    ${tables.map(t => `
    <div>
        ${t.title ? `<div class="section-header"><span>${t.title}</span><span style="font-size: 11px; font-weight: 500; color: #64748b;">${t.rows.length} records</span></div>` : ''}
        <table>
            <thead>
                <tr>
                    ${t.headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
                ${t.rows.length > 0 ? t.rows.map(r => `
                <tr>
                    ${r.map(c => `<td>${c !== null && c !== undefined ? c : '-'}</td>`).join('')}
                </tr>
                `).join('') : `
                <tr>
                    <td colspan="${t.headers.length}" style="text-align: center; color: #94a3b8; padding: 20px;">No data available</td>
                </tr>
                `}
            </tbody>
        </table>
    </div>
    `).join('')}

    ${notes ? `
    <div class="report-notes">
        <strong>Notes / Remarks:</strong> ${notes}
    </div>
    ` : ''}

    <div class="report-footer">
        <div>Universal Day Boarding Academy Management System</div>
        <div>Generated by Authorized Admin • Page 1 of 1</div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
            }, 500);
        };
    </script>
</body>
</html>`

    const printWindow = window.open('', '_blank')
    if (printWindow) {
        printWindow.document.open()
        printWindow.document.write(htmlContent)
        printWindow.document.close()
    } else {
        alert('Popup was blocked by your browser. Please allow popups for this site to download the PDF.')
    }
}
