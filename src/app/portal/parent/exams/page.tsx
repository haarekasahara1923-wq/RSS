'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import Script from 'next/script'

export default function ParentExams() {
  const { token } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChildId, setSelectedChildId] = useState<string>('')
  const [isPdfReady, setIsPdfReady] = useState(false)

  useEffect(() => {
    if (!token) return
    fetch('/api/parent', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setProfile(d.profile)
        const kids = d.profile?.children || []
        if (kids.length > 0) {
          setSelectedChildId(kids[0].id)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [token])

  const children = profile?.children || []
  const currentChild = children.find((c: any) => c.id === selectedChildId) || children[0]
  const examResults = currentChild?.examResults || []
  const schoolName = profile?.tenant?.name || 'School'
  const courseSubjects = currentChild?.course?.subjects || []
  const currentYear = new Date().getFullYear()

  // Group exam results by Exam Title
  const groupedExams = examResults.reduce((acc: any, er: any) => {
    const title = er.exam?.title || 'Unknown Exam'
    if (!acc[title]) acc[title] = []
    acc[title].push(er)
    return acc
  }, {})

  const downloadPDF = (elementId: string, title: string) => {
    const original = document.getElementById(elementId)
    if (!original) return

    // Create a clone so we don't mess up the UI while generating PDF
    const clone = original.cloneNode(true) as HTMLElement
    clone.style.background = '#ffffff'
    clone.style.color = '#000000'
    // A4 width is 210mm, we use that exactly to ensure perfect fit without clipping
    clone.style.width = '210mm'
    clone.style.padding = '20mm' // Side margins for the content inside A4
    clone.style.boxSizing = 'border-box'

    // Overwrite styles on the clone to ensure dark text and visible borders
    const ths = clone.querySelectorAll('th')
    ths.forEach(th => {
      th.style.background = '#f1f5f9'
      th.style.color = '#000000'
      th.style.borderColor = '#000000'
    })
    const tds = clone.querySelectorAll('td')
    tds.forEach(td => {
      // Keep green color if it's there, otherwise black
      if (td.style.color !== 'rgb(16, 185, 129)' && td.style.color !== '#10b981') {
          td.style.color = '#000000'
      }
      td.style.borderColor = '#000000'
    })
    
    // Change all text nodes to black to ensure visibility on white background
    const allEls = clone.querySelectorAll('*')
    allEls.forEach((el: any) => {
        const color = el.style.color
        if (color === 'white' || color === 'rgb(255, 255, 255)' || color === '#94a3b8' || color === 'rgb(148, 163, 184)' || color === '#cbd5e1') {
            el.style.color = '#000000'
        }
        if (el.style.borderTopColor === '#334155' || el.style.borderTopColor === 'rgb(51, 65, 85)') {
            el.style.borderTopColor = '#000000'
        }
        if (el.style.borderBottomColor === '#334155' || el.style.borderBottomColor === 'rgb(51, 65, 85)') {
            el.style.borderBottomColor = '#000000'
        }
    })

    // Mount the clone off-screen so html2canvas can render it completely without scroll clipping
    const wrapper = document.createElement('div')
    wrapper.style.position = 'absolute'
    wrapper.style.left = '-9999px'
    wrapper.style.top = '0'
    wrapper.appendChild(clone)
    document.body.appendChild(wrapper)

    const opt = {
      margin:       0, // Margin is handled via the clone's 20mm padding
      filename:     `${title.replace(/\s+/g, '_')}_Report_Card.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2, useCORS: true, scrollY: 0 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }
    
    // @ts-ignore
    window.html2pdf().set(opt).from(clone).save().then(() => {
        document.body.removeChild(wrapper)
    }).catch(() => {
        document.body.removeChild(wrapper)
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js" strategy="lazyOnload" onLoad={() => setIsPdfReady(true)} />

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>📑 Report Cards</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, margin: '4px 0 0 0' }}>View and download your child's examination report cards</p>
      </div>

      {loading ? (
        <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading exam marks...</div>
      ) : children.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '40px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>👶</div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>No children linked yet</div>
          <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 16px 0' }}>Link your children to view their exam marks.</p>
          <Link href="/portal/parent/children" style={{ background: '#6366f1', color: 'white', textDecoration: 'none', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '700' }}>
            Link Children
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Child Switcher Tabs */}
          {children.length > 1 && (
            <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '12px', border: '1px solid #334155' }}>
              {children.map((c: any) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedChildId(c.id)}
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: currentChild?.id === c.id ? '#10b981' : 'transparent',
                    color: currentChild?.id === c.id ? 'white' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  👶 {c.fullName}
                </button>
              ))}
            </div>
          )}

          {Object.keys(groupedExams).length === 0 ? (
            <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '40px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📝</div>
              <div style={{ fontSize: '14px', fontWeight: '700', color: 'white' }}>No exam marks published yet</div>
              <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                When the teacher evaluates tests for {currentChild.fullName}, report cards will appear here.
              </p>
            </div>
          ) : (
            Object.keys(groupedExams).map((examTitle, index) => {
                const results = groupedExams[examTitle]
                
                let grandTotalMax = 0
                let grandTotalObtained = 0
                
                // Collect results per subject
                const subjectRows = courseSubjects.map((subject: string) => {
                    const res = results.find((r: any) => r.exam?.subject === subject)
                    if (res) {
                        grandTotalMax += res.exam?.maxMarks || 0
                        grandTotalObtained += res.marksObtained || 0
                    }
                    return {
                        subject,
                        max: res ? res.exam?.maxMarks : '-',
                        obtained: res ? res.marksObtained : '-',
                        remarks: res?.remarks || '-',
                    }
                })

                // Add subjects that were tested but not in the course subjects list (if any)
                results.forEach((r: any) => {
                    if (r.exam?.subject && !courseSubjects.includes(r.exam.subject)) {
                        grandTotalMax += r.exam?.maxMarks || 0
                        grandTotalObtained += r.marksObtained || 0
                        subjectRows.push({
                            subject: r.exam.subject,
                            max: r.exam.maxMarks,
                            obtained: r.marksObtained,
                            remarks: r.remarks || '-'
                        })
                    }
                })

                const percentage = grandTotalMax > 0 ? ((grandTotalObtained / grandTotalMax) * 100).toFixed(2) : 0
                const reportCardId = `report-card-${index}`

                return (
                    <div key={examTitle} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
                        {/* Printable Report Card Area */}
                        <div id={reportCardId} style={{ padding: '24px', background: '#1e293b', color: 'white' }}>
                            <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px solid #334155', paddingBottom: '16px' }}>
                                {profile?.tenant?.logo && (
                                    <img src={profile.tenant.logo} alt="School Logo" style={{ height: '60px', objectFit: 'contain', marginBottom: '8px' }} crossOrigin="anonymous" />
                                )}
                                <h2 style={{ margin: '0 0 8px 0', fontSize: '24px', fontWeight: '800' }}>{schoolName}</h2>
                                <h3 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: '600', color: '#10b981' }}>{examTitle}</h3>
                                <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>Academic Year: {currentYear}</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', fontSize: '14px' }}>
                                <div>
                                    <p style={{ margin: '4px 0' }}><strong>Student Name:</strong> {currentChild.fullName}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Class:</strong> {currentChild.course?.name}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: '4px 0' }}><strong>Section:</strong> {currentChild.batch?.name}</p>
                                    <p style={{ margin: '4px 0' }}><strong>Roll/ID:</strong> {currentChild.studentId || 'N/A'}</p>
                                </div>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px', border: '1px solid #334155' }}>
                                <thead>
                                    <tr style={{ background: 'rgba(99,102,241,0.1)' }}>
                                        <th style={{ padding: '12px', border: '1px solid #334155', textAlign: 'left', color: '#cbd5e1' }}>Subject</th>
                                        <th style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center', color: '#cbd5e1' }}>Total Marks</th>
                                        <th style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center', color: '#cbd5e1' }}>Marks Obtained</th>
                                        <th style={{ padding: '12px', border: '1px solid #334155', textAlign: 'left', color: '#cbd5e1' }}>Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectRows.map((row: any, i: number) => (
                                        <tr key={i}>
                                            <td style={{ padding: '12px', border: '1px solid #334155', fontWeight: '600' }}>{row.subject}</td>
                                            <td style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center' }}>{row.max}</td>
                                            <td style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center', fontWeight: '700', color: row.obtained !== '-' ? '#10b981' : 'inherit' }}>{row.obtained}</td>
                                            <td style={{ padding: '12px', border: '1px solid #334155', fontSize: '12px', color: '#94a3b8' }}>{row.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ background: 'rgba(16,185,129,0.1)' }}>
                                        <td style={{ padding: '12px', border: '1px solid #334155', fontWeight: '800', textAlign: 'right' }}>GRAND TOTAL</td>
                                        <td style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center', fontWeight: '800' }}>{grandTotalMax}</td>
                                        <td style={{ padding: '12px', border: '1px solid #334155', textAlign: 'center', fontWeight: '800', color: '#10b981' }}>{grandTotalObtained}</td>
                                        <td style={{ padding: '12px', border: '1px solid #334155', fontWeight: '800' }}>{percentage}%</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '40px', paddingTop: '20px', borderTop: '1px dashed #334155', fontSize: '14px', color: '#94a3b8' }}>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '40px' }}></div>
                                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Class Teacher</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                    <div style={{ height: '40px' }}></div>
                                    <div style={{ borderTop: '1px solid #94a3b8', paddingTop: '4px' }}>Principal</div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div style={{ padding: '16px', background: '#0f172a', borderTop: '1px solid #334155', display: 'flex', justifyContent: 'flex-end' }}>
                            <button 
                                onClick={() => isPdfReady ? downloadPDF(reportCardId, `${currentChild.fullName}_${examTitle}`) : alert('PDF library loading... please try again in a few seconds')}
                                style={{ 
                                    background: '#ef4444', 
                                    color: 'white', 
                                    border: 'none', 
                                    padding: '10px 20px', 
                                    borderRadius: '8px', 
                                    fontWeight: '700', 
                                    fontSize: '14px',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    opacity: isPdfReady ? 1 : 0.6
                                }}
                            >
                                📄 Download Report Card as PDF
                            </button>
                        </div>
                    </div>
                )
            })
          )}
        </div>
      )}
    </div>
  )
}
