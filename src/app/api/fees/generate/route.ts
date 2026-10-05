import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { studentId, userCustomInstallments } = body
        if (!studentId) return NextResponse.json({ error: 'Student ID missing' }, { status: 400 })

        // Check if there are already installments
        const existingFees = await prisma.fee.count({
            where: { studentId, tenantId: user!.tenantId }
        })

        if (existingFees > 0) {
            return NextResponse.json({ error: 'Installments already exist for this student' }, { status: 400 })
        }

        const student = await prisma.student.findUnique({
            where: { id: studentId, tenantId: user!.tenantId },
            include: { course: true }
        })

        if (!student) {
            return NextResponse.json({ error: 'Student not found' }, { status: 404 })
        }

        // Create exactly 6 blank slots as requested by the user
        const installmentsToCreate = 6
        const feesToCreate: any[] = []

        for (let i = 0; i < installmentsToCreate; i++) {
            let dueDate = student.admissionDate ? new Date(student.admissionDate) : new Date()
            dueDate.setMonth(dueDate.getMonth() + i)

            feesToCreate.push({
                tenantId: user!.tenantId,
                studentId: student.id,
                amount: 0,
                dueDate: dueDate,
                status: 'PENDING',
                lateFee: 0,
                notes: `Installment ${i + 1}`,
            })
        }

        await prisma.fee.createMany({
            data: feesToCreate
        })

        const data = await prisma.fee.findMany({
            where: { studentId: student.id },
            orderBy: { dueDate: 'asc' }
        })

        return NextResponse.json({ success: true, data })

    } catch (err) {
        console.error('Generate fees error:', err)
        return NextResponse.json({ error: 'Failed to generate fees' }, { status: 500 })
    }
}
