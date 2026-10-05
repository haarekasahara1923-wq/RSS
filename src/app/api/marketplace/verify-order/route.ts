import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { Resend } from 'resend'

export async function POST(req: Request) {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, dbOrderId } = await req.json()

        const body = razorpay_order_id + "|" + razorpay_payment_id
        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '')
            .update(body.toString())
            .digest('hex')

        const isAuthentic = expectedSignature === razorpay_signature

        if (!isAuthentic) {
            await prisma.gyankoshOrder.update({
                where: { id: dbOrderId },
                data: { status: 'FAILED' }
            })
            return NextResponse.json({ error: 'Invalid payment signature' }, { status: 400 })
        }

        const order = await prisma.gyankoshOrder.update({
            where: { id: dbOrderId },
            data: {
                status: 'SUCCESS',
                razorpayPaymentId: razorpay_payment_id
            }
        })

        // Process affiliate commission
        if (order.affiliateTenantId && order.commissionAmount > 0) {
            await prisma.tenant.update({
                where: { id: order.affiliateTenantId },
                data: {
                    totalEarnings: { increment: order.commissionAmount },
                    availableBalance: { increment: order.commissionAmount }
                }
            });
        }

        // Prepare email table for all items
        const orderItems = (order.items as any[]) || []
        let itemsHtml = ''

        for (const item of orderItems) {
            const product = await prisma.gyankoshProduct.findUnique({
                where: { id: item.productId },
                include: { bonuses: true, orderBumps: true }
            })
            if (!product) continue

            // Main Product
            itemsHtml += `
                <tr>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>${product.title} (Main)</strong></td>
                    <td style="padding: 12px; border: 1px solid #e5e7eb;"><a href="${product.fileUrl}" style="color: #4f46e5; font-weight: bold;">Download Link</a></td>
                </tr>
            `

            // Bonuses
            product.bonuses.forEach(b => {
                itemsHtml += `
                    <tr style="background-color: #f0fdf4;">
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">🎁 ${b.title} (FREE Bonus)</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;"><a href="${b.fileUrl}" style="color: #10b981; font-weight: bold;">Download Link</a></td>
                    </tr>
                `
            })

            // Selected Bumps
            const selectedBumpIds = item.orderBumpIds || []
            const selectedBumps = product.orderBumps.filter(b => selectedBumpIds.includes(b.id))
            selectedBumps.forEach(b => {
                itemsHtml += `
                    <tr style="background-color: #f5f3ff;">
                        <td style="padding: 12px; border: 1px solid #e5e7eb;">🚀 ${b.title} (Bump Product)</td>
                        <td style="padding: 12px; border: 1px solid #e5e7eb;"><a href="${b.fileUrl}" style="color: #6366f1; font-weight: bold;">Download Link</a></td>
                    </tr>
                `
            })
        }

        if (order.email) {
            try {
                const resend = new Resend(process.env.RESEND_API_KEY)
                await resend.emails.send({
                    from: process.env.EMAIL_FROM || 'UDBA <onboarding@resend.dev>',
                    to: order.email,
                    subject: `Your Purchase Details - ${orderItems.length} Products`,
                    html: `
                        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto;">
                            <h2 style="color: #4f46e5; text-align: center;">Payment Successful! 🎉</h2>
                            <p>Hello <strong>${order.studentName || 'Student'}</strong>,</p>
                            <p>Thank you for your purchase from Gyankosh. Here are the access links for all your items:</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                                <thead>
                                    <tr style="background-color: #f3f4f6;">
                                        <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Product</th>
                                        <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: left;">Access Link</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${itemsHtml}
                                </tbody>
                            </table>

                            <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e5e7eb;">
                                <p style="margin: 0;"><strong>Total Paid:</strong> ₹${order.amount}</p>
                                <p style="margin: 5px 0 0 0; font-size: 12px; color: #6b7280;"><strong>Order ID:</strong> ${order.id}</p>
                            </div>

                            <p style="font-size: 14px; color: #6b7280;">Links are linked to Google Drive. Please ensure you are logged into your Google account to access them.</p>
                            
                            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                            <p style="font-size: 12px; color: #9ca3af; text-align: center;">Best regards,<br>UDBA Gyankosh Team</p>
                        </div>
                    `
                })
            } catch (err) { console.error('Email error:', err) }
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Verify error:', error)
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
    }
}
