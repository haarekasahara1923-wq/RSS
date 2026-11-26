'use client'
import { useEffect, useId, useRef } from 'react'
import DateInput from '@/components/DateInput'

export interface TimeTableRow {
  date: string
  subject: string
  startTime: string
  endTime: string
  duration: string
}

interface SubjectScheduleBuilderProps {
  rows: TimeTableRow[]
  onChange: (rows: TimeTableRow[]) => void
  availableSubjects: string[]
  computeDuration: (start: string, end: string) => string
  title?: string
  subtitle?: string
}

export default function SubjectScheduleBuilder({
  rows,
  onChange,
  availableSubjects,
  computeDuration,
  title = '📚 Exam Time Table Subjects',
  subtitle = 'Add all papers with dates and timings. This timetable will be printed below each admit card.',
}: SubjectScheduleBuilderProps) {
  const datalistId = useId()
  const prevAutoKeyRef = useRef<string>('')
  const availableKey = availableSubjects.map((s) => s.trim().toLowerCase()).join('|')

  // Automatically prefill schedule rows whenever selected class/group subjects change
  useEffect(() => {
    if (availableKey === prevAutoKeyRef.current) return

    const prevKeys = new Set(prevAutoKeyRef.current ? prevAutoKeyRef.current.split('|').filter(Boolean) : [])
    const nextKeys = new Set(availableSubjects.map((s) => s.trim().toLowerCase()).filter(Boolean))

    // Keep rows that are still in nextKeys OR were manually added (not in prevKeys),
    // preserving any dates/timings already filled by the user.
    const keptRows = rows.filter((r) => {
      const key = r.subject.trim().toLowerCase()
      return nextKeys.has(key) || (key !== '' && !prevKeys.has(key))
    })

    const keptKeys = new Set(keptRows.map((r) => r.subject.trim().toLowerCase()))
    const addedRows: TimeTableRow[] = availableSubjects
      .filter((s) => !keptKeys.has(s.trim().toLowerCase()))
      .map((subj) => ({
        date: '',
        subject: subj,
        startTime: '09:00',
        endTime: '12:00',
        duration: '3h',
      }))

    prevAutoKeyRef.current = availableKey
    onChange([...keptRows, ...addedRows])
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableKey])

  const addRow = (subjectName = '') => {
    onChange([
      ...rows,
      { date: '', subject: subjectName, startTime: '09:00', endTime: '12:00', duration: '3h' },
    ])
  }

  const removeRow = (i: number) => {
    onChange(rows.filter((_, idx) => idx !== i))
  }

  const updateRow = (i: number, key: keyof TimeTableRow, val: string) => {
    const updated = [...rows]
    updated[i] = { ...updated[i], [key]: val }
    if ((key === 'startTime' || key === 'endTime') && updated[i].startTime && updated[i].endTime) {
      updated[i].duration = computeDuration(updated[i].startTime, updated[i].endTime)
    }
    onChange(updated)
  }

  const existingSubjectSet = new Set(rows.map((r) => r.subject.trim().toLowerCase()).filter(Boolean))

  const handleAutoAddAllSubjects = () => {
    const missing = availableSubjects.filter((s) => !existingSubjectSet.has(s.trim().toLowerCase()))
    if (missing.length === 0) return
    const newRows: TimeTableRow[] = missing.map((subj) => ({
      date: '',
      subject: subj,
      startTime: '09:00',
      endTime: '12:00',
      duration: '3h',
    }))
    onChange([...rows, ...newRows])
  }

  const toggleSubjectChip = (subj: string) => {
    const lower = subj.trim().toLowerCase()
    if (existingSubjectSet.has(lower)) {
      onChange(rows.filter((r) => r.subject.trim().toLowerCase() !== lower))
    } else {
      addRow(subj)
    }
  }

  return (
    <div style={{ background: 'var(--surface-2)', padding: '16px', borderRadius: '14px', border: '1px solid var(--border)' }}>
      <datalist id={datalistId}>
        {availableSubjects.map((subj) => (
          <option key={subj} value={subj} />
        ))}
      </datalist>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
            {title} ({rows.length} added)
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{subtitle}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {availableSubjects.length > 0 && (
            <button
              type="button"
              onClick={handleAutoAddAllSubjects}
              style={{
                background: 'rgba(16,185,129,0.15)',
                color: '#10b981',
                border: '1px solid rgba(16,185,129,0.35)',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              ⚡ Add All Group Subjects ({availableSubjects.length})
            </button>
          )}
          <button
            type="button"
            onClick={() => addRow('')}
            style={{
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 14px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            + Add Subject
          </button>
        </div>
      </div>

      {/* Quick-pick Subject Chips from Selected Class / Group */}
      {availableSubjects.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700', marginRight: '4px' }}>
            Quick Pick Subjects:
          </span>
          {availableSubjects.map((subj) => {
            const active = existingSubjectSet.has(subj.trim().toLowerCase())
            return (
              <button
                key={subj}
                type="button"
                onClick={() => toggleSubjectChip(subj)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: active ? '1px solid #10b981' : '1px solid var(--border)',
                  background: active ? 'rgba(16,185,129,0.18)' : 'var(--surface)',
                  color: active ? '#10b981' : 'var(--text-primary)',
                }}
              >
                {active ? '✓ ' : '+ '}
                {subj}
              </button>
            )
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px 12px', color: 'var(--text-muted)', border: '1px dashed var(--border)', borderRadius: '10px', fontSize: '13px' }}>
          Click <strong>&quot;+ Add Subject&quot;</strong>{availableSubjects.length > 0 ? ' or pick subjects above' : ''} to enter exam dates, subjects, and timings.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {rows.map((row, idx) => (
            <div
              key={idx}
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                padding: '12px',
                borderRadius: '10px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 2fr 1fr 1fr 1fr auto',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Date *</label>
                <DateInput
                  value={row.date}
                  onChange={(e) => updateRow(idx, 'date', e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Subject / Paper *</label>
                <input
                  type="text"
                  list={datalistId}
                  placeholder="e.g. Science / Mathematics"
                  value={row.subject}
                  onChange={(e) => updateRow(idx, 'subject', e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Start Time</label>
                <input
                  type="time"
                  value={row.startTime}
                  onChange={(e) => updateRow(idx, 'startTime', e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>End Time</label>
                <input
                  type="time"
                  value={row.endTime}
                  onChange={(e) => updateRow(idx, 'endTime', e.target.value)}
                  className="input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px' }}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', marginBottom: '2px' }}>Duration</label>
                <input
                  type="text"
                  value={row.duration}
                  readOnly
                  className="input"
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', fontSize: '12px', color: '#10b981', fontWeight: '700' }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                style={{
                  background: 'rgba(239,68,68,0.15)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#ef4444',
                  padding: '8px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  marginTop: '14px',
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
