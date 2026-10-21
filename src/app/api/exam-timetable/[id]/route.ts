import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET — get a single event with its timetable details
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const { id } = await params
    const event = await prisma.admitCardEvent.findUnique({
      where: { id, tenantId: user!.tenantId },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        _count: { select: { admitCards: true } },
      },
    })
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ success: true, data: event })
  } catch (err) {
    console.error('Fetch exam timetable error:', err)
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
  }
}

// PATCH — update the timetable for an existing exam event
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const { id } = await params
    const body = await req.json()
    const { timeTable } = body

    if (!Array.isArray(timeTable)) {
      return NextResponse.json({ error: 'Invalid timetable data' }, { status: 400 })
    }

    const updated = await prisma.admitCardEvent.update({
      where: { id, tenantId: user!.tenantId },
      data: { timeTable },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('Update exam timetable error:', err)
    return NextResponse.json({ error: 'Failed to update timetable' }, { status: 500 })
  }
}
