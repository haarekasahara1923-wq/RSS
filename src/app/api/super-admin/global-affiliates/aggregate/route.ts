import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const { error, user } = requireRole(req, ['SUPER_ADMIN'])
    if (error) return error

    try {
        const body = await req.json()
        const targetMonth = body.month // Format: 'YYYY-MM' e.g. '2025-05'. Default is previous month.

        let monthStr = targetMonth;
        if (!monthStr) {
            const date = new Date();
            date.setMonth(date.getMonth() - 1); // Previous month
            monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        }

        // Get all pending subscription commissions for this month
        const pendingSubscriptions = await prisma.affiliateSubscriptionCommission.findMany({
            where: { month: monthStr, status: 'PENDING' }
        });

        // Get all pending marketplace commissions for this month
        const pendingMarketplaces = await prisma.affiliateMarketplaceCommission.findMany({
            where: { month: monthStr, status: 'PENDING' }
        });

        const affiliateTotals: Record<string, {
            subTotal: number,
            mktTotal: number
        }> = {};

        pendingSubscriptions.forEach(c => {
            if (!affiliateTotals[c.affiliateId]) affiliateTotals[c.affiliateId] = { subTotal: 0, mktTotal: 0 };
            affiliateTotals[c.affiliateId].subTotal += c.commissionAmount;
        });

        pendingMarketplaces.forEach(c => {
            if (!affiliateTotals[c.affiliateId]) affiliateTotals[c.affiliateId] = { subTotal: 0, mktTotal: 0 };
            affiliateTotals[c.affiliateId].mktTotal += c.commissionAmount;
        });

        let payoutsCreated = 0;

        await prisma.$transaction(async (tx) => {
            for (const affiliateId of Object.keys(affiliateTotals)) {
                const subTotal = affiliateTotals[affiliateId].subTotal;
                const mktTotal = affiliateTotals[affiliateId].mktTotal;
                const total = subTotal + mktTotal;

                if (total > 0) {
                    // Create payout record
                    await tx.affiliatePayout.create({
                        data: {
                            affiliateId,
                            month: monthStr,
                            totalSubscriptionCommission: subTotal,
                            totalMarketplaceCommission: mktTotal,
                            totalPayoutAmount: total,
                            payoutStatus: 'PENDING'
                        }
                    });
                    payoutsCreated++;

                    // Mark individual records as APPROVED
                    await tx.affiliateSubscriptionCommission.updateMany({
                        where: { affiliateId, month: monthStr, status: 'PENDING' },
                        data: { status: 'APPROVED' }
                    });

                    await tx.affiliateMarketplaceCommission.updateMany({
                        where: { affiliateId, month: monthStr, status: 'PENDING' },
                        data: { status: 'APPROVED' }
                    });
                }
            }
        });

        return NextResponse.json({ success: true, message: `Aggregated ${payoutsCreated} payouts for ${monthStr}` });

    } catch (err: any) {
        console.error('Affiliate Aggregation Error:', err)
        return NextResponse.json({ error: 'Internal server error aggregating payouts' }, { status: 500 })
    }
}
