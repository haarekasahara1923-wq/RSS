import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  // For Admin and Parent to view live locations
  try {
    const url = new URL(req.url)
    const vehicleId = url.searchParams.get('vehicleId')

    const whereClause: any = { tenantId: user!.tenantId }
    if (vehicleId) whereClause.vehicleId = vehicleId

    // Get the latest location per vehicle. 
    // For simplicity, we just fetch the last location recorded today.
    const startOfDay = new Date()
    startOfDay.setHours(0,0,0,0)
    whereClause.timestamp = { gte: startOfDay }

    // Fetch grouped or we can just fetch top 1 for a single vehicle
    if (vehicleId) {
      const loc = await prisma.vehicleLocation.findFirst({
        where: whereClause,
        orderBy: { timestamp: 'desc' }
      })
      return NextResponse.json({ success: true, data: loc ? [loc] : [] })
    } else {
      // If fetching all, we need the latest for each. 
      // PostgreSQL `distinct` on vehicleId is not directly supported in prisma findMany easily without distinct: ['vehicleId'], 
      // Luckily prisma supports it!
      const locs = await prisma.vehicleLocation.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        distinct: ['vehicleId'],
        include: { vehicle: { select: { registrationNo: true, routeDetails: true } } }
      })
      return NextResponse.json({ success: true, data: locs })
    }
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

  const { vehicleId, latitude, longitude, speed, heading } = await req.json()
  
  if (!vehicleId || latitude == null || longitude == null) {
    return NextResponse.json({ error: 'Invalid location data' }, { status: 400 })
  }

  try {
    const loc = await prisma.vehicleLocation.create({
      data: {
        tenantId: user!.tenantId,
        vehicleId,
        latitude,
        longitude,
        speed: speed || 0,
        heading: heading || 0
      }
    })
    return NextResponse.json({ success: true, data: loc })
  } catch (err) {
    console.error('Location update error:', err)
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 })
  }
}
