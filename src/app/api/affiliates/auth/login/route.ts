import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, comparePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const affiliate = await prisma.affiliate.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!affiliate || affiliate.status !== 'ACTIVE') {
            return NextResponse.json({ error: 'Invalid credentials or inactive account' }, { status: 401 })
        }

        const isValid = await comparePassword(password, affiliate.password)
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const payload = {
            userId: affiliate.id,
            tenantId: 'GLOBAL_AFFILIATE',
            role: 'AFFILIATE',
            email: affiliate.email,
        }

        const accessToken = signAccessToken(payload)
        const refreshToken = signRefreshToken(payload)

        return NextResponse.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: affiliate.id,
                name: affiliate.name,
                email: affiliate.email,
                role: 'AFFILIATE',
                affiliateCode: affiliate.affiliateCode,
            }
        })
    } catch (error) {
        console.error('Affiliate Login error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
