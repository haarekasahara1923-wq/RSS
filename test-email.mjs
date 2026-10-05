
import nodemailer from 'nodemailer';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testEmail() {
    console.log('--- Testing SMTP Connection ---');
    console.log('SMTP_HOST:', process.env.SMTP_HOST);
    console.log('SMTP_PORT:', process.env.SMTP_PORT);
    console.log('SMTP_USER:', process.env.SMTP_USER);
    // Masking password for safety in logs
    const pass = process.env.SMTP_PASS;
    console.log('SMTP_PASS:', pass ? '******' + pass.slice(-4) : 'MISSING');
    console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        console.error('CRITICAL: SMTP_USER or SMTP_PASS is missing in .env');
        return;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        console.log('Verifying transporter...');
        await transporter.verify();
        console.log('✅ SMTP connection successful!');

        console.log('Sending test email to:', process.env.SMTP_USER);
        const info = await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.SMTP_USER,
            to: process.env.SMTP_USER,
            subject: 'SMTP Test from Dev Script',
            text: 'This is a test email to verify SMTP settings. If you receive this, your settings are correct!',
        });

        console.log('✅ Email sent! Message ID:', info.messageId);
    } catch (error) {
        console.error('❌ SMTP Error:', error);
    }
}

testEmail();
