import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'



export async function GET() {
    try {
        const products = await prisma.gyankoshProduct.findMany({
            where: { isActive: true },
            include: { bonuses: true, orderBumps: true },
            orderBy: { createdAt: 'desc' },
        })

        return NextResponse.json({ products })
    } catch (error) {
        console.error('Error fetching gyankosh products:', error)
        return NextResponse.json({ error: 'Failed to fetch products' }, { status: 500 })
    }
}
