import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireFeature, checkPlanLimit } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        // Feature gate check: User needs Pro/Elite plan for mock tests
        const featureCheck = await requireFeature(req, 'mockTests')
        if (featureCheck.error) return featureCheck.error

        const tests = await prisma.mockTest.findMany({
            where: { tenantId: user!.tenantId },
            include: {
                batch: { select: { name: true } },
                _count: { select: { questions: true } }
            },
            orderBy: { createdAt: 'desc' }
        })

        // Include plan limit info in response
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxMockTests', tests.length)

        return NextResponse.json({
            success: true,
            data: tests.map(t => ({
                ...t,
                batchName: t.batch?.name || 'All',
                questionCount: t._count.questions,
            })),
            planInfo: {
                limit: limitCheck.limit,
                used: tests.length,
                currentPlan: limitCheck.currentPlan,
                canAdd: limitCheck.allowed,
            },
        })
    } catch (err) {
        console.error('Fetch mock tests error:', err)
        return NextResponse.json({ error: 'Failed to fetch mock tests' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        // Feature gate check
        const featureCheck = await requireFeature(req, 'mockTests')
        if (featureCheck.error) return featureCheck.error

        // Limit check
        const currentCount = await prisma.mockTest.count({ where: { tenantId: user!.tenantId } })
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxMockTests', currentCount)

        if (!limitCheck.allowed) {
            return NextResponse.json({
                error: limitCheck.message,
                code: 'PLAN_LIMIT_REACHED',
                currentPlan: limitCheck.currentPlan,
                limit: limitCheck.limit,
                used: currentCount,
            }, { status: 403 })
        }

        const body = await req.json()
        const { title, subject, type, duration, totalMarks, passingMarks, negativeMarks, instructions, batchId } = body

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 })
        }

        const test = await prisma.mockTest.create({
            data: {
                tenantId: user!.tenantId,
                batchId: batchId || null,
                title,
                subject: subject || '',
                type: (type || 'MCQ') as any,
                duration: parseInt(duration) || 60,
                totalMarks: parseFloat(totalMarks) || 100,
                passingMarks: parseFloat(passingMarks) || 40,
                negativeMarks: parseFloat(negativeMarks) || 0,
                isPublished: false,
                instructions: instructions || '',
            }
        })
        return NextResponse.json({ success: true, data: test }, { status: 201 })
    } catch (err) {
        console.error('Create mock test error:', err)
        return NextResponse.json({ error: 'Failed to create mock test' }, { status: 500 })
    }
}
