'use client'
import { useState, useEffect, useRef } from 'react'
import { CLASS_GROUPS, getCourseClassGroup } from '@/lib/classGroups'

interface ClassGroupMultiSelectProps {
  courses: any[]
  batches: any[]
  selectedClassGroup: string
  onClassGroupChange: (group: string) => void
  selectedCourseIds: string[]
  onSelectedCourseIdsChange: (ids: string[]) => void
  selectedBatch: string
  onBatchChange: (batchId: string) => void
  token: string | null
  studentCount: number | null
  onStudentCountChange: (count: number | null) => void
}

export default function ClassGroupMultiSelect({
  courses,
  batches,
  selectedClassGroup,
  onClassGroupChange,
  selectedCourseIds,
  onSelectedCourseIdsChange,
  selectedBatch,
  onBatchChange,
  token,
  studentCount,
  onStudentCountChange,
}: ClassGroupMultiSelectProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [courseStudentCounts, setCourseStudentCounts] = useState<Record<string, number>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  const groupCourses = selectedClassGroup
    ? courses.filter((c) => getCourseClassGroup(c) === selectedClassGroup)
    : []

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Fetch active student counts for selected courses
  useEffect(() => {
    if (!token || selectedCourseIds.length === 0) {
      onStudentCountChange(null)
      return
    }
    let cancelled = false
    const loadCounts = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` }
        const results = await Promise.all(
          selectedCourseIds.map(async (cid) => {
            if (courseStudentCounts[cid] !== undefined) {
              return { cid, count: courseStudentCounts[cid] }
            }
            const res = await fetch(`/api/students?courseId=${cid}`, { headers })
            const data = await res.json()
            return { cid, count: data.success ? (data.data?.length || 0) : 0 }
          })
        )
        if (cancelled) return
        const updatedMap = { ...courseStudentCounts }
        let total = 0
        for (const r of results) {
          updatedMap[r.cid] = r.count
          total += r.count
        }
        setCourseStudentCounts(updatedMap)
        onStudentCountChange(total)
      } catch {
        if (!cancelled) onStudentCountChange(null)
      }
    }
    loadCounts()
    return () => {
      cancelled = true
    }
  }, [selectedCourseIds, token])

  const handleGroupSelect = (group: string) => {
    onClassGroupChange(group)
    onBatchChange('')
    onSelectedCourseIdsChange([])
    if (!group) {
      setDropdownOpen(false)
      return
    }
    setDropdownOpen(true)
  }

  const toggleCourse = (courseId: string) => {
    if (selectedCourseIds.includes(courseId)) {
      onSelectedCourseIdsChange(selectedCourseIds.filter((id) => id !== courseId))
    } else {
      onSelectedCourseIdsChange([...selectedCourseIds, courseId])
    }
  }

  const toggleSelectAllGroup = () => {
    if (selectedCourseIds.length === groupCourses.length) {
      onSelectedCourseIdsChange([])
    } else {
      onSelectedCourseIdsChange(groupCourses.map((c) => c.id))
    }
  }

  const singleCourseId = selectedCourseIds.length === 1 ? selectedCourseIds[0] : ''
  const singleCourseBatches = singleCourseId
    ? batches.filter((b) => b.courseId === singleCourseId)
    : []

  const selectedNames = courses
    .filter((c) => selectedCourseIds.includes(c.id))
    .map((c) => c.name)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
        {/* 1. Class Group Selector */}
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
            Class Group (Same Subjects)
          </label>
          <select
            value={selectedClassGroup}
            onChange={(e) => handleGroupSelect(e.target.value)}
            className="input"
            style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
          >
            <option value="">-- Single Class Mode --</option>
            {CLASS_GROUPS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.shortLabel}
              </option>
            ))}
          </select>
        </div>

        {/* 2. Class / Multi-Class Tick Dropdown */}
        {selectedClassGroup ? (
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
              Select Classes in {selectedClassGroup} * (Tick Selection)
            </label>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="input"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                textAlign: 'left',
                cursor: 'pointer',
                border: dropdownOpen ? '1px solid var(--primary)' : undefined,
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px' }}>
                {selectedCourseIds.length === 0
                  ? `-- Tick Classes in ${selectedClassGroup} --`
                  : `${selectedCourseIds.length} Selected: ${selectedNames.join(', ')}`}
              </span>
              <span style={{ fontSize: '11px', marginLeft: '8px', opacity: 0.7 }}>{dropdownOpen ? '▲' : '▼'}</span>
            </button>

            {dropdownOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 6px)',
                  left: 0,
                  right: 0,
                  zIndex: 50,
                  background: 'var(--surface)',
                  border: '1px solid var(--primary)',
                  borderRadius: '12px',
                  boxShadow: '0 14px 36px rgba(0,0,0,0.4)',
                  overflow: 'hidden',
                }}
              >
                {/* Header with Select All & Done */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    background: 'var(--surface-2)',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '12px',
                  }}
                >
                  <button
                    type="button"
                    onClick={toggleSelectAllGroup}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      fontWeight: '700',
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '12px',
                    }}
                  >
                    {selectedCourseIds.length === groupCourses.length ? '☑ Deselect All' : '☐ Select All'} ({groupCourses.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      background: 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    Done ✓
                  </button>
                </div>

                {/* Checkbox List */}
                <div style={{ maxHeight: '220px', overflowY: 'auto', padding: '6px' }}>
                  {groupCourses.length === 0 ? (
                    <div style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                      No classes found in {selectedClassGroup}. Add classes in Classes & Sections first.
                    </div>
                  ) : (
                    groupCourses.map((c) => {
                      const checked = selectedCourseIds.includes(c.id)
                      const subjCount = Array.isArray(c.subjects) ? c.subjects.length : 0
                      return (
                        <label
                          key={c.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '10px',
                            padding: '9px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            background: checked ? 'rgba(99,102,241,0.12)' : 'transparent',
                            marginBottom: '2px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCourse(c.id)}
                              style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                            />
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                                {c.name}
                                {c.subjectGroup ? (
                                  <span style={{ fontSize: '11px', color: '#a78bfa', marginLeft: '6px' }}>({c.subjectGroup})</span>
                                ) : null}
                              </div>
                              {subjCount > 0 && (
                                <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                  {subjCount} subject{subjCount > 1 ? 's' : ''}: {c.subjects.slice(0, 4).join(', ')}
                                  {subjCount > 4 ? '…' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                          {courseStudentCounts[c.id] !== undefined && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: '700',
                                padding: '2px 7px',
                                borderRadius: '10px',
                                background: courseStudentCounts[c.id] > 0 ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                                color: courseStudentCounts[c.id] > 0 ? '#10b981' : '#ef4444',
                              }}
                            >
                              {courseStudentCounts[c.id]} students
                            </span>
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
              Select Class / Course *
            </label>
            <select
              value={singleCourseId}
              onChange={(e) => {
                const val = e.target.value
                onSelectedCourseIdsChange(val ? [val] : [])
                onBatchChange('')
              }}
              className="input"
              style={{ width: '100%', padding: '12px', borderRadius: '10px' }}
              required
            >
              <option value="">-- Choose Class --</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* 3. Section / Batch */}
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '700', marginBottom: '6px', display: 'block' }}>
            Section / Batch (Optional)
          </label>
          <select
            value={selectedBatch}
            onChange={(e) => onBatchChange(e.target.value)}
            className="input"
            disabled={selectedCourseIds.length !== 1}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              opacity: selectedCourseIds.length !== 1 ? 0.55 : 1,
            }}
          >
            <option value="">
              {selectedCourseIds.length > 1
                ? '-- All Sections (Multi-Class Mode) --'
                : singleCourseBatches.length > 0
                  ? '-- All Sections / Whole Class --'
                  : '-- Whole Class (No Sections) --'}
            </option>
            {singleCourseBatches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Selected Classes Chips (when in Group mode) */}
      {selectedClassGroup && selectedCourseIds.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '700' }}>Selected Classes:</span>
          {courses
            .filter((c) => selectedCourseIds.includes(c.id))
            .map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => toggleCourse(c.id)}
                title="Click to unselect"
                style={{
                  padding: '4px 10px',
                  borderRadius: '14px',
                  fontSize: '11px',
                  fontWeight: '700',
                  background: 'rgba(99,102,241,0.16)',
                  border: '1px solid rgba(99,102,241,0.4)',
                  color: '#a78bfa',
                  cursor: 'pointer',
                }}
              >
                ✓ {c.name} ✕
              </button>
            ))}
        </div>
      )}

      {/* Active Student Count Banner */}
      {studentCount !== null && selectedCourseIds.length > 0 && (
        <div
          style={{
            fontSize: '12px',
            color: studentCount > 0 ? '#10b981' : '#ef4444',
            fontWeight: '700',
          }}
        >
          {studentCount > 0
            ? `👥 ${studentCount} Active Student${studentCount === 1 ? '' : 's'} across ${selectedCourseIds.length} selected class${selectedCourseIds.length === 1 ? '' : 'es'} will receive Admit Cards`
            : '⚠️ No active students found in the selected class(es)'}
        </div>
      )}
    </div>
  )
}
