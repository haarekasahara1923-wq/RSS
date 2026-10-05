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

        const { amount } = await req.json()
        if (amount <= 0) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

        const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } })
        if (!tenant || tenant.availableBalance < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 })
        }

        await prisma.tenant.update({
            where: { id: user.tenantId },
            data: { availableBalance: { decrement: amount } }
        })

        const withdrawal = await prisma.affiliateWithdrawal.create({
            data: {
                tenantId: user.tenantId,
                amount,
                status: 'PENDING'
            }
        })

        return NextResponse.json(withdrawal)
    } catch (error) {
        console.error('Withdraw error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
