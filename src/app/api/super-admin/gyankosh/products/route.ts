import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAccessToken } from '@/lib/auth'

function getUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    return verifyAccessToken(authHeader.split(' ')[1])
}

export async function GET(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const products = await prisma.gyankoshProduct.findMany({ 
            include: { bonuses: true, orderBumps: true },
            orderBy: { createdAt: 'desc' } 
        })

        const orders = await prisma.gyankoshOrder.findMany({
            where: { status: 'SUCCESS' },
            include: { product: true },
            orderBy: { createdAt: 'desc' },
            take: 50
        })

        return NextResponse.json({ products, orders })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json()
        const product = await prisma.gyankoshProduct.create({
            data: {
                title: body.title,
                description: body.description,
                category: body.category,
                price: body.price,
                discount: body.discount || 0,
                imageUrl: body.imageUrl || '',
                fileUrl: body.fileUrl || '',
                bonuses: {
                    create: (body.bonuses || []).map((b: any) => ({
                        title: b.title,
                        description: b.description,
                        imageUrl: b.imageUrl,
                        fileUrl: b.fileUrl,
                        originalPrice: b.originalPrice || 0
                    }))
                },
                orderBumps: {
                    create: (body.orderBumps || []).map((ob: any) => ({
                        title: ob.title,
                        description: ob.description,
                        imageUrl: ob.imageUrl,
                        fileUrl: ob.fileUrl,
                        originalPrice: ob.originalPrice || 0,
                        discountedPrice: ob.discountedPrice || 0
                    }))
                }
            },
            include: { bonuses: true, orderBumps: true }
        })
        return NextResponse.json(product)
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user || user.role !== 'SUPER_ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        const body = await req.json()
        if (body.action === 'toggle') {
            const product = await prisma.gyankoshProduct.update({
                where: { id: body.id },
                data: { isActive: !body.isActive }
            })
            return NextResponse.json(product)
        }

        if (body.action === 'edit') {
            // Use transaction or separate calls to update bonuses/bumps
            await prisma.$transaction([
                prisma.gyankoshBonus.deleteMany({ where: { productId: body.id } }),
                prisma.gyankoshOrderBump.deleteMany({ where: { productId: body.id } }),
                prisma.gyankoshProduct.update({
                    where: { id: body.id },
                    data: {
                        title: body.title,
                        description: body.description,
                        category: body.category,
                        price: body.price,
                        discount: body.discount || 0,
                        imageUrl: body.imageUrl || '',
                        fileUrl: body.fileUrl || '',
                        bonuses: {
                            create: (body.bonuses || []).map((b: any) => ({
                                title: b.title,
                                description: b.description,
                                imageUrl: b.imageUrl,
                                fileUrl: b.fileUrl,
                                originalPrice: b.originalPrice || 0
                            }))
                        },
                        orderBumps: {
                            create: (body.orderBumps || []).map((ob: any) => ({
                                title: ob.title,
                                description: ob.description,
                                imageUrl: ob.imageUrl,
                                fileUrl: ob.fileUrl,
                                originalPrice: ob.originalPrice || 0,
                                discountedPrice: ob.discountedPrice || 0
                            }))
                        }
                    }
                })
            ]);
            
            const updatedProduct = await prisma.gyankoshProduct.findUnique({
                where: { id: body.id },
                include: { bonuses: true, orderBumps: true }
            })
            return NextResponse.json(updatedProduct)
        }

        return NextResponse.json({ error: 'Invalid' }, { status: 400 })
    } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
}

