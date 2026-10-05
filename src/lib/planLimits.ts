// =============================================
// PLAN LIMITS & FEATURE GATING CONFIGURATION
// =============================================
// This is the single source of truth for all plan-based restrictions.
// Basic → Limited features (starter coaching centers)
// Pro → Advanced features (growing institutes)
// Elite → Everything unlimited (large chains)

export type PlanType = 'BASIC' | 'PRO' | 'ELITE'

export interface PlanLimits {
    maxStudents: number       // -1 = unlimited
    maxTeachers: number       // -1 = unlimited
    maxBranches: number       // -1 = unlimited
    maxMockTests: number      // per month, -1 = unlimited
    maxAIQuestions: number    // per month, -1 = unlimited
    maxWhatsAppMessages: number // per month, -1 = unlimited
    maxLeads: number          // -1 = unlimited
    maxCourses: number        // -1 = unlimited
    maxBatches: number        // -1 = unlimited
}

export interface PlanFeatures {
    feeManagement: boolean
    attendance: boolean
    analytics: boolean
    mockTests: boolean
    aiTools: boolean
    whatsApp: boolean
    leadManagement: boolean
    expenseTracking: boolean
    multiBranch: boolean
    whiteLabel: boolean
    customDomain: boolean
    apiAccess: boolean
    franchiseMode: boolean
    advancedReports: boolean
    bulkSmsEmail: boolean
    parentPortal: boolean
}

export interface PlanConfig {
    name: string
    displayName: string
    price: number
    limits: PlanLimits
    features: PlanFeatures
}

// =============================================
// PLAN CONFIGURATIONS
// =============================================

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
    BASIC: {
        name: 'BASIC',
        displayName: 'Basic',
        price: 999,
        limits: {
            maxStudents: -1,
            maxTeachers: -1,
            maxBranches: 1,
            maxMockTests: 5,
            maxAIQuestions: 0,       // Not available in basic
            maxWhatsAppMessages: 0,  // Not available in basic
            maxLeads: 0,             // Not available in basic
            maxCourses: 5,
            maxBatches: 10,
        },
        features: {
            feeManagement: true,
            attendance: true,       // Basic attendance only
            analytics: false,       // Pro+ feature
            mockTests: false,       // Pro+ feature
            aiTools: false,         // Pro+ feature
            whatsApp: false,        // Pro+ feature
            leadManagement: false,  // Pro+ feature
            expenseTracking: true,  // Basic has basic expense tracking
            multiBranch: false,     // Elite feature
            whiteLabel: false,      // Elite feature
            customDomain: false,    // Elite feature
            apiAccess: false,       // Elite feature
            franchiseMode: false,   // Elite feature
            advancedReports: false, // Pro+ feature
            bulkSmsEmail: false,    // Pro+ feature
            parentPortal: false,    // Pro+ feature
        },
    },

    PRO: {
        name: 'PRO',
        displayName: 'Pro',
        price: 2999,
        limits: {
            maxStudents: 500,
            maxTeachers: 10,
            maxBranches: 1,
            maxMockTests: -1,        // Unlimited
            maxAIQuestions: 500,     // 500 per month
            maxWhatsAppMessages: 1000,
            maxLeads: -1,            // Unlimited
            maxCourses: -1,
            maxBatches: -1,
        },
        features: {
            feeManagement: true,
            attendance: true,
            analytics: true,
            mockTests: true,
            aiTools: true,
            whatsApp: true,
            leadManagement: true,
            expenseTracking: true,
            multiBranch: false,     // Elite feature
            whiteLabel: false,      // Elite feature
            customDomain: false,    // Elite feature
            apiAccess: false,       // Elite feature
            franchiseMode: false,   // Elite feature
            advancedReports: true,
            bulkSmsEmail: true,
            parentPortal: true,
        },
    },

    ELITE: {
        name: 'ELITE',
        displayName: 'Elite',
        price: 5999,
        limits: {
            maxStudents: -1,        // Unlimited
            maxTeachers: -1,        // Unlimited
            maxBranches: -1,        // Unlimited
            maxMockTests: -1,       // Unlimited
            maxAIQuestions: -1,     // Unlimited
            maxWhatsAppMessages: -1,// Unlimited
            maxLeads: -1,           // Unlimited
            maxCourses: -1,         // Unlimited
            maxBatches: -1,         // Unlimited
        },
        features: {
            feeManagement: true,
            attendance: true,
            analytics: true,
            mockTests: true,
            aiTools: true,
            whatsApp: true,
            leadManagement: true,
            expenseTracking: true,
            multiBranch: true,
            whiteLabel: true,
            customDomain: true,
            apiAccess: true,
            franchiseMode: true,
            advancedReports: true,
            bulkSmsEmail: true,
            parentPortal: true,
        },
    },
}

// =============================================
// HELPER FUNCTIONS
// =============================================

export function getPlanConfig(plan: string): PlanConfig {
    const normalized = (plan || 'BASIC').toUpperCase() as PlanType
    return PLAN_CONFIGS[normalized] || PLAN_CONFIGS.BASIC
}

export function hasFeature(plan: string, feature: keyof PlanFeatures): boolean {
    const config = getPlanConfig(plan)
    return config.features[feature]
}

export function getLimit(plan: string, limit: keyof PlanLimits): number {
    const config = getPlanConfig(plan)
    return config.limits[limit]
}

export function isWithinLimit(plan: string, limit: keyof PlanLimits, currentCount: number): boolean {
    const max = getLimit(plan, limit)
    if (max === -1) return true // Unlimited
    return currentCount < max
}

export function getLimitDisplay(plan: string, limit: keyof PlanLimits): string {
    const max = getLimit(plan, limit)
    if (max === -1) return 'Unlimited'
    if (max === 0) return 'Not available'
    return max.toString()
}

export function getUpgradePlanForFeature(feature: keyof PlanFeatures): PlanType {
    if (PLAN_CONFIGS.PRO.features[feature]) return 'PRO'
    return 'ELITE'
}

export function getUpgradePlanForLimit(limit: keyof PlanLimits, currentPlan: string): PlanType | null {
    const plan = (currentPlan || 'BASIC').toUpperCase() as PlanType
    if (plan === 'BASIC') return 'PRO'
    if (plan === 'PRO') return 'ELITE'
    return null // Already on Elite
}

// Sidebar navigation items with their required features
export const NAV_FEATURE_MAP: Record<string, keyof PlanFeatures | null> = {
    '/dashboard': null,              // Always available
    '/dashboard/students': null,     // Always available (limited by count)
    '/dashboard/students/add': null, // Always available (limited by count)
    '/dashboard/courses': null,      // Always available
    '/dashboard/fees': null,         // fee management - always available
    '/dashboard/payments': null,     // fee management - always available
    '/dashboard/expenses': null,     // Basic expense tracking
    '/dashboard/accounts/ledger': null, // School cash-book / ledger
    '/dashboard/accounts/pnl': null,    // Profit & Loss account
    '/dashboard/attendance': null,   // Basic attendance - always available
    '/dashboard/profile': null,      // Always available
    '/dashboard/subscription': null, // Always available
    '/dashboard/analytics': 'analytics',
    '/dashboard/mock-tests': 'mockTests',
    '/dashboard/ai-tools': 'aiTools',
    '/dashboard/teachers': null,     // Always available (limited by count)
    '/dashboard/leads': 'leadManagement',
    '/dashboard/whatsapp': 'whatsApp',
}
