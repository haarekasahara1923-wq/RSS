/**
 * School Accounts helpers (server-side)
 * Builds a unified cash-book / ledger from:
 *   - Fee Payments  (Credit / Receipt)
 *   - Other Income  (Credit / Receipt)
 *   - Expenses      (Debit  / Payment)
 */
import { prisma } from '@/lib/prisma'

export type LedgerEntryType = 'CREDIT' | 'DEBIT'
export type LedgerSource = 'FEE' | 'INCOME' | 'EXPENSE'

export interface LedgerEntry {
    id: string
    date: string            // ISO
    source: LedgerSource
    type: LedgerEntryType
    category: string
    particulars: string
    mode: string
    reference: string
    credit: number
    debit: number
    balance: number
}

export interface DailySummary {
    date: string            // YYYY-MM-DD
    opening: number
    credit: number
    debit: number
    closing: number
    count: number
}

/** Parse YYYY-MM-DD as local start of day (IST server-agnostic: treat as UTC+05:30) */
const IST_OFFSET_MIN = 330

export function dayStart(dateStr: string): Date {
    // Interpret date string as an Indian calendar day
    const d = new Date(`${dateStr}T00:00:00.000+05:30`)
    return d
}

export function dayEnd(dateStr: string): Date {
    return new Date(`${dateStr}T23:59:59.999+05:30`)
}

/** Convert a Date to IST calendar day YYYY-MM-DD */
export function toISTDay(d: Date): string {
    const ist = new Date(d.getTime() + IST_OFFSET_MIN * 60000)
    return ist.toISOString().slice(0, 10)
}

export function todayIST(): string {
    return toISTDay(new Date())
}

/** Financial year start (1 April) for a given IST day */
export function fyStart(day: string): string {
    const [y, m] = day.split('-').map(Number)
    const startYear = m >= 4 ? y : y - 1
    return `${startYear}-04-01`
}

const round2 = (n: number) => Math.round(n * 100) / 100

interface RawEntry {
    id: string
    date: Date
    source: LedgerSource
    type: LedgerEntryType
    category: string
    particulars: string
    mode: string
    reference: string
    amount: number
}

async function fetchRawEntries(tenantId: string, from?: Date, to?: Date): Promise<RawEntry[]> {
    const range = (field: string) => {
        const r: any = {}
        if (from) r.gte = from
        if (to) r.lte = to
        return Object.keys(r).length ? { [field]: r } : {}
    }

    const [payments, incomes, expenses] = await Promise.all([
        prisma.payment.findMany({
            where: { tenantId, ...range('createdAt') },
            include: { student: { select: { fullName: true } } },
        }),
        prisma.income.findMany({ where: { tenantId, ...range('date') } }),
        prisma.expense.findMany({ where: { tenantId, ...range('date') } }),
    ])

    const out: RawEntry[] = []
    for (const p of payments as any[]) {
        out.push({
            id: p.id,
            date: p.createdAt,
            source: 'FEE',
            type: 'CREDIT',
            category: 'Fee Collection',
            particulars: `Fee received from ${p.student?.fullName || 'Student'}${p.notes ? ` — ${p.notes}` : ''}`,
            mode: p.mode || 'CASH',
            reference: p.receiptNo || p.reference || '',
            amount: Number(p.amount) || 0,
        })
    }
    for (const i of incomes) {
        out.push({
            id: i.id,
            date: i.date,
            source: 'INCOME',
            type: 'CREDIT',
            category: i.category,
            particulars: `${i.category}${i.receivedFrom ? ` from ${i.receivedFrom}` : ''}${i.description ? ` — ${i.description}` : ''}`,
            mode: i.mode || 'CASH',
            reference: i.reference || '',
            amount: Number(i.amount) || 0,
        })
    }
    for (const e of expenses) {
        out.push({
            id: e.id,
            date: e.date,
            source: 'EXPENSE',
            type: 'DEBIT',
            category: e.category,
            particulars: `${e.category}${e.paidTo ? ` paid to ${e.paidTo}` : ''}${e.description ? ` — ${e.description}` : ''}`,
            mode: e.mode || 'CASH',
            reference: e.reference || '',
            amount: Number(e.amount) || 0,
        })
    }
    out.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.type === 'CREDIT' ? -1 : 1))
    return out
}

/**
 * Build the ledger for a date range (inclusive, IST days).
 * Opening balance = tenant opening balance + all credits − debits before `from`
 * (counting only entries on/after the configured ledger opening date, if any).
 */
