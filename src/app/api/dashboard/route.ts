import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    const tenantId = user!.tenantId
    const today = new Date()
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    
    try {
        const [
            allStudents,
            totalStudents,
            activeStudents,
            newAdmissionsThisMonth,
            revenueData,
            thisMonthRevenueData,
            expensesData,
            totalTeachers,
            totalLeads,
            totalTests,
            recentPayments,
            courses,
            leadsData
        ] = await Promise.all([
            prisma.student.findMany({ where: { tenantId }, select: { totalFee: true, paidFee: true, courseId: true } }),
            prisma.student.count({ where: { tenantId } }),
            prisma.student.count({ where: { tenantId, status: 'ACTIVE' } }),
            prisma.student.count({ where: { tenantId, admissionDate: { gte: firstDayOfMonth } } }),
            prisma.payment.aggregate({ _sum: { amount: true }, where: { tenantId } }),
            prisma.payment.aggregate({ _sum: { amount: true }, where: { tenantId, createdAt: { gte: firstDayOfMonth } } }),
            prisma.expense.aggregate({ _sum: { amount: true }, where: { tenantId } }),
            prisma.teacher.count({ where: { tenantId } }),
            prisma.lead.count({ where: { tenantId } }),
            prisma.mockTest.count({ where: { tenantId } }),
            prisma.payment.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'desc' },
                take: 5,
                include: { student: { select: { fullName: true } } }
            }),
            prisma.course.findMany({
                where: { tenantId },
                include: { _count: { select: { students: true } } }
            }),
            prisma.lead.findMany({ where: { tenantId }, select: { status: true } })
        ])

        const totalRevenue = revenueData._sum.amount || 0
        const thisMonthRevenue = thisMonthRevenueData._sum.amount || 0
        const totalExpenses = expensesData._sum.amount || 0
        const totalOutstanding = allStudents.reduce((sum, s) => sum + (s.totalFee - s.paidFee), 0)

        // Monthly revenue for chart (last 6 months)
        const monthlyRevenue = await Promise.all(
            Array.from({ length: 6 }, async (_, i) => {
                const monthDate = new Date(today.getFullYear(), today.getMonth() - 5 + i, 1)
                const endOfMonth = new Date(today.getFullYear(), today.getMonth() - 4 + i, 0, 23, 59, 59)
                const label = monthDate.toLocaleDateString('en-IN', { month: 'short' })
                
                const monthRevenue = await prisma.payment.aggregate({
                    _sum: { amount: true },
                    where: {
                        tenantId,
                        createdAt: {
                            gte: monthDate,
                            lte: endOfMonth
                        }
                    }
                })
                return { month: label, amount: monthRevenue._sum.amount || 0 }
            })
        )

        // Course distribution
        const courseDistribution = courses.map(c => ({
            name: c.name,
            value: c._count.students,
        })).filter(c => c.value > 0)

        // Lead funnel
        const leadFunnel = [
            { stage: 'New', count: leadsData.filter(l => l.status === 'NEW').length },
            { stage: 'Contacted', count: leadsData.filter(l => l.status === 'CONTACTED').length },
            { stage: 'Interested', count: leadsData.filter(l => l.status === 'INTERESTED').length },
            { stage: 'Converted', count: leadsData.filter(l => l.status === 'CONVERTED').length },
        ]

        return NextResponse.json({
            success: true,
            data: {
                overview: {
                    totalStudents,
                    activeStudents,
                    newAdmissionsThisMonth,
                    totalRevenue,
                    thisMonthRevenue,
                    totalOutstanding,
                    totalExpenses,
                    netProfit: totalRevenue - totalExpenses,
                    totalTeachers,
                    totalLeads,
                    totalTests,
                },
                monthlyRevenue,
                courseDistribution,
                leadFunnel,
                recentPayments: recentPayments.map(p => ({
                    id: p.id,
                    studentName: p.student.fullName,
                    amount: p.amount,
                    mode: p.mode,
                    createdAt: p.createdAt,
                })),
            },
        })
    } catch (err) {
        console.error('Dashboard data fetch error:', err)
        return NextResponse.json({ success: false, error: 'Failed to fetch dashboard data' }, { status: 500 })
    }
}
