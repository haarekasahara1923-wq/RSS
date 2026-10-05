import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth, requireFeature, checkPlanLimit } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        // Feature gate check: User needs Pro/Elite plan for leads
        const featureCheck = await requireFeature(req, 'leadManagement')
        if (featureCheck.error) return featureCheck.error

        const leads = await prisma.lead.findMany({
            where: { tenantId: user!.tenantId },
            orderBy: { createdAt: 'desc' }
        })

        // Include plan limit info in response
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxLeads', leads.length)

        return NextResponse.json({
            success: true,
            data: leads,
            planInfo: {
                limit: limitCheck.limit,
                used: leads.length,
                currentPlan: limitCheck.currentPlan,
                canAdd: limitCheck.allowed,
            },
        })
    } catch (err) {
        console.error('Fetch leads error:', err)
        return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        // Feature gate check
        const featureCheck = await requireFeature(req, 'leadManagement')
        if (featureCheck.error) return featureCheck.error

        // Limit check
        const currentCount = await prisma.lead.count({ where: { tenantId: user!.tenantId } })
        const limitCheck = await checkPlanLimit(user!.tenantId, 'maxLeads', currentCount)

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
        const { name, phone, email, course, source, followUpDate, notes, assignedTo } = body

        if (!name || !phone) {
            return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 })
        }

        const lead = await prisma.lead.create({
            data: {
                tenantId: user!.tenantId,
                name,
                phone,
                email: email || '',
                course: course || '',
                source: source || '',
                status: 'NEW',
                followUpDate: followUpDate ? new Date(followUpDate) : null,
                notes: notes || '',
                assignedTo: assignedTo || '',
            }
        })
        return NextResponse.json({ success: true, data: lead }, { status: 201 })
    } catch (err) {
        console.error('Create lead error:', err)
        return NextResponse.json({ error: 'Failed to create lead' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        // Feature gate check
        const featureCheck = await requireFeature(req, 'leadManagement')
        if (featureCheck.error) return featureCheck.error

        const body = await req.json()
        const { id, status, notes, followUpDate } = body

        const lead = await prisma.lead.updateMany({
            where: { id, tenantId: user!.tenantId },
            data: {
                status: status as any,
                notes,
                followUpDate: followUpDate ? new Date(followUpDate) : undefined,
            }
        })

        if (lead.count === 0) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Update lead error:', err)
        return NextResponse.json({ error: 'Failed to update lead' }, { status: 500 })
    }
}
