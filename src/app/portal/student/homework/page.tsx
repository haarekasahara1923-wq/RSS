'use client'
import { useAuth } from '@/contexts/AuthContext'
import { useState, useEffect } from 'react'

export default function StudentHomework() {
  const { token, user } = useAuth()
  const [homeworks, setHomeworks] = useState<any[]>([])
  const [studentId, setStudentId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [content, setContent] = useState<Record<string, string>>({})
  const [attachments, setAttachments] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState({ text: '', type: '' })

  const loadHomework = () => {
    if (!token) return
    fetch('/api/homework', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => {
        setHomeworks(d.homeworks || [])
        if (d.studentId) setStudentId(d.studentId)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }

  useEffect(() => {
    loadHomework()
  }, [token])

  const submit = async (homeworkId: string) => {
    const answer = (content[homeworkId] || '').trim()
    const attachmentUrl = (attachments[homeworkId] || '').trim()

    if (!answer && !attachmentUrl) {
      setMsg({ text: 'Please write your answer or provide a submission link', type: 'error' })
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
          studentId: studentId || user?.studentId || undefined,
          content: answer,
          attachmentUrl: attachmentUrl || null,
        }),
      })
      const d = await res.json()
      setSubmitting(null)
      if (d.success) {
        setMsg({ text: '✅ Homework submitted successfully! Your teacher will review it.', type: 'success' })
        setContent(prev => ({ ...prev, [homeworkId]: '' }))
        setAttachments(prev => ({ ...prev, [homeworkId]: '' }))
        loadHomework()
      } else {
        setMsg({ text: d.error || 'Failed to submit homework', type: 'error' })
      }
    } catch {
      setSubmitting(null)
      setMsg({ text: 'Network error occurred while submitting', type: 'error' })
    }
  }

  if (loading) {
    return <div style={{ color: '#64748b', textAlign: 'center', padding: '40px' }}>Loading your homework...</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1)', borderRadius: '16px', padding: '20px', color: 'white' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '800', margin: 0 }}>📚 My Homework</h1>
        <p style={{ fontSize: '12px', opacity: 0.85, margin: '4px 0 0 0' }}>Complete assignments given by your teacher and view your grades & feedback</p>
      </div>

      {msg.text && (
        <div
          style={{
            background: msg.type === 'success' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            border: `1px solid ${msg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
            borderRadius: '10px',
            padding: '12px',
            fontSize: '13px',
            color: msg.type === 'success' ? '#10b981' : '#ef4444',
          }}
        >
          {msg.text}
        </div>
      )}

      {homeworks.length === 0 ? (
        <div style={{ color: '#94a3b8', textAlign: 'center', padding: '60px 20px', background: '#1e293b', borderRadius: '16px' }}>
          <div style={{ fontSize: '36px', marginBottom: '10px' }}>🎉</div>
          <div style={{ fontSize: '16px', fontWeight: '700', color: 'white' }}>No homework assigned yet!</div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px' }}>You are all caught up with your studies.</p>
        </div>
      ) : (
        homeworks.map((hw: any) => {
          const submission = hw.submissions?.[0]
          const isGraded = submission?.status === 'GRADED'

          return (
            <div key={hw.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                  </div>
                </div>

                {submission && (
                  <div
                    style={{
                      background: isGraded ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)',
                      color: isGraded ? '#10b981' : '#f59e0b',
                      border: `1px solid ${isGraded ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '11px',
                      fontWeight: '700',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isGraded ? `✓ Grade: ${submission.grade || 'Graded'}` : '⏳ Submitted'}
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
                      <a href={hw.attachmentUrl} download="Homework_Attachment" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#3b82f6', color: 'white', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', textDecoration: 'none', textAlign: 'center', fontWeight: '600', width: 'max-content' }}>
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

              {/* Already Submitted */}
              {submission ? (
                <div style={{ marginTop: '10px', background: '#0f172a', padding: '14px', borderRadius: '10px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#94a3b8' }}>Your Submission:</span>
                    <span style={{ fontSize: '11px', color: '#64748b' }}>Submitted {new Date(submission.submittedAt).toLocaleString('en-IN')}</span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'white', whiteSpace: 'pre-wrap' }}>{submission.content || <em>No text provided</em>}</div>

                  {submission.attachmentUrl && (
                    <div style={{ marginTop: '8px' }}>
                      <a href={submission.attachmentUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8', fontSize: '12px', textDecoration: 'underline' }}>
                        📎 View Your Attachment
                      </a>
                    </div>
                  )}

                  {/* Teacher Feedback Box */}
                  {submission.feedback && (
                    <div style={{ marginTop: '12px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: '8px', padding: '10px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: '#10b981', marginBottom: '4px' }}>
                        👩‍🏫 Teacher's Review & Feedback:
                      </div>
                      <div style={{ fontSize: '13px', color: '#a7f3d0' }}>{submission.feedback}</div>
                    </div>
                  )}
                </div>
              ) : (
                /* Submission Form */
                <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <textarea
                    placeholder="Write your homework solution / answer here..."
                    value={content[hw.id] || ''}
                    onChange={e => setContent(prev => ({ ...prev, [hw.id]: e.target.value }))}
                    style={{
                      width: '100%',
                      minHeight: '80px',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      color: 'white',
                      fontSize: '13px',
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    placeholder="Optional: Google Drive link or image URL of your written work"
                    value={attachments[hw.id] || ''}
                    onChange={e => setAttachments(prev => ({ ...prev, [hw.id]: e.target.value }))}
                    style={{
                      width: '100%',
                      background: '#0f172a',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '8px 10px',
                      color: 'white',
                      fontSize: '12px',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={() => submit(hw.id)}
                    disabled={submitting === hw.id}
                    style={{
                      marginTop: '4px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '12px',
                      color: 'white',
                      fontWeight: '700',
                      fontSize: '14px',
                      cursor: 'pointer',
                      opacity: submitting === hw.id ? 0.6 : 1,
                    }}
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
