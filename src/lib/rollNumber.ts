/**
 * Class-wise sequential roll number generator for Admit Cards.
 *
 * Rules:
 * - LKG          -> L01, L02, ...
 * - UKG          -> U01, U02, ...
 * - Nursery/Play -> N01, N02, ...
 * - Class 1st    -> 101, 102, ...
 * - Class 2nd    -> 201, 202, ...
 * - Class 3rd    -> 301, 302, ...
 * - Class 4th    -> 401, 402, ...
 * - Class 5th    -> 501, 502, ...
 * - Class 6th    -> 601, 602, ...
 * - Class 7th    -> 701, 702, ...
 * - Class 8th    -> 801, 802, ...
 * - Class 9th    -> 901, 902, ...
 * - Class 10th   -> 1001, 1002, ...
 * - Class 11th   -> 1101, 1102, ...
 * - Class 12th   -> 1201, 1202, ...
 */

const ROMAN_CLASS_MAP: Record<string, number> = {
  xii: 12,
  xi: 11,
  x: 10,
  ix: 9,
  viii: 8,
  vii: 7,
  vi: 6,
  v: 5,
  iv: 4,
  iii: 3,
  ii: 2,
  i: 1,
}

export interface RollNoRule {
  type: 'prefix' | 'numeric'
  prefix?: string
  baseNumber?: number
  startLabel: string
}

export function resolveClassRollNoRule(courseName?: string | null): RollNoRule {
  const name = (courseName || '').toLowerCase().trim()

  if (/\bl\.?\s*k\.?\s*g\b|lower\s*kg/.test(name)) {
    return { type: 'prefix', prefix: 'L', startLabel: 'L01' }
  }
  if (/\bu\.?\s*k\.?\s*g\b|upper\s*kg/.test(name)) {
    return { type: 'prefix', prefix: 'U', startLabel: 'U01' }
  }
  if (/\bnursery\b|\bplay\s*group\b|\bplay\b/.test(name)) {
    return { type: 'prefix', prefix: 'N', startLabel: 'N01' }
  }

  // Match numeric class (check 12, 11, 10 before single digits)
  const numMatch = name.match(/\b(12|11|10|9|8|7|6|5|4|3|2|1)(?:st|nd|rd|th)?\b/)
  if (numMatch) {
    const classNum = parseInt(numMatch[1], 10)
    const baseNumber = classNum * 100
    return { type: 'numeric', baseNumber, startLabel: `${baseNumber + 1}` }
  }

  // Match Roman numeral class (e.g. "Class I", "Class IV", "X")
  const romanMatch = name.match(/\b(xii|xi|x|ix|viii|vii|vi|v|iv|iii|ii|i)\b/)
  if (romanMatch && ROMAN_CLASS_MAP[romanMatch[1]]) {
    const classNum = ROMAN_CLASS_MAP[romanMatch[1]]
    const baseNumber = classNum * 100
    return { type: 'numeric', baseNumber, startLabel: `${baseNumber + 1}` }
  }

  // Fallback for any other custom course name
  return { type: 'prefix', prefix: 'R', startLabel: 'R01' }
}

/**
 * Generate a 0-indexed roll number for a student in a given class.
 * index = 0 -> first student (e.g. L01, U01, 101, ..., 1001)
 */
export function generateClassRollNumber(courseName: string | null | undefined, index: number): string {
  const seq = index + 1
  const rule = resolveClassRollNoRule(courseName)

  if (rule.type === 'prefix') {
    const numStr = seq < 10 ? `0${seq}` : `${seq}`
    return `${rule.prefix}${numStr}`
  }

  const base = rule.baseNumber || 100
  if (seq < 100) {
    return `${base + seq}`
  }
  // If a class ever exceeds 99 students, keep prefix digits + full sequence to avoid colliding with next class
  const classPrefix = Math.floor(base / 100)
  return `${classPrefix}${seq}`
}

/**
 * Format a preview range string for UI display (e.g. "L01 – L30" or "101 onwards").
 */
export function formatRollNoPreview(courseName: string | null | undefined, studentCount?: number): string {
  const first = generateClassRollNumber(courseName, 0)
  if (typeof studentCount === 'number' && studentCount > 0) {
    const last = generateClassRollNumber(courseName, studentCount - 1)
    return studentCount === 1 ? first : `${first} – ${last}`
  }
  return `${first} onwards`
}
