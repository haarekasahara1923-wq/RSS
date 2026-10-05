import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/app/api/middleware'

export const dynamic = 'force-dynamic'

/**
 * Fee Ledger API
 * GET /api/reports/fee-ledger
 * 
 * Query params:
 *   search     - search by student name, mobile, or receipt no
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

  // Only super admin and coaching admin can access ledger
  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'ADMIN_OPERATION'].includes(user!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const search = searchParams.get('search') || ''
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
      where.id = studentId
    } else if (search) {
      // Search by name, phone, or receipt number
      const receiptMatchIds = search.match(/^REC-/i)
        ? await prisma.payment.findMany({
            where: { tenantId: user!.tenantId, receiptNo: { contains: search, mode: 'insensitive' } },
            select: { studentId: true },
          }).then(r => r.map(x => x.studentId))
        : []

      where.OR = [
        { fullName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { parentPhone: { contains: search } },
        { studentId: { contains: search, mode: 'insensitive' } },
        ...(receiptMatchIds.length > 0 ? [{ id: { in: receiptMatchIds } }] : []),
      ]
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
      return NextResponse.json({ success: true, students: [], siblings: {} })
    }

    // Find siblings: students sharing same parentPhone
    const parentPhones = [
      ...new Set(students.flatMap(s => [s.parentPhone, s.phone].filter(Boolean) as string[]))
    ]

    let siblingsMap: Record<string, string[]> = {} // studentId -> [sibling studentIds]

    if (parentPhones.length > 0) {
      const allRelated = await prisma.student.findMany({
        where: {
          tenantId: user!.tenantId,
          OR: [
            { parentPhone: { in: parentPhones } },
            { phone: { in: parentPhones } },
          ],
        },
        select: {
          id: true, fullName: true, studentId: true, parentPhone: true, phone: true,
          course: { select: { name: true } }, batch: { select: { name: true } },
          totalFee: true, paidFee: true,
        },
      })

      // Group by parentPhone to detect siblings
      const phoneGroups: Record<string, typeof allRelated> = {}
      for (const s of allRelated) {
        const key = s.parentPhone || s.phone || ''
        if (!phoneGroups[key]) phoneGroups[key] = []
        phoneGroups[key].push(s)
      }

      // Build sibling map for each searched student
      for (const s of students) {
        const phone = s.parentPhone || s.phone || ''
        const group = phoneGroups[phone] || []
        const siblings = group.filter(g => g.id !== s.id)
        if (siblings.length > 0) {
          siblingsMap[s.id] = siblings.map(sib => ({
            id: sib.id,
            fullName: sib.fullName,
            studentId: sib.studentId,
            class: sib.course.name,
            section: sib.batch.name,
            totalFee: sib.totalFee,
            paidFee: sib.paidFee,
            balance: sib.totalFee - sib.paidFee,
          })) as any
        }
      }
    }

    // Build ledger entries for each student
    const enrichedStudents = students.map(student => {
      let runningBalance = student.totalFee // starts as amount owed
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
            balance: 0, // will recalculate below
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
      const outstanding = student.totalFee - totalPaid

      return {
        id: student.id,
        studentId: student.studentId,
        fullName: student.fullName,
        fatherName: student.fatherName,
        phone: student.phone,
        parentPhone: student.parentPhone,
        class: student.course.name,
        section: student.batch.name,
        courseId: student.courseId,
        batchId: student.batchId,
        totalFee: student.totalFee,
        totalPaid,
        outstanding,
        status: outstanding <= 0 ? 'CLEAR' : outstanding < student.totalFee ? 'PARTIAL' : 'PENDING',
        hasSiblings: !!(siblingsMap[student.id]),
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
  } catch (err) {
    console.error('Fee ledger error:', err)
    return NextResponse.json({ error: 'Failed to generate ledger' }, { status: 500 })
  }
}

/**
 * POST /api/reports/fee-ledger
 * Proportional sibling fee deposit
 */
export async function POST(req: NextRequest) {
  const { error, user } = requireAuth(req)
  if (error) return error

  if (!['SUPER_ADMIN', 'COACHING_ADMIN', 'ADMIN_OPERATION'].includes(user!.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { parentPhone, totalAmount, mode, notes, receivedBy } = await req.json()

    if (!parentPhone || !totalAmount || totalAmount <= 0) {
      return NextResponse.json({ error: 'Parent phone and total amount are required' }, { status: 400 })
    }

    // Find all siblings (students with same parentPhone)
    const siblings = await prisma.student.findMany({
      where: {
        tenantId: user!.tenantId,
        OR: [{ parentPhone }, { phone: parentPhone }],
      },
    })

    if (siblings.length === 0) {
      return NextResponse.json({ error: 'No students found with this parent phone number' }, { status: 404 })
    }

    // Calculate proportional distribution based on outstanding balances
    const totalOutstanding = siblings.reduce((sum, s) => sum + Math.max(0, s.totalFee - s.paidFee), 0)

    if (totalOutstanding === 0) {
      return NextResponse.json({ error: 'All siblings have cleared their fees' }, { status: 400 })
    }

    // Generate parent receipt counter
    const paymentCount = await prisma.payment.count({ where: { tenantId: user!.tenantId } })
    const parentReceiptNo = `REC-P${String(paymentCount + 1).padStart(5, '0')}`

    const distributions: { studentId: string; amount: number; receiptNo: string }[] = []

    for (const sib of siblings) {
      const outstanding = Math.max(0, sib.totalFee - sib.paidFee)
      if (outstanding <= 0) continue

      const proportion = outstanding / totalOutstanding
      const sibAmount = Math.round(totalAmount * proportion * 100) / 100

      if (sibAmount <= 0) continue

      const receiptNo = `${parentReceiptNo}-${sib.studentId || sib.id.slice(-4)}`

      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            tenantId: user!.tenantId,
            studentId: sib.id,
            amount: sibAmount,
            mode: mode || 'CASH',
            receiptNo,
            notes: notes ? `${notes} (Sibling group: ${parentReceiptNo})` : `Sibling group payment: ${parentReceiptNo}`,
            receivedBy: receivedBy || user!.email,
          },
        })

        await tx.student.update({
          where: { id: sib.id },
          data: { paidFee: { increment: sibAmount } },
        })

        distributions.push({ studentId: sib.id, amount: sibAmount, receiptNo })
      })
    }

    return NextResponse.json({
      success: true,
      message: `₹${totalAmount.toLocaleString('en-IN')} distributed among ${distributions.length} siblings`,
      parentReceiptNo,
      distributions,
    })
  } catch (err) {
    console.error('Sibling payment error:', err)
    return NextResponse.json({ error: 'Failed to process sibling payment' }, { status: 500 })
  }
}
