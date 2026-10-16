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
        displayName: 'Unlimited School Plan',
        price: 0,
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

    PRO: {
        name: 'PRO',
        displayName: 'Unlimited School Plan',
        price: 0,
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

    ELITE: {
        name: 'ELITE',
        displayName: 'Unlimited School Plan',
        price: 0,
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
    return PLAN_CONFIGS.ELITE
}

export function hasFeature(plan: string, feature: keyof PlanFeatures): boolean {
    return true
}

export function getLimit(plan: string, limit: keyof PlanLimits): number {
    return -1
}

export function isWithinLimit(plan: string, limit: keyof PlanLimits, currentCount: number): boolean {
    return true // Always unlimited
}

export function getLimitDisplay(plan: string, limit: keyof PlanLimits): string {
    return 'Unlimited'
}

export function getUpgradePlanForFeature(feature: keyof PlanFeatures): PlanType {
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
