import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'
import { hashPassword } from '@/lib/auth'

// Sub-admin roles that SUPER_ADMIN or COACHING_ADMIN can create
const SUB_ADMIN_ROLES = ['ADMIN_OPERATION', 'ADMIN_LIBRARY', 'ADMIN_SPORTS', 'ADMIN_TRANSPORT']

// GET: list all sub-admins created by this tenant
export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const isAllowed = user!.role === 'SUPER_ADMIN' || user!.role === 'COACHING_ADMIN'
  if (!isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admins = await prisma.user.findMany({
    where: {
      tenantId: user!.tenantId,
      role: { in: SUB_ADMIN_ROLES as any },
    },
    select: {
      id: true, name: true, email: true, phone: true, role: true, isActive: true, createdAt: true, plainPassword: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ success: true, admins })
}

// POST: create a new sub-admin
export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  const isAllowed = user!.role === 'SUPER_ADMIN' || user!.role === 'COACHING_ADMIN'
  if (!isAllowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const { name, phone, password, role } = body

  if (!name || !phone || !password || !role) {
    return NextResponse.json({ error: 'Name, mobile number, password, and role are required' }, { status: 400 })
  }

  if (!SUB_ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid admin role' }, { status: 400 })
  }

  // Max 5 sub-admins per tenant
  const existingAdmins = await prisma.user.count({
    where: { tenantId: user!.tenantId, role: { in: SUB_ADMIN_ROLES as any } },
  })

  if (existingAdmins >= 5) {
    return NextResponse.json({ error: 'Maximum 5 sub-admins allowed per school' }, { status: 400 })
  }

  // Check duplicate phone
  const existing = await prisma.user.findFirst({
    where: { tenantId: user!.tenantId, phone },
  })
  if (existing) {
    return NextResponse.json({ error: 'A user with this mobile number already exists' }, { status: 409 })
  }

  const hashedPassword = await hashPassword(password)

  const newAdmin = await prisma.user.create({
    data: {
      tenantId: user!.tenantId,
      name,
      email: `${phone}@admin.udba.local`, // placeholder email since mobile-only
      phone,
      password: hashedPassword,
      plainPassword: password,
      role: role as any,
      isActive: true,
    },
  })

  return NextResponse.json({
    success: true,
    admin: {
      id: newAdmin.id, name: newAdmin.name, phone: newAdmin.phone, role: newAdmin.role,
    },
  }, { status: 201 })
}

// PATCH: toggle active/inactive (only SUPER_ADMIN can block)
export async function PATCH(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'COACHING_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { adminId, isActive } = body

  const updated = await prisma.user.update({
    where: { id: adminId, tenantId: user!.tenantId },
    data: { isActive },
  })

  return NextResponse.json({ success: true, admin: { id: updated.id, isActive: updated.isActive } })
}

// DELETE: remove a sub-admin (only SUPER_ADMIN)
export async function DELETE(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'COACHING_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const adminId = searchParams.get('adminId')
  if (!adminId) return NextResponse.json({ error: 'adminId required' }, { status: 400 })

  await prisma.user.delete({ where: { id: adminId, tenantId: user!.tenantId } })

  return NextResponse.json({ success: true })
}
