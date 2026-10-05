import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess, checkPlanLimit } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        console.log(`[API GET /teachers] Fetching teachers for tenant: ${user!.tenantId}`)
        const teachers = await prisma.teacher.findMany({
            where: { tenantId: user!.tenantId },
            orderBy: { createdAt: 'desc' }
        })
        console.log(`[API GET /teachers] Found ${teachers.length} teachers`)

        // Include plan limit info in response
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxTeachers', teachers.length)

        return NextResponse.json({
            success: true,
            data: teachers,
            total: teachers.length,
            planInfo: {
                limit: limitCheck.limit,
                used: teachers.length,
                currentPlan: limitCheck.currentPlan,
                canAdd: limitCheck.allowed,
            },
        })
    } catch (err) {
        console.error('Fetch teachers error:', err)
        return NextResponse.json({ error: 'Failed to fetch teachers' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        // Check plan limit before adding
        const currentCount = await prisma.teacher.count({ where: { tenantId: user!.tenantId } })
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxTeachers', currentCount)

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.message,
                code: 'PLAN_LIMIT_REACHED',
                currentPlan: limitCheck.currentPlan,
                limit: limitCheck.limit,
                used: currentCount,
            }, { status: 403 })
        }

        const body = await req.json()
        console.log('[API POST /teachers] Received payload:', body)
        const { name, email, phone, subject, salary, joinDate } = body

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
        }

        const teacher = await prisma.teacher.create({
            data: {
                tenantId: user!.tenantId,
                name,
                email: email || '',
                phone,
                subject: Array.isArray(subject) ? subject : subject ? [subject] : [],
                salary: parseFloat(salary) || 0,
                joinDate: joinDate ? new Date(joinDate) : new Date(),
                isActive: true,
            }
        })
        console.log('[API POST /teachers] Successfully created teacher:', teacher.id)

        return NextResponse.json({ success: true, data: teacher }, { status: 201 })
    } catch (err: any) {
        console.error('Create teacher error:', err)
        return NextResponse.json({ error: `Failed to create teacher: ${err?.message || 'Unknown error'}` }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const body = await req.json()
        const { id, name, email, phone, subject, salary, joinDate, isActive } = body

        if (!id) return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 })

        const teacher = await prisma.teacher.update({
            where: { id, tenantId: user!.tenantId },
            data: {
                name,
                email,
                phone,
                subject: Array.isArray(subject) ? subject : subject ? [subject] : undefined,
                salary: salary !== undefined ? parseFloat(salary) : undefined,
                joinDate: joinDate ? new Date(joinDate) : undefined,
                isActive: isActive !== undefined ? isActive : undefined,
            }
        })

        return NextResponse.json({ success: true, data: teacher })
    } catch (err) {
        console.error('Update teacher error:', err)
        return NextResponse.json({ error: 'Failed to update teacher' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Teacher ID is required' }, { status: 400 })

        await prisma.teacher.delete({
            where: { id, tenantId: user!.tenantId }
        })

        return NextResponse.json({ success: true, message: 'Teacher deleted' })
    } catch (err) {
        console.error('Delete teacher error:', err)
        return NextResponse.json({ error: 'Failed to delete teacher' }, { status: 500 })
    }
}
