import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  // Drivers fetching their student list and today's boarding status
  if (user!.role !== 'DRIVER') return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const profile = await prisma.driverProfile.findUnique({ where: { userId: user!.userId } })
    if (!profile || !profile.vehicleId) {
      return NextResponse.json({ success: true, data: [] }) // No vehicle assigned
    }

    const students = await prisma.student.findMany({
      where: { tenantId: user!.tenantId, vehicleId: profile.vehicleId },
      include: { batch: { select: { name: true } }, course: { select: { name: true } } }
    })
    
    // Get today's logs for this vehicle
    const startOfDay = new Date()
    startOfDay.setHours(0,0,0,0)

    const logs = await prisma.transportLog.findMany({
      where: { 
        tenantId: user!.tenantId, 
        vehicleId: profile.vehicleId,
        timestamp: { gte: startOfDay }
      },
      orderBy: { timestamp: 'asc' }
    })

    // Map the latest status for each student
    const studentStatus: Record<string, string> = {}
    logs.forEach((l: any) => {
      studentStatus[l.studentId] = l.status
    })

    const data = students.map((s: any) => ({
      ...s,
      currentStatus: studentStatus[s.id] || 'WAITING' // WAITING, IN, OUT
    }))

    return NextResponse.json({ success: true, data, vehicleId: profile.vehicleId })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (user!.role !== 'DRIVER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { studentId, vehicleId, status } = await req.json()
  
  if (!studentId || !vehicleId || !['IN', 'OUT'].includes(status)) {
    return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
  }

  try {
    const log = await prisma.transportLog.create({
      data: {
        tenantId: user!.tenantId,
        studentId,
        vehicleId,
        driverId: user!.userId,
        status
      }
    })

    // Notify parents (Fire and forget)
    // Find parent links
    prisma.student.findUnique({
      where: { id: studentId },
      include: { parentLinks: true }
    }).then(async (student: any) => {
      if (student && student.parentLinks.length > 0) {
        for (const parent of student.parentLinks) {
          await prisma.notification.create({
            data: {
              tenantId: user!.tenantId,
              title: `Transport Alert: ${student.fullName}`,
              message: `Your child has been marked ${status} the bus at ${new Date().toLocaleTimeString('en-IN')}.`,
              type: 'TRANSPORT',
              targetRole: 'PARENT',
              targetId: parent.userId
            }
          })
        }
      }
    }).catch(e => console.error("Parent transport notification failed", e))

    return NextResponse.json({ success: true, data: log })
  } catch (err) {
    console.error('Boarding error:', err)
    return NextResponse.json({ error: 'Failed to record boarding' }, { status: 500 })
  }
}
