import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const url = new URL(req.url)
        const courseId = url.searchParams.get('courseId')
        const batchId = url.searchParams.get('batchId')

        const where: any = { tenantId: user!.tenantId }
        if (courseId) where.courseId = courseId
        if (batchId) where.batchId = batchId

        const events = await prisma.admitCardEvent.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                _count: { select: { admitCards: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        return NextResponse.json({ success: true, data: events })
    } catch (err) {
        console.error('Fetch admit card events error:', err)
        return NextResponse.json({ error: 'Failed to fetch admit card events' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { courseId, batchId, examName, startDate, endDate } = body

        if (!courseId || !examName || !startDate || !endDate) {
            return NextResponse.json({ error: 'Required fields missing: Class, Exam Name, Start Date, and End Date are mandatory' }, { status: 400 })
        }

        // Ensure a valid batchId exists for AdmitCardEvent relation
        let resolvedBatchId = batchId && batchId !== 'all' ? batchId : null
        if (!resolvedBatchId) {
            let existingBatch = await prisma.batch.findFirst({
                where: { tenantId: user!.tenantId, courseId, isActive: true }
            })
            if (!existingBatch) {
                existingBatch = await prisma.batch.create({
                    data: {
                        tenantId: user!.tenantId,
                        courseId,
                        name: 'Section A',
                        isActive: true
                    }
                })
            }
            resolvedBatchId = existingBatch.id
        }

        // Get active students in this class/batch
        const studentWhere: any = {
            tenantId: user!.tenantId,
            courseId,
            status: 'ACTIVE'
        }
        if (batchId && batchId !== 'all') {
            const hasBatchStudents = await prisma.student.count({
                where: { tenantId: user!.tenantId, courseId, batchId, status: 'ACTIVE' }
            })
            if (hasBatchStudents > 0) {
                studentWhere.batchId = batchId
            }
        }

        const students = await prisma.student.findMany({
            where: studentWhere,
            select: { id: true }
        })

        if (students.length === 0) {
            return NextResponse.json({ error: 'No active students found in this class. Please ensure students are admitted to this class.' }, { status: 400 })
        }

        const event = await prisma.admitCardEvent.create({
            data: {
                tenantId: user!.tenantId,
                courseId,
                batchId: resolvedBatchId,
                examName,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                createdBy: user!.userId,
                timeTable: body.timeTable || [],
                admitCards: {
                    create: students.map(s => ({
                        tenantId: user!.tenantId,
                        studentId: s.id
                    }))
                }
            }
        })

        return NextResponse.json({ success: true, data: event }, { status: 201 })
    } catch (err) {
        console.error('Create admit card event error:', err)
        return NextResponse.json({ error: 'Failed to create admit card event' }, { status: 500 })
    }
}
