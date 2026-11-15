import { prisma } from '@/lib/prisma'
import { getNextReceiptNumber } from '@/lib/receiptNumber'

export interface SiblingPaymentInput {
  tenantId: string
  studentId?: string
  siblingGroupId?: string
  parentPhone?: string
  parentUserId?: string
  totalAmount: number
  mode?: string
  date?: string
  notes?: string
  receivedBy?: string
  userEmail?: string
}

export interface SiblingDistribution {
  studentId: string
  studentName: string
  scholarNo: string
  class: string
  previousOutstanding: number
  amount: number
  newOutstanding: number
  receiptNo: string
}

export interface SiblingPaymentResult {
  success: boolean
  parentReceiptNo: string
  totalAmount: number
  distributions: SiblingDistribution[]
  message: string
}

/**
 * Universal Sibling Collective Fee Deposit Engine
 * Proportionately distributes a gross payment amount across all linked siblings
 * based on each sibling's remaining fee dues.
 */
export async function processSiblingCollectivePayment(
  input: SiblingPaymentInput
): Promise<SiblingPaymentResult> {
  const {
    tenantId,
    studentId,
    siblingGroupId,
    parentPhone,
    parentUserId,
    totalAmount,
    mode = 'CASH',
    date,
    notes = 'Collective Sibling Group Fee Installment',
    receivedBy,
    userEmail,
  } = input

  const grossAmount = parseFloat(String(totalAmount))
  if (isNaN(grossAmount) || grossAmount <= 0) {
    throw new Error('Valid gross amount is required')
  }

  // 1. Locate all siblings
  let siblings: any[] = []

  // Strategy A: by siblingGroupId
  if (siblingGroupId) {
    siblings = await prisma.student.findMany({
      where: { tenantId, siblingGroupId },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
        parentLinks: true,
      },
      orderBy: { admissionDate: 'asc' },
    })
  }

  // Strategy B: by parentUserId
  if (siblings.length === 0 && parentUserId) {
    const parentProfile = await prisma.parentProfile.findUnique({
      where: { userId: parentUserId },
      include: {
        children: {
          where: { tenantId },
          include: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
            parentLinks: true,
          },
          orderBy: { admissionDate: 'asc' },
        },
      },
    })
    if (parentProfile?.children && parentProfile.children.length > 0) {
      siblings = parentProfile.children
    }
  }

  // Strategy C: by studentId
  if (siblings.length === 0 && studentId) {
    const target = await prisma.student.findUnique({
      where: { id: studentId, tenantId },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        parentLinks: {
          include: {
            children: {
              where: { tenantId },
              include: {
                course: { select: { name: true } },
                batch: { select: { name: true } },
                fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
                parentLinks: true,
              },
            },
          },
        },
      },
    })

    if (target) {
      if (target.siblingGroupId) {
        siblings = await prisma.student.findMany({
          where: { tenantId, siblingGroupId: target.siblingGroupId },
          include: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
            parentLinks: true,
          },
          orderBy: { admissionDate: 'asc' },
        })
      } else if (
        target.parentLinks &&
        target.parentLinks.length > 0 &&
        target.parentLinks[0].children &&
        target.parentLinks[0].children.length > 1
      ) {
        siblings = target.parentLinks[0].children
      } else if (target.parentPhone || target.phone) {
        const ph = target.parentPhone || target.phone
        siblings = await prisma.student.findMany({
          where: {
            tenantId,
            OR: [{ parentPhone: ph }, { phone: ph }],
          },
          include: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
            parentLinks: true,
          },
          orderBy: { admissionDate: 'asc' },
        })
      }

      if (siblings.length === 0) {
        siblings = [target]
      }
    }
  }

  // Strategy D: by parentPhone fallback
  if (siblings.length === 0 && parentPhone) {
    siblings = await prisma.student.findMany({
      where: {
        tenantId,
        OR: [{ parentPhone }, { phone: parentPhone }],
      },
      include: {
        course: { select: { name: true } },
        batch: { select: { name: true } },
        fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
        parentLinks: true,
      },
      orderBy: { admissionDate: 'asc' },
    })
  }

  if (siblings.length === 0) {
    throw new Error('No students found for this sibling payment')
  }

  // Ensure all these siblings have a persistent shared siblingGroupId
  const existingGroupId = siblings.find((s) => s.siblingGroupId)?.siblingGroupId
  const targetGroupId = existingGroupId || `sib_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
  const unlinkedSiblingIds = siblings.filter((s) => s.siblingGroupId !== targetGroupId).map((s) => s.id)
  if (unlinkedSiblingIds.length > 0) {
    await prisma.student.updateMany({
      where: { id: { in: siblings.map((s) => s.id) }, tenantId },
      data: { siblingGroupId: targetGroupId },
    })
  }

  // 2. Calculate remaining dues for each sibling
  const duesMap = siblings.map((s) => ({
    student: s,
    outstanding: Math.max(0, s.totalFee - s.paidFee),
  }))

  const totalOutstanding = duesMap.reduce((sum, d) => sum + d.outstanding, 0)
  if (totalOutstanding <= 0) {
    throw new Error('All siblings have already cleared their fees')
  }

  // 3. Proportionate distribution calculation
  const siblingsWithDues = duesMap.filter((d) => d.outstanding > 0)
  let allocatedTotal = 0
  const paymentPlans: { student: any; amount: number; outstanding: number }[] = []

  for (let i = 0; i < siblingsWithDues.length; i++) {
    const item = siblingsWithDues[i]
    let sibAmount = 0

    if (i === siblingsWithDues.length - 1) {
      // Last sibling gets the exact remaining amount so total matches perfectly
      sibAmount = Math.max(0, Math.round((grossAmount - allocatedTotal) * 100) / 100)
    } else {
      const proportion = item.outstanding / totalOutstanding
      sibAmount = Math.round(grossAmount * proportion * 100) / 100
      allocatedTotal += sibAmount
    }

    if (sibAmount > 0) {
      paymentPlans.push({
        student: item.student,
        amount: sibAmount,
        outstanding: item.outstanding,
      })
    }
  }

  if (paymentPlans.length === 0) {
    throw new Error('Allocated payment amount is zero')
  }

  const distributions: SiblingDistribution[] = []
  let parentReceiptNo = ''

  // 4. Database Transaction
  await prisma.$transaction(async (tx) => {
    // Generate sequential parent receipt number using tenant rules
    parentReceiptNo = await getNextReceiptNumber(tx, tenantId)
    const paymentDateObj = date ? new Date(date) : new Date()

    for (let idx = 0; idx < paymentPlans.length; idx++) {
      const plan = paymentPlans[idx]
      const sib = plan.student
      const sibAmount = plan.amount
      const siblingReceiptNo = `${parentReceiptNo}-${sib.scholarNo || sib.studentId || idx + 1}`

      // Check if there are unpaid fee installments to allocate towards
      let remainingToAllocate = sibAmount
      let primaryFeeId: string | null = null

      if (sib.fees && sib.fees.length > 0) {
        for (const fee of sib.fees) {
          if (remainingToAllocate <= 0) break
          primaryFeeId = primaryFeeId || fee.id

          const feeDue = fee.amount > 0 ? fee.amount : remainingToAllocate
          const alloc = Math.min(feeDue, remainingToAllocate)
          remainingToAllocate -= alloc

          const newStatus = alloc >= feeDue ? 'PAID' : 'PARTIAL'
          await tx.fee.update({
            where: { id: fee.id },
            data: {
              status: newStatus as any,
              paidDate: paymentDateObj,
            },
          })
        }
      }

      // Create Payment record for this sibling
      await tx.payment.create({
        data: {
          tenantId,
          studentId: sib.id,
          feeId: primaryFeeId,
          amount: sibAmount,
          mode: (mode as any) || 'CASH',
          receiptNo: siblingReceiptNo,
          notes: `${notes} (Collective Receipt: ${parentReceiptNo})`,
          receivedBy: receivedBy || userEmail || 'School Office',
          createdAt: paymentDateObj,
        },
      })

      // Increment student paidFee
      await tx.student.update({
        where: { id: sib.id },
        data: { paidFee: { increment: sibAmount } },
      })

      distributions.push({
        studentId: sib.id,
        studentName: sib.fullName,
        scholarNo: sib.scholarNo || '-',
        class: sib.course?.name || '-',
        previousOutstanding: plan.outstanding,
        amount: sibAmount,
        newOutstanding: Math.max(0, plan.outstanding - sibAmount),
        receiptNo: siblingReceiptNo,
      })
    }
  })

  return {
    success: true,
    parentReceiptNo,
    totalAmount: grossAmount,
    distributions,
    message: `₹${grossAmount.toLocaleString('en-IN')} deposited & distributed proportionately among ${distributions.length} sibling(s)`,
  }
}
