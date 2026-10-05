import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const batchId = searchParams.get('batchId')

  const where: any = { tenantId: user!.tenantId }
  if (batchId) where.batchId = batchId

  let student: any = null

  if (user!.role === 'STUDENT') {
    student = await prisma.student.findFirst({
      where: {
        tenantId: user!.tenantId,
        OR: [
          { userId: user!.userId },
          { email: user!.email },
          { phone: user!.email },
          ...(user!.phone ? [{ phone: user!.phone }] : [])
        ]
      }
    })

    if (student) {
      if (!student.userId) {
        await prisma.student.update({
          where: { id: student.id },
          data: { userId: user!.userId }
        }).catch(() => {})
      }
      where.batchId = student.batchId
    }
  } else if (user!.role === 'PARENT') {
    // For parents: fetch all children linked to them and get their batchIds
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user!.userId },
      include: {
        children: { select: { id: true, batchId: true, fullName: true } }
      }
    })
    const childrenBatchIds = (parentProfile?.children || []).map((c: any) => c.batchId).filter(Boolean)
    if (childrenBatchIds.length > 0) {
      where.batchId = { in: childrenBatchIds }
    } else {
      return NextResponse.json({ success: true, homeworks: [], studentId: null, children: [] })
    }

    const children = parentProfile?.children || []
    const homeworks = await prisma.homework.findMany({
      where,
      include: {
        batch: { select: { id: true, name: true, course: { select: { id: true, name: true } } } },
        _count: { select: { submissions: true } },
        submissions: {
          where: { studentId: { in: children.map((c: any) => c.id) } },
          include: { student: { select: { id: true, fullName: true, studentId: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, homeworks, studentId: null, children })
  }

  const homeworks = await prisma.homework.findMany({
    where,
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } }
        }
      },
      _count: { select: { submissions: true } },
      submissions: user!.role === 'STUDENT' ? (student ? {
        where: { studentId: student.id },
        select: { id: true, content: true, attachmentUrl: true, grade: true, feedback: true, status: true, submittedAt: true }
      } : false) : {
        include: {
          student: { select: { id: true, fullName: true, studentId: true, phone: true } }
        },
        orderBy: { submittedAt: 'desc' }
      }
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, homeworks, studentId: student?.id || null })
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const body = await req.json()
  const { batchId, title, description, subject, dueDate, attachmentUrl } = body

  if (!batchId || !title) return NextResponse.json({ error: 'Section/Batch and Title are required' }, { status: 400 })

  const homework = await prisma.homework.create({
    data: {
      tenantId: user!.tenantId,
      batchId,
      teacherId: user!.userId,
      title,
      description: description || '',
      subject: subject || '',
      dueDate: dueDate ? new Date(dueDate) : null,
      attachmentUrl: attachmentUrl || null,
    },
    include: {
      batch: {
        select: {
          id: true,
          name: true,
          course: { select: { id: true, name: true } }
        }
      }
    }
  })

  // Notify students in the batch
  const students = await prisma.student.findMany({
    where: { tenantId: user!.tenantId, batchId },
    select: { id: true, userId: true, fullName: true },
  })

  const studentsWithAccount = students.filter(s => s.userId)
  if (studentsWithAccount.length > 0) {
    await prisma.notification.createMany({
      data: studentsWithAccount.map(s => ({
        tenantId: user!.tenantId,
        title: `📚 New Homework: ${title}`,
        message: `${subject ? subject + ' • ' : ''}${description || title}`,
        type: 'HOMEWORK',
        targetRole: 'STUDENT',
        targetId: s.userId!,
      })),
    })
  }

  return NextResponse.json({ success: true, homework }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.homework.delete({ where: { id, tenantId: user!.tenantId } })
  return NextResponse.json({ success: true })
}
