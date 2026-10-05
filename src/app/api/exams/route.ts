import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { courseId, batchId } = Object.fromEntries(new URL(req.url).searchParams.entries())

        const where: any = { tenantId: user!.tenantId }
        if (courseId) where.courseId = courseId
        if (batchId) where.batchId = batchId

        const exams = await prisma.exam.findMany({
            where,
            include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                results: {
                    include: { student: { select: { fullName: true, studentId: true } } }
                }
            },
            orderBy: { date: 'desc' }
        })

        return NextResponse.json({ success: true, data: exams })
    } catch (err) {
        console.error('Fetch exams error:', err)
        return NextResponse.json({ error: 'Failed to fetch exams' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { title, subject, date, maxMarks, courseId, batchId, results } = body

        if (!title || !subject || !maxMarks || !courseId || !batchId || !results) {
            return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
        }

        const maxM = parseFloat(maxMarks)
        const exam = await prisma.exam.create({
            data: {
                tenantId: user!.tenantId,
                title,
                subject,
                date: new Date(date),
                maxMarks: maxM,
                courseId,
                batchId,
                teacherId: user!.userId,
                results: {
                    create: results.map((r: any) => ({
                        tenantId: user!.tenantId,
                        studentId: r.studentId,
                        marksObtained: parseFloat(r.marksObtained || '0'),
                        remarks: r.remarks || ''
                    }))
                }
            }
        })

        // Notify parents of each student with their marks
        const studentIds = results.map((r: any) => r.studentId)
        const students = await prisma.student.findMany({
            where: { id: { in: studentIds }, tenantId: user!.tenantId },
            select: { id: true, fullName: true, parentPhone: true, parentLinks: { select: { userId: true } } }
        })

        const notificationsData: any[] = []
        for (const res of results) {
            const stu = students.find(s => s.id === res.studentId)
            if (stu) {
                const marksObtained = parseFloat(res.marksObtained || '0')
                const pct = maxM > 0 ? Math.round((marksObtained / maxM) * 100) : 0
                notificationsData.push({
                    tenantId: user!.tenantId,
                    title: `📑 Marks Published: ${title} (${subject})`,
                    message: `${stu.fullName} obtained ${marksObtained}/${maxMarks} (${pct}%).${res.remarks ? ' Remarks: ' + res.remarks : ''}`,
                    type: 'NOTICE',
                    targetRole: 'PARENT',
                    targetId: stu.id,
                })
            }
        }

        if (notificationsData.length > 0) {
            await prisma.notification.createMany({ data: notificationsData }).catch(() => {})
        }

        return NextResponse.json({ success: true, data: exam }, { status: 201 })
    } catch (err) {
        console.error('Create exam error:', err)
        return NextResponse.json({ error: 'Failed to save exam marks' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Exam ID required' }, { status: 400 })

        await prisma.exam.delete({
            where: { id, tenantId: user!.tenantId }
        })

        return NextResponse.json({ success: true, message: 'Exam deleted successfully' })
    } catch (err) {
        console.error('Delete exam error:', err)
        return NextResponse.json({ error: 'Failed to delete exam' }, { status: 500 })
    }
}

