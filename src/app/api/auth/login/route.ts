import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signAccessToken, signRefreshToken, comparePassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const { email, password, role, tenantId } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const whereClause: any = { isActive: true }

        // Let user log in with email or phone (email field can hold phone number too)
        whereClause.OR = [
            { email: email.toLowerCase() },
            { phone: email },
            { email: email }, // preserve original casing too (in case stored differently)
        ]

        // If tenantId is explicitly provided (e.g., from a school-specific login page), scope to it.
        if (tenantId) {
            whereClause.tenantId = tenantId
        }

        // ── CRITICAL FIX: Use findMany instead of findFirst ──────────────────────
        // Multiple tenants can have admins with the SAME phone number.
        // findFirst would always return only the first DB match, making other
        // tenant admins unable to log in via phone.
        // Solution: Fetch ALL matching active users → verify password against each one.
        const candidates = await prisma.user.findMany({
            where: whereClause,
            include: {
                studentProfile: true,
                teacherProfile: true,
                parentProfile: true
            },
            // Order consistently: prioritize exact email match, then by creation order
            orderBy: { createdAt: 'asc' },
        })

        if (candidates.length === 0) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        // Try password against each candidate — first match wins
        let user: typeof candidates[0] | null = null
        for (const candidate of candidates) {
            const isValid = await comparePassword(password, candidate.password)
            if (isValid) {
                user = candidate
                break
            }
        }

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: user.tenantId }
        })

        const subscription = await prisma.subscription.findUnique({
            where: { tenantId: user.tenantId }
        })

        const payload = {
            userId: user.id,
            tenantId: user.tenantId,
            role: user.role,
            email: user.email,
            phone: user.phone || null,
        }

        const accessToken = signAccessToken(payload)
        const refreshToken = signRefreshToken(payload)

        await prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        })

        return NextResponse.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                tenantId: user.tenantId,
                phone: user.phone,
                studentId: user.studentProfile?.id || null,
                teacherProfile: user.teacherProfile || null,
                parentProfile: user.parentProfile || null,
            },
            tenant: tenant ? {
                id: tenant.id,
                name: tenant.name,
                logo: tenant.logo,
                themeColor: tenant.themeColor,
                phone: tenant.phone,
                address: tenant.address,
                email: tenant.email,
                schoolCode: tenant.schoolCode,
                registrationCode: tenant.registrationCode,
                diseCode: tenant.diseCode,
            } : null,
            subscription: subscription || null,
        })
    } catch (error) {
        console.error('Login error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
