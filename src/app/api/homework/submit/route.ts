import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const homeworkId = searchParams.get('homeworkId')
  const studentId = searchParams.get('studentId')

  const where: any = { tenantId: user!.tenantId }
  if (homeworkId) where.homeworkId = homeworkId
  if (studentId) where.studentId = studentId

  const submissions = await prisma.homeworkSubmission.findMany({
    where,
    include: {
      student: { select: { id: true, fullName: true, studentId: true, phone: true } },
      homework: {
        select: {
          id: true,
          title: true,
          subject: true,
          batch: { select: { id: true, name: true } }
        }
      },
    },
    orderBy: { submittedAt: 'desc' },
  })
  return NextResponse.json({ success: true, submissions })
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const body = await req.json()
  let { homeworkId, studentId, content, attachmentUrl } = body

  let student: any = null
  if (!studentId && user?.role === 'STUDENT') {
    student = await prisma.student.findFirst({
      where: {
        tenantId: user.tenantId,
        OR: [
          { userId: user.userId },
          { email: user.email },
          { phone: user.email },
          ...(user.phone ? [{ phone: user.phone }] : [])
        ]
      }
    })
    if (student) studentId = student.id
  } else if (studentId) {
    student = await prisma.student.findUnique({ where: { id: studentId } })
  } else if (user?.role === 'PARENT' && !studentId) {
    // Parent must pass studentId (child's id) explicitly
    return NextResponse.json({ error: 'Parent must provide studentId (child ID) to submit homework' }, { status: 400 })
  }

  if (!homeworkId || !studentId) {
    return NextResponse.json({ error: 'homeworkId and studentId required' }, { status: 400 })
  }

  const submission = await prisma.homeworkSubmission.upsert({
    where: { homeworkId_studentId: { homeworkId, studentId } },
    create: {
      tenantId: user!.tenantId,
      homeworkId,
      studentId,
      content: content || '',
      attachmentUrl: attachmentUrl || null,
      status: 'SUBMITTED',
      submittedAt: new Date()
    },
    update: {
      content: content || '',
      attachmentUrl: attachmentUrl || null,
      status: 'SUBMITTED',
      submittedAt: new Date()
    },
    include: {
      homework: true,
      student: { select: { fullName: true, studentId: true } }
    }
  })

  // Notify teacher if teacherId exists
  if (submission.homework?.teacherId) {
    await prisma.notification.create({
      data: {
        tenantId: user!.tenantId,
        title: `📥 Homework Submitted: ${submission.homework.title}`,
        message: `${submission.student?.fullName || 'A student'} submitted their homework.`,
        type: 'HOMEWORK',
        targetRole: 'TEACHER',
        targetId: submission.homework.teacherId,
      }
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, submission }, { status: 201 })
}

export async function PUT(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const body = await req.json()
  const { id, grade, feedback } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const submission = await prisma.homeworkSubmission.update({
    where: { id },
    data: {
      grade: grade || '',
      feedback: feedback || '',
      status: 'GRADED',
      updatedAt: new Date()
    },
    include: {
      homework: true,
      student: { select: { id: true, userId: true, fullName: true } }
    }
  })

  // Notify student if userId is linked
  if (submission.student?.userId) {
    await prisma.notification.create({
      data: {
        tenantId: user!.tenantId,
        title: `✅ Homework Reviewed: ${submission.homework?.title}`,
        message: `Grade: ${grade || 'Reviewed'}.${feedback ? ' Feedback: ' + feedback : ''}`,
        type: 'HOMEWORK',
        targetRole: 'STUDENT',
        targetId: submission.student.userId,
      }
    }).catch(() => {})
  }

  return NextResponse.json({ success: true, submission })
}
