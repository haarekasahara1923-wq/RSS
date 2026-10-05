import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') // 'fee' | 'attendance' | 'students'
  const tenantId = user!.tenantId

  if (type === 'fee') {
    const payments = await prisma.payment.findMany({
      where: { tenantId },
      include: { student: { select: { fullName: true, studentId: true } } },
      orderBy: { createdAt: 'desc' },
    })
    const totalCollection = payments.reduce((sum, p) => sum + p.amount, 0)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayCollection = payments
      .filter(p => new Date(p.createdAt) >= today)
      .reduce((sum, p) => sum + p.amount, 0)
    return NextResponse.json({ success: true, payments, totalCollection, todayCollection })
  }

  if (type === 'attendance') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const records = await prisma.attendance.findMany({
      where: { tenantId, date: { gte: today, lt: tomorrow } },
      include: { student: { select: { fullName: true, studentId: true } }, batch: { select: { name: true } } },
    })
    const present = records.filter(r => r.status === 'PRESENT').length
    const absent = records.filter(r => r.status === 'ABSENT').length
    return NextResponse.json({ success: true, records, present, absent, total: records.length })
  }

  if (type === 'students') {
    const students = await prisma.student.findMany({
      where: { tenantId },
      include: { course: { select: { name: true } }, batch: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ success: true, students })
  }

  return NextResponse.json({ error: 'Invalid report type' }, { status: 400 })
}
