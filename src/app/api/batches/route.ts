import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const batches = await prisma.batch.findMany({
            where: { tenantId: user!.tenantId, isActive: true },
            include: {
                course: { select: { name: true } },
                _count: { select: { students: true } }
            },
            orderBy: { createdAt: 'desc' }
        })
        const data = batches.map(b => ({
            ...b,
            courseName: b.course.name,
            studentCount: b._count.students,
        }))
        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('Fetch batches error:', err)
        return NextResponse.json({ error: 'Failed to fetch batches' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const body = await req.json()
        const batch = await prisma.batch.create({
            data: {
                tenantId: user!.tenantId,
                courseId: body.courseId,
                name: body.name,
                startTime: body.startTime || '',
                endTime: body.endTime || '',
                capacity: parseInt(body.capacity) || 30,
                isActive: true,
            }
        })
        return NextResponse.json({ success: true, data: batch }, { status: 201 })
    } catch (err) {
        console.error('Create batch error:', err)
        return NextResponse.json({ error: 'Failed to create batch' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const body = await req.json()
        const { id, name, courseId, startTime, endTime, capacity } = body
        if (!id) return NextResponse.json({ error: 'Batch ID missing' }, { status: 400 })

        const batch = await prisma.batch.update({
            where: { id, tenantId: user!.tenantId },
            data: {
                name,
                courseId,
                startTime: startTime !== undefined ? startTime : undefined,
                endTime: endTime !== undefined ? endTime : undefined,
                capacity: capacity !== undefined ? parseInt(capacity) : undefined
            }
        })
        return NextResponse.json({ success: true, data: batch })
    } catch (err) {
        console.error('Update batch error:', err)
        return NextResponse.json({ error: 'Failed to update batch' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Batch ID missing' }, { status: 400 })

        // Check active students
        const studentCount = await prisma.student.count({
            where: { batchId: id, tenantId: user!.tenantId }
        })

        if (studentCount > 0) {
            return NextResponse.json({ error: 'Cannot delete batch with active students.' }, { status: 400 })
        }

        await prisma.batch.update({
            where: { id, tenantId: user!.tenantId },
            data: { isActive: false }
        })
        return NextResponse.json({ success: true, message: 'Batch deleted successfully' })
    } catch (err) {
        console.error('Delete batch error:', err)
        return NextResponse.json({ error: 'Failed to delete batch' }, { status: 500 })
    }
}
