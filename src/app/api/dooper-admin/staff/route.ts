import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

const DOOPER_JWT_SECRET = process.env.DOOPER_JWT_SECRET || process.env.JWT_SECRET || 'dooper-fallback-secret'

function verifyDooperToken(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    try {
        const payload = jwt.verify(authHeader.split(' ')[1], DOOPER_JWT_SECRET) as any
        if (payload.role !== 'DOOPER_ADMIN') return null
        return payload
    } catch {
        return null
    }
}

// GET — fetch all staff (teachers) across all tenants with leaves, timetables
export async function GET(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const type = url.searchParams.get('type') || 'staff'       // staff | leaves | timetable
    const tenantId = url.searchParams.get('tenantId') || undefined

    try {
        if (type === 'staff') {
            const where: any = {}
            if (tenantId) where.tenantId = tenantId

            const teachers = await prisma.teacher.findMany({
                where,
                include: {
                    tenant: { select: { id: true, name: true, schoolCode: true, isActive: true } },
                    _count: {
                        select: {
                            leaveApplications: true,
                            timeTables: true,
                            attendances: true,
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            })

            const stats = {
                totalStaff: teachers.length,
                activeStaff: teachers.filter(t => t.isActive).length,
                inactiveStaff: teachers.filter(t => !t.isActive).length,
                totalSchoolsWithStaff: new Set(teachers.map(t => t.tenantId)).size,
            }

            return NextResponse.json({ success: true, staff: teachers, stats })
        }

        if (type === 'leaves') {
            const where: any = {}
            if (tenantId) where.tenantId = tenantId

            const leaves = await prisma.leaveApplication.findMany({
                where,
                include: {
                    teacher: { select: { id: true, name: true, phone: true, photo: true } },
                    tenant: { select: { id: true, name: true, schoolCode: true } },
                },
                orderBy: { createdAt: 'desc' }
            })

            return NextResponse.json({ success: true, leaves })
        }

        if (type === 'timetable') {
            const where: any = {}
            if (tenantId) where.tenantId = tenantId

            const timetables = await prisma.timeTable.findMany({
                where,
                include: {
                    teacher: { select: { id: true, name: true, photo: true } },
                    tenant: { select: { id: true, name: true, schoolCode: true } },
                    course: { select: { id: true, name: true } },
                    batch: { select: { id: true, name: true } },
                },
                orderBy: { createdAt: 'desc' }
            })

            return NextResponse.json({ success: true, timetables })
        }

        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 })
    } catch (error) {
        console.error('Dooper staff fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch staff data' }, { status: 500 })
    }
}

// PATCH — block/unblock staff, update leave status, update timetable status
export async function PATCH(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { action, id } = body

        if (!id || !action) {
            return NextResponse.json({ error: 'id and action are required' }, { status: 400 })
        }

        if (action === 'block' || action === 'unblock') {
            const teacher = await prisma.teacher.update({
                where: { id },
                data: { isActive: action === 'unblock' }
            })
            return NextResponse.json({ success: true, message: `Staff ${action}ed successfully`, data: teacher })
        }

        if (action === 'approve_leave' || action === 'reject_leave') {
            const status = action === 'approve_leave' ? 'APPROVED' : 'REJECTED'
            const leave = await prisma.leaveApplication.update({
                where: { id },
                data: { status }
            })
            return NextResponse.json({ success: true, message: `Leave ${status.toLowerCase()}`, data: leave })
        }

        if (action === 'approve_timetable' || action === 'reject_timetable') {
            const status = action === 'approve_timetable' ? 'PUBLISHED' : 'DRAFT'
            const timetable = await prisma.timeTable.update({
                where: { id },
                data: { status }
            })
            return NextResponse.json({ success: true, message: `Timetable ${status.toLowerCase()}`, data: timetable })
        }

        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    } catch (error) {
        console.error('Dooper staff patch error:', error)
        return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }
}

// PUT — edit staff details
export async function PUT(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const body = await req.json()
        const { id, name, email, phone, subject, salary, joinDate } = body

        if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

        const teacher = await prisma.teacher.update({
            where: { id },
            data: {
                ...(name && { name }),
                ...(email !== undefined && { email }),
                ...(phone && { phone }),
                ...(subject && { subject: Array.isArray(subject) ? subject : [subject] }),
                ...(salary !== undefined && { salary: parseFloat(salary) }),
                ...(joinDate && { joinDate: new Date(joinDate) }),
            }
        })

        return NextResponse.json({ success: true, message: 'Staff updated successfully', data: teacher })
    } catch (error) {
        console.error('Dooper staff put error:', error)
        return NextResponse.json({ error: 'Failed to update staff' }, { status: 500 })
    }
}

// DELETE — delete a staff member
export async function DELETE(req: NextRequest) {
    const admin = verifyDooperToken(req)
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Staff ID is required' }, { status: 400 })

        await prisma.$transaction(async (tx) => {
            await tx.leaveApplication.deleteMany({ where: { teacherId: id } })
            await tx.timeTable.deleteMany({ where: { teacherId: id } })
            await tx.teacherSalaryLedger.deleteMany({ where: { teacherId: id } })
            await tx.attendance.deleteMany({ where: { teacherId: id } })
            await tx.teacher.delete({ where: { id } })
        })

        return NextResponse.json({ success: true, message: 'Staff member deleted successfully' })
    } catch (error) {
        console.error('Dooper staff delete error:', error)
        return NextResponse.json({ error: 'Failed to delete staff member' }, { status: 500 })
    }
}
