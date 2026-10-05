import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

function getUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    return verifyAccessToken(authHeader.split(' ')[1])
}

// GET - Fetch all tenants
export async function GET(req: NextRequest) {
    return NextResponse.json({ error: 'Forbidden. Use Dooper Admin Panel for platform management.' }, { status: 403 })
}

// PUT - Block/Unblock tenant or Mark subscription as paid
export async function PUT(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { tenantId, action, plan } = await req.json()

        if (action === 'block') {
            await prisma.tenant.update({ where: { id: tenantId }, data: { isActive: false } })
            return NextResponse.json({ success: true, message: 'Tenant blocked' })
        }

        if (action === 'unblock') {
            await prisma.tenant.update({ where: { id: tenantId }, data: { isActive: true } })
            return NextResponse.json({ success: true, message: 'Tenant unblocked' })
        }

        if (action === 'mark_paid') {
            const start = new Date()
            const end = new Date()
            end.setMonth(end.getMonth() + 1)
            const selectedPlan = plan || 'BASIC'

            const existing = await prisma.subscription.findFirst({ where: { tenantId } })
            if (existing) {
                await prisma.subscription.update({
                    where: { id: existing.id },
                    data: { plan: selectedPlan, status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: end }
                })
            } else {
                await prisma.subscription.create({
                    data: { tenantId, plan: selectedPlan, status: 'ACTIVE', currentPeriodStart: start, currentPeriodEnd: end }
                })
            }
            return NextResponse.json({ success: true, message: 'Subscription marked as paid' })
        }

        if (action === 'edit') {
            const { name, email, phone, address, upiId } = await req.json()
            await prisma.tenant.update({
                where: { id: tenantId },
                data: { name, email, phone, address, upiId }
            })
            return NextResponse.json({ success: true, message: 'Tenant updated' })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Super admin action error:', error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization')
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        const user = verifyAccessToken(authHeader.split(' ')[1])
        
        if (!user || user.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }

        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })

        // Use transaction to delete tenant and its related records
        await prisma.$transaction([
            prisma.subscription.deleteMany({ where: { tenantId: id } }),
            prisma.user.deleteMany({ where: { tenantId: id } }),
            prisma.student.deleteMany({ where: { tenantId: id } }),
            prisma.payment.deleteMany({ where: { tenantId: id } }),
            prisma.attendance.deleteMany({ where: { tenantId: id } }),
            prisma.expense.deleteMany({ where: { tenantId: id } }),
            prisma.lead.deleteMany({ where: { tenantId: id } }),
            prisma.mockTest.deleteMany({ where: { tenantId: id } }),
            prisma.tenant.delete({ where: { id } })
        ])

        return NextResponse.json({ success: true, message: 'Tenant and all associated data deleted' })
    } catch (error) {
        console.error('Super admin delete tenant error:', error)
        return NextResponse.json({ error: 'Failed to delete tenant' }, { status: 500 })
    }
}
