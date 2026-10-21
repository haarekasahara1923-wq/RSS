import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  try {
    // Fetch the parent profile with all children
    const profile = await prisma.parentProfile.findUnique({
      where: { userId: user!.userId },
      include: {
        children: {
          include: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            fees: {
              include: {
                payments: { orderBy: { createdAt: 'desc' } },
              },
              orderBy: { dueDate: 'asc' },
            },
            payments: { orderBy: { createdAt: 'desc' } },
          },
        },
        tenant: {
          select: {
            name: true,
            address: true,
            phone: true,
            email: true,
            logo: true,
            schoolCode: true,
            directorSign: true,
          },
        },
      },
    })

    if (!profile) {
      return NextResponse.json({ error: 'Parent profile not found' }, { status: 404 })
    }

    // Build the fee ledger per child
    const ledger = profile.children.map((child) => {
      const totalFee = child.totalFee
      const paidFee = child.paidFee
      const dueAmount = Math.max(0, totalFee - paidFee)

      // Build installment rows from fee records
      const installments = child.fees.map((fee) => ({
        id: fee.id,
        notes: fee.notes || 'Fee Installment',
        amount: fee.amount,
        dueDate: fee.dueDate,
        paidDate: fee.paidDate,
        status: fee.status,
        lateFee: fee.lateFee,
        payments: fee.payments,
      }))

      // Payment history across all fee records
      const allPayments = child.payments.map((p) => ({
        id: p.id,
        amount: p.amount,
        mode: p.mode,
        receiptNo: p.receiptNo,
        notes: p.notes,
        createdAt: p.createdAt,
        feeId: p.feeId,
      }))

      return {
        studentId: child.id,
        fullName: child.fullName,
        fatherName: child.fatherName,
        scholarNo: child.scholarNo,
        studentCode: child.studentId,
        phone: child.phone,
        parentPhone: child.parentPhone,
        course: child.course?.name || '',
        batch: child.batch?.name || '',
        totalFee,
        paidFee,
        dueAmount,
        installments,
        payments: allPayments,
      }
    })

    // Combined totals (for siblings case)
    const combinedTotal = ledger.reduce((s, c) => s + c.totalFee, 0)
    const combinedPaid = ledger.reduce((s, c) => s + c.paidFee, 0)
    const combinedDue = Math.max(0, combinedTotal - combinedPaid)

    return NextResponse.json({
      success: true,
      school: profile.tenant,
      children: ledger,
      summary: {
        totalFee: combinedTotal,
        paidFee: combinedPaid,
        dueAmount: combinedDue,
        childrenCount: ledger.length,
      },
    })
  } catch (err) {
    console.error('Parent fee-ledger error:', err)
    return NextResponse.json({ error: 'Failed to fetch fee ledger' }, { status: 500 })
  }
}
