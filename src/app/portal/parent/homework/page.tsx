'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function ParentHomework() {
  const { token } = useAuth()
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [content, setContent] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<Record<string, string>>({})
  const [selectedChild, setSelectedChild] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState({ text: '', type: '' })

  const loadHomework = () => {
    if (!token) return
    fetch('/api/homework', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setHomeworks(d.homeworks || [])
        setChildren(d.children || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadHomework()
  }, [token])

  // For each homework, pre-select the correct child based on batchId
  useEffect(() => {
    if (!homeworks.length || !children.length) return
    const defaults: Record<string, string> = {}
    homeworks.forEach((hw: any) => {
      const child = children.find((c: any) => c.batchId === hw.batchId)
      if (child) defaults[hw.id] = child.id
    })
    setSelectedChild(prev => ({ ...defaults, ...prev }))
  }, [homeworks, children])

  const submit = async (homeworkId: string) => {
    const answer = (content[homeworkId] || '').trim()
    const attachmentUrl = (attachments[homeworkId] || '').trim()
    const childId = selectedChild[homeworkId]

    if (!childId) {
      setMsg({ text: 'Please select which child this submission is for', type: 'error' })
      return
    }
    if (!answer && !attachmentUrl) {
      setMsg({ text: 'Please write an answer or provide a submission link', type: 'error' })
      return
    }

    setSubmitting(homeworkId)
    setMsg({ text: '', type: '' })
    try {
      const res = await fetch('/api/homework/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          homeworkId,
          studentId: childId,
          content: answer,
          attachmentUrl: attachmentUrl || null,
        }),
      })
      const d = await res.json()
      setSubmitting(null)
      if (d.success) {
        setMsg({ text: '✅ Homework submitted successfully on behalf of your child!', type: 'success' })
        setContent(prev => ({ ...prev, [homeworkId]: '' }))
        setAttachments(prev => ({ ...prev, [homeworkId]: '' }))
        loadHomework()
      } else {
        setMsg({ text: d.error || 'Failed to submit homework', type: 'error' })
      }
    } catch {
      setSubmitting(null)
      setMsg({ text: 'Network error while submitting', type: 'error' })
    }
  }

  if (loading) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading homework...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>📚 Children's Homework</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, margin: '4px 0 0 0' }}>View homework assigned to your children and submit on their behalf</p>
      </div>

      {msg.text && (
        <div style={{
          background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
          border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
          borderRadius: '10px', padding: '12px', fontSize: '13px',
          color: msg.type === 'success' ? '#10b981' : '#ef4444',
        }}>
          {msg.text}
        </div>
      )}

      {homeworks.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px 20px', background: '#1e293b', borderRadius: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎉</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>No homework assigned yet!</div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>Your children have no pending homework at the moment.</p>
        </div>
      ) : (
        homeworks.map((hw: any) => {
          // Find all children in this homework's batch
          const relevantChildren = children.filter((c: any) => c.batchId === hw.batchId)
          // Find existing submissions from children
          const childrenWithSubmission = hw.submissions?.filter((s: any) =>
            children.some((c: any) => c.id === s.studentId)
          ) || []
          const hasSubmission = childrenWithSubmission.length > 0

          return (
            <div key={hw.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '15px', fontWeight: '700', color: 'white' }}>{hw.title}</div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {hw.subject && (
                      <span style={{ fontSize: '11px', background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        {hw.subject}
                      </span>
                    )}
                    {hw.batch?.name && (
                      <span style={{ fontSize: '11px', background: 'rgba(16,185,129,0.15)', color: '#6ee7b7', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        {hw.batch?.course?.name ? `${hw.batch.course.name} - ` : ''}{hw.batch.name}
                      </span>
                    )}
                    {relevantChildren.map((c: any) => (
                      <span key={c.id} style={{ fontSize: '11px', background: 'rgba(236,72,153,0.15)', color: '#f472b6', padding: '2px 8px', borderRadius: '6px', fontWeight: '600' }}>
                        👶 {c.fullName}
                      </span>
                    ))}
                  </div>
                </div>

                {hasSubmission && (
                  <div style={{
                    background: childrenWithSubmission[0]?.status === 'GRADED' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                    color: childrenWithSubmission[0]?.status === 'GRADED' ? '#10b981' : '#f59e0b',
                    border: `1px solid ${childrenWithSubmission[0]?.status === 'GRADED' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
                    padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap',
                  }}>
                    {childrenWithSubmission[0]?.status === 'GRADED'
                      ? `✓ Grade: ${childrenWithSubmission[0]?.grade || 'Graded'}`
                      : '⏳ Submitted'}
                  </div>
                )}
              </div>

              {hw.description && (
                <div style={{ fontSize: '13px', color: '#cbd5e1', background: '#0f172a', padding: '10px', borderRadius: '8px', whiteSpace: 'pre-wrap' }}>
                  {hw.description}
                </div>
              )}

              {hw.attachmentUrl && (
                <div style={{ marginTop: '10px' }}>
                  {hw.attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) || hw.attachmentUrl.includes('cloudinary') ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#cbd5e1', fontWeight: '600' }}>Teacher's Attached Photo:</span>
                      <img src={hw.attachmentUrl} alt="Homework Attachment" style={{ maxWidth: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: '8px', border: '1px solid #334155' }} />
                      <a href={hw.attachmentUrl} download="Homework_Attachment" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#ec4899', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', textAlign: 'center', fontWeight: '600', width: 'max-content' }}>
                        ⬇️ Download Image
                      </a>
                    </div>
                  ) : (
                    <a href={hw.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'underline', display: 'inline-block', background: 'rgba(129, 140, 248, 0.1)', padding: '6px 12px', borderRadius: '6px' }}>
                      📎 View Teacher Reference Material
                    </a>
                  )}
                </div>
              )}

              {hw.dueDate && (
                <div style={{ fontSize: '12px', color: '#f59e0b' }}>
                  ⏰ Due Date: {new Date(hw.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              )}

              {/* Existing Submission Details */}
              {hasSubmission ? (
                <div style={{ background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {childrenWithSubmission.map((sub: any) => (
                    <div key={sub.id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>
                          {sub.student?.fullName || 'Child'}'s Submission:
                        </span>
                        <span style={{ fontSize: '11px', color: '#64748b' }}>
                          {new Date(sub.submittedAt).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'white', whiteSpace: 'pre-wrap' }}>{sub.content || <em>No text</em>}</div>
                      {sub.feedback && (
                        <div style={{ marginTop: '10px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '10px' }}>
                          <div style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>👩‍🏫 Teacher Feedback:</div>
                          <div style={{ fontSize: '13px', color: '#a7f3d0' }}>{sub.feedback}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Submission Form */
                <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {/* Child selector (if multiple children in same batch) */}
                  {relevantChildren.length > 1 && (
                    <select
                      value={selectedChild[hw.id] || ''}
                      onChange={e => setSelectedChild(prev => ({ ...prev, [hw.id]: e.target.value }))}
                      style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 10px', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
                    >
                      <option value="">-- Select Child --</option>
                      {relevantChildren.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.fullName}</option>
                      ))}
                    </select>
                  )}

                  <textarea
                    placeholder="Write your child's homework answer here..."
                    value={content[hw.id] || ''}
                    onChange={e => setContent(prev => ({ ...prev, [hw.id]: e.target.value }))}
                    style={{ width: '100%', minHeight: '80px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '10px', color: 'white', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                  />
                  <input
                    placeholder="Optional: Google Drive link or image URL of written work"
                    value={attachments[hw.id] || ''}
                    onChange={e => setAttachments(prev => ({ ...prev, [hw.id]: e.target.value }))}
                    style={{ width: '100%', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', padding: '8px 10px', color: 'white', fontSize: '12px', boxSizing: 'border-box' }}
                  />
                  <button
                    onClick={() => submit(hw.id)}
                    disabled={submitting === hw.id}
                    style={{ marginTop: '4px', background: 'linear-gradient(135deg, #ec4899, #8b5cf6)', border: 'none', borderRadius: '10px', padding: '12px', color: 'white', fontWeight: '700', fontSize: '14px', cursor: 'pointer', opacity: submitting === hw.id ? 0.6 : 1 }}
                  >
                    {submitting === hw.id ? 'Submitting...' : '📤 Submit Homework'}
                  </button>
                </div>
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
