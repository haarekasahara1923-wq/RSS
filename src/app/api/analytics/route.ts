import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireFeature } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    // Ensure they have the analytics feature
    const featureCheck = await requireFeature(req, 'analytics')
    if (featureCheck.error) return featureCheck.error

    const { targetTenantId } = Object.fromEntries(new URL(req.url).searchParams.entries())

    // If super admin requests specific tenant data
    let tenantId = user!.tenantId
    if (user!.role === 'SUPER_ADMIN' && targetTenantId) {
        tenantId = targetTenantId
    }

    try {
        const [
            totalStudents,
            activeStudents,
            revenueData,
            leadsCount
        ] = await Promise.all([
            prisma.student.count({ where: { tenantId } }),
            prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
            prisma.payment.aggregate({ _sum: { amount: true }, where: { tenantId } }),
            prisma.lead.count({ where: { tenantId } })
        ])

        const totalRevenue = revenueData._sum.amount || 0

        return NextResponse.json({
            success: true,
            data: {
                overview: {
                    totalStudents,
                    activeStudents,
                    totalRevenue,
                    totalLeads: leadsCount
                },
                revenueTrend: [],
                leadFunnel: [],
                recentPayments: []
            }
        })
    } catch (err) {
        console.error('Analytics fetch error:', err)
        return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
    }
}
