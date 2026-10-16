import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'
import type { PlanFeatures, PlanLimits } from '@/lib/planLimits'

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


// Get the current tenant's subscription plan (all tenants have full unlimited access)
export async function getTenantPlan(tenantId: string): Promise<string> {
    return 'UNLIMITED'
}

// Check if a feature is available for the tenant's plan - all features enabled
export async function requireFeature(req: NextRequest, feature: keyof PlanFeatures) {
    const { error, user } = requireAuth(req)
    if (error) return { error, user: null }
    return { error: null, user }
}

// Check if adding a new entity is within the plan limit - always allowed (unlimited)
export async function checkPlanLimit(tenantId: string, limitKey: keyof PlanLimits, currentCount: number) {
    return { allowed: true, currentPlan: 'UNLIMITED', limit: -1, message: '' }
}
