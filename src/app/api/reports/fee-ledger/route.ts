import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

/**
 * Fee Ledger API
 * GET /api/reports/fee-ledger
 * 
 * Query params:
 *   search     - search by student name, scholar no, mobile, or receipt no
 *   courseId   - filter by class
 *   batchId    - filter by section/batch
 *   dateFrom   - filter payments from date
 *   dateTo     - filter payments to date
 *   studentId  - get single student ledger (auto fetches siblings too)
 * 
 * Returns: students with their complete fee ledger + siblings info
 */
export async function GET(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  // Only super admin, coaching admin, and operation admin can access ledger
  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'ADMIN_OPERATION'].includes(user!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search')?.trim() || ''
    const courseId = searchParams.get('courseId') || ''
    const batchId = searchParams.get('batchId') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const studentId = searchParams.get('studentId') || ''

    // Build where clause
    const where: any = { tenantId: user!.tenantId }

    if (courseId) where.courseId = courseId
    if (batchId) where.batchId = batchId

    if (studentId) {
      // Find this student and their sibling group if any
      const targetStudent = await prisma.student.findUnique({
        where: { id: studentId, tenantId: user!.tenantId },
        select: { id: true, siblingGroupId: true, parentPhone: true, phone: true },
      })

      if (targetStudent?.siblingGroupId) {
        where.OR = [
          { id: studentId },
          { siblingGroupId: targetStudent.siblingGroupId },
        ]
      } else {
        where.id = studentId
      }
    } else if (search) {
      // Search by name, scholar no, phone, studentId, or receipt number
      const receiptMatchIds = search.match(/^REC-/i)
        ? await prisma.payment.findMany({
            where: { tenantId: user!.tenantId, receiptNo: { contains: search, mode: 'insensitive' } },
            select: { studentId: true },
          }).then(r => r.map(x => x.studentId))
        : []

      // First find students matching the search
      const initialMatches = await prisma.student.findMany({
        where: {
          tenantId: user!.tenantId,
          OR: [
            { fullName: { contains: search, mode: 'insensitive' } },
            { scholarNo: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { parentPhone: { contains: search } },
            { studentId: { contains: search, mode: 'insensitive' } },
            ...(receiptMatchIds.length > 0 ? [{ id: { in: receiptMatchIds } }] : []),
          ],
        },
        select: { id: true, siblingGroupId: true },
      })

      const matchedIds = new Set<string>(initialMatches.map(m => m.id))
      const matchedGroupIds = Array.from(new Set(initialMatches.map(m => m.siblingGroupId).filter(Boolean) as string[]))

      // Also include siblings from the same siblingGroupId so they appear together!
      if (matchedGroupIds.length > 0) {
        const siblingMatches = await prisma.student.findMany({
          where: { tenantId: user!.tenantId, siblingGroupId: { in: matchedGroupIds } },
          select: { id: true },
        })
        siblingMatches.forEach(m => matchedIds.add(m.id))
      }

      where.id = { in: Array.from(matchedIds) }
    }

    // Fetch students with fees & payments
    const students = await prisma.student.findMany({
      where,
      include: {
        course: { select: { id: true, name: true } },
        batch: { select: { id: true, name: true } },
        fees: {
          orderBy: { dueDate: 'asc' },
          include: {
            payments: {
              where: {
                ...(dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {}),
                ...(dateTo ? { createdAt: { lte: new Date(dateTo + 'T23:59:59') } } : {}),
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
        payments: {
          where: {
            ...(dateFrom ? { createdAt: { gte: new Date(dateFrom) } } : {}),
            ...(dateTo ? { createdAt: { lte: new Date(dateTo + 'T23:59:59') } } : {}),
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: [{ course: { name: 'asc' } }, { fullName: 'asc' }],
    })

    if (students.length === 0) {
      return NextResponse.json({ success: true, students: [], summary: { totalStudents: 0, totalBilled: 0, totalCollected: 0, totalOutstanding: 0 } })
    }

    // Build comprehensive siblings map
    const siblingGroupIds = Array.from(new Set(students.map(s => s.siblingGroupId).filter(Boolean) as string[]))
    const parentPhones = Array.from(new Set(students.flatMap(s => [s.parentPhone, s.phone].filter(Boolean) as string[])))

    // Fetch all related students in those sibling groups
    let allRelatedStudents: any[] = []
    if (siblingGroupIds.length > 0 || parentPhones.length > 0) {
      allRelatedStudents = await prisma.student.findMany({
        where: {
          tenantId: user!.tenantId,
          OR: [
            ...(siblingGroupIds.length > 0 ? [{ siblingGroupId: { in: siblingGroupIds } }] : []),
            ...(parentPhones.length > 0 ? [{ parentPhone: { in: parentPhones } }, { phone: { in: parentPhones } }] : []),
          ],
        },
        select: {
          id: true,
          fullName: true,
          scholarNo: true,
          studentId: true,
          parentPhone: true,
          phone: true,
          siblingGroupId: true,
          course: { select: { name: true } },
          batch: { select: { name: true } },
          totalFee: true,
          paidFee: true,
        },
      })
    }

    const siblingsMap: Record<string, any[]> = {}

    for (const s of students) {
      let sibs: any[] = []

      // 1. Prioritize official siblingGroupId
      if (s.siblingGroupId) {
        sibs = allRelatedStudents.filter(r => r.siblingGroupId === s.siblingGroupId && r.id !== s.id)
      }

      // 2. Fallback to parentPhone if no siblingGroupId match
      if (sibs.length === 0) {
        const phone = s.parentPhone || s.phone
        if (phone) {
          sibs = allRelatedStudents.filter(r => (r.parentPhone === phone || r.phone === phone) && r.id !== s.id)
        }
      }

      if (sibs.length > 0) {
        siblingsMap[s.id] = sibs.map(sib => ({
          id: sib.id,
          fullName: sib.fullName,
          scholarNo: sib.scholarNo,
          studentId: sib.studentId,
          class: sib.course?.name || '',
          section: sib.batch?.name || '',
          totalFee: sib.totalFee,
          paidFee: sib.paidFee,
          balance: Math.max(0, sib.totalFee - sib.paidFee),
          siblingGroupId: sib.siblingGroupId,
        }))
      }
    }

    // Build ledger entries for each student
    const enrichedStudents = students.map(student => {
      const ledgerEntries: any[] = []

      // Opening debit entry
      if (student.totalFee > 0) {
        ledgerEntries.push({
          date: student.admissionDate,
          type: 'DEBIT',
          particulars: 'Annual Fee / Tuition Fee (Opening)',
          debit: student.totalFee,
          credit: 0,
          balance: student.totalFee,
          receiptNo: null,
          mode: null,
        })
      }

      // Fee installment debits
      for (const fee of student.fees) {
        if (fee.amount > 0 && fee.notes !== 'Opening') {
          ledgerEntries.push({
            date: fee.dueDate,
            type: 'DEBIT',
            particulars: `Fee Due - ${fee.notes || 'Installment'}`,
            debit: fee.amount,
            credit: 0,
            balance: 0,
            receiptNo: null,
            mode: null,
          })

          // Payments against this fee
          for (const pay of fee.payments) {
            ledgerEntries.push({
              date: pay.createdAt,
              type: 'CREDIT',
              particulars: `Fee Payment - ${pay.notes || 'Receipt'}`,
              debit: 0,
              credit: pay.amount,
              balance: 0,
              receiptNo: pay.receiptNo,
              mode: pay.mode,
            })
          }
        }
      }

      // Direct payments not linked to a fee installment
      for (const pay of student.payments) {
        if (!pay.feeId) {
          ledgerEntries.push({
            date: pay.createdAt,
            type: 'CREDIT',
            particulars: `Direct Payment - ${pay.notes || 'Receipt'}`,
            debit: 0,
            credit: pay.amount,
            balance: 0,
            receiptNo: pay.receiptNo,
            mode: pay.mode,
          })
        }
      }

      // Sort by date and calculate running balance
      ledgerEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

      let balance = 0
      for (const entry of ledgerEntries) {
        balance += entry.debit - entry.credit
        entry.balance = balance
      }

      const totalPaid = student.payments.reduce((sum, p) => sum + p.amount, 0)
      const outstanding = Math.max(0, student.totalFee - totalPaid)
      const hasSiblings = !!(siblingsMap[student.id] && siblingsMap[student.id].length > 0)

      return {
        id: student.id,
        studentId: student.studentId,
        scholarNo: student.scholarNo || '',
        fullName: student.fullName,
        fatherName: student.fatherName,
        phone: student.phone,
        parentPhone: student.parentPhone,
        class: student.course?.name || '',
        section: student.batch?.name || '',
        courseId: student.courseId,
        batchId: student.batchId,
        siblingGroupId: student.siblingGroupId,
        totalFee: student.totalFee,
        totalPaid,
        outstanding,
        status: outstanding <= 0 ? 'CLEAR' : totalPaid > 0 ? 'PARTIAL' : 'PENDING',
        hasSiblings,
        siblings: siblingsMap[student.id] || [],
        ledger: ledgerEntries,
        admissionDate: student.admissionDate,
      }
    })

    // Summary stats
    const totalStudents = enrichedStudents.length
    const totalBilled = enrichedStudents.reduce((s, x) => s + x.totalFee, 0)
    const totalCollected = enrichedStudents.reduce((s, x) => s + x.totalPaid, 0)
    const totalOutstanding = enrichedStudents.reduce((s, x) => s + x.outstanding, 0)

    return NextResponse.json({
      success: true,
      students: enrichedStudents,
      summary: { totalStudents, totalBilled, totalCollected, totalOutstanding },
    })
  } catch (err: any) {
    console.error('Fee ledger error:', err)
    return NextResponse.json({ error: 'Failed to generate ledger: ' + (err.message || '') }, { status: 500 })
  }
}

/**
 * POST /api/reports/fee-ledger
 * Proportional gross fee deposit for siblings
 */
export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'ADMIN_OPERATION'].includes(user!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { studentId, siblingGroupId, parentPhone, totalAmount, mode, notes, receivedBy } = await req.json()

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      return NextResponse.json({ error: 'Valid gross amount is required' }, { status: 400 })
    }

    const grossAmount = parseFloat(totalAmount)

    // Locate the siblings group
    let siblings: any[] = []

    // 1. By siblingGroupId
    if (siblingGroupId) {
      siblings = await prisma.student.findMany({
        where: { tenantId: user!.tenantId, siblingGroupId },
        include: {
          course: { select: { name: true } },
          batch: { select: { name: true } },
          fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
        },
      })
    }

    // 2. By studentId
    if (siblings.length === 0 && studentId) {
      const target = await prisma.student.findUnique({
        where: { id: studentId, tenantId: user!.tenantId },
        include: { parentLinks: true },
      })

      if (target?.siblingGroupId) {
        siblings = await prisma.student.findMany({
          where: { tenantId: user!.tenantId, siblingGroupId: target.siblingGroupId },
          include: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
          },
        })
      } else if (target?.parentPhone || target?.phone) {
        const phone = target.parentPhone || target.phone
        siblings = await prisma.student.findMany({
          where: {
            tenantId: user!.tenantId,
            OR: [{ parentPhone: phone }, { phone }],
          },
          include: {
            course: { select: { name: true } },
            batch: { select: { name: true } },
            fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
          },
        })
      } else {
        siblings = [target]
      }
    }

    // 3. Fallback by parentPhone
    if (siblings.length === 0 && parentPhone) {
      siblings = await prisma.student.findMany({
        where: {
          tenantId: user!.tenantId,
          OR: [{ parentPhone }, { phone: parentPhone }],
        },
        include: {
          course: { select: { name: true } },
          batch: { select: { name: true } },
          fees: { where: { status: { not: 'PAID' } }, orderBy: { dueDate: 'asc' } },
        },
      })
    }

    if (siblings.length === 0) {
      return NextResponse.json({ error: 'No students found for this sibling payment' }, { status: 404 })
    }

    // Calculate total outstanding balances
    const duesMap = siblings.map(s => ({
      student: s,
      outstanding: Math.max(0, s.totalFee - s.paidFee),
    }))

    const totalOutstanding = duesMap.reduce((sum, d) => sum + d.outstanding, 0)

    if (totalOutstanding <= 0) {
      return NextResponse.json({ error: 'All siblings have already cleared their fees' }, { status: 400 })
    }

    // Generate parent receipt counter
    const paymentCount = await prisma.payment.count({ where: { tenantId: user!.tenantId } })
    const parentReceiptNo = `REC-P${String(paymentCount + 1).padStart(5, '0')}`

    const distributions: {
      studentId: string
      studentName: string
      scholarNo: string
      class: string
      amount: number
      receiptNo: string
    }[] = []

    // Proportional calculation
    const siblingsWithDues = duesMap.filter(d => d.outstanding > 0)
    let allocatedTotal = 0

    const paymentPlans: { student: any; amount: number }[] = []

    for (let i = 0; i < siblingsWithDues.length; i++) {
      const item = siblingsWithDues[i]
      let sibAmount = 0

      if (i === siblingsWithDues.length - 1) {
        // Last sibling gets the exact remainder to ensure gross total matches perfectly
        sibAmount = Math.max(0, Math.round((grossAmount - allocatedTotal) * 100) / 100)
      } else {
        const proportion = item.outstanding / totalOutstanding
        sibAmount = Math.round(grossAmount * proportion * 100) / 100
        allocatedTotal += sibAmount
      }

      if (sibAmount > 0) {
        paymentPlans.push({ student: item.student, amount: sibAmount })
      }
    }

    // Execute database updates in transaction
    await prisma.$transaction(async (tx) => {
      for (const plan of paymentPlans) {
        const sib = plan.student
        const sibAmount = plan.amount
        const receiptNo = `${parentReceiptNo}-${sib.scholarNo || sib.studentId || sib.id.slice(-4)}`

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
                paidDate: new Date(),
              },
            })
          }
        }

        // Create individual Payment record for this sibling's ledger
        await tx.payment.create({
          data: {
            tenantId: user!.tenantId,
            studentId: sib.id,
            feeId: primaryFeeId,
            amount: sibAmount,
            mode: mode || 'CASH',
            receiptNo,
            notes: notes
              ? `${notes} (Sibling Gross Payment: ${parentReceiptNo})`
              : `Sibling Gross Payment: ${parentReceiptNo}`,
            receivedBy: receivedBy || user!.email,
          },
        })

        // Update student paid fee
        await tx.student.update({
          where: { id: sib.id },
          data: { paidFee: { increment: sibAmount } },
        })

        distributions.push({
          studentId: sib.id,
          studentName: sib.fullName,
          scholarNo: sib.scholarNo || '-',
          class: sib.course?.name || '-',
          amount: sibAmount,
          receiptNo,
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `₹${grossAmount.toLocaleString('en-IN')} deposited & deferred proportionately among ${distributions.length} sibling(s)`,
      parentReceiptNo,
      distributions,
    })
  } catch (err: any) {
    console.error('Sibling payment error:', err)
    return NextResponse.json({ error: 'Failed to process sibling payment: ' + (err.message || '') }, { status: 500 })
  }
}
