import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

// Create SMTP transporter using Gmail credentials from .env
function createTransporter() {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    })
}

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json()

        if (!email) {
            return NextResponse.json({ error: 'Email address is required' }, { status: 400 })
        }

        // Check in User table
        const user = await prisma.user.findFirst({
            where: { email: email.toLowerCase() }
        })

        // Check in Affiliate table
        const affiliate = !user ? await prisma.affiliate.findUnique({
            where: { email: email.toLowerCase() }
        }) : null

        if (!user && !affiliate) {
            // Return vague success to prevent email enumeration attacks
            return NextResponse.json({
                success: true,
                message: 'If an account with this email exists, a password reset link has been sent.'
            })
        }

        // Generate secure reset token
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenExpiry = new Date(Date.now() + 3600000) // 1 hour

        if (user) {
            await prisma.user.update({
                where: { id: user.id },
                data: { resetToken, resetTokenExpiry }
            })
        } else if (affiliate) {
            await prisma.affiliate.update({
                where: { id: affiliate.id },
                data: { resetToken, resetTokenExpiry }
            })
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://udba.vercel.app'
        const resetUrl = `${appUrl}/reset-password?token=${resetToken}`
        const schoolName = 'Universal Day Boarding Academy'
        const fromEmail = process.env.SMTP_USER || 'noreply@udba.ac.in'

        // Send email via SMTP (Gmail)
        const transporter = createTransporter()

        await transporter.sendMail({
            from: `"${schoolName}" <${fromEmail}>`,
            to: email,
            subject: `🔐 Password Reset Request — ${schoolName}`,
            html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1a5c38,#0f3d26);padding:32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:12px;">🏫</div>
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:800;">${schoolName}</h1>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">📍 Pinto Park, Gwalior (MP)</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <div style="text-align:center;margin-bottom:28px;">
                <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:64px;height:64px;line-height:64px;font-size:32px;">🔑</div>
              </div>
              <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;font-weight:700;text-align:center;">Password Reset Request</h2>
              <p style="color:#64748b;font-size:15px;line-height:1.6;margin:0 0 24px;text-align:center;">
                We received a request to reset the password for your UDBA account.<br>
                Click the button below to set a new password.
              </p>

              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}"
                   style="display:inline-block;background:linear-gradient(135deg,#1a5c38,#0f3d26);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                  🔐 Reset My Password
                </a>
              </div>

              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:24px 0;">
                <p style="margin:0;font-size:13px;color:#64748b;">
                  ⏰ <strong>This link expires in 1 hour.</strong><br><br>
                  If the button above doesn't work, copy and paste this link in your browser:<br>
                  <a href="${resetUrl}" style="color:#1a5c38;word-break:break-all;font-size:12px;">${resetUrl}</a>
                </p>
              </div>

              <p style="color:#94a3b8;font-size:13px;text-align:center;margin:24px 0 0;">
                If you didn't request a password reset, you can safely ignore this email.<br>
                Your password will remain unchanged.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} ${schoolName} &nbsp;|&nbsp; Pinto Park, Gwalior (MP)<br>
                Need help? Contact us at <a href="https://wa.me/917879337770" style="color:#1a5c38;">+91 7879337770</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
            `,
        })

        return NextResponse.json({
            success: true,
            message: `Password reset link sent to ${email}. Please check your inbox (and spam folder).`
        })

    } catch (error: any) {
        console.error('Forgot password error:', error)
        // Don't expose SMTP errors to client
        return NextResponse.json({
            error: 'Failed to send reset email. Please try again or contact support.'
        }, { status: 500 })
    }
}
