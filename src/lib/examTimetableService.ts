import { prisma } from '@/lib/prisma'
import { generateClassRollNumber } from '@/lib/rollNumber'

export interface CreateAdmitCardEventsInput {
  tenantId: string
  userId: string
  courseIds: string[]
  batchId?: string | null
  examName: string
  startDate: string
  endDate: string
  timeTable: any[]
}

export interface SkippedCourseInfo {
  courseId: string
  courseName: string
  reason: string
}

/**
 * Create AdmitCardEvent (with attached timeTable) and student AdmitCards
 * for one or more selected classes (courses).
 */
export async function createAdmitCardEventsForCourses({
  tenantId,
  userId,
  courseIds,
  batchId,
  examName,
  startDate,
  endDate,
  timeTable,
}: CreateAdmitCardEventsInput) {
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)))
  const isSingleCourse = uniqueCourseIds.length === 1
  const createdEvents: any[] = []
  const skipped: SkippedCourseInfo[] = []

  for (const courseId of uniqueCourseIds) {
    const course = await prisma.course.findFirst({
      where: { id: courseId, tenantId },
      select: { id: true, name: true },
    })

    if (!course) {
      skipped.push({ courseId, courseName: courseId, reason: 'Class not found' })
      continue
    }

    // Resolve batchId: specific batch only applies in single-class mode
    let resolvedBatchId = isSingleCourse && batchId && batchId !== 'all' ? batchId : null
    if (!resolvedBatchId) {
      let existingBatch = await prisma.batch.findFirst({
        where: { tenantId, courseId, isActive: true },
      })
      if (!existingBatch) {
        existingBatch = await prisma.batch.create({
          data: {
            tenantId,
            courseId,
            name: 'Section A',
            isActive: true,
          },
        })
      }
      resolvedBatchId = existingBatch.id
    }

    const studentWhere: any = { tenantId, courseId, status: 'ACTIVE' }
    if (isSingleCourse && batchId && batchId !== 'all') {
      const hasBatchStudents = await prisma.student.count({
        where: { tenantId, courseId, batchId, status: 'ACTIVE' },
      })
      if (hasBatchStudents > 0) studentWhere.batchId = batchId
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: { id: true },
      orderBy: [{ fullName: 'asc' }, { createdAt: 'asc' }],
    })

    if (students.length === 0) {
      skipped.push({
        courseId,
        courseName: course.name,
        reason: 'No active students found',
      })
      continue
    }

    const event = await prisma.admitCardEvent.create({
      data: {
        tenantId,
        courseId,
        batchId: resolvedBatchId,
        examName,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: userId,
        timeTable,
        admitCards: {
          create: students.map((s, idx) => ({
            tenantId,
            studentId: s.id,
            rollNo: generateClassRollNumber(course.name, idx),
          })),
        },
      },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        _count: { select: { admitCards: true } },
      },
    })

    createdEvents.push(event)
  }

  return { createdEvents, skipped }
}
