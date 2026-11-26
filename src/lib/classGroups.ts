export interface ClassGroupOption {
  label: string
  shortLabel: string
  value: string
}

export const CLASS_GROUPS: ClassGroupOption[] = [
  { label: 'Class Nursery to UKG - Pre Primary', shortLabel: 'Pre Primary (Nursery - UKG)', value: 'Pre Primary' },
  { label: 'Class 1st To 5th - Primary', shortLabel: 'Primary (Class 1st - 5th)', value: 'Primary' },
  { label: 'Class 6th to 8th - Middle', shortLabel: 'Middle (Class 6th - 8th)', value: 'Middle' },
  { label: 'Class 9th to 10th - High School', shortLabel: 'High School (Class 9th - 10th)', value: 'High School' },
  { label: 'Class 11th to 12th - Higher Secondary', shortLabel: 'Higher Secondary (Class 11th - 12th)', value: 'Higher Secondary' },
]

/**
 * Resolve a course's class group from its stored `classGroup` field,
 * falling back to name-based inference when `classGroup` is not set.
 */
export function getCourseClassGroup(course: { name?: string; classGroup?: string | null }): string {
  if (course.classGroup && course.classGroup.trim()) {
    return course.classGroup.trim()
  }
  const name = (course.name || '').toLowerCase().trim()
  if (/nursery|lkg|ukg|pre[\s-]*primary|play/.test(name)) return 'Pre Primary'
  if (/\b(11|12)\b|11th|12th|higher\s*sec/.test(name)) return 'Higher Secondary'
  if (/\b(9|10)\b|9th|10th|high\s*school/.test(name)) return 'High School'
  if (/\b(6|7|8)\b|6th|7th|8th|middle/.test(name)) return 'Middle'
  if (/\b([1-5])\b|1st|2nd|3rd|4th|5th|primary/.test(name)) return 'Primary'
  return ''
}

/**
 * Collect unique subjects across all selected courses, preserving order.
 */
export function getGroupSubjects(
  courses: Array<{ id: string; subjects?: string[] }>,
  selectedCourseIds: string[]
): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const c of courses) {
    if (!selectedCourseIds.includes(c.id)) continue
    for (const rawSubj of c.subjects || []) {
      const parts = String(rawSubj).split(',')
      for (const part of parts) {
        const trimmed = part.trim()
        if (!trimmed) continue
        const key = trimmed.toLowerCase()
        if (!seen.has(key)) {
          seen.add(key)
          result.push(trimmed)
        }
      }
    }
  }
  return result
}
