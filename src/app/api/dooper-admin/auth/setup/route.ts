import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'
import jwt from 'jsonwebtoken'

const DOOPER_JWT_SECRET = process.env.DOOPER_JWT_SECRET || process.env.JWT_SECRET || 'dooper-fallback-secret'
const DOOPER_SETUP_KEY = process.env.DOOPER_SETUP_KEY || 'scalevo-dooper-setup-2026'

// This route allows first-time setup of Dooper Admin
// Requires DOOPER_SETUP_KEY for security
export async function POST(req: NextRequest) {
    try {
        const { name, email, password, setupKey } = await req.json()

        if (setupKey !== DOOPER_SETUP_KEY) {
            return NextResponse.json({ error: 'Invalid setup key' }, { status: 403 })
        }

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
        }

        const existing = await prisma.dooperAdmin.findUnique({
            where: { email: email.toLowerCase() }
        })

        if (existing) {
            return NextResponse.json({ error: 'An admin with this email already exists' }, { status: 409 })
        }

        const hashedPassword = await hashPassword(password)

        const admin = await prisma.dooperAdmin.create({
            data: {
                name,
                email: email.toLowerCase(),
                password: hashedPassword,
                plainPassword: password,
                isActive: true,
            }
        })

        const token = jwt.sign(
            { adminId: admin.id, email: admin.email, role: 'DOOPER_ADMIN' },
            DOOPER_JWT_SECRET,
            { expiresIn: '12h' }
        )

        return NextResponse.json({
            success: true,
            token,
            admin: { id: admin.id, name: admin.name, email: admin.email }
        }, { status: 201 })
    } catch (error) {
        console.error('Dooper admin setup error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
