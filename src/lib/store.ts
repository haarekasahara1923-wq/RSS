// Store interfaces only — all data is in PostgreSQL via Prisma
// This file kept for legacy type references only

export interface Tenant {
    id: string
    name: string
    slug: string
    logo?: string
    themeColor: string
    address?: string
    phone?: string
    email?: string
    isActive: boolean
    createdAt: Date
}

export interface User {
    id: string
    tenantId: string
    email: string
    phone?: string
    password: string
    name: string
    role: string
    avatar?: string
    isActive: boolean
    lastLogin?: Date
    createdAt: Date
}

export interface Student {
    id: string
    tenantId: string
    courseId: string
    batchId: string
    studentId?: string
    fullName: string
    fatherName?: string
    motherName?: string
    phone: string
    parentPhone?: string
    email?: string
    address?: string
    dob?: string
    gender: string
    photo?: string
    admissionDate: string
    feePlan?: string
    totalFee: number
    paidFee: number
    status: string
    notes?: string
    createdAt: Date
}

export interface Course {
    id: string
    tenantId: string
    name: string
    description?: string
    duration?: string
    fees: number
    subjects: string[]
    isActive: boolean
    createdAt: Date
}

export interface Batch {
    id: string
    tenantId: string
    courseId: string
    name: string
    startTime?: string
    endTime?: string
    capacity: number
    isActive: boolean
    createdAt: Date
}

export interface Teacher {
    id: string
    tenantId: string
    name: string
    email?: string
    phone: string
    subject: string[]
    salary: number
    joinDate: string
    isActive: boolean
    createdAt: Date
}

export interface Fee {
    id: string
    tenantId: string
    studentId: string
    amount: number
    dueDate: string
    paidDate?: string
    status: string
    lateFee: number
    notes?: string
    createdAt: Date
}

export interface Payment {
    id: string
    tenantId: string
    studentId: string
    feeId?: string
    amount: number
    mode: string
    reference?: string
    receivedBy?: string
    notes?: string
    createdAt: Date
}

export interface Attendance {
    id: string
    tenantId: string
    studentId?: string
    batchId: string
    date: string
    status: string
    markedBy?: string
    notes?: string
    createdAt: Date
}

export interface MockTest {
    id: string
    tenantId: string
    batchId?: string
    title: string
    subject?: string
    type: string
    duration: number
    totalMarks: number
    passingMarks: number
    negativeMarks: number
    isPublished: boolean
    instructions?: string
    createdAt: Date
}

export interface Question {
    id: string
    tenantId: string
    mockTestId?: string
    subject: string
    topic?: string
    questionText: string
    type: string
    options?: string[]
    correctAnswer?: string
    marks: number
    difficulty: string
    explanation?: string
    createdAt: Date
}

export interface Result {
    id: string
    tenantId: string
    studentId: string
    mockTestId: string
    totalMarks: number
    obtainedMarks: number
    percentage: number
    rank?: number
    createdAt: Date
}

export interface Expense {
    id: string
    tenantId: string
    category: string
    amount: number
    date: string
    description?: string
    paidTo?: string
    createdAt: Date
}

export interface Lead {
    id: string
    tenantId: string
    name: string
    phone: string
    email?: string
    course?: string
    source?: string
    status: string
    followUpDate?: string
    notes?: string
    assignedTo?: string
    createdAt: Date
}

export interface Subscription {
    id: string
    tenantId: string
    plan: string
    status: string
    trialEndsAt?: Date
    amount: number
    createdAt: Date
}

function cuid(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// Empty store — all data lives in PostgreSQL via Prisma
export const store = {
    tenants: [] as Tenant[],
    users: [] as User[],
    students: [] as Student[],
    courses: [] as Course[],
    batches: [] as Batch[],
    teachers: [] as Teacher[],
    fees: [] as Fee[],
    payments: [] as Payment[],
    attendances: [] as Attendance[],
    mockTests: [] as MockTest[],
    questions: [] as Question[],
    results: [] as Result[],
    expenses: [] as Expense[],
    leads: [] as Lead[],
    subscriptions: [] as Subscription[],
}

export function generateId(): string {
    return cuid()
}

export function getTenantStore(tenantId: string) {
    return {
        students: store.students.filter(s => s.tenantId === tenantId),
        courses: store.courses.filter(c => c.tenantId === tenantId),
        batches: store.batches.filter(b => b.tenantId === tenantId),
        teachers: store.teachers.filter(t => t.tenantId === tenantId),
        fees: store.fees.filter(f => f.tenantId === tenantId),
        payments: store.payments.filter(p => p.tenantId === tenantId),
        attendances: store.attendances.filter(a => a.tenantId === tenantId),
        mockTests: store.mockTests.filter(m => m.tenantId === tenantId),
        questions: store.questions.filter(q => q.tenantId === tenantId),
        results: store.results.filter(r => r.tenantId === tenantId),
        expenses: store.expenses.filter(e => e.tenantId === tenantId),
        leads: store.leads.filter(l => l.tenantId === tenantId),
    }
}
