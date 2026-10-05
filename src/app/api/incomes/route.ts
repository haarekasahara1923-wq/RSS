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
        const incomes = await prisma.income.findMany({ where, orderBy: { date: 'desc' } })
        return NextResponse.json({ success: true, data: incomes })
    } catch (err) {
        console.error('Fetch incomes error:', err)
        return NextResponse.json({ error: 'Failed to fetch income records' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { category, amount, date, mode, receivedFrom, reference, description } = await req.json()
        if (!category || !amount || !date) {
            return NextResponse.json({ error: 'Category, amount and date are required' }, { status: 400 })
        }
        const amt = parseFloat(amount)
        if (!(amt > 0)) return NextResponse.json({ error: 'Amount must be greater than 0' }, { status: 400 })

        const income = await prisma.income.create({
            data: {
                tenantId: user!.tenantId,
                category,
                amount: amt,
                date: dayStart(String(date).slice(0, 10)),
                mode: mode || 'CASH',
                receivedFrom: receivedFrom || '',
                reference: reference || '',
                description: description || '',
            }
        })
        return NextResponse.json({ success: true, data: income }, { status: 201 })
    } catch (err) {
        console.error('Create income error:', err)
        return NextResponse.json({ error: 'Failed to create income record' }, { status: 500 })
    }
}

export async function PATCH(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { id, category, amount, date, mode, receivedFrom, reference, description } = await req.json()
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        const existing = await prisma.income.findFirst({ where: { id, tenantId: user!.tenantId } })
        if (!existing) return NextResponse.json({ error: 'Record not found' }, { status: 404 })

        const income = await prisma.income.update({
            where: { id },
            data: {
                category: category ?? undefined,
                amount: amount !== undefined ? parseFloat(amount) : undefined,
                date: date ? dayStart(String(date).slice(0, 10)) : undefined,
                mode: mode ?? undefined,
                receivedFrom: receivedFrom ?? undefined,
                reference: reference ?? undefined,
                description: description ?? undefined,
            }
        })
        return NextResponse.json({ success: true, data: income })
    } catch (err) {
        console.error('Update income error:', err)
        return NextResponse.json({ error: 'Failed to update income record' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const id = new URL(req.url).searchParams.get('id')
        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 })
        const result = await prisma.income.deleteMany({ where: { id, tenantId: user!.tenantId } })
        if (!result.count) return NextResponse.json({ error: 'Record not found' }, { status: 404 })
        return NextResponse.json({ success: true })
    } catch (err) {
        console.error('Delete income error:', err)
        return NextResponse.json({ error: 'Failed to delete income record' }, { status: 500 })
    }
}
