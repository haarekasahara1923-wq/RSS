import { NextRequest, NextResponse } from 'next/server'
export const dynamic = 'force-dynamic'
import { requireAuth } from '@/app/api/middleware'
import { prisma } from '@/lib/prisma'
import { dayStart, dayEnd } from '@/lib/accounts'

export async function GET(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const sp = new URL(req.url).searchParams
        const from = sp.get('from')
        const to = sp.get('to')
        const where: any = { tenantId: user!.tenantId }
        if (from || to) {
            where.date = {}
            if (from) where.date.gte = dayStart(from)
            if (to) where.date.lte = dayEnd(to)
        }
        const expenses = await prisma.expense.findMany({ where, orderBy: { date: 'desc' } })
        return NextResponse.json({ success: true, data: expenses })
    } catch (err) {
        console.error('Fetch expenses error:', err)
        return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { category, amount, date, description, paidTo, mode, reference } = body

        if (!category || !amount || !date) {
            return NextResponse.json({ error: 'Category, amount and date are required' }, { status: 400 })
        }
        const amt = parseFloat(amount)
        if (!(amt > 0)) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })

        const expense = await prisma.expense.create({
            data: {
                tenantId: user!.tenantId,
                category,
                amount: amt,
                date: dayStart(String(date).slice(0, 10)),
                description: description || '',
                paidTo: paidTo || '',
                mode: mode || 'CASH',
                reference: reference || '',
            }
        })
        return NextResponse.json({ success: true, data: expense }, { status: 201 })
    } catch (err) {
        console.error('Create expense error:', err)
        return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const body = await req.json()
        const { id, category, amount, date, description, paidTo, mode, reference } = body
        if (!id) return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })

        const existing = await prisma.expense.findFirst({ where: { id, tenantId: user!.tenantId } })
        if (!existing) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })

        const expense = await prisma.expense.update({
            where: { id },
            data: {
                category: category ?? undefined,
                amount: amount !== undefined ? parseFloat(amount) : undefined,
                date: date ? dayStart(String(date).slice(0, 10)) : undefined,
                description: description ?? undefined,
                paidTo: paidTo ?? undefined,
                mode: mode ?? undefined,
                reference: reference ?? undefined,
            }
        })
        return NextResponse.json({ success: true, data: expense })
    } catch (err) {
        console.error('Update expense error:', err)
        return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const id = new URL(req.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'Expense ID is required' }, { status: 400 })
        const result = await prisma.expense.deleteMany({ where: { id, tenantId: user!.tenantId } })
        if (!result.count) return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Delete expense error:', err)
        return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 })
    }
}
