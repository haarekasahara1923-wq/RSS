import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    const url = new URL(req.url)
    const teacherId = url.searchParams.get('teacherId')

    try {
        let whereClause: any = { tenantId: user!.tenantId }
        
        if (teacherId) {
            whereClause.teacherId = teacherId
        }

        const leaves = await prisma.leaveApplication.findMany({
            where: whereClause,
            include: {
                teacher: {
                    select: { id: true, name: true, photo: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: leaves })
    } catch (err) {
        console.error('Fetch leaves error:', err)
        return NextResponse.json({ error: 'Failed to fetch leave applications' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const body = await req.json()
        const { teacherId, startDate, endDate, reason } = body

        if (!teacherId || !startDate || !endDate || !reason) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const leave = await prisma.leaveApplication.create({
            data: {
                tenantId: user!.tenantId,
                teacherId,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                status: 'PENDING'
            }
        })

        return NextResponse.json({ success: true, data: leave })
    } catch (err) {
        console.error('Create leave error:', err)
        return NextResponse.json({ error: 'Failed to create leave application' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    // Only SUPER_ADMIN (or similar) should approve/reject
    if (user!.role !== 'SUPER_ADMIN' && user!.role !== 'COACHING_ADMIN') {
        return NextResponse.json({ error: 'Unauthorized to approve/reject leaves' }, { status: 403 })
    }

    try {
        const body = await req.json()
        const { id, status } = body

        if (!id || !status) {
            return NextResponse.json({ error: 'id and status are required' }, { status: 400 })
        }

        const leave = await prisma.leaveApplication.update({
            where: { id, tenantId: user!.tenantId },
            data: { status }
        })

        // If approved, we should automatically mark them on leave in attendance
        if (status === 'APPROVED') {
            const start = new Date(leave.startDate)
            const end = new Date(leave.endDate)
            
            // Generate all dates between start and end
            for (let dt = new Date(start); dt <= end; dt.setDate(dt.getDate() + 1)) {
                const currentDt = new Date(dt)
                currentDt.setHours(0, 0, 0, 0)
                
                const nextDay = new Date(currentDt)
                nextDay.setDate(nextDay.getDate() + 1)
                
                // check if already marked
                const existing = await prisma.attendance.findFirst({
                    where: {
                        tenantId: user!.tenantId,
                        teacherId: leave.teacherId,
                        date: {
                            gte: currentDt,
                            lt: nextDay
                        }
                    }
                })
                
                if (existing) {
                    await prisma.attendance.update({
                        where: { id: existing.id },
                        data: { status: 'LEAVE', notes: 'Approved Leave' }
                    })
                } else {
                    await prisma.attendance.create({
                        data: {
                            tenantId: user!.tenantId,
                            teacherId: leave.teacherId,
                            date: currentDt,
                            status: 'LEAVE',
                            notes: 'Approved Leave',
                            markedBy: 'SYSTEM'
                        }
                    })
                }
            }
        }

        return NextResponse.json({ success: true, data: leave })
    } catch (err) {
        console.error('Update leave error:', err)
        return NextResponse.json({ error: 'Failed to update leave application' }, { status: 500 })
    }
}
