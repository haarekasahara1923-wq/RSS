import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error
  const { endpoint, keys } = await req.json()
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { userId_endpoint: { userId: user!.userId, endpoint } },
    create: {
      tenantId: user!.tenantId,
      userId: user!.userId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
    update: { p256dh: keys.p256dh, auth: keys.auth },
  })
  return NextResponse.json({ success: true })
}
