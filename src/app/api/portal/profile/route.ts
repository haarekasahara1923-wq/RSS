import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1]
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const user = verifyAccessToken(token)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        let profile = null;

        if (user.role === 'STUDENT') {
            profile = await prisma.student.findUnique({
                where: { userId: user.userId },
                include: { course: true, batch: true }
            })
        } else if (user.role === 'PARENT') {
            profile = await prisma.parentProfile.findUnique({
                where: { userId: user.userId },
                include: { children: { include: { course: true, batch: true } } }
            })
        } else {
            profile = await prisma.user.findUnique({
                where: { id: user.userId }
            })
        }

        return NextResponse.json({ success: true, profile })
    } catch (error) {
        console.error('Portal profile fetch error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const token = req.headers.get('authorization')?.split(' ')[1]
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        
        const user = verifyAccessToken(token)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const body = await req.json()
        const { name, avatar } = body

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 })
        }

        // Update User model
        const updatedUser = await prisma.user.update({
            where: { id: user.userId },
            data: {
                name,
                ...(avatar ? { avatar } : {})
            }
        })

        // Also update Teacher model if they are a teacher
        if (['TEACHER', 'STAFF'].includes(user.role)) {
            // Find teacher profile by email or phone
            const teacher = await prisma.teacher.findFirst({
                where: { 
                    tenantId: user.tenantId,
                    OR: [
                        { email: updatedUser.email },
                        { phone: updatedUser.phone || '' }
                    ]
                }
            })
            
            if (teacher) {
                await prisma.teacher.update({
                    where: { id: teacher.id },
                    data: {
                        name,
                        ...(avatar ? { photo: avatar } : {})
                    }
                })
            }
        }

        return NextResponse.json({ success: true, user: updatedUser })
    } catch (error) {
        console.error('Portal profile update error:', error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
}
