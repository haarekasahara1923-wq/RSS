import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

function getUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    return verifyAccessToken(authHeader.split(' ')[1])
}

export async function POST(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { plan, cost } = await req.json()
        if (!plan || !cost || cost <= 0) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

        const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId },
            include: { subscriptions: true }
        })

        if (!tenant) return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })

        if (tenant.availableBalance < cost) {
            return NextResponse.json({ error: 'Insufficient affiliate balance' }, { status: 400 })
        }

        const currentSub = tenant.subscriptions[0]

        await prisma.tenant.update({
            where: { id: user.tenantId },
            data: { availableBalance: { decrement: cost } }
        })

        const start = new Date()
        const end = new Date()
        end.setMonth(end.getMonth() + 1)

        if (currentSub) {
            await prisma.subscription.update({
                where: { id: currentSub.id },
                data: { plan, status: 'ACTIVE', amount: cost, currentPeriodStart: start, currentPeriodEnd: end }
            })
        } else {
            await prisma.subscription.create({
                data: { tenantId: user.tenantId, plan, status: 'ACTIVE', amount: cost, currentPeriodStart: start, currentPeriodEnd: end }
            })
        }

        await prisma.affiliateWithdrawal.create({
            data: { tenantId: user.tenantId, amount: cost, status: 'PAID', notes: `Paid for ${plan} plan subscription` }
        })

        return NextResponse.json({ success: true, message: 'Subscription updated successfully' })
    } catch (error) {
        console.error('Pay subscription error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
