import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(req: NextRequest) {
    try {
        const { token, newPassword } = await req.json()

        if (!token || !newPassword) {
            return NextResponse.json({ error: 'Token and new password are required' }, { status: 400 })
        }

        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        })

        const affiliate = await prisma.affiliate.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: { gt: new Date() }
            }
        })

        if (!user && !affiliate) {
            return NextResponse.json({ error: 'Invalid or expired reset token' }, { status: 400 })
        }

        const hashedPassword = await hashPassword(newPassword)

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: {
                    password: hashedPassword,
                    plainPassword: newPassword, // Store plain password as requested
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        } else if (affiliate) {
            await prisma.affiliate.update({
                where: { id: affiliate.id },
                data: {
                    password: hashedPassword,
                    plainPassword: newPassword, // Store plain password as requested
                    resetToken: null,
                    resetTokenExpiry: null
                }
            })
        }

        return NextResponse.json({ success: true, message: 'Password reset successfully!' })
    } catch (error) {
        console.error('Reset password error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
