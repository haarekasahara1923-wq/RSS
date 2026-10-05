import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

// Pay Affiliate Payout API
export async function POST(req: NextRequest) {
    const { error } = requireRole(req, ['SUPER_ADMIN'])
    if (error) return error

    try {
        const { payoutId, transactionReference } = await req.json()

        if (!payoutId || !transactionReference) {
            return NextResponse.json({ error: 'Payout ID and Transaction Reference required' }, { status: 400 })
        }

        const payout = await prisma.affiliatePayout.findUnique({ where: { id: payoutId } })
        if (!payout) return NextResponse.json({ error: 'Payout not found' }, { status: 404 })
        if (payout.payoutStatus === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

        await prisma.$transaction(async (tx) => {
            await tx.affiliatePayout.update({
                where: { id: payoutId },
                data: {
                    payoutStatus: 'PAID',
                    payoutDate: new Date(),
                    transactionReference,
                }
            })

            // Mark individual commission records as PAID for this month
            await tx.affiliateSubscriptionCommission.updateMany({
                where: { affiliateId: payout.affiliateId, month: payout.month, status: 'APPROVED' },
                data: { status: 'PAID' }
            })

            await tx.affiliateMarketplaceCommission.updateMany({
                where: { affiliateId: payout.affiliateId, month: payout.month, status: 'APPROVED' },
                data: { status: 'PAID' }
            })
        })

        return NextResponse.json({ success: true, message: 'Payout marked as PAID successfully' })

    } catch (err: any) {
        console.error('Error paying affiliate:', err)
        return NextResponse.json({ error: 'Internal server error completing payout' }, { status: 500 })
    }
}
