import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { createAdmitCardEventsForCourses } from '@/lib/examTimetableService'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const url = new URL(req.url)
        const courseId = url.searchParams.get('courseId')
        const batchId = url.searchParams.get('batchId')

        const where: any = { tenantId: user!.tenantId }
        if (courseId) where.courseId = courseId
        if (batchId) where.batchId = batchId

        const events = await prisma.admitCardEvent.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                _count: { select: { admitCards: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: events })
    } catch (err) {
        console.error('Fetch admit card events error:', err)
        return NextResponse.json({ error: 'Failed to fetch admit card events' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { courseId, courseIds, batchId, examName, startDate, endDate } = body

        const resolvedCourseIds: string[] = Array.isArray(courseIds) && courseIds.length > 0
            ? courseIds
            : courseId
                ? [courseId]
                : []

        if (resolvedCourseIds.length === 0 || !examName || !startDate || !endDate) {
            return NextResponse.json({ error: 'Required fields missing: Class(es), Exam Name, Start Date, and End Date are mandatory' }, { status: 400 })
        }

        const { createdEvents, skipped } = await createAdmitCardEventsForCourses({
            tenantId: user!.tenantId,
            userId: user!.userId,
            courseIds: resolvedCourseIds,
            batchId,
            examName,
            startDate,
            endDate,
            timeTable: body.timeTable || [],
        })

        if (createdEvents.length === 0) {
            return NextResponse.json(
                { error: 'No active students found in the selected class(es). Please ensure students are admitted to these classes.' },
                { status: 400 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                data: createdEvents.length === 1 ? createdEvents[0] : createdEvents,
                createdCount: createdEvents.length,
                skipped,
            },
            { status: 201 }
        )
    } catch (err: any) {
        console.error('Create admit card event error:', err)
        const msg = err?.message || 'Failed to create admit card event'
        return NextResponse.json({ error: msg }, { status: 500 })
    }
}
