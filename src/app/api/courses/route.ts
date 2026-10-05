import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const data = await prisma.course.findMany({
            where: { tenantId: user!.tenantId, isActive: true },
            orderBy: { createdAt: 'desc' }
        })
        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('Fetch courses error:', err)
        return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const body = await req.json()
        const course = await prisma.course.create({
            data: {
                tenantId: user!.tenantId,
                name: body.name,
                description: body.description || '',
                duration: body.duration || '',
                fees: parseFloat(body.fees) || 0,
                subjects: body.subjects || [],
                classGroup: body.classGroup || null,
                subjectGroup: body.subjectGroup || null,
                installmentCount: parseInt(body.installmentCount) || 1,
                isActive: true,
            }
        })
        return NextResponse.json({ success: true, data: course }, { status: 201 })
    } catch (err) {
        console.error('Create course error:', err)
        return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const body = await req.json()
        const { id, name, description, duration, fees, subjects, classGroup, subjectGroup, installmentCount } = body
        if (!id) return NextResponse.json({ error: 'Course ID missing' }, { status: 400 })

        const course = await prisma.course.update({
            where: { id, tenantId: user!.tenantId },
            data: {
                name,
                description,
                duration,
                fees: fees !== undefined ? parseFloat(fees) : undefined,
                subjects: subjects ? subjects : undefined,
                classGroup: classGroup !== undefined ? classGroup : undefined,
                subjectGroup: subjectGroup !== undefined ? subjectGroup : undefined,
                installmentCount: installmentCount !== undefined ? parseInt(installmentCount) : undefined
            }
        })
        return NextResponse.json({ success: true, data: course })
    } catch (err) {
        console.error('Update course error:', err)
        return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error
    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Course ID missing' }, { status: 400 })

        // Check if there are active students in this course
        const studentCount = await prisma.student.count({
            where: { courseId: id, tenantId: user!.tenantId }
        })

        if (studentCount > 0) {
            return NextResponse.json({ error: 'Cannot delete course with active students.' }, { status: 400 })
        }

        await prisma.course.update({
            where: { id, tenantId: user!.tenantId },
            data: { isActive: false } // Soft delete
        })
        return NextResponse.json({ success: true, message: 'Course deleted successfully' })
    } catch (err) {
        console.error('Delete course error:', err)
        return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
    }
}
