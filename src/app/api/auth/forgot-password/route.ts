import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { randomBytes } from 'crypto'
import { sendEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'メールアドレスは必須です' }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    return NextResponse.json({ message: 'リセットリンクを送信しました' })
  }

  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null },
    data: { usedAt: new Date() },
  })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60)

  await prisma.passwordResetToken.create({
    data: { token, userId: user.id, expiresAt },
  })

  const resetUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/reset-password?token=${token}`

  await sendEmail({
    to: user.email,
    subject: 'パスワード再設定のご案内',
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">パスワード再設定</h2>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="color: #1e293b;">${user.name} 様</p>
          <p style="color: #475569;">パスワード再設定のリクエストを受け付けました。以下のボタンからパスワードを再設定してください。</p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; margin-top: 16px;">パスワードを再設定する</a>
          <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">このリンクは1時間で有効期限が切れます。このメールに心当たりのない場合は無視してください。</p>
        </div>
      </div>
    `,
  })

  return NextResponse.json({ message: 'リセットリンクを送信しました' })
}
