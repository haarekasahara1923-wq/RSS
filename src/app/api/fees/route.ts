import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { searchParams } = new URL(req.url);
        const studentId = searchParams.get('studentId');

        const whereClause: any = { tenantId: user!.tenantId };
        if (studentId) {
            whereClause.studentId = studentId;
        }

        const fees = await prisma.fee.findMany({
            where: whereClause,
            include: { student: { select: { fullName: true, phone: true } } },
            orderBy: { dueDate: 'asc' }
        })

        const data = fees.map(f => ({
            ...f,
            studentName: f.student.fullName,
            studentPhone: f.student.phone,
        }))

        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('Fetch fees error:', err)
        return NextResponse.json({ error: 'Failed to fetch fees' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { studentId, amount, dueDate, notes } = body

        if (!studentId || !amount || !dueDate) {
            return NextResponse.json({ error: 'Required fields missing' }, { status: 400 })
        }

        const fee = await prisma.fee.create({
            data: {
                tenantId: user!.tenantId,
                studentId,
                amount: parseFloat(amount),
                dueDate: new Date(dueDate),
                status: 'PENDING',
                lateFee: 0,
                notes: notes || '',
            }
        })
        return NextResponse.json({ success: true, data: fee }, { status: 201 })
    } catch (err) {
        console.error('Create fee error:', err)
        return NextResponse.json({ error: 'Failed to create fee' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { id, amount, mode } = body

        if (!id) return NextResponse.json({ error: 'Fee ID is required' }, { status: 400 })

        const result = await prisma.$transaction(async (tx) => {
            const oldFee = await tx.fee.findUnique({
                where: { id, tenantId: user!.tenantId }
            })
            if (!oldFee) throw new Error('Fee record not found')

            const newAmount = parseFloat(amount) || 0
            const diff = newAmount - oldFee.amount
            const paymentMode = mode || 'CASH'

            // Update Fee Record
            const updatedFee = await tx.fee.update({
                where: { id },
                data: {
                    amount: newAmount,
                    status: newAmount > 0 ? 'PAID' : 'PENDING',
                    paidDate: newAmount > 0 ? new Date() : null,
                }
            })

            // Sync with Payment Record (to keep dashboard/history accurate)
            const existingPayment = await tx.payment.findFirst({
                where: { feeId: id, tenantId: user!.tenantId }
            })

            if (existingPayment) {
                if (newAmount === 0) {
                    await tx.payment.delete({ where: { id: existingPayment.id } })
                } else {
                    await tx.payment.update({
                        where: { id: existingPayment.id },
                        data: { amount: newAmount, mode: paymentMode as any }
                    })
                }
            } else if (newAmount > 0) {
                await tx.payment.create({
                    data: {
                        tenantId: user!.tenantId,
                        studentId: oldFee.studentId,
                        feeId: id,
                        amount: newAmount,
                        mode: paymentMode as any,
                        notes: `Slot Payment: ${oldFee.notes || 'Custom Slot'}`
                    }
                })
            }

            // Update Student Total Paid Fee
            if (diff !== 0) {
                await tx.student.update({
                    where: { id: oldFee.studentId },
                    data: {
                        paidFee: { increment: diff }
                    }
                })
            }

            return updatedFee
        })

        return NextResponse.json({ success: true, data: result })
    } catch (err: any) {
        console.error('Update fee error:', err)
        return NextResponse.json({ error: err.message || 'Failed to update fee' }, { status: 500 })
    }
}
