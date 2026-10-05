import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

export async function PUT(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1]
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const user = verifyAccessToken(token)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { name, phone, email, address, themeColor, logo, registrationCode, diseCode } = body

        if (user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Only Super Admin can update school profile' }, { status: 403 })
        }

        const updatedTenant = await prisma.tenant.update({
            where: { id: user.tenantId },
            data: {
                name,
                phone,
                email,
                address,
                themeColor,
                registrationCode,
                diseCode,
                ...(logo ? { logo } : {})
            }
        })

        return NextResponse.json({ success: true, tenant: updatedTenant })
    } catch (error) {
        console.error('Profile update error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
