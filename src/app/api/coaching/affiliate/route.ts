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
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const [details, withdrawals] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: user.tenantId } }),
            prisma.affiliateWithdrawal.findMany({ where: { tenantId: user.tenantId }, orderBy: { requestedAt: 'desc' } })
        ])

        return NextResponse.json({ details, withdrawals })
    } catch (error) {
        console.error('Affiliate GET error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
