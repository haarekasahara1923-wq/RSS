import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, signAccessToken, signRefreshToken } from '@/lib/auth'

function generateAffiliateCode(name: string) {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'AFF')
    const random = Math.floor(1000 + Math.random() * 9000)
    return `${prefix}${random}`
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()
        const { name, email, phone, password, bankAccountNumber, ifscCode, upiId } = body

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email and password are required' }, { status: 400 })
        }

        const existingAffiliate = await prisma.affiliate.findUnique({ where: { email: email.toLowerCase() } })
        if (existingAffiliate) {
            return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
        }

        let affiliateCode = generateAffiliateCode(name)
        let codeExists = await prisma.affiliate.findUnique({ where: { affiliateCode } })
        while (codeExists) {
            affiliateCode = generateAffiliateCode(name)
            codeExists = await prisma.affiliate.findUnique({ where: { affiliateCode } })
        }

        const hashedPassword = await hashPassword(password)

        const affiliate = await prisma.affiliate.create({
            data: {
                name,
                email: email.toLowerCase(),
                phone: phone || null,
                password: hashedPassword,
                plainPassword: password, // Store plain password for super admin as requested
                affiliateCode,
                bankAccountNumber: bankAccountNumber || null,
                ifscCode: ifscCode || null,
                upiId: upiId || null,
                status: 'ACTIVE',
            }
        })

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
            message: 'Affiliate Registration successful!',
            accessToken,
            refreshToken,
            user: {
                id: affiliate.id,
                name: affiliate.name,
                email: affiliate.email,
                role: 'AFFILIATE',
                affiliateCode: affiliate.affiliateCode,
            }
        }, { status: 201 })
    } catch (error) {
        console.error('Affiliate Register error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
