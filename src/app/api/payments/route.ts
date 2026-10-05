import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { dayStart, dayEnd, todayIST } from '@/lib/accounts'

/** Convert YYYY-MM-DD into a timestamp; today's date keeps the current time */
function paymentDate(date?: string): Date | undefined {
    if (!date) return undefined
    const d = String(date).slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return undefined
    if (d === todayIST()) return new Date()
    return new Date(`${d}T12:00:00.000+05:30`)
}

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const sp = new URL(req.url).searchParams
        const from = sp.get('from')
        const to = sp.get('to')
        const where: any = { tenantId: user!.tenantId }
        if (from || to) {
            where.createdAt = {}
            if (from) where.createdAt.gte = dayStart(from)
            if (to) where.createdAt.lte = dayEnd(to)
        }
        const payments = await prisma.payment.findMany({
            where,
            include: { student: { select: { fullName: true } } },
            orderBy: { createdAt: 'desc' }
        })

        const data = payments.map(p => ({
            ...p,
            studentName: p.student.fullName,
        }))

        return NextResponse.json({ success: true, data })
    } catch (err) {
        console.error('Fetch payments error:', err)
        return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { studentId, feeId, amount, mode, reference, receivedBy, notes, date } = body

        if (!studentId || !amount) {
            return NextResponse.json({ error: 'Student ID and amount are required' }, { status: 400 })
        }

        // Use a transaction to ensure both payment is created and student's paidFee is updated
        const result = await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.create({
                data: {
                    tenantId: user!.tenantId,
                    studentId,
                    feeId: feeId || null,
                    amount: parseFloat(amount),
                    mode: mode as any || 'CASH',
                    reference: reference || '',
                    receivedBy: receivedBy || '',
                    notes: notes || '',
                    ...(paymentDate(date) ? { createdAt: paymentDate(date) } : {}),
                }
            })

            await tx.student.update({
                where: { id: studentId },
                data: {
                    paidFee: { increment: parseFloat(amount) }
                }
            })

            // Update Installment Fee status if provided
            if (feeId) {
                const feeRecord = await tx.fee.findUnique({ where: { id: feeId } });
                if (feeRecord) {
                    const newStatus = parseFloat(amount) >= feeRecord.amount ? 'PAID' : 'PARTIAL';
                    await tx.fee.update({
                        where: { id: feeId },
                        data: {
                            status: newStatus,
                            paidDate: new Date(),
                        }
                    });
                }
            }

            return payment
        })

        return NextResponse.json({ success: true, data: result }, { status: 201 })
    } catch (err) {
        console.error('Create payment error:', err)
        return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { id, amount, mode, reference, notes, date } = body

        if (!id) return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })

        const result = await prisma.$transaction(async (tx) => {
            const oldPayment = await tx.payment.findUnique({
                where: { id, tenantId: user!.tenantId }
            })
            if (!oldPayment) throw new Error('Payment not found')

            const amountDiff = (parseFloat(amount) || oldPayment.amount) - oldPayment.amount

            const updatedPayment = await tx.payment.update({
                where: { id },
                data: {
                    amount: amount !== undefined ? parseFloat(amount) : undefined,
                    mode: mode as any,
                    reference,
                    notes,
                    ...(paymentDate(date) ? { createdAt: paymentDate(date) } : {}),
                }
            })

            if (amountDiff !== 0) {
                await tx.student.update({
                    where: { id: oldPayment.studentId },
                    data: { paidFee: { increment: amountDiff } }
                })
            }

            return updatedPayment
        })

        return NextResponse.json({ success: true, data: result })
    } catch (err: any) {
        console.error('Update payment error:', err)
        return NextResponse.json({ error: err.message || 'Failed to update payment' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { id } = Object.fromEntries(new URL(req.url).searchParams.entries())
        if (!id) return NextResponse.json({ error: 'Payment ID is required' }, { status: 400 })

        await prisma.$transaction(async (tx) => {
            const payment = await tx.payment.findUnique({
                where: { id, tenantId: user!.tenantId }
            })
            if (!payment) throw new Error('Payment not found')

            await tx.student.update({
                where: { id: payment.studentId },
                data: { paidFee: { decrement: payment.amount } }
            })

            await tx.payment.delete({ where: { id } })
        })

        return NextResponse.json({ success: true, message: 'Payment deleted' })
    } catch (err: any) {
        console.error('Delete payment error:', err)
        return NextResponse.json({ error: err.message || 'Failed to delete payment' }, { status: 500 })
    }
}
