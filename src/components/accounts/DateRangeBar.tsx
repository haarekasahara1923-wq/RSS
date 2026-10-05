'use client'

/** Local (browser) YYYY-MM-DD */
export function localDay(d: Date = new Date()): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
}

export function fyStartDay(d: Date = new Date()): string {
    const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
    return `${y}-04-01`
}

export function prettyDay(day: string): string {
    if (!day) return ''
    const [y, m, d] = day.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'lastMonth' | 'fy' | 'all'

export function presetRange(p: RangePreset): { from: string; to: string } {
    const now = new Date()
    const today = localDay(now)
    switch (p) {
        case 'today': return { from: today, to: today }
        case 'yesterday': {
            const y = new Date(now); y.setDate(y.getDate() - 1)
            return { from: localDay(y), to: localDay(y) }
        }
        case 'week': {
            const s = new Date(now); s.setDate(s.getDate() - 6)
            return { from: localDay(s), to: today }
        }
        case 'month': return { from: localDay(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
        case 'lastMonth': return {
            from: localDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
            to: localDay(new Date(now.getFullYear(), now.getMonth(), 0)),
        }
        case 'fy': return { from: fyStartDay(now), to: today }
        case 'all': return { from: '2000-01-01', to: today }
    }
}

const PRESETS: { key: RangePreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'week', label: 'Last 7 Days' },
    { key: 'month', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
    { key: 'fy', label: 'This FY' },
    { key: 'all', label: 'All Time' },
]

export default function DateRangeBar({
    from, to, onChange, presets = PRESETS.map(p => p.key), right,
}: {
    from: string
    to: string
    onChange: (r: { from: string; to: string }) => void
    presets?: RangePreset[]
    right?: React.ReactNode
}) {
    const active = PRESETS.find(p => {
        const r = presetRange(p.key)
        return r.from === from && r.to === to
    })?.key

    return (
        <div className="acc-range-bar">
            <div className="acc-range-dates">
                <label className="acc-date-field">
                    <span>📅 From</span>
                    <input id="range-from" type="date" className="input" value={from} max={to}
                        onChange={e => e.target.value && onChange({ from: e.target.value, to })} />
                </label>
                <label className="acc-date-field">
                    <span>📅 To</span>
                    <input id="range-to" type="date" className="input" value={to} min={from} max={localDay()}
                        onChange={e => e.target.value && onChange({ from, to: e.target.value })} />
                </label>
            </div>
            <div className="acc-presets">
                {PRESETS.filter(p => presets.includes(p.key)).map(p => (
                    <button key={p.key} id={`preset-${p.key}`} type="button"
                        className={`acc-chip ${active === p.key ? 'active' : ''}`}
                        onClick={() => onChange(presetRange(p.key))}>
                        {p.label}
                    </button>
                ))}
            </div>
            {right && <div className="acc-range-right">{right}</div>}
        </div>
    )
}
