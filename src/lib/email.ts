import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}) {
  if (!process.env.SMTP_USER) return // skip if not configured
  try {
    await transporter.sendMail({
      from: `BuildSync <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
    })
  } catch (e) {
    console.error('Email send failed:', e)
  }
}

export function buildNotificationEmail(title: string, content: string, link?: string) {
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">BuildSync 通知</h2>
      </div>
      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
        <h3 style="color: #1e293b; margin-top: 0;">${title}</h3>
        <p style="color: #475569;">${content}</p>
        ${link ? `<a href="${appUrl}${link}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px;">詳細を確認する</a>` : ''}
      </div>
    </div>
  `
}
