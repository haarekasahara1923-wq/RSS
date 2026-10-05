import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireWriteAccess } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    const url = new URL(req.url)
    const teacherId = url.searchParams.get('teacherId')
    const monthStr = url.searchParams.get('month')
    const yearStr = url.searchParams.get('year')

    try {
        let whereClause: any = { tenantId: user!.tenantId }
        
        if (teacherId) whereClause.teacherId = teacherId
        if (monthStr) whereClause.month = parseInt(monthStr)
        if (yearStr) whereClause.year = parseInt(yearStr)

        const ledgers = await prisma.teacherSalaryLedger.findMany({
            where: whereClause,
            include: {
                teacher: { select: { id: true, name: true, salary: true } }
            },
            orderBy: [{ year: 'desc' }, { month: 'desc' }]
        })

        return NextResponse.json({ success: true, data: ledgers })
    } catch (err) {
        console.error('Fetch salary ledger error:', err)
        return NextResponse.json({ error: 'Failed to fetch ledgers' }, { status: 500 })
    }
}

// Generate salary for a month
export async function POST(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const body = await req.json()
        const { teacherId, month, year } = body

        if (!teacherId || !month || !year) {
            return NextResponse.json({ error: 'teacherId, month, and year are required' }, { status: 400 })
        }

        const teacher = await prisma.teacher.findUnique({
            where: { id: teacherId, tenantId: user!.tenantId }
        })

        if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 })

        const baseSalary = teacher.salary || 0

        // Count absents and rejected leaves in this month
        // Assuming month is 1-12
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        
        const attendances = await prisma.attendance.findMany({
            where: {
                tenantId: user!.tenantId,
                teacherId: teacher.id,
                date: {
                    gte: startDate,
                    lte: endDate
                }
            }
        })

        const unapprovedAbsents = attendances.filter(a => a.status === 'ABSENT').length
        
        // Simple logic: deduct baseSalary / 30 for every absent day
        const dailyRate = baseSalary / 30
        const deductions = Math.round(unapprovedAbsents * dailyRate)
        const netPayable = Math.max(0, baseSalary - deductions)

        const ledger = await prisma.teacherSalaryLedger.upsert({
            where: {
                teacherId_month_year: { teacherId: teacher.id, month, year }
            },
            update: {
                baseSalary,
                deductions,
                netPayable
            },
            create: {
                tenantId: user!.tenantId,
                teacherId: teacher.id,
                month,
                year,
                baseSalary,
                deductions,
                netPayable,
                status: 'UNPAID'
            }
        })

        return NextResponse.json({ success: true, data: ledger })
    } catch (err) {
        console.error('Generate salary error:', err)
        return NextResponse.json({ error: 'Failed to generate salary' }, { status: 500 })
    }
}

// Pay salary (reverse entry logic to Expense)
export async function PATCH(req: NextRequest) {
    const { error, user } = requireWriteAccess(req)
    if (error) return error

    try {
        const body = await req.json()
        const { ledgerId } = body

        if (!ledgerId) return NextResponse.json({ error: 'ledgerId is required' }, { status: 400 })

        const ledger = await prisma.teacherSalaryLedger.findUnique({
            where: { id: ledgerId, tenantId: user!.tenantId },
            include: { teacher: true }
        })

        if (!ledger) return NextResponse.json({ error: 'Ledger not found' }, { status: 404 })
        if (ledger.status === 'PAID') return NextResponse.json({ error: 'Already paid' }, { status: 400 })

        // Process payment in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // 1. Mark ledger as paid
            const updatedLedger = await tx.teacherSalaryLedger.update({
                where: { id: ledgerId },
                data: { status: 'PAID', paidDate: new Date() }
            })

            // 2. Add entry to Expense
            await tx.expense.create({
                data: {
                    tenantId: user!.tenantId,
                    category: 'Salary',
                    amount: ledger.netPayable,
                    date: new Date(),
                    description: `Salary for ${ledger.teacher.name} - ${ledger.month}/${ledger.year}`,
                    paidTo: ledger.teacher.name,
                    mode: 'BANK_TRANSFER' // Default
                }
            })

            return updatedLedger
        })

        return NextResponse.json({ success: true, data: result })
    } catch (err) {
        console.error('Pay salary error:', err)
        return NextResponse.json({ error: 'Failed to pay salary' }, { status: 500 })
    }
}
