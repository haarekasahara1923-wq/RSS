import { NextRequest, NextResponse } from 'next/server'
import { verifyAccessToken } from '@/lib/auth'

function getUser(req: NextRequest) {
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) return null
    return verifyAccessToken(authHeader.split(' ')[1])
}

export async function POST(req: NextRequest) {
    try {
        const user = getUser(req)
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const formData = await req.formData()
        const file = formData.get('file') as File
        if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

        const cloudName = process.env.CLOUDINARY_CLOUD_NAME
        const apiKey = process.env.CLOUDINARY_API_KEY
        const apiSecret = process.env.CLOUDINARY_API_SECRET

        if (!cloudName || !apiKey || !apiSecret) {
            return NextResponse.json({ error: 'Cloudinary not configured' }, { status: 500 })
        }

        // Generate signature
        const timestamp = Math.round(Date.now() / 1000)
        const crypto = await import('crypto')
        const signature = crypto
            .createHash('sha1')
            .update(`folder=gyankosh&timestamp=${timestamp}${apiSecret}`)
            .digest('hex')

        // Upload to Cloudinary
        const uploadData = new FormData()
        uploadData.append('file', file)
        uploadData.append('api_key', apiKey)
        uploadData.append('timestamp', timestamp.toString())
        uploadData.append('signature', signature)
        uploadData.append('folder', 'gyankosh')

        const cloudinaryRes = await fetch(
            `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
            { method: 'POST', body: uploadData }
        )

        const result = await cloudinaryRes.json()

        if (result.error) {
            return NextResponse.json({ error: result.error.message }, { status: 400 })
        }

        return NextResponse.json({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
        })
    } catch (error) {
        console.error('Upload error:', error)
        return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    }
}
