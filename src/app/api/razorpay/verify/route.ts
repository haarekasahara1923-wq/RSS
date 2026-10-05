import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/app/api/middleware'
import crypto from 'crypto'
import Razorpay from 'razorpay'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
    const { error, user } = requireAuth(req)
    if (error) return error

    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan } = await req.json()

        const sign = razorpay_order_id + "|" + razorpay_payment_id
        const expectedSign = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
            .update(sign.toString())
            .digest("hex")

        if (razorpay_signature === expectedSign) {
            // Update subscription in DB
            await prisma.subscription.update({
                where: { tenantId: user!.tenantId },
                data: {
                    plan: plan.toUpperCase(),
                    status: 'ACTIVE',
                    razorpaySubId: razorpay_payment_id,
                    amount: Number(req.headers.get('x-payment-amount') || 0), // fallback if needed
                    updatedAt: new Date()
                }
            })

            try {
                const razorpay = new Razorpay({ key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || '', key_secret: process.env.RAZORPAY_KEY_SECRET || '' })
                const orderInfo = await razorpay.orders.fetch(razorpay_order_id)
                const paymentAmount = typeof orderInfo.amount === 'number' ? orderInfo.amount / 100 : 0

                if (paymentAmount > 0) {
                    const tenantObj = await prisma.tenant.findUnique({
                        where: { id: user!.tenantId },
                        include: { globalAffiliateReferral: true }
                    })

                    if (tenantObj?.affiliateId) {
                        if (!tenantObj.referralLocked) {
                            await prisma.tenant.update({ where: { id: user!.tenantId }, data: { referralLocked: true } })
                            if (tenantObj.globalAffiliateReferral) {
                                await prisma.affiliateReferral.update({
                                    where: { id: tenantObj.globalAffiliateReferral.id },
                                    data: { status: 'ACTIVE' }
                                })
                            }
                        }

                        const pastCommissions = await prisma.affiliateSubscriptionCommission.count({
                            where: { tenantId: user!.tenantId, affiliateId: tenantObj.affiliateId }
                        })

                        const commissionPercentage = pastCommissions === 0 ? 0.40 : 0.20
                        const commissionType = pastCommissions === 0 ? 'FIRST_TIME' : 'RECURRING'

                        const now = new Date()
                        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

                        await prisma.affiliateSubscriptionCommission.create({
                            data: {
                                affiliateId: tenantObj.affiliateId,
                                tenantId: user!.tenantId,
                                subscriptionId: razorpay_payment_id,
                                paymentAmount,
                                commissionPercentage,
                                commissionAmount: paymentAmount * commissionPercentage,
                                commissionType,
                                month: monthStr,
                                status: 'PENDING'
                            }
                        })
                    }
                }
            } catch (err) {
                console.error("Affiliate Commission processing failed:", err)
            }
            return NextResponse.json({ success: true, message: 'Payment verified successfully' })
        } else {
            return NextResponse.json({ success: false, error: 'Invalid signature sent!' }, { status: 400 })
        }
    } catch (err: any) {
        console.error('Razorpay Verify Order Error:', err)
        return NextResponse.json({ error: 'Internal server error validating payment' }, { status: 500 })
    }
}
