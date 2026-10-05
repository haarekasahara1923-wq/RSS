import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'
import { hashPassword } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    const drivers = await prisma.driverProfile.findMany({
      where: { tenantId: user!.tenantId },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, isActive: true } },
        vehicle: true
      },
      orderBy: { createdAt: 'desc' }
    })
    return NextResponse.json({ success: true, data: drivers })
  } catch (err) {
    console.error('Fetch drivers error:', err)
    return NextResponse.json({ error: 'Failed to fetch drivers' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'STAFF'].includes(user!.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, phone, email, password, licenseNo, vehicleId, address } = await req.json()
  
  if (!name || !phone || !password) {
    return NextResponse.json({ error: 'Name, phone, and password are required' }, { status: 400 })
  }

  try {
    // Check if phone or email is already taken
    const existing = await prisma.user.findFirst({
      where: { tenantId: user!.tenantId, OR: [{ phone }, { email: email || 'NONE' }] }
    })

    if (existing) {
      return NextResponse.json({ error: 'User with this phone/email already exists' }, { status: 400 })
    }

    const hashed = await hashPassword(password)

    // Create user and profile in transaction
    const newDriver = await prisma.$transaction(async (tx: any) => {
      const newUser = await tx.user.create({
        data: {
          tenantId: user!.tenantId,
          name,
          phone,
          email: email || `${phone}@driver.local`,
          password: hashed,
          plainPassword: password, // For admin viewing
          role: 'DRIVER',
          isActive: true
        }
      })

      const newProfile = await tx.driverProfile.create({
        data: {
          tenantId: user!.tenantId,
          userId: newUser.id,
          licenseNo,
          phone,
          address,
          vehicleId: vehicleId || null,
          isActive: true
        },
        include: { user: true, vehicle: true }
      })

      return newProfile
    })

    return NextResponse.json({ success: true, data: newDriver })
  } catch (err) {
    console.error('Create driver error:', err)
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 })
  }
}
