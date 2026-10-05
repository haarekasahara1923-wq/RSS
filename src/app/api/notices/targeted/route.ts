import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['TEACHER', 'STAFF', 'COACHING_ADMIN', 'SUPER_ADMIN'].includes(user!.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const body = await req.json()
  const { title, message, studentId } = body

  if (!title || !message || !studentId) {
    return NextResponse.json({ error: 'title, message, and studentId required' }, { status: 400 })
  }

  try {
    const student = await prisma.student.findUnique({
      where: { id: studentId, tenantId: user!.tenantId },
      include: { parentLinks: true }
    })

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const createdNotices = []

    // Always create notice with targetId: student.id so Parent portal will display it for this child
    const primaryNotice = await prisma.notification.create({
      data: {
        tenantId: user!.tenantId,
        title: `📌 To ${student.fullName}'s Parent: ${title}`,
        message,
        type: 'NOTICE',
        targetRole: 'PARENT',
        targetId: student.id,
      },
    })
    createdNotices.push(primaryNotice)

    // Also link to specific parent userIds if available
    for (const parent of student.parentLinks) {
      if (parent.userId) {
        const pNotice = await prisma.notification.create({
          data: {
            tenantId: user!.tenantId,
            title: `📌 To ${student.fullName}'s Parent: ${title}`,
            message,
            type: 'NOTICE',
            targetRole: 'PARENT',
            targetId: parent.userId,
          },
        })
        createdNotices.push(pNotice)
      }
    }

    return NextResponse.json({ success: true, notices: createdNotices }, { status: 201 })
  } catch (err) {
    console.error('Targeted notice error:', err)
    return NextResponse.json({ error: 'Failed to send targeted notice' }, { status: 500 })
  }
}
