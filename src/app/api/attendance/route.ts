import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { batchId, date } = Object.fromEntries(new URL(req.url).searchParams.entries())
        
        const where: any = { tenantId: user!.tenantId }
        if (batchId) where.batchId = batchId
        if (date) {
            const startDate = new Date(date)
            startDate.setHours(0, 0, 0, 0)
            const endDate = new Date(date)
            endDate.setHours(23, 59, 59, 999)
            where.date = { gte: startDate, lte: endDate }
        }

        const attendances = await prisma.attendance.findMany({
            where,
            include: { student: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' }
        })

        const data = attendances.map(a => ({
            ...a,
            studentName: a.student?.fullName || 'Unknown',
        }))

        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('Fetch attendance error:', err)
        return NextResponse.json({ error: 'Failed to fetch attendance' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const records = body.records || [body]

        if (!Array.isArray(records)) {
            return NextResponse.json({ error: 'Invalid record format' }, { status: 400 })
        }

        const created = await prisma.$transaction(
            records.map((r: any) => 
                prisma.attendance.create({
                    data: {
                        tenantId: user!.tenantId,
                        studentId: r.studentId,
                        batchId: r.batchId,
                        date: new Date(r.date),
                        status: (r.status || 'PRESENT') as any,
                        markedBy: user!.userId,
                        notes: r.notes || '',
                    }
                })
            )
        )

        // Asynchronously notify parents
        for (const r of records) {
            const student = await prisma.student.findUnique({
                where: { id: r.studentId },
                include: { parentLinks: true }
            })
            if (student && student.parentLinks.length > 0) {
                for (const parent of student.parentLinks) {
                    await prisma.notification.create({
                        data: {
                            tenantId: user!.tenantId,
                            title: `Attendance Marked: ${student.fullName}`,
                            message: `${student.fullName} has been marked ${r.status} on ${new Date(r.date).toLocaleDateString('en-IN')}.`,
                            type: 'ATTENDANCE',
                            targetRole: 'PARENT',
                            targetId: parent.userId,
                        }
                    })
                    // Send push notification
                    try {
                        const subscriptions = await prisma.pushSubscription.findMany({
                            where: { userId: parent.userId }
                        })
                        for (const sub of subscriptions) {
                            await sendWebPush(sub, `Attendance: ${student.fullName}`, `${student.fullName} is marked ${r.status}`)
                        }
                    } catch (e) {
                        console.error('Push notification send error:', e)
                    }
                }
            }
        }

        return NextResponse.json({ success: true, data: created }, { status: 201 })
    } catch (err) {
        console.error('Create attendance error:', err)
        return NextResponse.json({ error: 'Failed to create attendance' }, { status: 500 })
    }
}

// Simple web push sender helper function
async function sendWebPush(sub: any, title: string, body: string) {
    const webpush = require('web-push')
    // Generate VAPID keys if not set (or use dummy/placeholder)
    const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_KEY || 'BFG54n2XjD6u05w21Zsz2g5p7fR9n...'
    const privateVapidKey = process.env.VAPID_PRIVATE_KEY || 'uKq6K9m7Q...'
    
    webpush.setVapidDetails(
        'mailto:info@udba.space',
        publicVapidKey,
        privateVapidKey
    )

    const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
            auth: sub.auth,
            p256dh: sub.p256dh
        }
    }

    await webpush.sendNotification(
        pushSubscription,
        JSON.stringify({ title, body })
    )
}
