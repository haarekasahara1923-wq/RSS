import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const DOOPER_JWT_SECRET = process.env.DOOPER_JWT_SECRET || process.env.JWT_SECRET || 'dooper-fallback-secret'

export async function POST(req: NextRequest) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
        }

        const admin = await prisma.dooperAdmin.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (!admin || !admin.isActive) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const isValid = await comparePassword(password, admin.password)
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
        }

        const token = jwt.sign(
            { adminId: admin.id, email: admin.email, role: 'DOOPER_ADMIN' },
            DOOPER_JWT_SECRET,
            { expiresIn: '12h' }
        )

        return NextResponse.json({
            success: true,
            token,
            admin: {
                id: admin.id,
                name: admin.name,
                email: admin.email,
            }
        })
    } catch (error) {
        console.error('Dooper admin login error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
