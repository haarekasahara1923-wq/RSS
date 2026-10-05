import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPlanConfig, hasFeature, isWithinLimit, getUpgradePlanForFeature, type PlanFeatures, type PlanLimits } from '@/lib/planLimits'

export function getAuthUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
        return null
    }
    const token = authHeader.split(' ')[1]
    return verifyAccessToken(token)
}

export function requireAuth(req: NextRequest) {
    const user = getAuthUser(req)
    if (!user) {
        return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null }
    }
    return { error: null, user }
}

export function requireRole(req: NextRequest, roles: string[]) {
    const { error, user } = requireAuth(req)
    if (error) return { error, user: null }
    if (!roles.includes(user!.role)) {
        return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }), user: null }
    }
    return { error: null, user }
}

// Full-access roles (can create, edit, delete, block)
const FULL_ACCESS_ROLES = ['SUPER_ADMIN', 'COACHING_ADMIN']
// Sub-admin roles (can only add/view, NOT edit/delete/block)
const SUB_ADMIN_ROLES = ['ADMIN_OPERATION', 'ADMIN_LIBRARY', 'ADMIN_SPORTS', 'ADMIN_TRANSPORT']

export function requireWriteAccess(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return { error, user: null }
    if (SUB_ADMIN_ROLES.includes(user!.role)) {
        return {
            error: NextResponse.json({ error: 'Permission denied. Only Super Admin can edit, delete, or block records.' }, { status: 403 }),
            user: null,
        }
    }
    return { error: null, user }
}

export function isSubAdminRole(role: string): boolean {
    return SUB_ADMIN_ROLES.includes(role)
}


// Get the current tenant's subscription plan from database
export async function getTenantPlan(tenantId: string): Promise<string> {
    try {
        const sub = await prisma.subscription.findUnique({ where: { tenantId } })
        return sub?.plan || 'BASIC'
    } catch (err) {
        console.error('getTenantPlan error:', err)
        return 'BASIC'
    }
}

// Check if a feature is available for the tenant's plan
export async function requireFeature(req: NextRequest, feature: keyof PlanFeatures) {
    const { error, user } = requireAuth(req)
    if (error) return { error, user: null }

    const plan = await getTenantPlan(user!.tenantId)
    if (!hasFeature(plan, feature)) {
        const upgradeTo = getUpgradePlanForFeature(feature)
        return {
            error: NextResponse.json({
                error: `This feature requires ${upgradeTo} plan or higher. Please upgrade your subscription.`,
                code: 'PLAN_UPGRADE_REQUIRED',
                requiredPlan: upgradeTo,
                currentPlan: plan,
            }, { status: 403 }),
            user: null,
        }
    }
    return { error: null, user }
}

// Check if adding a new entity is within the plan limit
export async function checkPlanLimit(tenantId: string, limitKey: keyof PlanLimits, currentCount: number) {
    const plan = await getTenantPlan(tenantId)
    const config = getPlanConfig(plan)
    const max = config.limits[limitKey]

    if (max === 0) {
        return {
            allowed: false,
            message: `This feature is not available on the ${config.displayName} plan. Please upgrade to access it.`,
            currentPlan: plan,
            limit: max,
        }
    }

    if (max !== -1 && currentCount >= max) {
        return {
            allowed: false,
            message: `You've reached the maximum limit of ${max} for your ${config.displayName} plan. Please upgrade to add more.`,
            currentPlan: plan,
            limit: max,
        }
    }

    return { allowed: true, currentPlan: plan, limit: max }
}
