import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { buildPnL, todayIST, fyStart } from '@/lib/accounts'

const isDay = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const sp = new URL(req.url).searchParams
        const to = isDay(sp.get('to')) ? sp.get('to')! : todayIST()
        const from = isDay(sp.get('from')) ? sp.get('from')! : fyStart(to)
        if (from > to) return NextResponse.json({ error: '"From" date must be before "To" date' }, { status: 400 })

        const data = await buildPnL(user!.tenantId, from, to)
        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('P&L error:', err)
        return NextResponse.json({ error: 'Failed to build P&L statement' }, { status: 500 })
    }
}
