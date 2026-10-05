import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { dayStart, toISTDay } from '@/lib/accounts'

const ALLOWED = ['SUPER_ADMIN', 'COACHING_ADMIN']

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    const t = await prisma.tenant.findUnique({
        where: { id: user!.tenantId },
        select: { ledgerOpeningBalance: true, ledgerOpeningDate: true },
    })
    return NextResponse.json({
        success: true,
        data: {
            openingBalance: t?.ledgerOpeningBalance || 0,
            openingDate: t?.ledgerOpeningDate ? toISTDay(t.ledgerOpeningDate) : null,
        }
    })
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    if (!ALLOWED.includes(user!.role)) {
        return NextResponse.json({ error: 'Only the school admin can change the opening balance' }, { status: 403 })
    }
    try {
        const { openingBalance, openingDate } = await req.json()
        const bal = parseFloat(openingBalance)
        if (isNaN(bal)) return NextResponse.json({ error: 'Invalid opening balance' }, { status: 400 })
        await prisma.tenant.update({
            where: { id: user!.tenantId },
            data: {
                ledgerOpeningBalance: bal,
                ledgerOpeningDate: openingDate ? dayStart(String(openingDate).slice(0, 10)) : null,
            }
        })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Ledger settings error:', err)
        return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }
}
