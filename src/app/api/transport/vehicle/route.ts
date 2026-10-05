import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { tenantId: user!.tenantId },
      include: {
        driverProfiles: { include: { user: { select: { name: true, phone: true } } } },
        _count: { select: { students: true } }
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, data: vehicles })
  } catch (err) {
    console.error('Fetch vehicles error:', err)
    return NextResponse.json({ error: 'Failed to fetch vehicles' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'STAFF'].includes(user!.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { registrationNo, routeDetails, capacity } = await req.json()
  
  if (!registrationNo) {
    return NextResponse.json({ error: 'Registration number is required' }, { status: 400 })
  }

  try {
    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId: user!.tenantId,
        registrationNo,
        routeDetails,
        capacity: parseInt(capacity) || 40,
        isActive: true
      }
    })
    return NextResponse.json({ success: true, data: vehicle })
  } catch (err) {
    console.error('Create vehicle error:', err)
    return NextResponse.json({ error: 'Failed to create vehicle' }, { status: 500 })
  }
}
