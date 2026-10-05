import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireRole(req, ['AFFILIATE'])
    if (error) return error

    try {
        const affiliateId = user!.userId

        const affiliate = await prisma.affiliate.findUnique({
            where: { id: affiliateId },
            include: {
                referrals: { include: { tenant: true } },
                subscriptionCommissions: true,
                marketplaceCommissions: { include: { order: true } },
                payouts: true,
            }
        })

        if (!affiliate) {
            return NextResponse.json({ error: 'Affiliate not found' }, { status: 404 })
        }

        const totalReferred = affiliate.referrals.length
        const activeTenants = affiliate.referrals.filter(r => r.status === 'ACTIVE').length

        const subCommissionEarned = affiliate.subscriptionCommissions.reduce((sum, c) => sum + c.commissionAmount, 0)
        const mktCommissionEarned = affiliate.marketplaceCommissions.reduce((sum, c) => sum + c.commissionAmount, 0)

        const totalEarned = subCommissionEarned + mktCommissionEarned
        const pendingPayouts = affiliate.payouts.filter(p => p.payoutStatus === 'PENDING').reduce((sum, p) => sum + p.totalPayoutAmount, 0)
        const paidPayouts = affiliate.payouts.filter(p => p.payoutStatus === 'PAID').reduce((sum, p) => sum + p.totalPayoutAmount, 0)

        // Generate monthly earnings array
        const monthlyEarningsData: Record<string, { month: string, sub: number, mkt: number, total: number }> = {}

        affiliate.subscriptionCommissions.forEach(c => {
            if (!monthlyEarningsData[c.month]) monthlyEarningsData[c.month] = { month: c.month, sub: 0, mkt: 0, total: 0 }
            monthlyEarningsData[c.month].sub += c.commissionAmount
            monthlyEarningsData[c.month].total += c.commissionAmount
        })

        affiliate.marketplaceCommissions.forEach(c => {
            if (!monthlyEarningsData[c.month]) monthlyEarningsData[c.month] = { month: c.month, sub: 0, mkt: 0, total: 0 }
            monthlyEarningsData[c.month].mkt += c.commissionAmount
            monthlyEarningsData[c.month].total += c.commissionAmount
        })

        const monthlyEarnings = Object.values(monthlyEarningsData).sort((a, b) => b.month.localeCompare(a.month))

        return NextResponse.json({
            success: true,
            affiliateCode: affiliate.affiliateCode,
            stats: {
                totalReferred,
                activeTenants,
                subCommissionEarned,
                mktCommissionEarned,
                totalEarned,
                pendingPayouts,
                paidPayouts
            },
            monthlyEarnings,
            payouts: affiliate.payouts,
            referrals: affiliate.referrals.map(r => ({
                id: r.id,
                tenantName: r.tenant.name,
                referralDate: r.referralDate,
                status: r.status,
            }))
        })

    } catch (err: any) {
        console.error('Affiliate Dashboard Error:', err)
        return NextResponse.json({ error: 'Internal server error fetching data' }, { status: 500 })
    }
}
