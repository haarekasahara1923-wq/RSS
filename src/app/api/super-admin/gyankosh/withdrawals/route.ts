import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

function getUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    return verifyAccessToken(authHeader.split(' ')[1])
}

export async function GET(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const list = await prisma.affiliateWithdrawal.findMany({
            include: { tenant: true },
            orderBy: { requestedAt: 'desc' }
        })
        return NextResponse.json(list)
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const { id, status } = await req.json()
        const record = await prisma.affiliateWithdrawal.update({
            where: { id },
            data: {
                status,
                processedAt: status === 'PAID' || status === 'REJECTED' ? new Date() : undefined
            }
        })

        if (status === 'REJECTED') {
            await prisma.tenant.update({
                where: { id: record.tenantId },
                data: { availableBalance: { increment: record.amount } }
            })
        }

        return NextResponse.json(record)
    } catch (error) {
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
