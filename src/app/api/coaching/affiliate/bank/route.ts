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

        const { upiId, bankAccountNo, ifscCode } = await req.json()

        await prisma.tenant.update({
            where: { id: user.tenantId },
            data: { upiId, bankAccountNo, ifscCode }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Bank update error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}