export async function buildLedger(tenantId: string, fromDay: string, toDay: string) {
    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { ledgerOpeningBalance: true, ledgerOpeningDate: true, name: true },
    })
    const baseOpening = Number(tenant?.ledgerOpeningBalance || 0)
    const baseDate = tenant?.ledgerOpeningDate || undefined

    const from = dayStart(fromDay)
    const to = dayEnd(toDay)

    // Everything before the range → contributes to opening balance
    let opening = baseOpening
    const prior = await fetchRawEntries(tenantId, baseDate, new Date(from.getTime() - 1))
    for (const e of prior) opening += e.type === 'CREDIT' ? e.amount : -e.amount
    opening = round2(opening)

    const effectiveFrom = baseDate && baseDate > from ? baseDate : from
    const raw = await fetchRawEntries(tenantId, effectiveFrom, to)

    let running = opening
    let totalCredit = 0
    let totalDebit = 0
    const entries: LedgerEntry[] = raw.map(e => {
        const credit = e.type === 'CREDIT' ? e.amount : 0
        const debit = e.type === 'DEBIT' ? e.amount : 0
        running = round2(running + credit - debit)
        totalCredit += credit
        totalDebit += debit
        return {
            id: e.id,
            date: e.date.toISOString(),
            source: e.source,
            type: e.type,
            category: e.category,
            particulars: e.particulars,
            mode: e.mode,
            reference: e.reference,
            credit,
            debit,
            balance: running,
        }
    })

    // Day-wise summary for every calendar day in range (so ledger is current to today)
    const daily: DailySummary[] = []
    const byDay = new Map<string, LedgerEntry[]>()
    for (const e of entries) {
        const k = toISTDay(new Date(e.date))
        if (!byDay.has(k)) byDay.set(k, [])
        byDay.get(k)!.push(e)
    }
    let dayOpening = opening
    const cursor = new Date(`${fromDay}T12:00:00.000Z`)
    const last = new Date(`${toDay}T12:00:00.000Z`)
    let guard = 0
    while (cursor <= last && guard < 1000) {
        const k = cursor.toISOString().slice(0, 10)
        const list = byDay.get(k) || []
        const c = list.reduce((s, x) => s + x.credit, 0)
        const d = list.reduce((s, x) => s + x.debit, 0)
        const closing = round2(dayOpening + c - d)
        daily.push({ date: k, opening: round2(dayOpening), credit: round2(c), debit: round2(d), closing, count: list.length })
        dayOpening = closing
        cursor.setUTCDate(cursor.getUTCDate() + 1)
        guard++
    }

    return {
        schoolName: tenant?.name || '',
        from: fromDay,
        to: toDay,
        baseOpening,
        baseOpeningDate: baseDate ? toISTDay(baseDate) : null,
        openingBalance: opening,
        totalCredit: round2(totalCredit),
        totalDebit: round2(totalDebit),
        closingBalance: round2(opening + totalCredit - totalDebit),
        entries,
        daily,
    }
}

/** Profit & Loss (Income & Expenditure) for a date range */
export async function buildPnL(tenantId: string, fromDay: string, toDay: string) {
    const raw = await fetchRawEntries(tenantId, dayStart(fromDay), dayEnd(toDay))
    const incomeMap = new Map<string, number>()
    const expenseMap = new Map<string, number>()
    const modeMap = new Map<string, number>()
    for (const e of raw) {
        if (e.type === 'CREDIT') {
            incomeMap.set(e.category, (incomeMap.get(e.category) || 0) + e.amount)
            modeMap.set(e.mode, (modeMap.get(e.mode) || 0) + e.amount)
        } else {
            expenseMap.set(e.category, (expenseMap.get(e.category) || 0) + e.amount)
        }
    }
    const income = [...incomeMap.entries()].map(([category, amount]) => ({ category, amount: round2(amount) })).sort((a, b) => b.amount - a.amount)
    const expenses = [...expenseMap.entries()].map(([category, amount]) => ({ category, amount: round2(amount) })).sort((a, b) => b.amount - a.amount)
    const totalIncome = round2(income.reduce((s, x) => s + x.amount, 0))
    const totalExpense = round2(expenses.reduce((s, x) => s + x.amount, 0))
    const net = round2(totalIncome - totalExpense)

    // Month-wise trend
    const monthMap = new Map<string, { income: number; expense: number }>()
    for (const e of raw) {
        const k = toISTDay(e.date).slice(0, 7)
        if (!monthMap.has(k)) monthMap.set(k, { income: 0, expense: 0 })
        const m = monthMap.get(k)!
        if (e.type === 'CREDIT') m.income += e.amount
        else m.expense += e.amount
    }
    const monthly = [...monthMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, v]) => ({
        month, income: round2(v.income), expense: round2(v.expense), net: round2(v.income - v.expense),
    }))

    return {
        from: fromDay,
        to: toDay,
        income,
        expenses,
        totalIncome,
        totalExpense,
        netProfit: net,
        isProfit: net >= 0,
        receiptsByMode: [...modeMap.entries()].map(([mode, amount]) => ({ mode, amount: round2(amount) })),
        monthly,
    }
}
