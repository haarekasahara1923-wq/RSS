import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken, signAccessToken, signRefreshToken } from '@/lib/auth'

// GET /api/super-admin/switch-list
// Returns all super admins with their tenant info for switching
export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split(' ')[1]
        const payload = verifyAccessToken(token)

        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Only Super Admins can use this feature' }, { status: 403 })
        }

        // Fetch all super admins across all tenants (max 2 tenants)
        const superAdmins = await prisma.user.findMany({
            where: { role: 'SUPER_ADMIN', isActive: true },
            select: {
                id: true,
                name: true,
                email: true,
                tenantId: true,
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        schoolCode: true,
                        themeColor: true,
                    }
                }
            },
            orderBy: { createdAt: 'asc' },
        })

        return NextResponse.json({ success: true, superAdmins })
    } catch (error) {
        console.error('Switch list error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

// POST /api/super-admin/switch-list
// Switch to a different super admin session (returns new JWT for that admin)
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization')
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const token = authHeader.split(' ')[1]
        const payload = verifyAccessToken(token)

        if (!payload || payload.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Only Super Admins can switch accounts' }, { status: 403 })
        }

        const body = await req.json()
        const { targetUserId } = body

        if (!targetUserId) {
            return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 })
        }

        // Verify target user is a SUPER_ADMIN and exists
        const targetUser = await prisma.user.findFirst({
            where: { id: targetUserId, role: 'SUPER_ADMIN', isActive: true },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                        slug: true,
                        schoolCode: true,
                        themeColor: true,
                    }
                }
            }
        })

        if (!targetUser) {
            return NextResponse.json({ error: 'Super Admin not found' }, { status: 404 })
        }

        // Issue new tokens for the target super admin
        const newPayload = {
            userId: targetUser.id,
            tenantId: targetUser.tenantId,
            role: 'SUPER_ADMIN',
            email: targetUser.email,
        }

        const accessToken = signAccessToken(newPayload)
        const refreshToken = signRefreshToken(newPayload)

        // Fetch subscription for this tenant
        const subscription = await prisma.subscription.findFirst({
            where: { tenantId: targetUser.tenantId },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({
            success: true,
            accessToken,
            refreshToken,
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role: 'SUPER_ADMIN',
                tenantId: targetUser.tenantId,
            },
            tenant: {
                id: targetUser.tenant.id,
                name: targetUser.tenant.name,
                slug: targetUser.tenant.slug,
                schoolCode: targetUser.tenant.schoolCode,
                themeColor: targetUser.tenant.themeColor,
            },
            subscription: subscription ? {
                plan: subscription.plan,
                status: subscription.status,
                trialEndsAt: subscription.trialEndsAt,
            } : null,
        })
    } catch (error) {
        console.error('Switch admin error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
