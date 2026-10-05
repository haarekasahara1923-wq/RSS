import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const DOOPER_JWT_SECRET = process.env.DOOPER_JWT_SECRET || process.env.JWT_SECRET || 'dooper-fallback-secret'

function verifyDooperToken(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    try {
        const payload = jwt.verify(authHeader.split(' ')[1], DOOPER_JWT_SECRET) as any
        if (payload.role !== 'DOOPER_ADMIN') return null
        return payload
    } catch {
        return null
    }
}

// GET — fetch all tenants (schools) with full signup data
export async function GET(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const tenants = await prisma.tenant.findMany({
            include: {
                users: {
                    where: { role: 'SUPER_ADMIN' },
                    select: { id: true, name: true, email: true, phone: true, plainPassword: true, createdAt: true, isActive: true }
                },
                subscriptions: true,
                _count: { select: { students: true, users: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        const formatted = tenants.map(t => {
            const superAdmin = t.users[0]
            const sub = t.subscriptions[0]
            return {
                id: t.id,
                name: t.name,
                slug: t.slug,
                schoolCode: t.schoolCode || null,
                registrationCode: t.registrationCode || null,
                diseCode: t.diseCode || null,
                email: t.email,
                phone: t.phone,
                address: t.address,
                isActive: t.isActive,
                createdAt: t.createdAt,
                directorName: t.directorName || superAdmin?.name || '—',
                directorPhone: t.directorPhone || superAdmin?.phone || '—',
                directorEmail: t.directorEmail || superAdmin?.email || '—',
                superAdminEmail: superAdmin?.email || '—',
                superAdminPassword: superAdmin?.plainPassword || '—',
                superAdminName: superAdmin?.name || '—',
                superAdminId: superAdmin?.id || null,
                studentCount: t._count.students,
                userCount: t._count.users,
                plan: sub?.plan || 'FREE',
                subscriptionStatus: sub?.status || 'TRIAL',
                trialEndsAt: t.trialEndsAt,
            }
        })

        const stats = {
            totalSchools: tenants.length,
            activeSchools: tenants.filter(t => t.isActive).length,
            blockedSchools: tenants.filter(t => !t.isActive).length,
            totalStudents: tenants.reduce((s, t) => s + t._count.students, 0),
        }

        return NextResponse.json({ tenants: formatted, stats })
    } catch (error) {
        console.error('Dooper tenants fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch tenants' }, { status: 500 })
    }
}

// PUT — edit, block, or unblock a tenant
export async function PUT(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { tenantId, action } = body

        if (!tenantId) {
            return NextResponse.json({ error: 'tenantId is required' }, { status: 400 })
        }

        if (action === 'block') {
            await prisma.tenant.update({ where: { id: tenantId }, data: { isActive: false } })
            return NextResponse.json({ success: true, message: 'School blocked' })
        }

        if (action === 'unblock') {
            await prisma.tenant.update({ where: { id: tenantId }, data: { isActive: true } })
            return NextResponse.json({ success: true, message: 'School unblocked' })
        }

        if (action === 'edit') {
            const { name, email, phone, address, directorName, directorPhone, directorEmail } = body
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { name, email, phone, address, directorName, directorPhone, directorEmail }
            })
            return NextResponse.json({ success: true, message: 'School updated' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Dooper tenant update error:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// DELETE — delete a tenant and all its data
export async function DELETE(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })

        await prisma.$transaction(async (tx) => {
            await tx.pushSubscription.deleteMany({ where: { tenantId: id } })
            await tx.auditLog.deleteMany({ where: { tenantId: id } })
            await tx.notification.deleteMany({ where: { tenantId: id } })
            await tx.chatMessage.deleteMany({ where: { tenantId: id } })
            await tx.homeworkSubmission.deleteMany({ where: { tenantId: id } })
            await tx.homework.deleteMany({ where: { tenantId: id } })
            await tx.examResult.deleteMany({ where: { tenantId: id } })
            await tx.exam.deleteMany({ where: { tenantId: id } })
            await tx.result.deleteMany({ where: { tenantId: id } })
            await tx.question.deleteMany({ where: { tenantId: id } })
            await tx.mockTest.deleteMany({ where: { tenantId: id } })
            await tx.transportLog.deleteMany({ where: { tenantId: id } })
            await tx.vehicleLocation.deleteMany({ where: { tenantId: id } })
            await tx.driverProfile.deleteMany({ where: { tenantId: id } })
            await tx.vehicle.deleteMany({ where: { tenantId: id } })
            await tx.attendance.deleteMany({ where: { tenantId: id } })
            await tx.parentProfile.deleteMany({ where: { tenantId: id } })
            await tx.payment.deleteMany({ where: { tenantId: id } })
            await tx.fee.deleteMany({ where: { tenantId: id } })
            await tx.student.deleteMany({ where: { tenantId: id } })
            await tx.teacher.deleteMany({ where: { tenantId: id } })
            await tx.lead.deleteMany({ where: { tenantId: id } })
            await tx.expense.deleteMany({ where: { tenantId: id } })
            await tx.batch.deleteMany({ where: { tenantId: id } })
            await tx.course.deleteMany({ where: { tenantId: id } })
            await tx.branch.deleteMany({ where: { tenantId: id } })
            await tx.subscription.deleteMany({ where: { tenantId: id } })
            await tx.affiliateWithdrawal.deleteMany({ where: { tenantId: id } })
            await tx.user.deleteMany({ where: { tenantId: id } })
            await tx.tenant.delete({ where: { id } })
        })

        return NextResponse.json({ success: true, message: 'School and all data deleted successfully' })
    } catch (error) {
        console.error('Dooper delete tenant error:', error)
        return NextResponse.json({ error: 'Failed to delete school' }, { status: 500 })
    }
}
