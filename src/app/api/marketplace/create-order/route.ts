import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import Razorpay from 'razorpay'

export async function POST(req: Request) {
    try {
        const key_id = process.env.RAZORPAY_KEY_ID || ''
        const key_secret = process.env.RAZORPAY_KEY_SECRET || ''
        
        if (!key_id || !key_secret) {
            return NextResponse.json({ error: 'Razorpay keys not configured' }, { status: 500 })
        }

        const razorpay = new Razorpay({ key_id, key_secret })

        const { items, studentName, email, phone, affiliateTenantId } = await req.json()

        if (!items || !Array.isArray(items) || items.length === 0) {
            return NextResponse.json({ error: 'No items in order' }, { status: 400 })
        }

        let totalAmount = 0
        const dbItems: any[] = []

        // Fetch each product and calculate prices
        for (const item of items) {
            const product = await prisma.gyankoshProduct.findUnique({
                where: { id: item.productId },
                include: { orderBumps: true }
            })

            if (!product || !product.isActive) continue

            const mainPrice = product.price - (product.price * (product.discount / 100))
            let bumpsPrice = 0
            const selectedBumpIds: string[] = []

            if (item.orderBumpIds && item.orderBumpIds.length > 0) {
                const selectedBumps = product.orderBumps.filter(b => item.orderBumpIds.includes(b.id))
                bumpsPrice = selectedBumps.reduce((sum, b) => sum + b.discountedPrice, 0)
                selectedBumps.forEach(b => selectedBumpIds.push(b.id))
            }

            totalAmount += (mainPrice + bumpsPrice)
            dbItems.push({
                productId: product.id,
                orderBumpIds: selectedBumpIds,
                amount: mainPrice + bumpsPrice
            })
        }

        if (dbItems.length === 0) {
            return NextResponse.json({ error: 'No valid products found' }, { status: 404 })
        }

        const amountInPaise = Math.round(totalAmount * 100)

        // Verify affiliate
        let validAffiliateId = null
        if (affiliateTenantId) {
            const coaching = await prisma.tenant.findUnique({
                where: { id: affiliateTenantId }
            })
            if (coaching) validAffiliateId = coaching.id
        }

        const commissionAmount = validAffiliateId ? (totalAmount * 0.20) : 0

        // Create Razorpay Order
        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `gyankosh_cart_${Date.now()}`,
        }

        const rzpOrder = await razorpay.orders.create(options)

        // Create record in DB
        const order = await prisma.gyankoshOrder.create({
            data: {
                items: dbItems,
                studentName,
                email,
                phone,
                amount: totalAmount,
                status: 'PENDING',
                razorpayOrderId: rzpOrder.id,
                affiliateTenantId: validAffiliateId,
                commissionAmount: commissionAmount,
            }
        })

        return NextResponse.json({
            orderId: rzpOrder.id,
            amount: amountInPaise,
            currency: rzpOrder.currency,
            dbOrderId: order.id,
        })

    } catch (error: any) {
        console.error('Error creating cart order:', error)
        return NextResponse.json({ error: error.message || 'Failed to create order' }, { status: 500 })
    }
}
