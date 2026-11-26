import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { createAdmitCardEventsForCourses } from '@/lib/examTimetableService'

export const dynamic = 'force-dynamic'

// GET  — list all exam timetables for the tenant
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
        _count: { select: { admitCards: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: events })
  } catch (err) {
    console.error('Fetch exam timetable error:', err)
    return NextResponse.json({ error: 'Failed to fetch exam timetables' }, { status: 500 })
  }
}

// POST — create exam timetable(s) for one or more classes (also creates AdmitCardEvents & AdmitCards)
// Body: { examName, courseId?, courseIds?, batchId?, startDate, endDate, timeTable: [{date, subject, startTime, endTime, duration?}] }
export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const body = await req.json()
    const { examName, courseId, courseIds, batchId, startDate, endDate, timeTable } = body

    const resolvedCourseIds: string[] = Array.isArray(courseIds) && courseIds.length > 0
      ? courseIds
      : courseId
        ? [courseId]
        : []

    if (!examName || resolvedCourseIds.length === 0 || !startDate || !endDate || !Array.isArray(timeTable) || timeTable.length === 0) {
      return NextResponse.json({ error: 'Required fields missing: Exam Name, Class(es), Start Date, End Date, and Subjects are required' }, { status: 400 })
    }

    const { createdEvents, skipped } = await createAdmitCardEventsForCourses({
      tenantId: user!.tenantId,
      userId: user!.userId,
      courseIds: resolvedCourseIds,
      batchId,
      examName,
      startDate,
      endDate,
      timeTable,
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
  } catch (err) {
    console.error('Create exam timetable error:', err)
    return NextResponse.json({ error: 'Failed to create exam timetable' }, { status: 500 })
  }
}
