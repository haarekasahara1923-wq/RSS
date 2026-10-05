import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { buildLedger, todayIST, fyStart } from '@/lib/accounts'

const isDay = (s: string | null) => !!s && /^\d{4}-\d{2}-\d{2}$/.test(s)

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const sp = new URL(req.url).searchParams
        const today = todayIST()
        const to = isDay(sp.get('to')) ? sp.get('to')! : today
        const from = isDay(sp.get('from')) ? sp.get('from')! : fyStart(to)
        if (from > to) return NextResponse.json({ error: '"From" date must be before "To" date' }, { status: 400 })

        const data = await buildLedger(user!.tenantId, from, to)
        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('Ledger error:', err)
        return NextResponse.json({ error: 'Failed to build ledger' }, { status: 500 })
    }
}
