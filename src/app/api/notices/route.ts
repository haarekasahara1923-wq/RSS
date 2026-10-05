import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const targetRole = searchParams.get('role')

  if (user!.role === 'PARENT') {
    // 1. Find explicit parent profile with children
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: user!.userId },
      include: { children: true }
    })

    // 2. Also find children by phone or email
    const matchingStudents = await prisma.student.findMany({
      where: {
        tenantId: user!.tenantId,
        OR: [
          { parentPhone: user!.email },
          { phone: user!.email },
          ...(user!.phone ? [{ parentPhone: user!.phone }, { phone: user!.phone }] : [])
        ]
      }
    })

    const children = [...(parentProfile?.children || [])]
    for (const ms of matchingStudents) {
      if (!children.some(c => c.id === ms.id)) {
        children.push(ms)
        if (parentProfile) {
          await prisma.parentProfile.update({
            where: { id: parentProfile.id },
            data: { children: { connect: { id: ms.id } } }
          }).catch(() => {})
        }
      }
    }

    const childIds = children.map(c => c.id)
    const batchIds = children.map(c => c.batchId).filter(Boolean) as string[]

    const notices = await prisma.notification.findMany({
      where: {
        tenantId: user!.tenantId,
        type: 'NOTICE',
        OR: [
          // Broadcast to parents or all
          {
            OR: [
              { targetRole: null },
              { targetRole: { in: ['ALL', 'PARENT', ''] } }
            ],
            targetId: null
          },
          {
            OR: [
              { targetRole: null },
              { targetRole: { in: ['ALL', 'PARENT', ''] } }
            ],
            targetId: ''
          },
          // Notice for this child's batch
          ...(batchIds.length > 0 ? [{ targetId: { in: batchIds } }] : []),
          // Targeted specifically to child or parent userId
          ...(childIds.length > 0 ? [{ targetId: { in: childIds } }] : []),
          { targetId: user!.userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, notices })
  }

  if (user!.role === 'STUDENT') {
    const student = await prisma.student.findFirst({
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

    const notices = await prisma.notification.findMany({
      where: {
        tenantId: user!.tenantId,
        type: 'NOTICE',
        OR: [
          // Broadcast
          {
            OR: [
              { targetRole: null },
              { targetRole: { in: ['ALL', 'STUDENT', ''] } }
            ],
            targetId: null
          },
          {
            OR: [
              { targetRole: null },
              { targetRole: { in: ['ALL', 'STUDENT', ''] } }
            ],
            targetId: ''
          },
          // Class batch notice
          ...(student?.batchId ? [{ targetId: student.batchId }] : []),
          // Student specific notice
          ...(student?.id ? [{ targetId: student.id }] : []),
          { targetId: user!.userId }
        ]
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return NextResponse.json({ success: true, notices })
  }

  // For TEACHER, STAFF, COACHING_ADMIN, SUPER_ADMIN
  const where: any = { tenantId: user!.tenantId, type: 'NOTICE' }
  if (targetRole) {
    where.OR = [{ targetRole: null }, { targetRole: '' }, { targetRole }]
  }

  const notices = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 60,
  })

  return NextResponse.json({ success: true, notices })
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'TEACHER', 'STAFF'].includes(user!.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { title, message, targetRole, targetType, targetBatchId, targetStudentId } = body

  if (!title || !message) {
    return NextResponse.json({ error: 'Title and message are required' }, { status: 400 })
  }

  let finalTitle = title
  let finalTargetRole = targetRole || null
  let finalTargetId: string | null = null

  if (targetType === 'STUDENT_PARENT' || targetStudentId) {
    const student = await prisma.student.findUnique({
      where: { id: targetStudentId, tenantId: user!.tenantId },
      include: { batch: true, course: true }
    })
    if (!student) {
      return NextResponse.json({ error: 'Selected student not found' }, { status: 404 })
    }
    finalTitle = `📌 To ${student.fullName}'s Parent: ${title}`
    finalTargetRole = 'PARENT'
    finalTargetId = student.id
  } else if (targetType === 'BATCH' || targetBatchId) {
    const batch = await prisma.batch.findUnique({
      where: { id: targetBatchId, tenantId: user!.tenantId },
      include: { course: true }
    })
    const className = batch?.course?.name ? `${batch.course.name} - ` : ''
    finalTitle = `🏫 [${className}${batch?.name || 'Class'}] ${title}`
    finalTargetRole = 'PARENT'
    finalTargetId = targetBatchId
  }

  const notice = await prisma.notification.create({
    data: {
      tenantId: user!.tenantId,
      title: finalTitle,
      message,
      type: 'NOTICE',
      targetRole: finalTargetRole,
      targetId: finalTargetId,
    },
  })

  return NextResponse.json({ success: true, notice }, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  await prisma.notification.delete({ where: { id, tenantId: user!.tenantId } })
  return NextResponse.json({ success: true })
}
