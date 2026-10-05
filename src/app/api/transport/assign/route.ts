import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const url = new URL(req.url)
  const vehicleId = url.searchParams.get('vehicleId')
  
  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicleId required' }, { status: 400 })
  }

  try {
    const students = await prisma.student.findMany({
      where: { tenantId: user!.tenantId, vehicleId },
      include: { batch: { select: { name: true } }, course: { select: { name: true } } }
    })
    return NextResponse.json({ success: true, data: students })
  } catch (err) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'STAFF'].includes(user!.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { studentIds, vehicleId } = await req.json()
  
  try {
    await prisma.student.updateMany({
      where: { tenantId: user!.tenantId, id: { in: studentIds } },
      data: { vehicleId: vehicleId || null } // if vehicleId is null, unassigns them
    })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Assign students error:', err)
    return NextResponse.json({ error: 'Failed to assign students' }, { status: 500 })
  }
}
