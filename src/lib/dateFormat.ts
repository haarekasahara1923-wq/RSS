export function formatDateDDMMYYYY(d: string | Date | null | undefined, fallback = '—'): string {
  if (!d) return fallback
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return fallback
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
