import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const profile = await prisma.parentProfile.findUnique({
    where: { userId: user!.userId },
    include: {
      tenant: { select: { name: true } },
      children: {
        include: {
          course: { select: { name: true, subjects: true } },
          batch: { select: { name: true } },
          attendances: { orderBy: { date: 'desc' }, take: 10 },
          fees: { orderBy: { dueDate: 'desc' }, take: 5 },
          examResults: { include: { exam: true }, orderBy: { createdAt: 'desc' } },
        },
      },
    },
  })

  return NextResponse.json({ success: true, profile })
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const body = await req.json()
  const { studentIds } = body // max 3 student IDs to link

  if (!studentIds || !Array.isArray(studentIds) || studentIds.length > 3) {
    return NextResponse.json({ error: 'Provide 1-3 studentIds to link' }, { status: 400 })
  }

  // Verify students belong to same tenant
  const students = await prisma.student.findMany({
    where: { id: { in: studentIds }, tenantId: user!.tenantId },
    include: { parentLinks: true }
  })

  if (students.length !== studentIds.length) {
    return NextResponse.json({ error: 'Invalid student IDs' }, { status: 400 })
  }

  // Check if any of these students are already linked to a DIFFERENT parent
  for (const student of students) {
    const otherParent = student.parentLinks.find(p => p.userId !== user!.userId);
    if (otherParent) {
      return NextResponse.json({ error: `Student ${student.fullName} is already linked to another parent.` }, { status: 400 })
    }
  }

  // Upsert parent profile
  const profile = await prisma.parentProfile.upsert({
    where: { userId: user!.userId },
    create: {
      tenantId: user!.tenantId,
      userId: user!.userId,
      name: user!.email,
      children: { connect: studentIds.map(id => ({ id })) },
    },
    update: {
      children: { set: studentIds.map(id => ({ id })) },
    },
  })

  return NextResponse.json({ success: true, profile })
}
