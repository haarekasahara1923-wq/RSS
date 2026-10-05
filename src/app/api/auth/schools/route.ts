import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * UDBA Single-School:
 * Returns only the UDBA school. If NEXT_PUBLIC_SCHOOL_SLUG is set,
 * filters to that specific school. Otherwise returns all active schools.
 */
export async function GET(req: NextRequest) {
  try {
    const schoolSlug = process.env.NEXT_PUBLIC_SCHOOL_SLUG

    const where: any = { isActive: true }
    if (schoolSlug) {
      where.slug = schoolSlug
    }

    const schools = await prisma.tenant.findMany({
      where,
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ success: true, schools })
  } catch (error: any) {
    console.error('Fetch schools error:', error)
    return NextResponse.json({ error: 'Failed to fetch schools' }, { status: 500 })
  }
}
